"""Conditional-edge routing functions.

Each function reads state and returns the name of the next node (or END).
No side effects, no state mutation.
"""

from __future__ import annotations

import logging

from langgraph.graph import END

from .state import AgentState

logger = logging.getLogger("restaurant_agent")


def route_after_intake(state: AgentState) -> str:
    """Decide where to go after the intake node."""
    intent = state.get("intent")
    status = state.get("status")
    error = state.get("error")
    od = state.get("order_details", {})
    attempts_left = state.get("order_attempts_left", 0)

    # Technical failure with budget remaining → retry intake
    if error and attempts_left > 0:
        logger.info("route_after_intake → intake (retry, %d left)", attempts_left)
        return "intake"

    # Terminal processing failure
    if status == "failed_processing":
        logger.info("route_after_intake → respond (failed_processing)")
        return "respond"

    # Successful place_order with both dish and quantity → confirm
    if intent == "place_order" and od.get("dish_name") and od.get("required_quantity"):
        logger.info("route_after_intake → order_confirmation")
        return "order_confirmation"

    # menu_question, unrelated, missing details → respond and end the turn
    logger.info("route_after_intake → respond (intent=%s)", intent)
    return "respond"


def route_after_order_confirmation(state: AgentState) -> str:
    """Decide where to go after order_confirmation."""
    status = state.get("status")
    error = state.get("error")
    attempts_left = state.get("order_attempts_left", 0)

    # Technical failure with budget → retry
    if error and attempts_left > 0:
        logger.info("route_after_order_confirmation → order_confirmation (retry, %d left)", attempts_left)
        return "order_confirmation"

    # Terminal processing failure or any availability outcome → respond
    logger.info("route_after_order_confirmation → respond (status=%s)", status)
    return "respond"


def route_after_respond(state: AgentState) -> str:
    """After respond, continue to cook only if order was confirmed."""
    status = state.get("status")
    if status == "order_confirmed":
        logger.info("route_after_respond → cook")
        return "cook"
    logger.info("route_after_respond → END (status=%s)", status)
    return END


def route_after_cook(state: AgentState) -> str:
    """Route after the cook node."""
    status = state.get("status")
    attempts_left = state.get("cook_attempts_left", 0)

    if status == "order_ready":
        logger.info("route_after_cook → serve")
        return "serve"

    if status == "failed_cooking":
        logger.info("route_after_cook → release_stock")
        return "release_stock"

    # Still has budget — retry cook
    if attempts_left > 0:
        logger.info("route_after_cook → cook (retry, %d left)", attempts_left)
        return "cook"

    # Budget exhausted but status wasn't set — shouldn't happen, but be safe
    logger.info("route_after_cook → release_stock (fallback)")
    return "release_stock"


def route_after_serve(state: AgentState) -> str:
    """Route after the serve node."""
    status = state.get("status")
    attempts_left = state.get("serve_attempts_left", 0)

    if status == "order_served":
        logger.info("route_after_serve → order_completed")
        return "order_completed"

    if status == "failed_serving":
        logger.info("route_after_serve → respond (failed_serving)")
        return "respond"

    # Still has budget — retry serve
    if attempts_left > 0:
        logger.info("route_after_serve → serve (retry, %d left)", attempts_left)
        return "serve"

    # Fallback
    logger.info("route_after_serve → respond (fallback)")
    return "respond"
