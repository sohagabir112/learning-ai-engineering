# Day 11: Retrieval-Augmented Generation

This example demonstrates a minimal retrieval-augmented generation (RAG)
workflow with Python and the Groq API.

## What it does

1. Stores a few facts in an in-memory knowledge base.
2. Retrieves context using simple keyword matching.
3. Sends the question and retrieved context to the Groq chat-completion API.
4. Prints a concise answer based only on the supplied context.

The example uses the `openai/gpt-oss-120b` model.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- A [Groq API key](https://console.groq.com/keys)

## Setup

Create a `.env` file in this directory:

```env
GROQ_API_KEY=your_groq_api_key
```

Install the project dependencies:

```bash
uv sync
```

## Run

```bash
uv run python rag.py
```

The default question is defined at the bottom of `rag.py`. Edit `question` or
add entries to `knowledge_base` to try different retrieval scenarios.

## Notes

This is a teaching example, not a production RAG pipeline. Retrieval is based
on keyword matching and the knowledge base is stored only in memory.

## Security

Do not commit `.env` or API keys. Keep `GROQ_API_KEY` in a local environment
file.