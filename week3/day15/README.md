# Week 3, Day 15: Filtered Qdrant RAG

This example extends the Day 14 RAG pipeline with structured JSON documents
and payload filtering:

- Qdrant Cloud for vector storage and filtered similarity search
- `all-MiniLM-L6-v2` for 384-dimensional sentence embeddings
- Payload fields for `text`, `category`, and `is_active`
- Groq for generating an answer from retrieved context

The script loads employee-policy records from `knowledge.json`, recreates the
`knowledge_filter` collection, creates a keyword index for `category`, uploads
the embeddings and payloads, and demonstrates a reimbursement-category filter.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- A Qdrant Cloud cluster and API key
- A [Groq API key](https://console.groq.com/keys)

## Configuration

Create `week3/day15/.env`:

```env
QDRANT_URL=https://your-cluster-id.region.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
GROQ_API_KEY=your_groq_api_key
```

For a local Qdrant server:

```env
QDRANT_URL=http://localhost
QDRANT_PORT=6333
```

The script uses port `443` for HTTPS URLs and `6333` otherwise unless
`QDRANT_PORT` is set explicitly.

## Run

From the day15 directory:

```powershell
uv sync
uv run python .\fullQudrant.py
```

From the repository root:

```powershell
Set-Location .\week3\day15
uv sync
uv run python .\fullQudrant.py
```

The script expects `knowledge.json` in the current working directory. Each
run deletes and recreates the `knowledge_filter` collection.

The demonstration search applies the `reimbursement` category filter and
returns the two reimbursement records. The final RAG search runs without that
filter so the vacation-policy record can be retrieved.
