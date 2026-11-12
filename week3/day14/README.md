# Week 3, Day 14: Qdrant RAG

This example builds a retrieval-augmented generation (RAG) pipeline with:

- Qdrant Cloud for vector storage and similarity search
- `all-MiniLM-L6-v2` for 384-dimensional sentence embeddings
- Groq for generating an answer from the retrieved context

The script loads employee-policy statements from `knowledge.txt`, stores their
embeddings in a `knowledge` collection, retrieves the most relevant statements,
and sends them to Groq with the user's question.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- A Qdrant Cloud cluster and API key
- A [Groq API key](https://console.groq.com/keys)

## Configuration

Create `week3/day14/.env`:

```env
QDRANT_URL=https://your-cluster-id.region.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
GROQ_API_KEY=your_groq_api_key
```

For a local Qdrant server, use its URL and port instead:

```env
QDRANT_URL=http://localhost
QDRANT_PORT=6333
```

The script defaults to port `443` for HTTPS URLs and `6333` otherwise. Set
`QDRANT_PORT` explicitly when your deployment uses a non-default port.

## Run

From this directory:

```powershell
uv sync
uv run python .\quadrant.py
```

The first run downloads the embedding model from Hugging Face. The script
recreates the `knowledge` collection on each run, uploads the six statements
from `knowledge.txt`, performs a search, and prints the generated answer.

On Windows, use `uv run` or activate the project's `.venv` before running
`python` directly so the required dependencies are available.
