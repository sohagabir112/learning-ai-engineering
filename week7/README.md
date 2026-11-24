# 🛒 Electronics Shop — Order History Agent

A single-file AI agent built with the **Groq API** (`openai/gpt-oss-120b`), complete with **observability**, **guardrails**, and an **evaluation suite**.

## ✨ Features

- **Order History Lookup (`get_order_history`)**: Searches 14 demo orders across 10 customers by customer name and/or order ID (`ORD-XXXX`).
- **Formatted Terminal Tables**: Displays order results with status icons (`✅ Delivered`, `🚚 Out for Delivery`, `⏳ Pending`, `❌ Canceled`) using `tabulate`.
- **Observability & Tracing**: Logs every request with a unique `trace_id`, UTC timestamp, per-LLM-call token usage, latency (ms), estimated USD cost, tool call arguments/results/latency, and persists traces to `traces.jsonl`.
- **3-Layer Guardrails**:
  1. **Multi-order / Ownership Verification**: Refuses to dump all orders if multiple orders exist for a customer name (requires `order_id`), and verifies `customer_name` + `order_id` ownership so another customer's order is never exposed.
  2. **Strict Scope Enforcement**: Classifies inputs with `openai/gpt-oss-20b` and refuses anything outside order history enquiries.
  3. **Illegal Topic Auto-Termination**: Detects cybersecurity/malware/sexual content via regex + classifier and automatically terminates the chat session.
- **Evaluation Suite (`eval.py`)**: 10 automated test cases (5 functional + 5 adversarial) testing accuracy, tool calling, off-topic refusal, prompt injection, and edge cases.

## 📁 Project Structure

```text
week7/
├── agent.py          # Single-file agent (LLM, tool, guardrails, observability, CLI)
├── eval.py           # 10-case evaluation suite (functional + adversarial)
├── pyproject.toml    # Project metadata & dependencies (groq, python-dotenv, tabulate)
├── .env              # Environment variables (GROQ_API_KEY)
├── traces.jsonl      # Auto-generated JSONL trace log per request
└── README.md         # This file
```

## ⚙️ Setup & Installation

Make sure you have [`uv`](https://docs.astral.sh/uv/) installed and a `.env` file containing your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Sync dependencies:

```bash
cd week7
uv sync
```

## 🚀 Usage

### Run the Agent

```bash
uv run python agent.py
```

Example queries:
- `Bob Hossain` (single order — returns directly)
- `Alice Rahman` (multiple orders — prompts for specific `ORD-XXXX`)
- `Alice Rahman, ORD-7391` (verified match — displays order table)
- `Type quit or exit` to leave.

### Run the Evaluation Suite

```bash
uv run python eval.py
```

## 📊 Observability Output

Each request prints a structured trace summary and appends it to `traces.jsonl`:

```text
────────────────────────────────────────────────────────────
🔍 TRACE  | ID: tr-a003404c  | Time: 2026-11-24T18:27:24.136204+00:00
📝 Input  | i am Diana Sultana and my order id is ORD-8812
────────────────────────────────────────────────────────────
Call      In Tokens    Out Tokens  Latency    Est. Cost
------  -----------  ------------  ---------  -----------
LLM #1          658            40  342.0 ms   $0.000123
LLM #2          780            40  349.4 ms   $0.000141

Tool                        Arguments                                                   Result                                                           Latency
--------------------------  ----------------------------------------------------------  ---------------------------------------------------------------  ---------
Tool #1: get_order_history  {"customer_name": "Diana Sultana", "order_id": "ORD-8812"}  [ { "order_id": "ORD-8812", "customer_name": "Diana Sultana"...  0.15 ms
────────────────────────────────────────────────────────────
📊 TOTAL  | Cost: $0.000264  | Latency: 1227.1 ms  | Tokens: 1438 in / 80 out
────────────────────────────────────────────────────────────
```
