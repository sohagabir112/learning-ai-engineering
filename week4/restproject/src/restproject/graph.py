"""Build and compile the restaurant order StateGraph."""

from __future__ import annotations

import random
from typing import Any, Callable

from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from .config import AgentConfig
from .inventory import InventoryRepository
from .nodes import (
    make_cook_node,
    make_intake_node,
    make_order_confirmation_node,
    make_release_stock_node,
    make_respond_node,
    make_serve_node,
    order_completed_node,
)
from .routing import (
    route_after_cook,
    route_after_intake,
    route_after_order_confirmation,
    route_after_respond,
    route_after_serve,
)
from .state import AgentState


def build_graph(
    *,
    llm: Any | None = None,
    inventory: InventoryRepository | None = None,
    config: AgentConfig | None = None,
    random_source: Callable[[], float] | None = None,
    checkpointer: Any | None = None,
) -> tuple[Any, InventoryRepository, AgentConfig]:
    """Assemble the full restaurant-order StateGraph.

    Returns ``(compiled_graph, inventory, config)`` so callers have handles
    to the live inventory and configuration.
    """
    cfg = config or AgentConfig()
    inv = inventory or InventoryRepository(cfg.default_inventory)
    rng = random_source or random.random

    if llm is None:
        llm = ChatGroq(
            model=cfg.resolved_model_name(),
            api_key=cfg.resolved_api_key(),
        )

    # -- node factories ----------------------------------------------------
    intake = make_intake_node(llm)
    order_confirmation = make_order_confirmation_node(inv)
    respond = make_respond_node(llm, inv)
    cook = make_cook_node(rng, cfg.cook_success_probability)
    serve = make_serve_node(rng, cfg.serve_success_probability)
    release_stock = make_release_stock_node(inv)

    # -- graph wiring ------------------------------------------------------
    graph = StateGraph(AgentState)

    graph.add_node("intake", intake)
    graph.add_node("order_confirmation", order_confirmation)
    graph.add_node("respond", respond)
    graph.add_node("cook", cook)
    graph.add_node("release_stock", release_stock)
    graph.add_node("serve", serve)
    graph.add_node("order_completed", order_completed_node)

    graph.add_edge(START, "intake")

    graph.add_conditional_edges("intake", route_after_intake, {
        "intake": "intake",
        "order_confirmation": "order_confirmation",
        "respond": "respond",
    })

    graph.add_conditional_edges("order_confirmation", route_after_order_confirmation, {
        "order_confirmation": "order_confirmation",
        "respond": "respond",
    })

    graph.add_conditional_edges("respond", route_after_respond, {
        "cook": "cook",
        END: END,
    })

    graph.add_conditional_edges("cook", route_after_cook, {
        "cook": "cook",
        "serve": "serve",
        "release_stock": "release_stock",
    })

    graph.add_edge("release_stock", "respond")

    graph.add_conditional_edges("serve", route_after_serve, {
        "serve": "serve",
        "order_completed": "order_completed",
        "respond": "respond",
    })

    graph.add_edge("order_completed", "respond")

    saver = checkpointer if checkpointer is not None else InMemorySaver()
    compiled = graph.compile(checkpointer=saver)

    return compiled, inv, cfg
