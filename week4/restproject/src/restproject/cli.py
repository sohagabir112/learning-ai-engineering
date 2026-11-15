"""CLI chat loop — one graph invocation per customer message."""

from __future__ import annotations

import logging
import uuid

from dotenv import load_dotenv

from .config import AgentConfig
from .graph import build_graph
from .state import new_turn_input


def main() -> None:
    """Run the interactive restaurant agent in the terminal."""
    load_dotenv()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )

    cfg = AgentConfig()
    compiled, inventory, _ = build_graph(config=cfg)
    thread_id = str(uuid.uuid4())
    thread_config = {"configurable": {"thread_id": thread_id}}

    print("Welcome to the restaurant! Type 'quit' to leave.")
    print(f"Menu: {', '.join(inventory.snapshot().keys())}")
    print(f"Stock: {inventory.snapshot()}")
    print()

    while True:
        try:
            user_text = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_text:
            continue
        if user_text.lower() in {"quit", "exit", "bye"}:
            print("Goodbye!")
            break

        turn_input = new_turn_input(
            user_text,
            order_attempts=cfg.order_attempts,
            cook_attempts=cfg.cook_attempts,
            serve_attempts=cfg.serve_attempts,
        )

        for chunk in compiled.stream(turn_input, config=thread_config, stream_mode="updates"):
            for node_name, update in chunk.items():
                status = update.get("status", "")
                if status:
                    print(f"[{node_name}] status={status}")

        state = compiled.get_state(thread_config).values
        msgs = state.get("messages", [])
        if msgs:
            last_ai = [m for m in msgs if hasattr(m, "type") and m.type == "ai"]
            if last_ai:
                print(f"Assistant: {last_ai[-1].content}")

        print(f"Stock: {inventory.snapshot()}")
        print()


if __name__ == "__main__":
    main()
