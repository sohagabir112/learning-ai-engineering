"""Graph nodes — each returns a partial state update, never mutates state."""

from __future__ import annotations

import logging
from typing import Any, Callable

from langchain_core.messages import AIMessage, AnyMessage
from pydantic import BaseModel, Field

from .inventory import InventoryRepository, InventoryError
from .prompts import INTAKE_SYSTEM_PROMPT, RESPOND_SYSTEM_PROMPT
from .state import AgentState, OrderDetails

logger = logging.getLogger("restaurant_agent")


# ---------------------------------------------------------------------------
# Pydantic model for structured LLM output from the intake node
# ---------------------------------------------------------------------------

class IntakeExtraction(BaseModel):
    """Structured output the LLM must return from the intake node."""

    intent: str = Field(
        description='One of "place_order", "menu_question", or "unrelated".'
    )
    dish_name: str | None = Field(
        default=None, description="Dish the customer wants, or null."
    )
    quantity: int | None = Field(
        default=None, description="How many units, or null."
    )


# ---------------------------------------------------------------------------
# Fallback templates when the respond LLM call fails
# ---------------------------------------------------------------------------

_FALLBACK_TEMPLATES: dict[str, str] = {
    "order_confirmed": "Your order has been confirmed!",
    "needs_user_input": (
        "We couldn't fully process your request right now. "
        "Could you try a different dish or quantity?"
    ),
    "order_ready": "Order Ready — your food is prepared!",
    "order_served": "Order Served — enjoy your meal!",
    "order_completed": "Order Completed — thank you for dining with us!",
    "failed_processing": (
        "Sorry, we hit a snag processing your order. Please try again later."
    ),
    "failed_cooking": (
        "Sorry, something went wrong in the kitchen. Please try again later."
    ),
    "failed_serving": (
        "Sorry, we couldn't get your order to you. Please try again later."
    ),
    "menu_question": "Here's our menu! Feel free to order whenever you're ready.",
    "unrelated": (
        "I'm here to help with restaurant orders — "
        "let me know if you'd like to see the menu or place an order!"
    ),
    "idle": "Welcome! What can I get for you today?",
}


def _get_fallback(status: str) -> str:
    return _FALLBACK_TEMPLATES.get(status, _FALLBACK_TEMPLATES["idle"])


# ---------------------------------------------------------------------------
# Helper: build the FACTS block that the respond node feeds to the LLM
# ---------------------------------------------------------------------------

