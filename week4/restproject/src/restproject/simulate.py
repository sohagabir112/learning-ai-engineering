"""Simulation helper for running scripted scenarios."""

from __future__ import annotations

from typing import Any, Callable

from .config import AgentConfig
from .graph import build_graph
from .inventory import InventoryRepository
from .state import new_turn_input


def run_scenario(
    messages: list[str],
    inventory: dict[str, int],
    cook_outcomes: list[bool],
    serve_outcomes: list[bool],
    llm: Any,
    *,
    config: AgentConfig | None = None,
) -> tuple[list[str], dict, dict[str, int]]:
    """Run a scripted multi-turn scenario and return results.

    Parameters
    ----------
    messages:
        Customer messages to feed in order, one graph invocation each.
    inventory:
        Starting stock levels.
    cook_outcomes:
        Sequence of True/False for each cook attempt (popped in order).
    serve_outcomes:
        Sequence of True/False for each serve attempt (popped in order).
    llm:
        The LangChain chat model (or a stub) to inject.
    config:
        Optional ``AgentConfig`` override.

    Returns
    -------
    (visited_nodes, final_state, final_inventory)
        ``visited_nodes`` is a flat list of node names in execution order
        across all turns.
    """
    cfg = config or AgentConfig()
    inv = InventoryRepository(inventory)

    cook_iter = iter(cook_outcomes)
    serve_iter = iter(serve_outcomes)

    def cook_random() -> float:
        outcome = next(cook_iter, True)
        return 0.0 if outcome else 1.0  # < probability → success

    def serve_random() -> float:
        outcome = next(serve_iter, True)
        return 0.0 if outcome else 1.0

    # Build two random sources — cook and serve share the same graph random
    # parameter, but we need to separate them.  The trick: the cook node uses
    # cook_success_probability and the serve node uses serve_success_probability.
    # We'll route via a single random source that dispatches based on an
    # internal counter.
    cook_q: list[bool] = list(cook_outcomes)
    serve_q: list[bool] = list(serve_outcomes)

    class _RandomDispatch:
        """Routes random() calls to the right outcome queue.

        The cook node calls random_source() with probability = cook_success_probability.
        The serve node calls random_source() with probability = serve_success_probability.
        Since both are wired to the same callable, we track calls by the
        probability value they're compared against.
        """

        def __init__(self) -> None:
            self._cook_idx = 0
            self._serve_idx = 0
            self._mode: str = "cook"

        def __call__(self) -> float:
            # We can't distinguish cook vs serve from the random source alone.
            # Instead, the nodes are built with separate random sources.
            # This class is not used; see below.
            raise NotImplementedError

    # Build with separate random sources by building nodes directly.
    # Actually, build_graph takes a single random_source.  Let's modify
    # the approach: we'll rebuild graph manually using node factories.

    from langgraph.checkpoint.memory import InMemorySaver
    from langgraph.graph import END, START, StateGraph

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

    cook_idx = [0]
    serve_idx = [0]

    def cook_rng() -> float:
        idx = cook_idx[0]
        cook_idx[0] += 1
        if idx < len(cook_q):
            return 0.0 if cook_q[idx] else 1.0
        return 0.0  # default to success

    def serve_rng() -> float:
        idx = serve_idx[0]
        serve_idx[0] += 1
        if idx < len(serve_q):
            return 0.0 if serve_q[idx] else 1.0
        return 0.0

    intake = make_intake_node(llm)
    order_confirmation = make_order_confirmation_node(inv)
    respond = make_respond_node(llm, inv)
    cook_node = make_cook_node(cook_rng, cfg.cook_success_probability)
    serve_node = make_serve_node(serve_rng, cfg.serve_success_probability)
    release_stock = make_release_stock_node(inv)

    graph = StateGraph(AgentState)
    graph.add_node("intake", intake)
    graph.add_node("order_confirmation", order_confirmation)
    graph.add_node("respond", respond)
    graph.add_node("cook", cook_node)
    graph.add_node("release_stock", release_stock)
    graph.add_node("serve", serve_node)
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

    saver = InMemorySaver()
    compiled = graph.compile(checkpointer=saver)

    # Run each message as a separate turn
    all_visited: list[str] = []
    final_state: dict = {}
    thread_config = {"configurable": {"thread_id": "sim-1"}}

    for msg_text in messages:
        turn_input = new_turn_input(
            msg_text,
            order_attempts=cfg.order_attempts,
            cook_attempts=cfg.cook_attempts,
            serve_attempts=cfg.serve_attempts,
        )
        for chunk in compiled.stream(turn_input, config=thread_config, stream_mode="updates"):
            for node_name in chunk:
                all_visited.append(node_name)

        final_state = compiled.get_state(thread_config).values

    return all_visited, final_state, inv.snapshot()
