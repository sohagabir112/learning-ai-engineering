# Prompt Chaining

This lesson demonstrates prompt chaining with the Groq API. The script breaks
resume-to-job matching into three focused LLM calls:

1. Extract skills from a candidate resume.
2. Extract required skills from a job description.
3. Compare both skill lists and return a match score with a fit verdict.

The resume and job description are defined as sample text in
`prompt_chaining.py`. Update those values to experiment with different
candidates and roles.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- A [Groq API key](https://console.groq.com/keys)

## Setup

From this directory, install the project dependencies:

```powershell
uv sync
```

Create a `.env` file next to `prompt_chaining.py`:

```text
GROQ_API_KEY=your_groq_api_key
```

Do not commit the `.env` file or your API key.

## Run

```powershell
uv run python prompt_chaining.py
```

The script uses the `openai/gpt-oss-120b` model and prints the final score and
fit verdict returned by the third LLM call.