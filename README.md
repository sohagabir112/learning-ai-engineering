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
- **Week 3, Day 13:** Build a semantic-search RAG example that retrieves the
  most relevant employee-policy document and sends it to Groq with the user's
  question.
- **Week 3, Day 14:** Build a Qdrant-backed RAG pipeline that stores sentence
  embeddings, retrieves relevant employee-policy statements, and uses Groq to
  generate a grounded answer.
- **Week 3, Day 15:** Extend the Qdrant RAG pipeline with JSON documents,
  payload fields, keyword indexes, and category-filtered similarity search.
- **Week 4, Agent:** Build a Groq tool-calling agent with Tavily web search
  and safe basic arithmetic.
- **Week 4, LangGraph:** Build a conditional LangGraph workflow that doubles a
  number until it reaches 100, then finishes.
- **Week 4, Restaurant Order Agent:** Build a LangGraph order-management
  workflow that validates inventory, simulates cooking and serving, and
  retries bounded failures.
- **Week 5, Multiagent:** Compare a single Groq tool-calling agent with a
  LangGraph system that coordinates dedicated web-search and calculator agents,
  including token-usage tracking and persistent manager notes.
- **Week 5, AI Proctor:** Detect code similarity with MOSS-style fingerprints
  and analyze AI-generated code with structural heuristics and Groq.

