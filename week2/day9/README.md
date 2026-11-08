# Streaming Chat Completions

This lesson demonstrates streaming responses from the Groq API. Instead of
waiting for the complete answer, the script prints each response chunk as it
arrives.

## What the example covers

- Sending a chat-completion request with `stream=True`
- Reading text from each streamed chunk
- Printing output immediately with `flush=True`

The sample prompt asks the model to explain how the internet works.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- A [Groq API key](https://console.groq.com/keys)

## Setup

From this directory, install the project dependencies:

```powershell
uv sync
```

Create a `.env` file next to `streaming.py`:

```text
GROQ_API_KEY=your_groq_api_key
```

Do not commit the `.env` file or your API key.

## Run

```powershell
uv run python streaming.py
```

The script uses the `openai/gpt-oss-120b` model and prints the response as it
is generated.