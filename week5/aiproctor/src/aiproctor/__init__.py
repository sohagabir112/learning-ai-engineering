"""AI Proctor — plagiarism & AI-generated code detection toolkit."""

from .analyzer import AIProctor
from .cli import main
from .config import Config

__all__ = ["AIProctor", "Config", "main"]
