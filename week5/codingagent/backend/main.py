import asyncio
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from .agent import Session, event_stream, run_agent
from .config import get_workspace_root, set_workspace_root
from .safety import (
    BLOCKED_DIRS,
    SPECIAL_ALLOWED_FILES,
    TEXT_EXTENSIONS,
    SafetyError,
    safe_path,
    safe_rel_path,
)
from .tools import search_files

app = FastAPI(title="Bug Fixing Coding Agent Backend")

# Enable CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active sessions
sessions: dict[str, Session] = {}


# --- Request and Response Models ---

class SaveFileRequest(BaseModel):
    path: str
    content: str


class CreateFileRequest(BaseModel):
    path: str
    is_directory: bool = False
    content: str = ""


class SessionRequest(BaseModel):
    bug: str = Field(min_length=1, description="Description of the bug or pasted error/trace")
    open_file: str | None = Field(default=None, description="Optional path of current active file")
    cursor_line: int | None = Field(default=None, description="Optional current cursor line")


class DecisionRequest(BaseModel):
    decision: Literal["accept", "reject"]
    reason: str = ""


class ChangeWorkspaceRequest(BaseModel):
    path: str = Field(min_length=1, description="Absolute or relative path to the folder to open")


class RunCodeRequest(BaseModel):
    path: str = Field(min_length=1, description="Relative path of file to execute")


# --- Workspace and File Routes ---