def _build_facts(state: AgentState, inventory: InventoryRepository) -> str:
    od: OrderDetails = state.get("order_details", {})
    lines = [
        f"intent: {state.get('intent')}",
        f"status: {state.get('status')}",
        f"dish_name: {od.get('dish_name')}",
        f"required_quantity: {od.get('required_quantity', 0)}",
        f"stock_at_lookup: {od.get('quantity', 0)}",
        f"availability_status: {od.get('availability_status')}",
        f"alternatives: {state.get('alternatives', [])}",
        f"error: {state.get('error')}",
        f"menu: {list(inventory.snapshot().keys())}",
        f"menu_stock: {inventory.snapshot()}",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Recent message window — keep context manageable
# ---------------------------------------------------------------------------

def _recent_messages(messages: list[AnyMessage], window: int = 10) -> list[AnyMessage]:
    return messages[-window:]


# ===================================================================
# NODE: intake  (LLM, structured output)
# ===================================================================

def make_intake_node(llm: Any) -> Callable[[AgentState], dict]:
    """Return the intake node function, closed over the injected LLM."""

    structured_llm = llm.with_structured_output(IntakeExtraction)

    def intake(state: AgentState) -> dict:
        thread_id = state.get("thread_id", "?")
        logger.info("node=intake thread=%s status=%s order_attempts_left=%s",
                     thread_id, state.get("status"), state.get("order_attempts_left"))
        try:
            od: OrderDetails = state.get("order_details", {})
            context_msg = (
                f"Previous order_details: dish_name={od.get('dish_name')}, "
                f"quantity={od.get('required_quantity')}"
            )
            result: IntakeExtraction = structured_llm.invoke(
                [
                    ("system", INTAKE_SYSTEM_PROMPT),
                    ("system", context_msg),
                ] + _recent_messages(state.get("messages", []))
            )

            # Validate intent value
            valid_intents = {"place_order", "menu_question", "unrelated"}
            if result.intent not in valid_intents:
                raise ValueError(f"Invalid intent {result.intent!r}")

            # Build the order_details update — always return the full dict
            new_od: OrderDetails = {
                "dish_name": result.dish_name if result.intent == "place_order" else od.get("dish_name"),
                "required_quantity": result.quantity if result.intent == "place_order" and result.quantity else od.get("required_quantity", 0),
                "quantity": od.get("quantity", 0),
                "availability_status": od.get("availability_status"),
            }

            update: dict = {
                "intent": result.intent,
                "order_details": new_od,
                "error": None,
            }

            if result.intent == "place_order":
                if result.dish_name and result.quantity:
                    update["status"] = "received"
                else:
                    # Missing dish or quantity — ask the customer
                    update["status"] = "needs_user_input"
            elif result.intent == "menu_question":
                update["status"] = "idle"
            else:
                update["status"] = "idle"

            return update

        except Exception as exc:
            logger.warning("intake LLM error: %s", exc)
            attempts = state.get("order_attempts_left", 0) - 1
            return {
                "order_attempts_left": max(attempts, 0),
                "error": str(exc),
                "status": "failed_processing" if attempts <= 0 else state.get("status", "idle"),
                "order_details": state.get("order_details", {
                    "dish_name": None, "required_quantity": 0,
                    "quantity": 0, "availability_status": None,
                }),
                "intent": state.get("intent"),
            }

    return intake


# ===================================================================
# NODE: order_confirmation  (deterministic)
# ===================================================================

def make_order_confirmation_node(
    inventory: InventoryRepository,
) -> Callable[[AgentState], dict]:
    """Return the order_confirmation node, closed over the inventory."""

    def order_confirmation(state: AgentState) -> dict:
        thread_id = state.get("thread_id", "?")
        logger.info("node=order_confirmation thread=%s status=%s order_attempts_left=%s",
                     thread_id, state.get("status"), state.get("order_attempts_left"))
        try:
            od: OrderDetails = state.get("order_details", {})
            dish = (od.get("dish_name") or "").strip().lower()
            required = od.get("required_quantity", 0)

            stock_level = inventory.get(dish)

            if stock_level is None:
                # Dish is not on the menu — treat as out of stock
                in_stock = [
                    d for d, qty in inventory.snapshot().items()
                    if qty > 0 and d != dish
                ]
                return {
                    "order_details": {
                        "dish_name": dish,
                        "required_quantity": required,
                        "quantity": 0,
                        "availability_status": "out_of_stock",
                    },
                    "status": "needs_user_input",
                    "alternatives": in_stock[:3],
                    "error": None,
                }

            if stock_level == 0:
                in_stock = [
                    d for d, qty in inventory.snapshot().items()
                    if qty > 0 and d != dish
                ]
                return {
                    "order_details": {
                        "dish_name": dish,
                        "required_quantity": required,
                        "quantity": 0,
                        "availability_status": "out_of_stock",
                    },
                    "status": "needs_user_input",
                    "alternatives": in_stock[:3],
                    "error": None,
                }

            if stock_level < required:
                # Insufficient — no inventory change
                in_stock = [
                    d for d, qty in inventory.snapshot().items()
                    if qty > 0 and d != dish
                ]
                return {
                    "order_details": {
                        "dish_name": dish,
                        "required_quantity": required,
                        "quantity": stock_level,
                        "availability_status": "insufficient",
                    },
                    "status": "needs_user_input",
                    "alternatives": in_stock[:3],
                    "error": None,
                }

            # Available — reserve stock
            inventory.reserve(dish, required)
            return {
                "order_details": {
                    "dish_name": dish,
                    "required_quantity": required,
                    "quantity": stock_level,
                    "availability_status": "available",
                },
                "status": "order_confirmed",
                "alternatives": [],
                "error": None,
            }

        except Exception as exc:
            logger.warning("order_confirmation error: %s", exc)
            attempts = state.get("order_attempts_left", 0) - 1
            od_fallback: OrderDetails = state.get("order_details", {
                "dish_name": None, "required_quantity": 0,
                "quantity": 0, "availability_status": None,
            })
            return {
                "order_attempts_left": max(attempts, 0),
                "error": str(exc),
                "status": "failed_processing" if attempts <= 0 else state.get("status", "idle"),
                "order_details": od_fallback,
            }

    return order_confirmation


# ===================================================================
# NODE: respond  (LLM — with fallback)
# ===================================================================

def make_respond_node(
    llm: Any,
    inventory: InventoryRepository,
) -> Callable[[AgentState], dict]:
    """Return the respond node, closed over LLM and inventory."""

    def respond(state: AgentState) -> dict:
        thread_id = state.get("thread_id", "?")
        status = state.get("status", "idle")
        logger.info("node=respond thread=%s status=%s", thread_id, status)

        facts = _build_facts(state, inventory)
        prompt = RESPOND_SYSTEM_PROMPT.format(facts=facts)

        try:
            ai_message: AIMessage = llm.invoke(
                [("system", prompt)] + _recent_messages(state.get("messages", []))
            )
            return {"messages": [ai_message]}
        except Exception as exc:
            logger.warning("respond LLM failed, using fallback: %s", exc)
            fallback_text = _get_fallback(status)
            return {"messages": [AIMessage(content=fallback_text)]}

    return respond


# ===================================================================
# NODE: cook  (deterministic, probability-based)
# ===================================================================

def make_cook_node(
    random_source: Callable[[], float],
    success_probability: float,
) -> Callable[[AgentState], dict]:
    """Return the cook node."""

    def cook(state: AgentState) -> dict:
        thread_id = state.get("thread_id", "?")
        attempts_left = state.get("cook_attempts_left", 0)
        logger.info("node=cook thread=%s cook_attempts_left=%s", thread_id, attempts_left)

        if attempts_left <= 0:
            return {
                "status": "failed_cooking",
                "cook_attempts_left": 0,
                "error": "Cook budget exhausted",
                "order_details": state.get("order_details", {
                    "dish_name": None, "required_quantity": 0,
                    "quantity": 0, "availability_status": None,
                }),
            }

        success = random_source() < success_probability
        if success:
            return {
                "status": "order_ready",
                "error": None,
                "order_details": state.get("order_details", {
                    "dish_name": None, "required_quantity": 0,
                    "quantity": 0, "availability_status": None,
                }),
            }
        else:
            new_attempts = attempts_left - 1
            return {
                "cook_attempts_left": new_attempts,
                "error": "Cooking attempt failed",
                "status": "order_confirmed" if new_attempts > 0 else "failed_cooking",
                "order_details": state.get("order_details", {
                    "dish_name": None, "required_quantity": 0,
                    "quantity": 0, "availability_status": None,
                }),
            }

    return cook


# ===================================================================
# NODE: release_stock  (deterministic)
# ===================================================================

def make_release_stock_node(
    inventory: InventoryRepository,
) -> Callable[[AgentState], dict]:
    """Return reserved stock to inventory after cooking fails permanently."""

    def release_stock(state: AgentState) -> dict:
        thread_id = state.get("thread_id", "?")
        logger.info("node=release_stock thread=%s", thread_id)
        od: OrderDetails = state.get("order_details", {})
        dish = od.get("dish_name")
        qty = od.get("required_quantity", 0)
        if dish and qty > 0:
            inventory.release(dish, qty)
        return {
            "order_details": state.get("order_details", {
                "dish_name": None, "required_quantity": 0,
                "quantity": 0, "availability_status": None,
            }),
        }

    return release_stock


# ===================================================================
# NODE: serve  (deterministic, probability-based)
# ===================================================================

def make_serve_node(
    random_source: Callable[[], float],
    success_probability: float,
) -> Callable[[AgentState], dict]:
    """Return the serve node."""

    def serve(state: AgentState) -> dict:
        thread_id = state.get("thread_id", "?")
        attempts_left = state.get("serve_attempts_left", 0)
        logger.info("node=serve thread=%s serve_attempts_left=%s", thread_id, attempts_left)

        if attempts_left <= 0:
            return {
                "status": "failed_serving",
                "serve_attempts_left": 0,
                "error": "Serve budget exhausted",
                "order_details": state.get("order_details", {
                    "dish_name": None, "required_quantity": 0,
                    "quantity": 0, "availability_status": None,
                }),
            }

        success = random_source() < success_probability
        if success:
            return {
                "status": "order_served",
                "error": None,
                "order_details": state.get("order_details", {
                    "dish_name": None, "required_quantity": 0,
                    "quantity": 0, "availability_status": None,
                }),
            }
        else:
            new_attempts = attempts_left - 1
            return {
                "serve_attempts_left": new_attempts,
                "error": "Serving attempt failed",
                "status": "order_served" if False else (
                    "order_ready" if new_attempts > 0 else "failed_serving"
                ),
                "order_details": state.get("order_details", {
                    "dish_name": None, "required_quantity": 0,
                    "quantity": 0, "availability_status": None,
                }),
            }

    return serve


# ===================================================================
# NODE: order_completed  (deterministic)
# ===================================================================

def order_completed_node(state: AgentState) -> dict:
    """Mark the order as completed."""
    thread_id = state.get("thread_id", "?")
    logger.info("node=order_completed thread=%s", thread_id)
    return {
        "status": "order_completed",
        "error": None,
        "order_details": state.get("order_details", {
            "dish_name": None, "required_quantity": 0,
            "quantity": 0, "availability_status": None,
        }),
    }
