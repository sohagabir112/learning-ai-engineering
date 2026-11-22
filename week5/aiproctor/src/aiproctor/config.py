"""Configuration for AI Proctor."""

import os
from dataclasses import dataclass, field
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover – graceful fallback
    def load_dotenv(*_a, **_kw):  # type: ignore[misc]
        pass


# Load .env from project root
_project_root = Path(__file__).resolve().parents[2]
load_dotenv(_project_root / ".env")


@dataclass
class Config:
    """Central configuration for the AI Proctor system."""

    # Groq / OpenAI-compatible API settings
    groq_api_key: str = field(
        default_factory=lambda: os.environ.get("GROQ_API_KEY", "")
    )
    groq_base_url: str = "https://api.groq.com/openai/v1"
    model: str = "openai/gpt-oss-120b"

    # Detection thresholds
    plagiarism_threshold: float = 0.40
    ai_detection_threshold: float = 0.65

    def validate(self) -> None:
        """Raise if required settings are missing."""
        if not self.groq_api_key:
            raise ValueError(
                "GROQ_API_KEY is not set. "
                "Set it in the environment or in a .env file."
            )


# Module-level singleton for convenience
config = Config()
