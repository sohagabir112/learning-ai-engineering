# Qdrant RAG Evaluation

This project builds and evaluates a retrieval-augmented generation (RAG)
pipeline using Qdrant Cloud, Sentence Transformers, and Groq.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- Qdrant Cloud URL and API key
- Groq API key

## Configuration

Create a `.env` file in this directory:

```env
QDRANT_URL=https://your-cluster-id.region.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
GROQ_API_KEY=your_groq_api_key
```

Do not commit real API keys.

## Run

From this directory, install the project dependencies and run the evaluation:

```powershell
uv sync
$env:PYTHONIOENCODING="utf-8"
uv run python .\rag_eva.py
```

The first run downloads the `all-MiniLM-L6-v2` model from Hugging Face.
The script creates 384-dimensional embeddings, recreates the `rag_eval`
collection, uploads the documents from `knowledge.json`, and prints the
retrieval and answer-quality scores.

The `PYTHONIOENCODING` setting prevents Windows `cp1252` terminal encoding
errors when the generated answer contains Unicode characters.