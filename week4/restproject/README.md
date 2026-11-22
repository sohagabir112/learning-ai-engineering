# Restaurant Order Agent

A LangGraph-based restaurant order-management agent. It takes customer chat
messages, confirms orders against inventory, then simulates cooking and
serving with bounded retries at every stage.

The CLI keeps conversation state for the current session and uses an
in-memory inventory seeded with burgers, pizza, pasta, salad, sushi, and steak.
Sushi starts out of stock, while steak has limited stock so both inventory
branches can be exercised interactively.

## Setup

```bash
# Install dependencies (uses uv)
uv sync

# Set your Groq API key
echo "GROQ_API_KEY=your_key_here" > .env

# Optionally set a different model
echo "MODEL_NAME=openai/gpt-oss-120b" >> .env
```

## Run the CLI

```bash
uv run python -m restproject.cli
```

Or via the package entry point:

```bash
uv run restproject
```

The CLI prints the available menu and inventory, then accepts messages such as
`I would like two burgers`. Type `quit`, `exit`, or `bye` to stop.

## Run the Tests

Tests run fully offline — the LLM is stubbed and all randomness is injected.

```bash
uv run pytest tests/ -v
```

The tests cover unrelated requests, successful orders, insufficient stock,
out-of-stock items, bounded cooking and serving retries, and inventory
rollback behavior. They do not require a Groq API key.

## Architecture

```
src/restproject/
├── config.py       # AgentConfig dataclass — all tuneable knobs
├── state.py        # AgentState TypedDict + new_turn_input helper
├── inventory.py    # Thread-safe in-memory InventoryRepository
├── prompts.py      # System prompts for intake and respond nodes
├── nodes.py        # Node functions (intake, order_confirmation, respond, cook, serve, etc.)
├── routing.py      # Conditional-edge routing functions
├── graph.py        # build_graph() — assembles and compiles the StateGraph
├── cli.py          # Interactive terminal chat loop
├── simulate.py     # run_scenario() for scripted test scenarios
└── __init__.py
tests/
└── test_graph.py   # Offline pytest suite covering all acceptance criteria
```

The workflow uses these stages:

1. **Intake** extracts the customer intent, dish, and quantity.
2. **Order confirmation** checks and reserves inventory.
3. **Cook** and **serve** simulate downstream operations with bounded retries.
4. **Respond** returns the current status to the customer.

## Assumptions

- **`quantity` vs `required_quantity`**: `required_quantity` is what the customer asked for; `quantity` is what was in stock at lookup time (used to tell the customer "only N left").
- **Attempt budgets 3/2/2**: Order processing gets 3 attempts, cook gets 2, serve gets 2. Only technical failures (LLM errors, inventory exceptions) consume order-processing attempts.
- **Stock release on cook failure only**: Reserved stock is returned to inventory when cooking fails permanently. If serving fails permanently, stock stays consumed (the food was cooked).
- **One dish per order**: Multi-dish orders are out of scope for v1.
- **CLI as the UI**: A terminal chat loop with one graph invocation per customer message and `InMemorySaver` for state persistence within a session.

## Configuration

`MODEL_NAME` defaults to `openai/gpt-oss-120b`. Set it in `.env` to use a
different Groq-compatible model. `GROQ_API_KEY` is required for the CLI, but
the offline test suite injects a stub LLM and does not call Groq.
