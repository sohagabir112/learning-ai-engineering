# VS Code-Style AI Bug-Fixing Coding Agent

A web-based IDE modeled after VS Code with an autonomous bug-fixing AI agent. You can open any project folder on your machine, browse files, write and edit code in Monaco (the editor powering VS Code), run your code in an integrated terminal, and ask an AI agent to fix bugs.

The agent investigates the root cause using codebase search and targeted file inspection tools, and proposes an exact diff replacing only the broken lines. The fix is displayed side-by-side in Monaco's Diff Editor for review—**nothing is written to disk until you explicitly click Accept**.

Powered by:
- **Backend:** FastAPI, Python 3.11+, official Groq SDK with `openai/gpt-oss-120b` (function calling & SSE streaming).
- **Frontend:** React 19, Vite, Tailwind CSS, `@monaco-editor/react`, Lucide icons.
- **Security:** Strict path sandboxing inside `WORKSPACE_ROOT`, blocked access to `.env` and `.git`, and a 30-line patch ceiling.

---

## What's New

1. **Folder Selection ("Open Folder"):**
   - Click the **Open Folder** button in the top bar or file explorer header (or press `Ctrl+Shift+P` -> *File: Open Folder...*).
   - Enter/paste any directory path (such as `sample_project` or any project on your computer) or browse subfolders.
   - The entire IDE switches to that folder as its active workspace root.

2. **Run Code & Integrated Terminal Panel:**
   - Click **▶ Run** in the editor toolbar or press **F5** to run the active Python or JavaScript file.
   - A VS Code-style Terminal drawer slides up at the bottom showing command execution, stdout, and formatted errors/tracebacks in real time.
   - If an error occurs (such as `ZeroDivisionError`), click **"✨ Fix with AI Agent"** directly in the terminal to have the agent analyze and repair the error!

3. **Always-Visible Copilot Agent Panel:**
   - The agent panel automatically opens and stays active whenever the agent is analyzing or waiting for your review.
   - When collapsed, a sleek vertical **"Copilot Agent"** strip on the right allows reopening it instantly with a single click.

---

## Setup & Running

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- A Groq API key ([console.groq.com](https://console.groq.com/keys))

### 2. Backend Setup

```bash
# In the root repository folder:
python -m venv .venv

# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux / macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment variables in .env
cp backend/.env.example .env
```

Edit `.env`:
```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
WORKSPACE_ROOT=.
```

Start the FastAPI backend:
```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Frontend Setup

In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## Example Walkthrough: Fixing a Bug

1. Open `http://localhost:5173`.
2. Click **Open Folder** and select `sample_project` (or click `calculator.py` in the explorer).
3. Click the green **▶ Run** button (or press **F5**):
   - The terminal drawer opens at the bottom showing:
     ```
     $ python calculator.py
     Testing calculator...
     10 / 2 = 5.0
     ZeroDivisionError: division by zero
     ```
4. Click the **"✨ Fix with AI Agent"** button inside the terminal:
   - The AI Agent panel opens on the right.
   - The agent inspects `calculator.py` lines 17-19 using its tools.
   - It proposes a clean replacement patch.
5. The Monaco **Diff Review** opens side-by-side:
   - Left: original broken division.
   - Right: proposed fix returning `0.0` or handling zero divisor.
   - Explanation banner: *"Why this fix: ..."*
6. Click **Accept Fix**:
   - The patch is written to disk.
   - An automatic `.bak` backup copy is saved.
   - The editor reloads and highlights the changed lines.
7. Click **▶ Run** again in the editor:
   - Terminal shows:
     ```
     Testing calculator...
     10 / 2 = 5.0
     10 / 0 = 0.0
     [Process completed with exit code 0]
     ```
8. Click **Undo** anytime to restore the `.bak` file.
