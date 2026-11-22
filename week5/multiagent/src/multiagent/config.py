"""Configuration and environment settings for the multiagent project."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

# Default to openai/gpt-oss-120b, or fallback to openai/gpt-oss-20b or custom GROQ_MODEL
DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# Default notes file path for the manager agent
DEFAULT_NOTES_FILE = ROOT_DIR / "manager_notes.txt"

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is not set in .env file.")

if not TAVILY_API_KEY:
    raise ValueError("TAVILY_API_KEY is not set in .env file.")
