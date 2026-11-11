# Week 3, Day 13: Semantic-search RAG

This lesson builds a small retrieval-augmented generation (RAG) example for
employee policies.

## What it demonstrates

1. Encode policy documents and the user's question with
   `all-MiniLM-L6-v2`.
2. Compare the question with every document using cosine similarity.
3. Select the highest-scoring document.
4. Send both the question and retrieved context to the Groq chat-completion
   API.

The retrieved context is included explicitly in the user message, so the
model can answer from the relevant policy instead of relying only on its
general knowledge.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- A [Groq API key](https://console.groq.com/keys)

## Setup and run

Create `.env` in this directory:

```env
GROQ_API_KEY=your_groq_api_key
```

Install the lesson dependencies and run the example:

```bash
uv sync
uv run python fullRag.py
```

The first run downloads the sentence-transformers model from Hugging Face.
Change `query` in `fullRag.py` to try other questions about the policy
documents.