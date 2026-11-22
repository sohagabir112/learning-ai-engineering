"""Tools for the agent systems: Tavily Web Search and Python Calculator."""

import json
import math
import re
from typing import Any, Dict, List
from tavily import TavilyClient
from multiagent.config import TAVILY_API_KEY


def run_web_search(query: str, max_results: int = 5) -> str:
    """Execute a web search using the Tavily API."""
    if not query or not query.strip():
        return "Error: Empty search query provided."

    try:
        client = TavilyClient(api_key=TAVILY_API_KEY)
        response = client.search(
            query=query.strip(),
            max_results=max_results,
            search_depth="advanced"
        )
        results = response.get("results", [])
        if not results:
            return f"No search results found for query: '{query}'."

        formatted_lines = [f"Search Results for: '{query}'"]
        for idx, res in enumerate(results, 1):
            title = res.get("title", "No Title")
            url = res.get("url", "")
            content = res.get("content", "").strip()
            formatted_lines.append(f"[{idx}] {title}\nURL: {url}\nSnippet: {content}\n")

        return "\n".join(formatted_lines)
    except Exception as exc:
        return f"Error executing web search for '{query}': {exc}"


# Allowed functions, types, and constants for the safe math calculator
SAFE_MATH_ENV = {
    "__builtins__": None,
    "sqrt": math.sqrt,
    "pow": math.pow,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "pi": math.pi,
    "e": math.e,
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "sum": sum,
    "dict": dict,
    "list": list,
    "tuple": tuple,
    "int": int,
    "float": float,
    "str": str,
    "bool": bool,
    "True": True,
    "False": False,
    "None": None,
    "math": math,
}


def run_calculator(expression: str) -> str:
    """Safely evaluate mathematical expressions using Python."""
    if not expression or not expression.strip():
        return "Error: Empty expression provided."

    cleaned = expression.strip()
    cleaned = cleaned.replace("$", "")

    # Remove commas between digits (e.g. 1,000,000 -> 1000000) without breaking dicts, tuples, or argument lists
    cleaned = re.sub(r'(?<=\d),(?=\d)', '', cleaned)

    # Handle percentage signs e.g., '15%' -> '(15 / 100)'
    cleaned = re.sub(r'(\d+(?:\.\d+)?)\s*%', r'(\1 / 100)', cleaned)

    try:
        # Evaluate within restricted environment
        result = eval(cleaned, SAFE_MATH_ENV, {})
        # Format floating points nicely if integer
        if isinstance(result, float) and result.is_integer():
            result = int(result)
        return str(result)
    except ZeroDivisionError:
        return "Error: Division by zero."
    except Exception as exc:
        return f"Error evaluating expression '{expression}': {exc}"


# Groq Tool Schemas
WEB_SEARCH_TOOL: Dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Perform real-time web searches using the Tavily API to find current facts, news, financial data, statistics, and real-world information.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to look up on the web."
                }
            },
            "required": ["query"]
        }
    }
}

CALCULATOR_TOOL: Dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "calculator",
        "description": "Evaluate mathematical and numerical calculations using a Python calculator. Supports arithmetic operations (+, -, *, /, **, %, //), math functions (sqrt, pow, log, round, abs, pi, e), and dictionary/tuple batch expressions.",
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "The mathematical expression to evaluate, e.g. '(3500 - 2800) / 2800 * 100', 'sqrt(144) * 12', or a dict of calculations."
                }
            },
            "required": ["expression"]
        }
    }
}

ALL_TOOLS = [WEB_SEARCH_TOOL, CALCULATOR_TOOL]


def execute_tool(tool_name: str, arguments: Any) -> str:
    """Dispatch and execute tool call by name."""
    if isinstance(arguments, str):
        try:
            arguments = json.loads(arguments)
        except Exception:
            return f"Error parsing arguments for tool '{tool_name}': {arguments}"

    if not isinstance(arguments, dict):
        return f"Error: Arguments must be a dictionary, got {type(arguments)}"

    if tool_name == "web_search":
        query = arguments.get("query", "")
        return run_web_search(query)
    elif tool_name == "calculator":
        expression = arguments.get("expression", "")
        return run_calculator(expression)
    else:
        return f"Error: Unknown tool '{tool_name}'."
