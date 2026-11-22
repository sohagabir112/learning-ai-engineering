"""Multi-Agent System Package."""

from multiagent.single_agent import run_single_agent, ask_llm
from multiagent.multi_agent import (
    run_multi_agent,
    ask_manager,
    ask_web_search_agent,
    ask_calculator_agent,
    create_multi_agent_graph,
)
from multiagent.tools import run_web_search, run_calculator, execute_tool
from multiagent.notes_manager import NotesManager
from multiagent.token_tracker import TokenUsage
from multiagent.compare import run_comparison, DEFAULT_COMPLEX_QUERY
from multiagent.main import main

__all__ = [
    "main",
    "run_single_agent",
    "ask_llm",
    "run_multi_agent",
    "ask_manager",
    "ask_web_search_agent",
    "ask_calculator_agent",
    "create_multi_agent_graph",
    "run_web_search",
    "run_calculator",
    "execute_tool",
    "NotesManager",
    "TokenUsage",
    "run_comparison",
    "DEFAULT_COMPLEX_QUERY",
]