Each lesson or project is an independent Python project with its own
`pyproject.toml` and, where applicable, `uv.lock` file.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- A [Groq API key](https://console.groq.com/keys)
- A [Tavily API key](https://app.tavily.com/) for the week 4 agent
- A Qdrant Cloud cluster and API key for days 14 and 15

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
uv run python week3/day13/fullRag.py
uv run --directory .\week5\multiagent python -m multiagent --mode compare
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

### Week 3, Day 13: Semantic-search RAG

The day 13 example embeds a small set of employee-policy documents with
`all-MiniLM-L6-v2`, compares the question embedding with each document using
cosine similarity, and retrieves the highest-scoring document. The retrieved
document is then included in the Groq prompt so the answer is grounded in the
matching policy.

Run it from the lesson directory:

```bash
cd week3/day13
uv sync
uv run python fullRag.py
```

The first run downloads the embedding model from Hugging Face. The script also
requires `GROQ_API_KEY` in `week3/day13/.env`.

### Week 3, Day 14: Qdrant RAG

The day 14 example stores embeddings generated by `all-MiniLM-L6-v2` in a
Qdrant collection, retrieves the most relevant employee-policy statements, and
passes the retrieved context to Groq.

Create `week3/day14/.env` with:

```env
QDRANT_URL=https://your-cluster-id.region.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
GROQ_API_KEY=your_groq_api_key
```

Run it from the lesson directory:

```bash
cd week3/day14
uv sync
uv run python quadrant.py
```

For a local Qdrant server, set `QDRANT_URL=http://localhost` and
`QDRANT_PORT=6333`. HTTPS Qdrant Cloud URLs default to port `443`; local URLs
default to port `6333`. The script recreates the `knowledge` collection on
each run and loads the documents from `knowledge.txt`.

### Week 3, Day 15: Filtered Qdrant RAG

The day 15 example loads structured employee-policy records from
`knowledge.json`, stores their 384-dimensional embeddings in the
`knowledge_filter` collection, and adds `text`, `category`, and `is_active`
payload fields. It creates a keyword index for `category` and demonstrates a
filtered search for reimbursement policies before running the final vacation
question through Groq.

Create `week3/day15/.env` with:

```env
QDRANT_URL=https://your-cluster-id.region.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
GROQ_API_KEY=your_groq_api_key
```

Run it from the lesson directory:

```bash
cd week3/day15
uv sync
uv run python fullQudrant.py
```

For a local Qdrant server, set `QDRANT_URL=http://localhost` and
`QDRANT_PORT=6333`. HTTPS Qdrant Cloud URLs default to port `443`; local URLs
default to port `6333`. Each run recreates the `knowledge_filter` collection,
so existing points in that collection are replaced.

### Week 4: Qdrant RAG evaluation

The `week4/rag_eva` project evaluates a Qdrant-backed RAG pipeline. It
generates 384-dimensional embeddings with
`all-MiniLM-L6-v2`, uploads the knowledge documents to Qdrant, retrieves
relevant context, and evaluates the generated answers with Groq.

Create `week4/rag_eva/.env` with:

```env
QDRANT_URL=https://your-cluster-id.region.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
GROQ_API_KEY=your_groq_api_key
```

Run it from the project directory:

```powershell
cd week4/rag_eva
uv sync
$env:PYTHONIOENCODING="utf-8"
uv run python .\rag_eva.py
```

The first run downloads the Sentence Transformers model from Hugging Face.
Each run recreates the `rag_eval` collection and uploads the documents from
`knowledge.json`.

### Week 4: Web search and math agent

The `week4/agent` project is a single-file Groq agent with two tools. It uses
Tavily for web searches and a safe expression evaluator for basic arithmetic.
Groq automatically chooses the appropriate tool for each input.

Create `week4/agent/.env` with:

```env
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
```

Run it from the agent directory:

```powershell
cd week4/agent
uv sync
uv run python aiagent.py
```

Arithmetic answers use a simple format such as
`(12 + 8) * 3 = 60`. Never commit the `.env` file or API keys.

### Week 4: LangGraph conditional workflow

The `week4/langChain` project demonstrates a small LangGraph state machine. It
doubles the starting number while it is below 100, then transitions to a
finishing node.

Run it from the repository root:

```powershell
uv run --directory .\week4\langChain python .\langchain.py
```

The example starts with `5` and finishes with `160`.

### Week 4: Restaurant order agent

The `week4/restproject` project uses LangGraph to manage a restaurant order
from customer intake through inventory confirmation, cooking, and serving.
Each stage has bounded retries, and the in-memory inventory repository prevents
orders from reserving unavailable stock.

Create `week4/restproject/.env` with:

```env
GROQ_API_KEY=your_groq_api_key
MODEL_NAME=openai/gpt-oss-120b
```

Run the interactive CLI from the project directory:

```powershell
cd week4/restproject
uv sync
uv run restproject
```

The project also includes an offline test suite:

```powershell
uv run pytest tests/ -v
```

### Week 5: Single-agent and multi-agent comparison

The `week5/multiagent` project compares two implementations for requests that
combine current web data with calculations:

- The single-agent system uses one Groq `ask_llm` function with Tavily web
  search and a safe Python calculator, with a maximum of five attempts.
- The LangGraph system uses a manager plus dedicated web-search and calculator
  agents. The manager can persist useful context in `manager_notes.txt`.
- Both systems record prompt, completion, total tokens, request counts, and
  execution time. The comparison writes a detailed report to
  `week5/multiagent/comparison_report.md`.

Create `week5/multiagent/.env` with:

```env
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

Run the benchmark from the repository root:

```powershell
uv run --directory .\week5\multiagent python -m multiagent --mode compare
```

You can also run one system directly:

```powershell
uv run --directory .\week5\multiagent python -m multiagent --mode single --query "What is 15 percent of 840?"
uv run --directory .\week5\multiagent python -m multiagent --mode multi --query "What is 15 percent of 840?"
```

The default comparison query asks for current Apple and Microsoft market data,
then calculates differences, percentages, growth projections, and a combined
total. Market data changes over time, so token counts and generated answers may
vary between runs.

### Week 5: AI Proctor

The `week5/aiproctor` project provides both a Streamlit dashboard and a CLI
for code-integrity analysis. It compares submissions with MOSS-style
winnowing fingerprints and Jaccard similarity, and combines structural
heuristics with Groq analysis to identify AI-generated code patterns.

Create `week5/aiproctor/.env` with:

```env
GROQ_API_KEY=your_groq_api_key
```

Install dependencies and launch the dashboard:

```powershell
cd week5/aiproctor
uv sync
uv run streamlit run src/aiproctor/app.py
```

Run CLI analysis against the bundled samples:

```powershell
uv run python -m aiproctor.cli plagiarism samples/student_a_sorting.py samples/student_b_sorting.py
uv run python -m aiproctor.cli ai-detect samples/ai_generated_calculator.py
uv run python -m aiproctor.cli full samples/student_a_sorting.py samples/student_b_sorting.py samples/student_c_sorting.py
```

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
├── week3
    ├── day11
    │   ├── rag.py
    │   ├── README.md
    │   ├── pyproject.toml
    │   └── uv.lock
    ├── day12
    │   ├── embed.py
    │   ├── README.md
    │   ├── pyproject.toml
    │   └── uv.lock
    └── day13
        ├── fullRag.py
        ├── README.md
        ├── pyproject.toml
        └── uv.lock
    ├── day14
        ├── quadrant.py
        ├── knowledge.txt
        ├── README.md
        ├── pyproject.toml
        └── uv.lock
    └── day15
        ├── fullQudrant.py
        ├── knowledge.json
        ├── README.md
        ├── pyproject.toml
        └── uv.lock
├── week4
    ├── agent
    │   ├── aiagent.py
    │   ├── README.md
    │   ├── pyproject.toml
    │   └── uv.lock
    ├── langChain
    │   ├── langchain.py
    │   ├── README.md
    │   ├── pyproject.toml
    │   └── uv.lock
    ├── restproject
    │   ├── src/restproject
    │   ├── tests
    │   ├── README.md
    │   ├── pyproject.toml
    │   └── uv.lock
    └── rag_eva
        ├── rag_eva.py
        ├── knowledge.json
        ├── README.md
        ├── pyproject.toml
        └── uv.lock
└── week5
    ├── aiproctor
    │   ├── samples
    │   ├── src/aiproctor
    │   ├── README.md
    │   ├── pyproject.toml
    │   └── uv.lock
    └── multiagent
        ├── src/multiagent
        ├── manager_notes.txt
        ├── comparison_report.md
        ├── README.md
        ├── prompt.md
        ├── pyproject.toml
        └── uv.lock
```

## Security

Do not commit API keys or other secrets. Store `QDRANT_API_KEY` and
`GROQ_API_KEY` in a local `.env` file. Environment files, virtual environments,
caches, and build artifacts are excluded by `.gitignore`.

## License

This project is for learning and experimentation.
