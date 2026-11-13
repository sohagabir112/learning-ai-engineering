# Web Search and Math Agent

A single-file AI agent that uses Groq to choose between two tools:

- **Web search:** Searches current information with the Tavily API.
- **Calculator:** Evaluates basic arithmetic expressions safely.

The agent uses the `openai/gpt-oss-120b` model and automatically selects the
appropriate tool for any input string.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- [Groq API key](https://console.groq.com/keys)
- [Tavily API key](https://app.tavily.com/)

## Setup

From this directory, install the dependencies:

```powershell
uv sync
```

Create a `.env` file in this directory:

```env
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
```

Never commit `.env` or expose either API key.

## Run

```powershell
uv run python aiagent.py
```

Enter any question or arithmetic expression when prompted:

```text
Ask anything: What is the capital of Japan?
Ask anything: (12 + 8) * 3
```

Arithmetic responses use a simple format:

```text
(12 + 8) * 3 = 60
```