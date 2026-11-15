"""Graph state definition for the restaurant order agent."""

from __future__ import annotations

from typing import Annotated, Literal, TypedDict

from langgraph.graph import add_messages
from langchain_core.messages import AnyMessage


class OrderDetails(TypedDict, total=False):
    """Structured details about the current order."""

    dish_name: str | None
    required_quantity: int
    quantity: int  # units in stock at lookup time (0 when dish is not on the menu)
    availability_status: (
        Literal["available", "insufficient", "out_of_stock"] | None
    )


class AgentState(TypedDict, total=False):
    """Full state carried through the LangGraph StateGraph."""

    messages: Annotated[list[AnyMessage], add_messages]
    order_details: OrderDetails
    status: Literal[
        "idle",
        "received",
        "needs_user_input",
        "order_confirmed",
        "order_ready",
        "order_served",
        "order_completed",
        "failed_processing",
        "failed_cooking",
        "failed_serving",
    ]
    intent: Literal["place_order", "menu_question", "unrelated"] | None
    alternatives: list[str]
    error: str | None
    order_attempts_left: int
    cook_attempts_left: int
    serve_attempts_left: int


def new_turn_input(text: str, *, order_attempts: int = 3,
                   cook_attempts: int = 2, serve_attempts: int = 2) -> dict:
    """Build the input dict for a new customer message.

    Resets attempt counters and error while letting `messages` and
    `order_details` carry over via the checkpointer.
    """
    from langchain_core.messages import HumanMessage

    return {
        "messages": [HumanMessage(content=text)],
        "order_attempts_left": order_attempts,
        "cook_attempts_left": cook_attempts,
        "serve_attempts_left": serve_attempts,
        "error": None,
        "status": "idle",
    }
