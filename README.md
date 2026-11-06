# Learning AI Engineering

A hands-on learning repository for building AI applications with Python and the Groq API.

## What this repository covers

The current material is organized as a Week 1 learning series:

- **Day 1:** Make a basic chat completion request.
- **Day 2:** Use system prompts and adjust model temperature.
- **Day 3:** Inspect prompt, completion, and total token usage.
- **Day 4:** Request structured JSON output and validate it with Pydantic.

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

Repeat the `uv sync` command from `week1/day2`, `week1/day3`, or `week1/day4` when working on another lesson.

## Running the examples

Run the examples from the repository root:

```bash
uv run python week1/day1/hello_llm.py
uv run python week1/day2/sys_temp.py
uv run python week1/day3/tokens.py
uv run python week1/day4/json_pydantic.py
```

Because each day has its own environment, you can also run a script after changing into its directory:

```bash
cd week1/day1
uv run python hello_llm.py
```

## Project structure

```text
.
├── README.md
├── .gitignore
└── week1
    ├── day1
    │   ├── hello_llm.py
    │   └── pyproject.toml
    ├── day2
    │   ├── sys_temp.py
    │   └── pyproject.toml
    ├── day3
    │   ├── tokens.py
    │   └── pyproject.toml
    └── day4
        ├── json_pydantic.py
        └── pyproject.toml
```

## Security

Do not commit API keys or other secrets. Store `GROQ_API_KEY` in a local `.env` file. Environment files, virtual environments, caches, and build artifacts are excluded by `.gitignore`.

## License

This project is for learning and experimentation.
