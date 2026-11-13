"""A small Groq agent with Tavily web search and safe basic calculations."""

from __future__ import annotations

import ast
import json
import operator
import os
import urllib.error
import urllib.request
from typing import Any, Callable

from dotenv import load_dotenv
from groq import Groq


load_dotenv()


def web_search(query: str) -> str:
    """Search the web with Tavily and return its answer and source URLs."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY is not set in the environment.")
    if not query.strip():
        raise ValueError("The search query cannot be empty.")

    request_body = json.dumps(
        {
            "api_key": api_key,
            "query": query,
            "search_depth": "basic",
            "include_answer": True,
            "max_results": 5,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.tavily.com/search",
        data=request_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Tavily search failed ({error.code}): {details}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Tavily search could not connect: {error.reason}") from error

    answer = result.get("answer") or "Tavily did not provide a direct answer."
    sources = [
        item["url"]
        for item in result.get("results", [])
        if isinstance(item, dict) and item.get("url")
    ]
    if sources:
        answer += "\n\nSources:\n" + "\n".join(f"- {url}" for url in sources)
    return answer


_OPERATORS: dict[type[ast.operator], Callable[[float, float], float]] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_UNARY_OPERATORS: dict[type[ast.unaryop], Callable[[float], float]] = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


def _evaluate(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPERATORS:
        return _UNARY_OPERATORS[type(node.op)](_evaluate(node.operand))
    if isinstance(node, ast.BinOp) and type(node.op) in _OPERATORS:
        left = _evaluate(node.left)
        right = _evaluate(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > 100:
            raise ValueError("Exponent must be between -100 and 100.")
        return _OPERATORS[type(node.op)](left, right)
    raise ValueError(
        "Only numbers, parentheses, and +, -, *, /, %, and ** operators are allowed."
    )


def calculate(expression: str) -> str:
    """Evaluate a basic arithmetic expression without executing arbitrary Python."""
    if not expression.strip():
        raise ValueError("The expression cannot be empty.")
    try:
        tree = ast.parse(expression, mode="eval")
        result = _evaluate(tree.body)
    except (SyntaxError, ValueError, TypeError, ZeroDivisionError, OverflowError) as error:
        raise ValueError(f"Could not calculate {expression!r}: {error}") from error
    formatted_result = (
        str(int(result)) if isinstance(result, float) and result.is_integer() else str(result)
    )
    return f"{expression.strip()} = {formatted_result}"


tools: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web with Tavily for current or factual information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The question or search query to look up.",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Calculate a basic arithmetic expression.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "An arithmetic expression such as (12 + 8) * 3.",
                    }
                },
                "required": ["expression"],
            },
        },
    },
]

_TOOL_FUNCTIONS: dict[str, Callable[..., str]] = {
    "web_search": web_search,
    "calculate": calculate,
}


def ask_agent(user_input: str) -> str:
    """Let Groq automatically choose tools and return the final answer."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in the environment.")
    if not user_input.strip():
        raise ValueError("The input cannot be empty.")

    client = Groq(api_key=api_key)
    messages: list[dict[str, Any]] = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant. Use web_search for current or factual "
                "information and calculate for arithmetic. For arithmetic, reply only "
                "in the simple format 'expression = result'."
            ),
        },
        {"role": "user", "content": user_input},
    ]

    while True:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )
        message = completion.choices[0].message
        tool_calls = message.tool_calls or []

        if not tool_calls:
            return message.content or "The model returned an empty response."

        messages.append(
            {
                "role": "assistant",
                "content": message.content,
                "tool_calls": [
                    {
                        "id": call.id,
                        "type": "function",
                        "function": {
                            "name": call.function.name,
                            "arguments": call.function.arguments,
                        },
                    }
                    for call in tool_calls
                ],
            }
        )
        for call in tool_calls:
            function = _TOOL_FUNCTIONS.get(call.function.name)
            if function is None:
                raise RuntimeError(f"Model requested unknown tool: {call.function.name}")
            try:
                arguments = json.loads(call.function.arguments)
                result = function(**arguments)
            except (json.JSONDecodeError, TypeError, ValueError, RuntimeError) as error:
                result = f"Tool error: {error}"
            messages.append(
                {"role": "tool", "tool_call_id": call.id, "content": result}
            )


if __name__ == "__main__":
    try:
        print(ask_agent(input("Ask anything: ")))
    except (RuntimeError, ValueError) as error:
        print(f"Error: {error}")