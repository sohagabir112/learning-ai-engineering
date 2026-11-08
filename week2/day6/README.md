# Prompt Engineering

This lesson demonstrates how prompt structure can improve the consistency of
an LLM's response. The example uses the Groq API to classify a customer
complaint into a predefined category.

## What the example covers

The prompt includes:

- A role for the assistant
- A clear classification task
- Allowed output categories
- An output-format constraint
- An example classification
- A fallback category for unsupported complaints

For the sample complaint, `My laptop is not working.`, the expected category
is `Technical Issue`.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- A [Groq API key](https://console.groq.com/keys)

## Setup

From this directory, install the project dependencies:

```powershell
uv sync
```

Create a `.env` file next to `prompt_engineering.py`:

```text
GROQ_API_KEY=your_groq_api_key
```

Do not commit the `.env` file or your API key.

## Run

```powershell
uv run python prompt_engineering.py
```

The script sends the structured prompt to the `openai/gpt-oss-120b` model and
prints the returned category.

## Experiment

Try changing the complaint in `good_prompt` and observe whether the model
returns one of these categories:

1. `Billing Issue`
2. `Technical Issue`
3. `Return`
4. `Other`