import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root or backend folder
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Workspace root where code files and projects live
env_root = os.getenv("WORKSPACE_ROOT")
if env_root:
    WORKSPACE_ROOT = Path(env_root).expanduser().resolve()
else:
    WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

MODEL = "openai/gpt-oss-120b"


def get_workspace_root() -> Path:
    """Returns the current active workspace root path."""
    global WORKSPACE_ROOT
    return WORKSPACE_ROOT


def set_workspace_root(new_path: str | Path) -> Path:
    """Dynamically updates the workspace root folder."""
    global WORKSPACE_ROOT
    p = Path(new_path).expanduser().resolve()
    if not p.exists() or not p.is_dir():
        raise ValueError(f"Directory '{new_path}' does not exist or is not a directory.")
    WORKSPACE_ROOT = p
    return WORKSPACE_ROOT
