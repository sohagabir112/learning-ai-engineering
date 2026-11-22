Build a simple bug-fixing coding agent with a VS Code-style web IDE as the frontend. The user can open a project folder, browse files, write and edit code in a real code editor, and ask an AI agent to fix bugs. Write the agent and backend in Python 3.11+ using FastAPI, and use the official groq Python SDK to call the model "openai/gpt-oss-120b" with tool calling. The frontend is React (Vite) with Tailwind CSS and @monaco-editor/react, the same editor that powers VS Code. The Groq API key must live in a .env file on the backend only, never in the browser.

Think through the architecture and the agent loop before writing any code.

What it does:
The user opens a project folder, edits code like in VS Code, and describes a bug in the agent chat (optionally pasting an error or stack trace). The agent searches the codebase, finds the files related to the bug, and proposes a fix that changes only the broken lines. The fix appears inside the editor as a diff. The user accepts or rejects it. Nothing is written to disk until the user accepts.

Step 1 - Project structure
Create this scaffold first, with empty files where needed:
- backend/: main.py (FastAPI app and routes), agent.py (the agent loop), tools.py (tool schemas and handlers), safety.py (path checks), config.py (loads .env), requirements.txt, .env.example
- frontend/src/: App.jsx, components/ActivityBar.jsx, components/FileExplorer.jsx, components/EditorTabs.jsx, components/CodeEditor.jsx, components/DiffReview.jsx, components/AgentPanel.jsx, components/ToolLog.jsx, components/StatusBar.jsx, hooks/useAgentStream.js, api.js
- .env.example contains GROQ_API_KEY and WORKSPACE_ROOT
- requirements.txt includes fastapi, uvicorn, groq, python-dotenv, sse-starlette

Step 2 - Agent tools (backend/tools.py)
Define these tools as JSON schemas in the OpenAI-style function format that Groq supports, and write a plain Python handler for each:

1. search_files(query, file_glob=None)
   Searches the workspace for the query, like grep. Use pathlib and plain Python. Return up to 20 matches as file path, line number, and a short snippet. Skip node_modules, .git, venv, __pycache__, dist, build, and binary files.

2. read_file(path, start_line=None, end_line=None)
   Returns the requested lines with line numbers. If no range is given, return the first 200 lines and say whether the file continues. If the user has unsaved edits in the editor for that file, the agent must read the saved version on disk, and the UI should warn the user to save first.

3. propose_fix(path, start_line, end_line, new_code, explanation)
   Does NOT edit the file. It stores a pending patch that replaces only lines start_line through end_line with new_code, and sends the patch (old lines, new lines, explanation) to the frontend. Reject any patch that touches more than 30 lines and tell the agent to narrow it down.

The accept/reject step is handled by the user in the UI, not by the model. When the user clicks Accept, the backend applies the patch and saves a .bak copy of the original file. When the user clicks Reject, the backend returns the rejection (and the optional reason the user typed) to the agent as the result of propose_fix, so the agent can try a different fix.

Step 3 - Agent loop (backend/agent.py)
- Use the Groq client to send the system prompt, the bug description, and the tool schemas.
- Loop: if the model returns tool_calls, parse the JSON arguments, run the matching handler, append the tool result as a "tool" message, and call the model again. Stop when the model replies with no tool calls.
- Cap the loop at 12 iterations.
- Make the loop async. Stream every step (tool call, tool result, model message, pending patch) to the frontend with Server-Sent Events.
- When a patch is pending, pause the loop with an asyncio.Future tied to the session. The decision endpoint resolves it with accept or reject plus the optional reason, and the loop continues.
- Wrap Groq calls in try/except for rate limits, network errors, and bad tool arguments. Send a readable error to the UI instead of crashing.
- Use type hints and Pydantic models for patches, sessions, and events.

Write the agent's system prompt like this:
"You are a careful bug-fixing assistant working in the user's project. Find the root cause before proposing anything. Use search_files to locate related code, then read_file to confirm it. Fix only the lines that are actually broken - do not reformat, rename, or refactor anything else. Propose one fix at a time with propose_fix and a short, plain explanation of why the bug happens. If the user rejects a fix, read their reason and try a different approach. If you can't find the cause, say so and explain what you checked. Never invent file paths or line numbers."

Step 4 - API routes (backend/main.py)
File routes, so the editor can work like VS Code:
- GET /api/tree?path=: returns the folder tree for the explorer.
- GET /api/file?path=: returns file contents.
- PUT /api/file: saves file contents (used by Ctrl+S).
- POST /api/file: creates a new file or folder. DELETE /api/file: deletes with confirmation.
Agent routes:
- POST /api/sessions: body has bug description and optionally the currently open file and cursor line. Returns a session id.
- GET /api/sessions/{id}/stream: SSE stream of agent events.
- POST /api/sessions/{id}/decision: body has decision ("accept" or "reject") and an optional reason.
- POST /api/sessions/{id}/undo: restores the .bak file for the last applied patch.
Enable CORS for the Vite dev server only.

Step 5 - Safety (backend/safety.py)
- Resolve every path with Path.resolve() and confirm it is inside WORKSPACE_ROOT using is_relative_to. This blocks ../ tricks and symlinks that point outside the folder. Apply it to both the file routes and the agent tools.
- Allow only text and source files. Block .env files and anything inside .git.
- The agent can never write a file without an explicit Accept click.

Step 6 - Frontend UI (VS Code layout)
Build a dark-theme layout that feels like VS Code:
- Activity bar on the far left with icons for Explorer, Search, and AI Agent.
- Sidebar with a collapsible file explorer tree: folder icons, file-type icons, click to open, right-click menu for new file, rename, and delete.
- Main area with editor tabs on top. Show a dot on tabs with unsaved changes and an X to close. Below the tabs, a Monaco Editor with syntax highlighting, line numbers, minimap, bracket matching, find (Ctrl+F), and the vs-dark theme. The user can type and edit freely. Ctrl+S saves through PUT /api/file.
- Agent panel docked on the right, like a Copilot chat: a message box for describing the bug, a streamed conversation, and a collapsible activity log of tool calls ("Searching for 'user_id'...", "Reading auth.py lines 40-80").
- Review flow: when the agent proposes a fix, open that file in Monaco's DiffEditor so the old lines and new lines show side by side with red and green highlights, and scroll to the changed range. Show a bar above the diff with the agent's explanation and two buttons: Accept and Reject. Rejecting opens a small optional text box for a reason.
- After Accept, reload the file in the editor, show "Fix applied to <file>" in the agent panel with an Undo button, and flash the changed lines.
- Status bar at the bottom: current file, line and column, language, agent status (idle, thinking, waiting for your review).
- Resizable panels, a command palette on Ctrl+Shift+P with a few commands (Save, Open Agent, Undo Fix), and a "Fix this bug" button the user can trigger from a selected piece of code or an error line.
- States for loading, errors, and empty folders. Keep it usable on a laptop screen first.

Step 7 - Finish
Add a README with setup steps (create a venv, pip install -r requirements.txt, add the Groq key, set WORKSPACE_ROOT, run uvicorn main:app --reload, run the frontend) and one example Python bug to test with. Build and test the backend agent loop first, then the file routes, then the editor, then the review flow.

Write the code in a clear, direct style. Comments should read like a thoughtful developer wrote them, not documentation software. No robotic phrasing, and keep UI text short and specific to this tool.