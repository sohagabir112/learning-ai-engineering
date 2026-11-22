"""Command-line interface for AI Proctor."""

from __future__ import annotations

import argparse
import sys

from .analyzer import AIProctor
from .config import Config

# ── ANSI helpers ────────────────────────────────────────────────────── #
_BOLD = "\033[1m"
_RED = "\033[91m"
_GREEN = "\033[92m"
_YELLOW = "\033[93m"
_CYAN = "\033[96m"
_RESET = "\033[0m"


def _header(text: str) -> str:
    return f"\n{_BOLD}{_CYAN}{text}{_RESET}\n"


def _ok(text: str) -> str:
    return f"{_GREEN}✓ {text}{_RESET}"


def _warn(text: str) -> str:
    return f"{_RED}⚠ {text}{_RESET}"


# ── CLI actions ─────────────────────────────────────────────────────── #

def _plagiarism(args: argparse.Namespace) -> None:
    proctor = AIProctor(Config())
    result = proctor.analyze_plagiarism(args.file1, args.file2)

    print(_header("Plagiarism Comparison"))
    print(f"  File 1 : {args.file1}")
    print(f"  File 2 : {args.file2}")
    sim = result["similarity"]
    color = _RED if result["is_plagiarized"] else _GREEN
    print(f"  Similarity : {color}{sim:.2%}{_RESET}")
    label = _warn("PLAGIARIZED") if result["is_plagiarized"] else _ok("ORIGINAL")
    print(f"  Verdict    : {label}")

    if result["is_plagiarized"] and result.get("matching_regions"):
        print(f"\n  {_YELLOW}Matching regions (first 10):{_RESET}")
        for m in result["matching_regions"][:10]:
            print(f"    L{m[0]:>3} ↔ L{m[1]:>3} : {m[2][:70]}")


def _ai_detect(args: argparse.Namespace) -> None:
    proctor = AIProctor(Config())
    result = proctor.analyze_ai_generated(args.file)

    print(_header("AI-Generated Code Detection"))
    print(f"  File : {args.file}")
    h = result["heuristic_score"]
    l = result["llm_result"]["confidence"]
    c = result["combined_score"]
    color = _RED if result["is_ai_generated"] else _GREEN
    print(f"  Heuristic score : {h:.2%}")
    print(f"  LLM confidence  : {l:.2%}")
    print(f"  Combined score  : {color}{c:.2%}{_RESET}")
    label = (
        _warn("AI-GENERATED")
        if result["is_ai_generated"]
        else _ok("HUMAN-WRITTEN")
    )
    print(f"  Verdict : {label}")
    reasoning = result["llm_result"].get("reasoning", "")
    if reasoning:
        print(f"\n  {_YELLOW}LLM reasoning:{_RESET} {reasoning}")

    print(f"\n  {_CYAN}Features:{_RESET}")
    for k, v in result["features"].items():
        print(f"    {k:.<30s} {v}")


def _full(args: argparse.Namespace) -> None:
    proctor = AIProctor(Config())
    results = proctor.full_analysis(args.files)
    report = proctor.generate_report(results)
    print(report)


# ── Argument parser ─────────────────────────────────────────────────── #

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="aiproctor",
        description="AI Proctor — plagiarism & AI-code detector",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # plagiarism
    p_plag = sub.add_parser(
        "plagiarism", help="Compare two files for plagiarism"
    )
    p_plag.add_argument("file1", help="First source file")
    p_plag.add_argument("file2", help="Second source file")
    p_plag.set_defaults(func=_plagiarism)

    # ai-detect
    p_ai = sub.add_parser(
        "ai-detect", help="Check if a file is AI-generated"
    )
    p_ai.add_argument("file", help="Source file to analyse")
    p_ai.set_defaults(func=_ai_detect)

    # full
    p_full = sub.add_parser(
        "full",
        help="Full analysis: plagiarism (all pairs) + AI detection (each file)",
    )
    p_full.add_argument(
        "files", nargs="+", help="Two or more source files"
    )
    p_full.set_defaults(func=_full)

    return parser


def main(argv: list[str] | None = None) -> None:
    """Entry point for the CLI."""
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except FileNotFoundError as exc:
        print(f"{_RED}Error:{_RESET} {exc}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        sys.exit(130)
