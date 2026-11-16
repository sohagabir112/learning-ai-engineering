# Multi-Agent vs. Single Agent System (Groq + LangGraph)

This project implements and compares two agentic architectures:
1. **Single Agent System**: A monolithic agent using a single `ask_llm` function with Groq, equipped with two tools (Tavily Web Search and a Python Safe Calculator), running in a tool-calling loop capped at 5 attempts.
2. **Multi-Agent System (LangGraph)**: A hierarchical multi-agent graph with three dedicated `ask_llm` functions:
   - **Manager LLM** (`ask_manager`): Analyzes user intent, checks previous context from a persistent notes file (`manager_notes.txt`), coordinates worker agents, saves notes, and synthesizes final answers.
   - **Web Search Agent** (`ask_web_search_agent`): Performs focused web searches using Tavily API and synthesizes factual findings.
   - **Calculator Agent** (`ask_calculator_agent`): Evaluates exact mathematical computations using Python and returns structured numerical proofs.

---

## Architecture Overview

```
Single Agent System:
[User Query] --> [ask_llm (Groq)] <---> [Tavily Search / Python Calculator] (Max 5 Attempts)
                      |
                      v
                [Final Answer]

Multi-Agent System (LangGraph):
                [User Query]
                     |
                     v
             +---------------+ <---> [manager_notes.txt]
             |  Manager LLM  | (ask_manager)
             +---------------+
                /         \
   (needs web data)     (needs calculation)
              /             \
             v               v
   +------------------+   +-------------------+
   | Web Search Agent |   |  Calculator Agent |
   | (Tavily Search)  |   | (Python Calculator)
   | ask_web_search   |   | ask_calculator    |
   +------------------+   +-------------------+
             \               /
              \             /
               v           v
             +---------------+
             |  Manager LLM  | --> [Final Answer]
             +---------------+
```

---

## Project Structure

```
multiagent/
├── .env                     # API keys (GROQ_API_KEY, TAVILY_API_KEY, etc.)
├── manager_notes.txt        # Manager LLM persistent memory / notes file
├── comparison_report.md     # Auto-generated benchmark & token comparison report
├── pyproject.toml           # Project dependencies & build config
├── prompt.md                # Project specification & requirements
├── README.md                # Documentation
└── src/
    └── multiagent/
        ├── __init__.py      # Package exports
        ├── __main__.py      # CLI entrypoint
        ├── config.py        # Environment & model configuration
        ├── tools.py         # Tavily web search & Python safe calculator tools
        ├── token_tracker.py # Granular token tracking dataclass
        ├── notes_manager.py # Persistent notes reader & writer
        ├── single_agent.py  # Single agent loop (ask_llm, max 5 attempts)
        ├── multi_agent.py   # LangGraph workflow (3 ask_llm functions)
        ├── compare.py       # Benchmark runner on complex queries
        └── main.py          # Unified CLI interface
```

---

## Setup & Installation

Dependencies are managed using `uv`:

```bash
# Install dependencies from this directory
uv sync
```

Ensure `.env` contains:
```env
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

The application loads `.env` from the project directory and requires both API
keys at startup. Never commit `.env`, `manager_notes.txt`, or generated
benchmark output when they contain private data.

---

## Running the Systems

### 1. Run the Full Comparison Benchmark
Runs both systems on a complex multi-step query requiring both web search and multiple calculations, compares token usage, and writes a detailed markdown report:
```bash
uv run python -m multiagent --mode compare
```

### 2. Run Only Single Agent
```bash
uv run python -m multiagent --mode single --query "Find Apple and Microsoft stock prices and calculate their ratio."
```

### 3. Run Only Multi-Agent (LangGraph)
```bash
uv run python -m multiagent --mode multi --query "Find Apple and Microsoft stock prices and calculate their ratio."
```

The CLI also accepts `--model` to override `GROQ_MODEL` and `--report` to
choose a different output path for comparison reports:

```bash
uv run python -m multiagent --mode compare \
  --model openai/gpt-oss-120b \
  --report comparison_report.md
```

Run the commands from `week5/multiagent`, or use `uv run --directory
week5/multiagent ...` when starting from the repository root.

The default comparison query combines Tavily lookups for Apple and Microsoft
market data with difference, percentage, projection, and combined-growth
calculations. Pass `--query` to benchmark a different request. Because web
results and model responses are live, token counts, timing, and answers can
vary between runs.

---

## Key Features

- **Accurate Token Tracking**: Tracks prompt tokens, completion tokens, and total API requests for both systems, including individual agent breakdown in the multi-agent graph.
- **Persistent Notes File**: The Manager LLM remembers previous context across queries in `manager_notes.txt`, enabling it to reuse previously fetched knowledge and bypass redundant web searches.
- **Resilient Tool Loop**: Prevents infinite loops with bounded execution and supports both single-call and batch calculations (evaluating tuples or dictionaries of expressions in a single call).

## Token usage and reports

Each Groq response contributes prompt, completion, total-token, and request
counts to a `TokenUsage` tracker. The multi-agent run reports manager,
web-search, and calculator usage separately, then combines them for the total.
The comparison report also includes execution time, iteration counts, the final
answers, and the manager notes used during the run.

The calculator accepts arithmetic, percentages, common `math` functions, and
batch expressions such as dictionaries. It evaluates expressions in a
restricted environment; it should not be treated as a general-purpose Python
runtime.
