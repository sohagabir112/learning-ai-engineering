# Day 12: Sentence Embeddings

This example generates sentence embeddings with Sentence Transformers and
compares two sentences using cosine similarity.

## What it does

1. Loads the `all-MiniLM-L6-v2` sentence-transformer model.
2. Converts two text strings into numerical embedding vectors.
3. Calculates and prints their cosine similarity.

The example compares:

```text
There are 24 paid leaves
There are 24 vacation days
```

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)

## Setup

Install the project dependencies from this directory:

```bash
uv sync
```

## Run

Use the project environment:

```bash
uv run python embed.py
```

On Windows, you can alternatively activate the virtual environment first:

```powershell
.\.venv\Scripts\Activate.ps1
python .\embed.py
```

Do not use a different system Python installation directly unless it has the
project dependencies installed. Otherwise, errors such as
`ModuleNotFoundError: No module named 'numpy'` may occur.

The first run downloads `all-MiniLM-L6-v2` from Hugging Face. The output is a
cosine similarity score between the two sentences.

## Notes

Cosine similarity measures how close two embedding vectors are in direction.
Higher values generally indicate more similar sentence meaning, although the
score depends on the embedding model and the input text.