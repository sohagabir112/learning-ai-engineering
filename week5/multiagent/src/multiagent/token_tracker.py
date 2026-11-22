"""Token usage tracking data structures."""

from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class TokenUsage:
    """Tracks token consumption across LLM calls."""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    requests_count: int = 0

    def add(self, usage: Any) -> None:
        """Add tokens from a Groq API usage object or dict."""
        if not usage:
            return
        if isinstance(usage, dict):
            p = usage.get("prompt_tokens", 0) or 0
            c = usage.get("completion_tokens", 0) or 0
            t = usage.get("total_tokens", 0) or 0
        else:
            p = getattr(usage, "prompt_tokens", 0) or 0
            c = getattr(usage, "completion_tokens", 0) or 0
            t = getattr(usage, "total_tokens", 0) or 0

        self.prompt_tokens += p
        self.completion_tokens += c
        self.total_tokens += (t if t else (p + c))
        self.requests_count += 1

    def combine(self, other: "TokenUsage") -> "TokenUsage":
        """Combine this TokenUsage with another and return a new instance."""
        return TokenUsage(
            prompt_tokens=self.prompt_tokens + other.prompt_tokens,
            completion_tokens=self.completion_tokens + other.completion_tokens,
            total_tokens=self.total_tokens + other.total_tokens,
            requests_count=self.requests_count + other.requests_count,
        )

    def to_dict(self) -> Dict[str, int]:
        return {
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "requests_count": self.requests_count,
        }

    def summary(self) -> str:
        return (
            f"Prompt: {self.prompt_tokens:,} | "
            f"Completion: {self.completion_tokens:,} | "
            f"Total: {self.total_tokens:,} | "
            f"Requests: {self.requests_count}"
        )
