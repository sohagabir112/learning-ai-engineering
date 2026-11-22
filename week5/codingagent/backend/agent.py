import asyncio
import json
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncIterator

from groq import Groq
from pydantic import BaseModel, Field

from .config import GROQ_API_KEY, MODEL, WORKSPACE_ROOT
from .safety import safe_path, safe_rel_path
from .tools import (
    TOOL_SCHEMAS,
    PendingPatch,
    propose_fix,
    read_file,
    search_files,
)

SYSTEM_PROMPT = (
    "You are a careful bug-fixing assistant working in the user's project. "
    "Find the root cause before proposing anything. Use search_files to locate related code, "
    "then read_file to confirm it. Fix only the lines that are actually broken - do not reformat, "
    "rename, or refactor anything else. Propose one fix at a time with propose_fix and a short, "
    "plain explanation of why the bug happens. If the user rejects a fix, read their reason and "
    "try a different approach. If you can't find the cause, say so and explain what you checked. "
    "Never invent file paths or line numbers."
)


class AgentEvent(BaseModel):
    event: str
    data: dict[str, Any] = Field(default_factory=dict)


@dataclass
class Session:
    id: str
    bug: str
    open_file: str | None = None
    cursor_line: int | None = None
    events: asyncio.Queue[dict[str, Any]] = field(default_factory=asyncio.Queue)
    decision: asyncio.Future[dict[str, Any]] | None = None
    pending_patch: PendingPatch | None = None
    last_backup: Path | None = None
    last_patched_file: Path | None = None
    messages: list[dict[str, Any]] = field(default_factory=list)

    async def emit(self, event_name: str, payload: dict[str, Any]) -> None:
        """Pushes an SSE event into the session queue."""
        await self.events.put({
            "event": event_name,
            "data": json.dumps(payload),
        })


def get_groq_client() -> Groq:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not configured in .env. Please set it to use the agent.")
    return Groq(api_key=GROQ_API_KEY)


def apply_patch_to_disk(patch: PendingPatch) -> tuple[Path, Path]:
    """
    Applies the patch directly to disk, creating a .bak copy first.
    Returns (target_file_path, backup_file_path).
    """
    target = safe_path(patch.path, must_exist=True)
    backup = target.with_name(target.name + ".bak")

    # Read original bytes and write backup
    original_bytes = target.read_bytes()
    backup.write_bytes(original_bytes)

    # Write modified content
    target.write_text(patch.modified_content, encoding="utf-8")
    return target, backup


