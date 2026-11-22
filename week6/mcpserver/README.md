# Week 6: Model Context Protocol (MCP) Server

This project demonstrates how to build and deploy servers using the **Model Context Protocol (MCP)**—an open standard created by Anthropic that standardizes how AI applications and LLMs connect to external data sources, tools, and workflows.

This directory features two implementations:
1. **Python MCP Server (`mcpserver.py`)**: A lightweight tool server built with the official Python `mcp` SDK and managed by `uv`.
2. **Production TypeScript MCP Server (`email-drafter-mcp/`)**: A full-featured, persistent MCP server built with `@modelcontextprotocol/sdk`, Zod, and SQLite (`better-sqlite3`), providing 18 tools, 4 resources, 4 prompts, and bilingual support (English & Bangla) for professional email drafting.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       MCP Host / Client               |
                      |   (Claude Desktop, Cursor, Inspector) |
                      +-------------------+-------------------+
                                          |
                        JSON-RPC via stdio / SSE transport
                                          |
                +-------------------------+-------------------------+
                |                                                   |
                v                                                   v
   +---------------------------+                      +-----------------------------+
   |   Python MCP Server       |                      | TypeScript Email Drafter    |
   |   (mcpserver.py)          |                      | (email-drafter-mcp)         |
   +---------------------------+                      +-----------------------------+
   | - Tool: Abir_calculator   |                      | - 18 MCP Tools              |
   | - FastMCP / stdio runner  |                      | - 4 MCP Resources           |
   | - Custom math logic       |                      | - 4 MCP Prompts             |
   +---------------------------+                      | - SQLite DB (drafts.db)     |
                                                      | - 32 Built-in Templates     |
                                                      | - English & Bangla Support  |
                                                      +-----------------------------+
```

---

## Directory Structure

```text
mcpserver/
├── mcpserver.py            # Python MCP server definition and tool implementation
├── pyproject.toml          # Python project dependencies (mcp[cli])
├── uv.lock                 # Pinned Python dependency lockfile
├── README.md               # Documentation (this file)
├── src/
│   └── mcpserver/
│       └── __init__.py     # Package initialization
└── email-drafter-mcp/      # Production TypeScript MCP server project
    ├── src/
    │   ├── index.ts        # Server entrypoint and MCP setup
    │   ├── db.ts           # SQLite schema and database client
    │   ├── types.ts        # TypeScript types & Zod schemas
    │   ├── resources.ts    # MCP resource definitions
    │   ├── prompts.ts      # MCP prompt templates
    │   ├── templates/      # Built-in templates and template engine
    │   └── tools/          # 18 modular tool implementations
    ├── tests/              # Vitest unit and integration test suite
    ├── data/               # SQLite database directory (drafts.db)
    ├── package.json        # Node.js dependencies and scripts
    ├── tsconfig.json       # TypeScript compiler settings
    └── README.md           # Detailed documentation for email-drafter-mcp
```

---

## Part 1: Python MCP Server

The Python server (`mcpserver.py`) uses the official `mcp` SDK to register and expose tools via standard I/O (stdio).

### Implemented Tool: `Abir_calculator`

- **Parameters**:
  - `num1` (`float`): First operand
  - `num2` (`float`): Second operand
  - `operation` (`str`): Arithmetic operator (`+`, `-`, `*`, `/`)
- **Behavior**: Performs the calculation, guards against division by zero, and formats the output with a sample offset to verify server-side transformations.

### Setup & Requirements

- Python 3.11+
- [uv](https://docs.astral.sh/uv/)

From the `week6/mcpserver` directory:

```powershell
uv sync
```

### Running the Python Server

Run directly with `uv`:

```powershell
uv run python mcpserver.py
```

### Testing with MCP Developer Tools & Inspector

You can inspect the Python server using the built-in MCP CLI dev mode or the MCP Inspector:

```powershell
# Using MCP CLI Dev Mode
uv run mcp dev mcpserver.py

