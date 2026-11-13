# LangGraph conditional workflow

This project demonstrates a small conditional workflow built with
[LangGraph](https://langchain-ai.github.io/langgraph/). The workflow starts
with the number `5`, doubles it while it is below `100`, and then finishes.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)

## Run

From this directory:

```powershell
uv sync
uv run python .\langchain.py
```

Or run it from the repository root:

```powershell
uv run --directory .\week4\langChain python .\langchain.py
```

## Expected output

```text
Doubling 5 to get 10
Doubling 10 to get 20
Doubling 20 to get 40
Doubling 40 to get 80
Doubling 80 to get 160
Finishing with number 160
```

Change the initial value in `langchain.py` to experiment with different
workflow paths.