async def run_agent(session: Session) -> None:
    """
    Executes the bug fixing agent loop:
    1. Sends context, bug description, and tools to Groq ('openai/gpt-oss-120b').
    2. Runs tool calls up to 12 iterations.
    3. Handles propose_fix by pausing for user decision.
    4. Streams progress events via SSE.
    """
    try:
        user_prompt_lines = [f"Bug description:\n{session.bug.strip()}"]
        if session.open_file:
            loc = f" (line {session.cursor_line})" if session.cursor_line else ""
            user_prompt_lines.append(f"Currently open file in editor: {session.open_file}{loc}")

        session.messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "\n\n".join(user_prompt_lines)},
        ]

        client = get_groq_client()

        for iteration in range(12):
            step_num = iteration + 1
            await session.emit("status", {
                "message": f"Investigating codebase (step {step_num}/12)...",
                "step": step_num,
                "max_steps": 12,
            })

            # Call model with tool definitions
            try:
                response = await asyncio.to_thread(
                    client.chat.completions.create,
                    model=MODEL,
                    messages=session.messages,
                    tools=TOOL_SCHEMAS,
                    tool_choice="auto",
                    temperature=0.1,
                )
            except Exception as api_err:
                await session.emit("error", {
                    "message": f"Groq API error: {api_err}",
                })
                break

            choice = response.choices[0]
            message = choice.message
            tool_calls = message.tool_calls or []

            # If model didn't call any tools, output final message and finish
            if not tool_calls:
                content = message.content or "I have finished analyzing the codebase."
                await session.emit("message", {"content": content})
                break

            # Record assistant message with tool calls
            assistant_msg: dict[str, Any] = {
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in tool_calls
                ],
            }
            session.messages.append(assistant_msg)

            # If there was introductory content from assistant, emit it
            if message.content:
                await session.emit("message", {"content": message.content})

            # Process each requested tool call
            for call in tool_calls:
                fn_name = call.function.name
                raw_args = call.function.arguments
                parsed_args: dict[str, Any] = {}

                try:
                    parsed_args = json.loads(raw_args)
                except json.JSONDecodeError as json_err:
                    err_result = f"Failed to parse tool arguments as JSON: {json_err}"
                    await session.emit("tool_result", {"name": fn_name, "error": err_result})
                    session.messages.append({
                        "role": "tool",
                        "tool_call_id": call.id,
                        "content": json.dumps({"error": err_result}),
                    })
                    continue

                await session.emit("tool_call", {
                    "id": call.id,
                    "name": fn_name,
                    "arguments": parsed_args,
                })

                tool_output: Any = None

                try:
                    if fn_name == "search_files":
                        query = parsed_args.get("query", "")
                        glob_pat = parsed_args.get("file_glob")
                        tool_output = search_files(query=query, file_glob=glob_pat)

                    elif fn_name == "read_file":
                        path = parsed_args.get("path", "")
                        start_line = parsed_args.get("start_line")
                        end_line = parsed_args.get("end_line")
                        tool_output = read_file(path=path, start_line=start_line, end_line=end_line)

                    elif fn_name == "propose_fix":
                        patch_result = propose_fix(
                            path=parsed_args.get("path", ""),
                            start_line=int(parsed_args.get("start_line", 0)),
                            end_line=int(parsed_args.get("end_line", 0)),
                            new_code=parsed_args.get("new_code", ""),
                            explanation=parsed_args.get("explanation", ""),
                        )

                        if isinstance(patch_result, PendingPatch):
                            session.pending_patch = patch_result
                            await session.emit("patch", patch_result.model_dump())
                            await session.emit("status", {
                                "message": "Patch proposed. Waiting for your review in the diff editor...",
                                "waiting_decision": True,
                            })

                            # Pause agent loop until user accepts or rejects
                            loop = asyncio.get_running_loop()
                            session.decision = loop.create_future()
                            user_decision = await session.decision

                            if user_decision.get("decision") == "accept":
                                target, backup = apply_patch_to_disk(patch_result)
                                session.last_patched_file = target
                                session.last_backup = backup
                                await session.emit("applied", {
                                    "path": patch_result.path,
                                    "backup": safe_rel_path(backup),
                                    "message": f"Fix applied to {patch_result.path}",
                                })
                                tool_output = {
                                    "accepted": True,
                                    "message": "The user reviewed and accepted your patch. It has been applied to disk.",
                                }
                            else:
                                reason = user_decision.get("reason", "").strip()
                                await session.emit("rejected", {
                                    "path": patch_result.path,
                                    "reason": reason,
                                    "message": "Patch was rejected by the user.",
                                })
                                tool_output = {
                                    "accepted": False,
                                    "reason": reason or "No specific reason provided.",
                                    "message": "The user rejected your patch. Please review their feedback and try a different fix.",
                                }
                            session.pending_patch = None
                        else:
                            # Rejection string from propose_fix limits (e.g. > 30 lines)
                            tool_output = {"error": patch_result}
                    else:
                        tool_output = {"error": f"Unknown tool name: {fn_name}"}

                except Exception as run_err:
                    tool_output = {"error": f"Execution error in {fn_name}: {run_err}"}

                # Emit result to frontend
                await session.emit("tool_result", {
                    "id": call.id,
                    "name": fn_name,
                    "result": tool_output,
                })

                # Append tool message for Groq
                session.messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": json.dumps(tool_output if isinstance(tool_output, dict) else {"output": str(tool_output)}),
                })

        else:
            await session.emit("message", {
                "content": "I reached the 12-iteration limit. Please check the steps and diff, or refine your bug description.",
            })

    except Exception as general_err:
        await session.emit("error", {"message": f"Agent error: {general_err}"})
    finally:
        await session.emit("done", {})


async def event_stream(session: Session) -> AsyncIterator[dict[str, Any]]:
    """Yields SSE events to the connected HTTP client."""
    while True:
        event = await session.events.get()
        yield event
        if event.get("event") == "done":
            break
