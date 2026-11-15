"""Central configuration for the restaurant order agent."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class AgentConfig:
    """All tuneable knobs in one place."""

    # Attempt budgets
    order_attempts: int = 3
    cook_attempts: int = 2
    serve_attempts: int = 2

    # Success probabilities for stochastic nodes
    cook_success_probability: float = 0.8
    serve_success_probability: float = 0.8

    # LLM settings — resolved from env if not provided
    model_name: str = ""
    api_key: str = ""

    # Seed inventory (dish → stock count)
    default_inventory: dict[str, int] = field(default_factory=lambda: {
        "burger": 10,
        "pizza": 8,
        "pasta": 6,
        "salad": 5,
        "sushi": 0,       # always out of stock
        "steak": 2,       # low stock — exercises the insufficient branch
    })

    def resolved_model_name(self) -> str:
        return self.model_name or os.getenv("MODEL_NAME", "openai/gpt-oss-120b")

    def resolved_api_key(self) -> str:
        return self.api_key or os.getenv("GROQ_API_KEY", "")
