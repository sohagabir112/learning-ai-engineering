# Resume Parser

This project uses Groq and Pydantic to:

1. Extract structured requirements from a job description.
2. Parse PDF and DOCX resumes.
3. Score each resume against the job description.
4. Display the top and lowest-matching candidates.

## Requirements

- Python 3.11 or newer
- A Groq API key

## Setup

From this directory, install the dependencies with `uv`:

```powershell
uv sync
```

Create a `.env` file and add your API key:

```text
GROQ_API_KEY=your_groq_api_key
```

Do not commit the `.env` file or your API key.

## Add resumes

Place `.pdf` and `.docx` files in the `reumse` folder next to
`resume_parsered.py`.

## Run

```powershell
uv run python resume_parsered.py
```

The script sends requests to the configured Groq model and prints the
two highest-scoring and two lowest-scoring candidates.