"""CLI Entrypoint for the Multi-Agent vs Single Agent System."""

import argparse
import sys
from pathlib import Path

from multiagent.config import DEFAULT_GROQ_MODEL, ROOT_DIR
from multiagent.single_agent import run_single_agent
from multiagent.multi_agent import run_multi_agent
from multiagent.compare import run_comparison, DEFAULT_COMPLEX_QUERY


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Single Agent vs Multi-Agent (LangGraph) System with Groq, Tavily, and Python Calculator."
    )
    parser.add_argument(
        "--mode",
        choices=["compare", "single", "multi"],
        default="compare",
        help="Execution mode: 'compare' (runs both and compares tokens), 'single', or 'multi'. Default is 'compare'.",
    )
    parser.add_argument(
        "--query",
        type=str,
        default=None,
        help="User query to process. If omitted in 'compare' mode, a complex default query involving search and math is used.",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=DEFAULT_GROQ_MODEL,
        help=f"Groq model name to use (default: {DEFAULT_GROQ_MODEL}).",
    )
    parser.add_argument(
        "--report",
        type=str,
        default=str(ROOT_DIR / "comparison_report.md"),
        help="Path where comparison markdown report will be saved.",
    )

    args = parser.parse_args()

    if args.mode == "compare":
        query = args.query if args.query else DEFAULT_COMPLEX_QUERY
        report_path = Path(args.report)
        run_comparison(query=query, model=args.model, output_report_path=report_path, verbose=True)

    elif args.mode == "single":
        query = args.query or "What is the square root of 256 plus 44?"
        res = run_single_agent(user_query=query, model=args.model, verbose=True)
        print("\n=== FINAL ANSWER ===")
        print(res["answer"])
        print("\n=== TOKEN USAGE ===")
        print(res["token_usage"].summary())

    elif args.mode == "multi":
        query = args.query or "What is the square root of 256 plus 44?"
        res = run_multi_agent(user_query=query, model=args.model, verbose=True)
        print("\n=== FINAL ANSWER ===")
        print(res["answer"])
        print("\n=== TOKEN USAGE ===")
        print(f"Manager:     {res['manager_tokens'].summary()}")
        print(f"Web Search:  {res['web_search_tokens'].summary()}")
        print(f"Calculator:  {res['calculator_tokens'].summary()}")
        print(f"Total:       {res['total_token_usage'].summary()}")


if __name__ == "__main__":
    main()
