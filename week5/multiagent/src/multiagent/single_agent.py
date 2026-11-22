"""Single Agent System with one LLM (Groq), 2 tools, and max 5 attempts."""

import json
from typing import Any, Dict, List, Optional
from groq import Groq
from multiagent.config import GROQ_API_KEY, DEFAULT_GROQ_MODEL
from multiagent.token_tracker import TokenUsage
from multiagent.tools import ALL_TOOLS, execute_tool

SINGLE_AGENT_SYSTEM_PROMPT = """You are an intelligent, fact-based AI assistant equipped with two specialized tools:
1. `web_search`: Perform real-time web searches using the Tavily API to fetch current factual data, news, statistics, and domain details.
2. `calculator`: Evaluate mathematical and numerical computations using Python.

CRITICAL INSTRUCTIONS:
- You have a strict limit of at most 5 attempts to complete the request.
- Plan your tool usage efficiently:
  * When researching multiple subjects, perform a consolidated search query to retrieve all needed values in one step (e.g. search for 'Apple and Microsoft market capitalization current').
  * When performing multiple calculations (such as differences, percentages, projections, and growth), compute them together in a single Python expression or dictionary (e.g. evaluate `{'diff': a - b, 'pct': a/b*100, 'proj_a': a*1.12, 'proj_b': b*1.18, 'growth': ((a*1.12+b*1.18)-(a+b))/(a+b)*100}`).
- As soon as you have the required information and calculation results, formulate and provide your complete, detailed final answer directly.
"""


def ask_llm(
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
    tool_choice: Optional[str] = None,
    model: str = DEFAULT_GROQ_MODEL,
    tracker: Optional[TokenUsage] = None,
    temperature: float = 0.2,
) -> Any:
    """Core ask_llm function for the Single Agent system.
    
    Calls Groq API, records token usage, and returns the completion response.
    """
    client = Groq(api_key=GROQ_API_KEY)
    kwargs: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if tools:
        kwargs["tools"] = tools
        if tool_choice:
            kwargs["tool_choice"] = tool_choice
        else:
            kwargs["tool_choice"] = "auto"

    try:
        response = client.chat.completions.create(**kwargs)
    except Exception as exc:
        # If tool_use_failed occurs, retry with tools=None or extract error
        err_msg = str(exc)
        if "tool_use_failed" in err_msg or "Tool choice is none" in err_msg:
            # Fallback retry allowing auto tools or plain message
            kwargs["tool_choice"] = "auto"
            response = client.chat.completions.create(**kwargs)
        else:
            raise exc

    # Accumulate token usage
    if tracker is not None and hasattr(response, "usage") and response.usage:
        tracker.add(response.usage)

    return response


def run_single_agent(
    user_query: str,
    max_attempts: int = 5,
    model: str = DEFAULT_GROQ_MODEL,
    verbose: bool = True,
) -> Dict[str, Any]:
    """Runs the single agent loop up to max_attempts."""
    tracker = TokenUsage()
    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": SINGLE_AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": user_query},
    ]

    execution_trace = []
    final_answer: Optional[str] = None
    attempt_count = 0

    if verbose:
        print("\n" + "=" * 60, flush=True)
        print(f"[Single Agent] Starting execution with model: {model}", flush=True)
        print(f"[Single Agent] User Query: {user_query}", flush=True)
        print("=" * 60, flush=True)

    for attempt in range(1, max_attempts + 1):
        attempt_count = attempt
        if verbose:
            print(f"\n--- [Single Agent] Attempt {attempt}/{max_attempts} ---", flush=True)

        response = ask_llm(
            messages=messages,
            tools=ALL_TOOLS,
            tool_choice="auto",
            model=model,
            tracker=tracker,
        )

        message = response.choices[0].message
        tool_calls = getattr(message, "tool_calls", None)

        if tool_calls:
            # Format assistant message with tool calls
            assistant_msg: Dict[str, Any] = {
                "role": "assistant",
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in tool_calls
                ],
            }
            messages.append(assistant_msg)

            for tc in tool_calls:
                fn_name = tc.function.name
                fn_args_raw = tc.function.arguments
                if verbose:
                    print(f" -> Calling Tool: `{fn_name}` with args: {fn_args_raw}", flush=True)

                tool_result = execute_tool(fn_name, fn_args_raw)
                if verbose:
                    preview = (
                        tool_result[:160] + "..."
                        if len(tool_result) > 160
                        else tool_result
                    )
                    print(f" <- Tool Result: {preview}", flush=True)

                execution_trace.append(
                    {
                        "attempt": attempt,
                        "tool": fn_name,
                        "arguments": fn_args_raw,
                        "result": tool_result,
                    }
                )

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "name": fn_name,
                        "content": tool_result,
                    }
                )

            # If attempt reaches max_attempts and model invoked a tool on its 5th attempt,
            # execute a final request with tool_choice="auto" asking for synthesis
            if attempt == max_attempts:
                if verbose:
                    print("\n[Single Agent] Reached 5 attempts. Requesting final synthesis...", flush=True)
                messages.append(
                    {
                        "role": "user",
                        "content": "All tool steps have been executed. Please synthesize all gathered data and calculations into a comprehensive, detailed final answer now.",
                    }
                )
                final_resp = ask_llm(
                    messages=messages,
                    tools=ALL_TOOLS,
                    tool_choice="auto",
                    model=model,
                    tracker=tracker,
                )
                final_msg = final_resp.choices[0].message
                if final_msg.content:
                    final_answer = final_msg.content
                elif final_msg.tool_calls:
                    # If it invoked one last tool, execute it and take its result
                    last_tc = final_msg.tool_calls[0]
                    last_res = execute_tool(last_tc.function.name, last_tc.function.arguments)
                    final_answer = f"Final computed value: {last_res}"
                break

        else:
            # Final response generated without calling more tools
            final_answer = message.content or ""
            if verbose:
                print("\n[Single Agent] Final response reached without further tool calls.", flush=True)
            break

    if final_answer is None:
        final_answer = "No final answer was generated."

    if verbose:
        print("\n" + "=" * 60, flush=True)
        print("[Single Agent] Execution Complete!", flush=True)
        print(f"[Single Agent] Total Attempts: {attempt_count}", flush=True)
        print(f"[Single Agent] Token Usage: {tracker.summary()}", flush=True)
        print("=" * 60 + "\n", flush=True)

    return {
        "system": "Single Agent",
        "query": user_query,
        "answer": final_answer,
        "attempts": attempt_count,
        "execution_trace": execution_trace,
        "token_usage": tracker,
    }
