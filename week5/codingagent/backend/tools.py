from dataclasses import asdict
from pathlib import Path
from typing import Any
from pydantic import BaseModel, Field

from .config import get_workspace_root
from .safety import (
    BLOCKED_DIRS,
    SPECIAL_ALLOWED_FILES,
    TEXT_EXTENSIONS,
    SafetyError,
    safe_path,
    safe_rel_path,
)

MAX_PATCH_LINES = 30


class PendingPatch(BaseModel):
    path: str
    start_line: int
    end_line: int
    old_code: str
    new_code: str
    explanation: str
    original_content: str
    modified_content: str


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "search_files",
            "description": "Searches workspace files for a text query (like grep). Returns up to 20 matching occurrences with file path, line number, and snippet.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The exact string or token to search for in the codebase.",
                    },
                    "file_glob": {
                        "type": ["string", "null"],
                        "description": "Optional glob pattern to restrict the search, e.g. '*.py' or 'src/**/*.js'.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Reads lines from a file with line numbers. If start_line and end_line are omitted, returns the first 200 lines.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "The path to the file relative to the project workspace root or absolute path.",
                    },
                    "start_line": {
                        "type": ["integer", "null"],
                        "description": "Optional 1-based start line number.",
                    },
                    "end_line": {
                        "type": ["integer", "null"],
                        "description": "Optional 1-based end line number.",
                    },
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "propose_fix",
            "description": "Proposes a bug fix patch replacing broken lines (start_line to end_line) with new_code. Does not edit the file immediately; sends it to the user for diff review. Limit: touches at most 30 lines.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "The file path where the bug exists.",
                    },
                    "start_line": {
                        "type": "integer",
                        "description": "The 1-based line number where the replacement starts.",
                    },
                    "end_line": {
                        "type": "integer",
                        "description": "The 1-based line number where the replacement ends.",
                    },
                    "new_code": {
                        "type": "string",
                        "description": "The corrected replacement lines of code.",
                    },
                    "explanation": {
                        "type": "string",
                        "description": "Short, plain explanation of why the bug occurred and how this fix resolves it.",
                    },
                },
                "required": ["path", "start_line", "end_line", "new_code", "explanation"],
            },
        },
    },
]


def search_files(query: str, file_glob: str | None = None) -> dict[str, Any]:
    """
    Searches the active workspace for the query string, like grep.
    Skips blocked directories (.git, node_modules, venv, dist, etc.) and binary files.
    Returns up to 20 matches.
    """
    if not query or not query.strip():
        return {"matches": [], "message": "Search query was empty."}

    root = get_workspace_root()
    matches: list[dict[str, Any]] = []
    pattern = file_glob.strip() if file_glob else "*"

    try:
        candidates = root.glob(pattern) if ("/" in pattern or "\\" in pattern) else root.rglob(pattern)
        for path in candidates:
            if len(matches) >= 20:
                break
            if not path.is_file():
                continue

            try:
                rel = path.relative_to(root)
            except ValueError:
                continue

            # Skip blocked directories
            if any(part in BLOCKED_DIRS for part in rel.parts):
                continue

            name_lower = path.name.lower()
            if name_lower == ".env" or (name_lower.startswith(".env.") and name_lower != ".env.example"):
                continue

            if path.suffix.lower() not in TEXT_EXTENSIONS and path.name not in SPECIAL_ALLOWED_FILES:
                continue

            try:
                content = path.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue

            for idx, line in enumerate(content.splitlines(), start=1):
                if query.lower() in line.lower():
                    matches.append({
                        "path": rel.as_posix(),
                        "line": idx,
                        "snippet": line.strip()[:200],
                    })
                    if len(matches) >= 20:
                        break
    except Exception as e:
        return {"matches": matches, "error": str(e)}

    return {
        "query": query,
        "matches": matches,
        "total_found": len(matches),
        "truncated": len(matches) >= 20,
    }


def read_file(path: str, start_line: int | None = None, end_line: int | None = None) -> dict[str, Any]:
    """
    Reads the requested lines from a file with line numbers.
    If no range is given, returns the first 200 lines and indicates if the file continues.
    """
    try:
        resolved = safe_path(path, must_exist=True)
    except SafetyError as exc:
        return {"error": str(exc)}

    try:
        text = resolved.read_text(encoding="utf-8", errors="replace")
    except Exception as exc:
        return {"error": f"Failed to read file '{path}': {exc}"}

    lines = text.splitlines()
    total_lines = len(lines)

    start = max(1, start_line or 1)
    end = min(end_line or (start + 199 if start_line is None else total_lines), total_lines)

    numbered_lines = [f"{idx}: {lines[idx - 1]}" for idx in range(start, end + 1)]
    rel_path = safe_rel_path(resolved)

    return {
        "path": rel_path,
        "start_line": start,
        "end_line": end,
        "total_lines": total_lines,
        "continues": end < total_lines,
        "lines": numbered_lines,
    }


def propose_fix(
    path: str,
    start_line: int,
    end_line: int,
    new_code: str,
    explanation: str,
) -> PendingPatch | str:
    """
    Validates and constructs a PendingPatch replacing lines start_line to end_line with new_code.
    Does NOT write to disk. Rejects any patch touching more than 30 lines.
    """
    if start_line < 1 or end_line < start_line:
        return "Patch rejected: start_line must be at least 1 and end_line >= start_line."

    lines_touched = end_line - start_line + 1
    if lines_touched > MAX_PATCH_LINES:
        return f"Patch rejected: it touches {lines_touched} lines, which exceeds the 30-line limit. Please narrow down the fix to only the broken lines."

    try:
        resolved = safe_path(path, must_exist=True)
    except SafetyError as exc:
        return f"Patch rejected: {exc}"

    try:
        original_content = resolved.read_text(encoding="utf-8", errors="replace")
    except Exception as exc:
        return f"Patch rejected: unable to read file: {exc}"

    lines = original_content.splitlines(keepends=True)
    total_lines = len(lines)

    if end_line > total_lines:
        return f"Patch rejected: file has {total_lines} lines, but end_line is {end_line}."

    old_code = "".join(lines[start_line - 1 : end_line])

    # Ensure replacement has newline if original segment did
    replacement = new_code
    if replacement and not replacement.endswith("\n") and (lines[end_line - 1].endswith("\n") or end_line < total_lines):
        replacement += "\n"

    modified_lines = lines[: start_line - 1] + [replacement] + lines[end_line:]
    modified_content = "".join(modified_lines)
    rel_path = safe_rel_path(resolved)

    return PendingPatch(
        path=rel_path,
        start_line=start_line,
        end_line=end_line,
        old_code=old_code,
        new_code=new_code,
        explanation=explanation,
        original_content=original_content,
        modified_content=modified_content,
    )
