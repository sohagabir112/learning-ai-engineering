# HireMeAI

![HireMeAI candidate dashboard](https://img.shields.io/badge/HireMeAI-candidate%20workspace-5b53df)

HireMeAI is a full-stack resume assistant. The FastAPI backend extracts
structured candidate information from the bundled PDF using Groq, while the
React frontend presents the profile and provides an AI chat assistant grounded
in the parsed resume.

## Features

- Resume PDF text extraction and structured parsing
- Candidate profile with skills, experience, projects, and statistics
- Resume-based AI question answering
- Responsive React dashboard for desktop and mobile
- FastAPI validation, error responses, health checks, and interactive API docs

## Requirements

- Python 3.11+
- [uv](https://docs.astral.sh/uv/)
- Node.js 18+
- npm
- A [Groq API key](https://console.groq.com/keys)

## Configuration

Create a `.env` file in this directory:

```env
GROQ_API_KEY=your_groq_api_key
```

The frontend uses `http://127.0.0.1:8000` by default. To use another backend
address, create `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## Run locally

From `week2/hiremeai`, install backend dependencies and start the API:

```bash
uv sync
uv run uvicorn backend.main:app --reload
```

In a second terminal, install frontend dependencies and start the dashboard:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` to view the candidate dashboard.

## Production build

Build the frontend bundle with:

```bash
cd frontend
npm run build
```

## API

- `GET /health` checks that the service is running.
- `GET /` parses and returns the bundled resume.
- `GET /resume` returns the parsed resume object.
- `POST /chat` answers a question using the parsed resume:

```json
{"question": "What Python experience does the candidate have?"}
```

The chat request accepts questions from 1 to 2,000 characters. API failures
return an explicit error response instead of a fallback answer.

## Project structure

```text
hiremeai/
├── backend/
│   └── main.py
├── frontend/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       └── styles.css
├── README.md
├── pyproject.toml
└── uv.lock
```

The API automatically discovers the single PDF in `backend`, so the bundled
resume remains usable even when its filename contains invisible Unicode
characters.

## Security

Never commit `.env` files, API keys, or other credentials. The local
`.gitignore` excludes environment files, virtual environments, caches, and
frontend build output.