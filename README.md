# Learning AI Engineering

A hands-on learning repository for building AI applications with Python and the Groq API.

## What this repository covers

The learning material is organized into weekly lessons.

### Week 1

- **Day 1:** Make a basic chat completion request.
- **Day 2:** Use system prompts and adjust model temperature.
- **Day 3:** Inspect prompt, completion, and total token usage.
- **Day 4:** Request structured JSON output and validate it with Pydantic.
- **Day 5:** Parse resumes and score candidates against a job description.

### Week 2

- **Day 6:** Use structured prompts to classify customer complaints with an
  LLM.
- **Day 7:** Build a ReAct-style shopping agent that uses price lookup and
  calculator tools.
- **Day 8:** Chain multiple LLM calls to extract resume and job-description
  skills, then score the candidate's fit.
- **Day 9:** Stream chat-completion responses from the Groq API.
- **HireMeAI:** Build a full-stack resume assistant with a FastAPI backend,
  Groq-powered resume parsing, and a React dashboard.

- **Week 3, Day 11:** Build a small retrieval-augmented generation (RAG)
  example with an in-memory knowledge base and Groq.
- **Week 3, Day 12:** Generate sentence embeddings and compare text similarity
  with cosine similarity.

Each day is an independent Python project with its own `pyproject.toml` and `uv.lock` file.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- A [Groq API key](https://console.groq.com/keys)

## Setup

Clone the repository and move into the project:

```bash
git clone https://github.com/sohagabir112/learning-ai-engineering.git
cd learning-ai-engineering
```

Create a `.env` file inside the day you want to run:

```env
GROQ_API_KEY=your_groq_api_key
```

Install dependencies for that day:

```bash
cd week1/day1
uv sync
```

Repeat the `uv sync` command from the directory of the lesson you want to run.

## Running the examples

Run the examples from the repository root:

```bash
uv run python week1/day1/hello_llm.py
uv run python week1/day2/sys_temp.py
uv run python week1/day3/tokens.py
uv run python week1/day4/json_pydantic.py
uv run python week2/day6/prompt_engineering.py
uv run python week2/day7/react_chain.py
uv run python week2/day8/prompt_chaining.py
uv run python week2/day9/streaming.py
uv run python week3/day11/rag.py
```

Day 5 requires PDF or DOCX resumes in `week1/day5/reumse` and a local
`.env` file containing `GROQ_API_KEY`:

```bash
cd week1/day5
uv sync
uv run python resume_parsered.py
```

Day 6 demonstrates prompt engineering with a structured complaint-classification
prompt:

```bash
cd week2/day6
uv sync
uv run python prompt_engineering.py
```

Day 7 demonstrates a ReAct-style shopping agent:

```bash
cd week2/day7
uv sync
uv run python react_chain.py
```

Day 8 demonstrates prompt chaining for resume-to-job matching:

```bash
cd week2/day8
uv sync
uv run python prompt_chaining.py
```

The script makes three sequential Groq API calls: it extracts candidate
skills, extracts job requirements, and compares the two lists to produce a
match score and fit verdict.

Day 9 demonstrates streaming responses from a chat completion:

```bash
cd week2/day9
uv sync
uv run python streaming.py
```

The script prints the model response as it arrives by passing `stream=True` to
`client.chat.completions.create`.

### Week 3, Day 11: RAG

The day 11 example retrieves matching information from a small knowledge base
before sending the question and context to the Groq chat-completion API. Run it
from the lesson directory:

```bash
cd week3/day11
uv sync
uv run python rag.py
```

The example uses the `openai/gpt-oss-120b` model and prints a one-line answer
to the question defined in `rag.py`. Update `knowledge_base` or `question` to
experiment with other retrieval cases.

### Week 3, Day 12: Embeddings

The day 12 example uses the `all-MiniLM-L6-v2` Sentence Transformers model to
generate embeddings for two sentences and calculate their cosine similarity.
Run it from the lesson directory so `uv` uses the project's dependencies:

```bash
cd week3/day12
uv sync
uv run python embed.py
```

You can also activate the project's virtual environment before using `python`
directly:

```powershell
.\.venv\Scripts\Activate.ps1
python .\embed.py
```

The first run downloads the embedding model from Hugging Face. On Windows,
using `uv run` or the activated `.venv` is important because a system Python
installation may not have NumPy or the other project dependencies installed.

### HireMeAI resume assistant

HireMeAI is a full-stack project in `week2/hiremeai`. It parses the bundled
resume PDF with Groq, displays the candidate profile in a React dashboard, and
provides an AI assistant for resume-based questions.

Start the backend from the project directory:

```bash
cd week2/hiremeai
uv sync
uv run uvicorn backend.main:app --reload
```

In a second terminal, start the frontend:

```bash
cd week2/hiremeai/frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The backend API documentation is available at
`http://127.0.0.1:8000/docs`.

Because each day has its own environment, you can also run any script after changing into its directory:

```bash
cd week1/day1
uv run python hello_llm.py
```

## Project structure

```text
.
├── README.md
├── .gitignore
├── week1
│   ├── day1
│   │   ├── hello_llm.py
│   │   └── pyproject.toml
│   ├── day2
│   │   ├── sys_temp.py
│   │   └── pyproject.toml
│   ├── day3
│   │   ├── tokens.py
│   │   └── pyproject.toml
│   ├── day4
│   │   ├── json_pydantic.py
│   │   └── pyproject.toml
│   └── day5
│       ├── resume_parsered.py
│       ├── reumse/
│       ├── README.md
│       └── pyproject.toml
├── week2
    ├── day6
    │   ├── prompt_engineering.py
    │   ├── README.md
    │   ├── pyproject.toml
    │   └── uv.lock
    ├── day7
    │   ├── react_chain.py
    │   ├── README.md
    │   ├── pyproject.toml
    │   └── uv.lock
    ├── day8
    │   ├── prompt_chaining.py
    │   ├── README.md
    │   ├── pyproject.toml
    │   └── uv.lock
    ├── day9
    │   ├── streaming.py
    │   ├── README.md
    │   ├── pyproject.toml
    │   └── uv.lock
    └── hiremeai
        ├── backend
        │   └── main.py
        ├── frontend
        │   ├── index.html
        │   ├── package.json
        │   └── src
        ├── README.md
        ├── pyproject.toml
        └── uv.lock
└── week3
    ├── day11
    │   ├── rag.py
    │   ├── README.md
    │   ├── pyproject.toml
    │   └── uv.lock
    └── day12
        ├── embed.py
        ├── README.md
        ├── pyproject.toml
        └── uv.lock
```

## Security

Do not commit API keys or other secrets. Store `GROQ_API_KEY` in a local `.env` file. Environment files, virtual environments, caches, and build artifacts are excluded by `.gitignore`.

## License

This project is for learning and experimentation.