def build_tree(dir_path: Path, max_depth: int = 5, current_depth: int = 0) -> list[dict[str, Any]]:
    """Recursively builds a directory tree structure."""
    if current_depth > max_depth or not dir_path.is_dir():
        return []

    items: list[dict[str, Any]] = []
    try:
        entries = sorted(dir_path.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
    except (PermissionError, OSError):
        return []

    for entry in entries:
        name = entry.name
        if name in BLOCKED_DIRS:
            continue
        if name.startswith(".") and name not in {".gitignore"}:
            continue
        if name.lower() == ".env" or (name.lower().startswith(".env.") and name.lower() != ".env.example"):
            continue

        rel_path = safe_rel_path(entry)
        if entry.is_dir():
            children = build_tree(entry, max_depth, current_depth + 1)
            items.append({
                "name": name,
                "path": rel_path,
                "type": "directory",
                "children": children,
            })
        elif entry.is_file():
            if entry.suffix.lower() in TEXT_EXTENSIONS or name in SPECIAL_ALLOWED_FILES:
                try:
                    sz = entry.stat().st_size
                except OSError:
                    sz = 0
                items.append({
                    "name": name,
                    "path": rel_path,
                    "type": "file",
                    "size": sz,
                })

    return items


@app.get("/api/workspace")
async def get_workspace() -> dict[str, Any]:
    """Returns the active workspace root info."""
    root = get_workspace_root()
    return {
        "workspace_root": str(root),
        "name": root.name,
    }


@app.post("/api/workspace")
async def change_workspace(request: ChangeWorkspaceRequest) -> dict[str, Any]:
    """Sets a new workspace folder for coding and agent analysis."""
    try:
        new_root = set_workspace_root(request.path)
        return {
            "ok": True,
            "workspace_root": str(new_root),
            "name": new_root.name,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/folders")
async def list_folders(path: str = "") -> dict[str, Any]:
    """
    Lists directories in the given path or workspace root to enable an intuitive folder picker.
    """
    current_root = get_workspace_root()
    target_dir = Path(path).expanduser().resolve() if path else current_root

    if not target_dir.is_dir():
        raise HTTPException(status_code=400, detail=f"'{path}' is not a valid directory.")

    folders = []
    try:
        for entry in sorted(target_dir.iterdir(), key=lambda e: e.name.lower()):
            if entry.is_dir() and entry.name not in BLOCKED_DIRS and not entry.name.startswith("."):
                folders.append({
                    "name": entry.name,
                    "path": str(entry.resolve()),
                })
    except PermissionError:
        pass

    parent_dir = str(target_dir.parent) if target_dir.parent != target_dir else None
    return {
        "current": str(target_dir),
        "name": target_dir.name,
        "parent": parent_dir,
        "folders": folders,
    }


@app.get("/api/tree")
async def get_tree(path: str = "") -> dict[str, Any]:
    """Returns the folder tree for the file explorer."""
    try:
        target_dir = safe_path(path, must_exist=True, allow_dir=True)
    except SafetyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not target_dir.is_dir():
        raise HTTPException(status_code=400, detail="Requested path is not a directory.")

    root = get_workspace_root()
    tree = build_tree(target_dir)
    return {
        "workspace": root.name,
        "root": safe_rel_path(target_dir),
        "tree": tree,
    }


@app.get("/api/file")
async def get_file(path: str = Query(..., description="Path to file")) -> dict[str, Any]:
    """Returns file contents for the code editor."""
    try:
        target = safe_path(path, must_exist=True)
    except SafetyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        content = target.read_text(encoding="utf-8", errors="replace")
        stat = target.stat()
        return {
            "path": safe_rel_path(target),
            "content": content,
            "size": stat.st_size,
            "modified": stat.st_mtime,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {exc}") from exc


@app.put("/api/file")
async def save_file(request: SaveFileRequest) -> dict[str, Any]:
    """Saves file contents (used when user hits Ctrl+S)."""
    try:
        target = safe_path(request.path, must_exist=False)
    except SafetyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(request.content, encoding="utf-8")
        return {
            "ok": True,
            "path": safe_rel_path(target),
            "size": len(request.content),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {exc}") from exc


@app.post("/api/file")
async def create_file(request: CreateFileRequest) -> dict[str, Any]:
    """Creates a new file or directory."""
    try:
        target = safe_path(request.path, must_exist=False, allow_dir=request.is_directory)
    except SafetyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if target.exists():
        raise HTTPException(status_code=409, detail=f"Path '{request.path}' already exists.")

    try:
        if request.is_directory:
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(request.content, encoding="utf-8")
        return {
            "ok": True,
            "path": safe_rel_path(target),
            "is_directory": request.is_directory,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create path: {exc}") from exc


@app.delete("/api/file")
async def delete_file(path: str = Query(..., description="Path to delete")) -> dict[str, Any]:
    """Deletes a file or directory."""
    try:
        target = safe_path(path, must_exist=True, allow_dir=True)
    except SafetyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    root = get_workspace_root()
    if target == root:
        raise HTTPException(status_code=400, detail="Cannot delete the workspace root directory.")

    try:
        if target.is_dir():
            import shutil
            shutil.rmtree(target)
        else:
            target.unlink()
        return {"ok": True, "path": safe_rel_path(target)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete path: {exc}") from exc


@app.get("/api/search")
async def search_endpoint(q: str = Query(..., min_length=1), file_glob: str | None = None) -> dict[str, Any]:
    """Searches workspace files for quick navigation."""
    return search_files(query=q, file_glob=file_glob)


# --- Code Execution Route ---

@app.post("/api/run")
async def run_code(request: RunCodeRequest) -> dict[str, Any]:
    """
    Executes a code file (e.g. Python or JavaScript) in a subprocess,
    capturing stdout, stderr, execution duration, and exit code.
    """
    try:
        file_path = safe_path(request.path, must_exist=True)
    except SafetyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    ext = file_path.suffix.lower()
    if ext == ".py":
        cmd = [sys.executable, str(file_path)]
    elif ext in {".js", ".mjs"}:
        cmd = ["node", str(file_path)]
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Execution is supported for Python (.py) and JavaScript (.js). Received '{ext}'.",
        )

    start_time = time.time()
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(file_path.parent),
        )
        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=30.0)
            duration = round(time.time() - start_time, 2)
            return {
                "ok": proc.returncode == 0,
                "exit_code": proc.returncode,
                "stdout": stdout_bytes.decode("utf-8", errors="replace"),
                "stderr": stderr_bytes.decode("utf-8", errors="replace"),
                "duration": duration,
                "cmd": f"{Path(cmd[0]).name} {file_path.name}",
                "file": safe_rel_path(file_path),
            }
        except asyncio.TimeoutError:
            proc.kill()
            return {
                "ok": False,
                "exit_code": -1,
                "stdout": "",
                "stderr": "Execution timed out after 30 seconds.",
                "duration": 30.0,
                "cmd": f"{Path(cmd[0]).name} {file_path.name}",
                "file": safe_rel_path(file_path),
            }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to run code: {exc}") from exc


# --- Agent Routes ---

@app.post("/api/sessions")
async def create_session(request: SessionRequest) -> dict[str, str]:
    """Starts a new bug fixing session and launches the agent loop in background."""
    session_id = str(uuid.uuid4())
    session = Session(
        id=session_id,
        bug=request.bug,
        open_file=request.open_file,
        cursor_line=request.cursor_line,
    )
    sessions[session.id] = session
    asyncio.create_task(run_agent(session))
    return {"id": session.id}


@app.get("/api/sessions/{session_id}/stream")
async def session_stream(session_id: str) -> EventSourceResponse:
    """Streams agent progress, tool calls, status, and pending patches."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return EventSourceResponse(event_stream(session))


@app.post("/api/sessions/{session_id}/decision")
async def submit_decision(session_id: str, request: DecisionRequest) -> dict[str, bool]:
    """Resolves the user's decision (accept or reject) on a pending patch."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not session.decision or session.decision.done():
        raise HTTPException(status_code=409, detail="There is no pending patch waiting for review.")

    session.decision.set_result(request.model_dump())
    return {"ok": True}


@app.post("/api/sessions/{session_id}/undo")
async def undo_patch(session_id: str) -> dict[str, Any]:
    """Restores the backup (.bak) of the last applied patch."""
    session = sessions.get(session_id)
    if not session or not session.last_backup or not session.last_patched_file:
        raise HTTPException(status_code=404, detail="No applied patch found to undo.")

    if not session.last_backup.exists():
        raise HTTPException(status_code=404, detail="Backup file (.bak) does not exist.")

    try:
        original_bytes = session.last_backup.read_bytes()
        session.last_patched_file.write_bytes(original_bytes)
        session.last_backup.unlink(missing_ok=True)
        rel_path = safe_rel_path(session.last_patched_file)

        session.last_backup = None
        session.last_patched_file = None
        return {
            "ok": True,
            "path": rel_path,
            "message": f"Successfully restored {rel_path} from backup.",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to undo patch: {exc}") from exc
