# ReAct Shopping Agent

This lesson demonstrates a simple ReAct-style shopping assistant using the
Groq API. The agent reasons about a shopping question, calls one tool at a
time, receives an observation, and continues until it can provide a final
answer.

## What the example covers

- Looking up product prices with `get_product_price`
- Performing arithmetic with `calculator`
- Parsing model-generated `Action` instructions
- Returning tool results as `Observation` messages
- Maintaining the conversation between reasoning steps

The sample question asks how much money remains after buying an iPhone 17 with
a budget of 5,000 rupees.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- A [Groq API key](https://console.groq.com/keys)

## Setup

From this directory, install the project dependencies:

```powershell
uv sync
```

Create a `.env` file next to `react_chain.py`:

```text
GROQ_API_KEY=your_groq_api_key
```

Do not commit the `.env` file or your API key.

## Run

```powershell
uv run python react_chain.py
```

The agent uses the `openai/gpt-oss-120b` model and prints each reasoning step,
tool observation, and final answer.

## Available products

- `iPhone 17`: 1,000
- `macbook pro 2023`: 2,000