# Or using the MCP Inspector via npx
npx @modelcontextprotocol/inspector uv run python mcpserver.py
```

### Claude Desktop Integration (Python)

To connect this Python MCP server to Claude Desktop, add it to your `claude_desktop_config.json`:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "abir-calculator": {
      "command": "uv",
      "args": [
        "--directory",
        "C:\\Users\\sohag\\Learning AI Engineering\\week6\\mcpserver",
        "run",
        "python",
        "mcpserver.py"
      ]
    }
  }
}
```

---

## Part 2: TypeScript Production MCP Server (`email-drafter-mcp`)

The `email-drafter-mcp` subproject is a complete, production-ready MCP server designed for students and freelance developers to draft, refine, proofread, and store communications for teachers, clients, and teammates.

### Key Highlights

- **32 Built-in Templates**: Covers academic queries, freelance milestone updates, code review requests, and Bangla variants.
- **18 MCP Tools**: CRUD operations for drafts, custom templates, contacts, profile settings, tone rewrites, and a 7-point proofreading checklist.
- **4 MCP Resources**: Exposes `templates://all`, `templates://{category}`, `drafts://recent`, and `profile://me`.
- **4 MCP Prompts**: Pre-packaged workflows for `write_email`, `polish_email`, `reply_to_email`, and `weekly_client_update`.
- **Local SQLite Persistence**: Stores user profile, contacts, drafts, and custom templates in `./data/drafts.db`.
- **Zero Auto-Send**: Strictly an assistance and drafting tool—never transmits emails automatically.

### Setup & Build

- **Node.js 20+** and **npm**

```powershell
cd email-drafter-mcp
npm install
npm run build
```

### Running Tests

Run the Vitest test suite (22 unit & integration tests covering engine logic and tool handlers):

```powershell
npm test
```

### Testing with the MCP Inspector

Launch the interactive web UI to test tools, prompts, and resources:

```powershell
npx @modelcontextprotocol/inspector node dist/index.js
```

### Claude Desktop Integration (TypeScript)

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "email-drafter": {
      "command": "node",
      "args": [
        "C:\\Users\\sohag\\Learning AI Engineering\\week6\\mcpserver\\email-drafter-mcp\\dist\\index.js"
      ],
      "env": {
        "DB_PATH": "C:\\Users\\sohag\\Learning AI Engineering\\week6\\mcpserver\\email-drafter-mcp\\data\\drafts.db"
      }
    }
  }
}
```

For full documentation and tool references, see [email-drafter-mcp/README.md](file:///c:/Users/sohag/Learning%20AI%20Engineering/week6/mcpserver/email-drafter-mcp/README.md).

---

## Python vs. TypeScript for MCP

| Dimension | Python SDK (`mcp` / FastMCP) | TypeScript SDK (`@modelcontextprotocol/sdk`) |
| :--- | :--- | :--- |
| **Primary Use Case** | Rapid prototyping, AI/data workflows, scripting | Production servers, web developer tools, npm distribution |
| **Schema Definition** | Python type hints & Pydantic | Zod schemas |
| **Tool Registration** | Decorator-based (`@mcp.tool()`) | Explicit handler registration with Zod schemas |
| **Ecosystem Fit** | Data science, PyTorch, LangChain, Groq, local ML | Node.js utilities, Electron, desktop integrations |
| **Packaging** | `pyproject.toml` + `uv` / `pip` | `package.json` + `npm` / `pnpm` |

---

## Security & Best Practices

1. **Keep Secrets Local**: Store all API keys and environment variables in `.env` files. Never commit `.env` or database files containing private emails or contact details.
2. **Review Before Sending**: MCP tools can read data and draft text, but human-in-the-loop review ensures safe execution.
3. **Use Absolute Paths in Host Configs**: Claude Desktop runs servers as background processes; always provide absolute file and directory paths in `claude_desktop_config.json`.
