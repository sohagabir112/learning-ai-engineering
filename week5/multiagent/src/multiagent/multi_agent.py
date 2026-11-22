"""Multi-Agent System built with LangGraph, containing three distinct ask_llm functions:
1. Manager LLM (ask_manager): coordinates workers and manages the notes file.
2. Web Search Agent (ask_web_search_agent): executes Tavily searches and summarizes findings.
3. Calculator Agent (ask_calculator_agent): executes Python calculations and returns exact math.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict
from groq import Groq
from langgraph.graph import StateGraph, START, END

from multiagent.config import GROQ_API_KEY, DEFAULT_GROQ_MODEL, DEFAULT_NOTES_FILE
from multiagent.notes_manager import NotesManager
from multiagent.token_tracker import TokenUsage
from multiagent.tools import (
    WEB_SEARCH_TOOL,
    CALCULATOR_TOOL,
    execute_tool,
)

# ---------------------------------------------------------------------------
# Prompts for the three agents
# ---------------------------------------------------------------------------

MANAGER_SYSTEM_PROMPT = """You are the Manager LLM of an advanced multi-agent system.
Your job is to orchestrate two specialized worker agents to answer the user request:
1. `web_search_agent`: Responsible for performing web searches via the Tavily API to gather up-to-date facts, current numbers, statistics, prices, and external knowledge.
2. `calculator_agent`: Responsible for executing mathematical computations, percentages, differences, projections, and formulas using the Python calculator tool.

You also maintain a Notes File where you can store relevant information, learnings, or context across interactions.

Guidelines:
- Analyze the user query and what information has already been retrieved in the scratchpad.
- Decide the single next best step:
  * If external information or data is needed, delegate to `web_search`.
  * If a calculation or mathematical comparison is needed based on retrieved or known data, delegate to `calculator`.
  * If you have all required facts and calculations to provide a thorough, accurate, and complete response to the user, select `finish`.
- If there is an important finding, preference, or fact worth saving for future requests, include it in `save_note`.

You MUST respond strictly in valid JSON format with the following keys:
{
  "thought": "Your internal reasoning about the current progress and next step",
  "action": "web_search" | "calculator" | "finish",
  "instruction": "Detailed task instructions for the chosen worker agent (empty string if finish)",
  "save_note": "Short note to persist in the notes file, or null/empty if nothing new to record",
  "final_answer": "Comprehensive final answer for the user when action is 'finish' (empty string otherwise)"
}
"""

WEB_SEARCH_AGENT_SYSTEM_PROMPT = """You are a dedicated Web Search Agent in a multi-agent system.
Your responsibility is to perform web searches using the Tavily API tool and report factual, reliable data back to the Manager LLM.

Guidelines:
- Analyze the Manager's instruction carefully.
- Call the `web_search` tool with clean, focused queries to retrieve the needed information. You may call the tool multiple times if you need to research multiple entities.
- Extract the exact numbers, facts, sources, and dates from the search results.
- Synthesize your findings into a clear, concise factual summary for the Manager LLM. Do NOT perform complex math yourself; just present the facts accurately.
"""

CALCULATOR_AGENT_SYSTEM_PROMPT = """You are a dedicated Calculator Agent in a multi-agent system.
Your responsibility is to perform mathematical calculations using the Python calculator tool and report exact results back to the Manager LLM.

Guidelines:
- Analyze the Manager's instruction and the given values carefully.
- Call the `calculator` tool with the exact Python math expression or dictionary of expressions.
- Verify the expression, precision, units, and output.
- Present the final calculated result with a clear breakdown of the formula and steps for the Manager LLM.
"""

# ---------------------------------------------------------------------------
# LangGraph State Definition
# ---------------------------------------------------------------------------

class MultiAgentState(TypedDict):
    query: str
    notes_content: str
    scratchpad: List[Dict[str, str]]
    next_action: str
    worker_instruction: str
    worker_output: str
    iteration: int
    max_iterations: int
    final_answer: str
    manager_tokens: Dict[str, int]
    web_search_tokens: Dict[str, int]
    calculator_tokens: Dict[str, int]


# ---------------------------------------------------------------------------
# Three distinct ask_llm functions
# ---------------------------------------------------------------------------

def ask_manager(
    messages: List[Dict[str, Any]],
    tracker: TokenUsage,
    model: str = DEFAULT_GROQ_MODEL,
) -> Dict[str, Any]:
    """ask_llm function 1: Manager LLM.
    
    Decides whether to route to web search agent, calculator agent, or finish,
    and coordinates notes.
    """
    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    if hasattr(response, "usage") and response.usage:
        tracker.add(response.usage)

    content = response.choices[0].message.content or "{}"
    try:
        data = json.loads(content)
    except Exception:
        # Fallback if parsing fails
        data = {
            "thought": "Parsed response directly.",
            "action": "finish",
            "instruction": "",
            "save_note": "",
            "final_answer": content,
        }
    return data


def ask_web_search_agent(
    instruction: str,
    context: str,
    tracker: TokenUsage,
    model: str = DEFAULT_GROQ_MODEL,
    max_steps: int = 3,
    verbose: bool = True,
) -> str:
    """ask_llm function 2: Web Search Agent.
    
    Handles requests requiring web search using Tavily API.
    Can execute multiple searches (up to max_steps) to fulfill the assignment.
    """
    client = Groq(api_key=GROQ_API_KEY)
    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": WEB_SEARCH_AGENT_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Context so far:\n{context}\n\nTask from Manager:\n{instruction}",
        },
    ]

    for step in range(max_steps):
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=[WEB_SEARCH_TOOL],
            tool_choice="auto",
            temperature=0.2,
        )
        if hasattr(resp, "usage") and resp.usage:
            tracker.add(resp.usage)

        msg = resp.choices[0].message
        tool_calls = getattr(msg, "tool_calls", None)

        if tool_calls:
            assistant_msg = {
                "role": "assistant",
                "content": msg.content or "",
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
                if verbose:
                    print(f"   [Web Search Agent] Executing Tavily Search: {tc.function.arguments}", flush=True)
                tool_output = execute_tool(tc.function.name, tc.function.arguments)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "name": tc.function.name,
                        "content": tool_output,
                    }
                )
        else:
            # Agent synthesized findings directly into text
            return msg.content or "Search completed."

    # If max_steps reached, perform final synthesis call
    messages.append({
        "role": "user",
        "content": "You have gathered the search results above. Provide your factual summary report to the Manager now.",
    })
    resp_final = client.chat.completions.create(
        model=model,
        messages=messages,
        tools=[WEB_SEARCH_TOOL],
        tool_choice="auto",
        temperature=0.2,
    )
    if hasattr(resp_final, "usage") and resp_final.usage:
        tracker.add(resp_final.usage)
    return resp_final.choices[0].message.content or "Search summary complete."


def ask_calculator_agent(
    instruction: str,
    context: str,
    tracker: TokenUsage,
    model: str = DEFAULT_GROQ_MODEL,
    max_steps: int = 3,
    verbose: bool = True,
) -> str:
    """ask_llm function 3: Calculator Agent.
    
    Handles requests requiring mathematical calculations using Python calculator tool.
    Can execute multiple calculation steps (up to max_steps) to fulfill the assignment.
    """
    client = Groq(api_key=GROQ_API_KEY)
    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": CALCULATOR_AGENT_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Context / Data available:\n{context}\n\nTask from Manager:\n{instruction}",
        },
    ]

    for step in range(max_steps):
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=[CALCULATOR_TOOL],
            tool_choice="auto",
            temperature=0.0,
        )
        if hasattr(resp, "usage") and resp.usage:
            tracker.add(resp.usage)

        msg = resp.choices[0].message
        tool_calls = getattr(msg, "tool_calls", None)

        if tool_calls:
            assistant_msg = {
                "role": "assistant",
                "content": msg.content or "",
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
                if verbose:
                    print(f"   [Calculator Agent] Evaluating Expression: {tc.function.arguments}", flush=True)
                tool_output = execute_tool(tc.function.name, tc.function.arguments)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "name": tc.function.name,
                        "content": tool_output,
                    }
                )
        else:
            # Agent synthesized calculations directly into text
            return msg.content or "Calculation completed."

    # If max_steps reached, perform final synthesis call
    messages.append({
        "role": "user",
        "content": "Provide your final calculation summary to the Manager now.",
    })
    resp_final = client.chat.completions.create(
        model=model,
        messages=messages,
        tools=[CALCULATOR_TOOL],
        tool_choice="auto",
        temperature=0.0,
    )
    if hasattr(resp_final, "usage") and resp_final.usage:
        tracker.add(resp_final.usage)
    return resp_final.choices[0].message.content or "Calculation summary complete."


# ---------------------------------------------------------------------------
# LangGraph Workflow Construction
# ---------------------------------------------------------------------------

def create_multi_agent_graph(
    manager_tracker: TokenUsage,
    web_tracker: TokenUsage,
    calc_tracker: TokenUsage,
    notes_mgr: NotesManager,
    model: str = DEFAULT_GROQ_MODEL,
    verbose: bool = True,
):
    """Builds and compiles the LangGraph StateGraph connecting Manager, Search, and Calc agents."""

    def manager_node(state: MultiAgentState) -> Dict[str, Any]:
        """Node for Manager Agent."""
        current_iter = state["iteration"] + 1
        scratchpad = state.get("scratchpad", [])
        
        # Build context for manager
        scratchpad_text = "\n".join(
            f"Step {idx+1} [{item['agent']}]:\nInstruction: {item['instruction']}\nResult: {item['result']}\n"
            for idx, item in enumerate(scratchpad)
        )
        if not scratchpad_text:
            scratchpad_text = "No worker steps taken yet."

        current_notes = notes_mgr.read_notes()

        manager_prompt = f"""User Request:
{state['query']}

Manager Notes File Content (Previous Context & Knowledge):
{current_notes}

Worker Progress & Findings Scratchpad:
{scratchpad_text}

Iteration: {current_iter} of {state['max_iterations']}

Review the above state. Decide the next action: 'web_search', 'calculator', or 'finish'.
If you have enough information, synthesize the complete final answer and set action to 'finish'.
"""

        messages = [
            {"role": "system", "content": MANAGER_SYSTEM_PROMPT},
            {"role": "user", "content": manager_prompt},
        ]

        if verbose:
            print(f"\n>>> [Manager Agent] Iteration {current_iter}/{state['max_iterations']} evaluating state...", flush=True)

        decision = ask_manager(messages=messages, tracker=manager_tracker, model=model)
        action = decision.get("action", "finish").lower().strip()
        instruction = decision.get("instruction", "")
        save_note = decision.get("save_note")
        final_ans = decision.get("final_answer", "")
        thought = decision.get("thought", "")

        if verbose:
            print(f"    Thought: {thought}", flush=True)
            print(f"    Selected Action: {action.upper()}", flush=True)
            if instruction:
                print(f"    Worker Instruction: {instruction}", flush=True)

        # Handle notes storage if requested by manager
        if save_note and str(save_note).strip() and str(save_note).lower() != "null":
            notes_mgr.append_note(str(save_note).strip(), tag=f"Iter {current_iter} Note")
            if verbose:
                print(f"    [Notes Updated] Saved note to file: {str(save_note).strip()[:80]}...", flush=True)

        # Guard against exceeding max iterations
        if current_iter >= state["max_iterations"] and action != "finish":
            if verbose:
                print("    [Manager Agent] Reached max iterations, forcing completion.", flush=True)
            action = "finish"
            if not final_ans:
                final_ans = f"Based on the gathered data:\n{scratchpad_text}"

        return {
            "iteration": current_iter,
            "next_action": action,
            "worker_instruction": instruction,
            "final_answer": final_ans,
            "manager_tokens": manager_tracker.to_dict(),
        }

    def web_search_node(state: MultiAgentState) -> Dict[str, Any]:
        """Node for Web Search Agent."""
        instruction = state["worker_instruction"]
        scratchpad = list(state.get("scratchpad", []))
        
        context = "\n".join(
            f"[{item['agent']}]: {item['result']}" for item in scratchpad
        )

        if verbose:
            print(f"\n>>> [Web Search Agent] Received Task: {instruction}", flush=True)

        search_output = ask_web_search_agent(
            instruction=instruction,
            context=context,
            tracker=web_tracker,
            model=model,
            verbose=verbose,
        )

        if verbose:
            preview = search_output[:160] + "..." if len(search_output) > 160 else search_output
            print(f"    [Web Search Agent] Findings: {preview}", flush=True)

        scratchpad.append({
            "agent": "Web Search Agent",
            "instruction": instruction,
            "result": search_output,
        })

        return {
            "scratchpad": scratchpad,
            "worker_output": search_output,
            "web_search_tokens": web_tracker.to_dict(),
        }

    def calculator_node(state: MultiAgentState) -> Dict[str, Any]:
        """Node for Calculator Agent."""
        instruction = state["worker_instruction"]
        scratchpad = list(state.get("scratchpad", []))

        context = "\n".join(
            f"[{item['agent']}]: {item['result']}" for item in scratchpad
        )

        if verbose:
            print(f"\n>>> [Calculator Agent] Received Task: {instruction}", flush=True)

        calc_output = ask_calculator_agent(
            instruction=instruction,
            context=context,
            tracker=calc_tracker,
            model=model,
            verbose=verbose,
        )

        if verbose:
            preview = calc_output[:160] + "..." if len(calc_output) > 160 else calc_output
            print(f"    [Calculator Agent] Calculation: {preview}", flush=True)

        scratchpad.append({
            "agent": "Calculator Agent",
            "instruction": instruction,
            "result": calc_output,
        })

        return {
            "scratchpad": scratchpad,
            "worker_output": calc_output,
            "calculator_tokens": calc_tracker.to_dict(),
        }

    def router(state: MultiAgentState) -> str:
        """Route to appropriate worker node or END based on Manager decision."""
        action = state.get("next_action", "finish")
        if action == "web_search":
            return "web_search"
        elif action == "calculator":
            return "calculator"
        else:
            return END

    # Build LangGraph StateGraph
    workflow = StateGraph(MultiAgentState)

    workflow.add_node("manager", manager_node)
    workflow.add_node("web_search", web_search_node)
    workflow.add_node("calculator", calculator_node)

    workflow.add_edge(START, "manager")
    workflow.add_conditional_edges(
        "manager",
        router,
        {
            "web_search": "web_search",
            "calculator": "calculator",
            END: END,
        },
    )
    workflow.add_edge("web_search", "manager")
    workflow.add_edge("calculator", "manager")

    return workflow.compile()


def run_multi_agent(
    user_query: str,
    max_iterations: int = 6,
    notes_file: Path = DEFAULT_NOTES_FILE,
    model: str = DEFAULT_GROQ_MODEL,
    verbose: bool = True,
) -> Dict[str, Any]:
    """Execute the multi-agent system on a user query."""
    manager_tracker = TokenUsage()
    web_tracker = TokenUsage()
    calc_tracker = TokenUsage()
    notes_mgr = NotesManager(file_path=notes_file)

    if verbose:
        print("\n" + "=" * 65, flush=True)
        print(f"[Multi-Agent System] Initializing with model: {model}", flush=True)
        print(f"[Multi-Agent System] Notes file: {notes_file}", flush=True)
        print(f"[Multi-Agent System] User Query: {user_query}", flush=True)
        print("=" * 65, flush=True)

    app = create_multi_agent_graph(
        manager_tracker=manager_tracker,
        web_tracker=web_tracker,
        calc_tracker=calc_tracker,
        notes_mgr=notes_mgr,
        model=model,
        verbose=verbose,
    )

    initial_state: MultiAgentState = {
        "query": user_query,
        "notes_content": notes_mgr.read_notes(),
        "scratchpad": [],
        "next_action": "manager",
        "worker_instruction": "",
        "worker_output": "",
        "iteration": 0,
        "max_iterations": max_iterations,
        "final_answer": "",
        "manager_tokens": {},
        "web_search_tokens": {},
        "calculator_tokens": {},
    }

    final_state = app.invoke(initial_state)

    total_tracker = manager_tracker.combine(web_tracker).combine(calc_tracker)

    # Automatically save a summary note of the interaction for future queries
    summary_note = (
        f"Query: {user_query}\n"
        f"Resolution: Handled in {final_state['iteration']} iterations with "
        f"{len(final_state['scratchpad'])} worker steps."
    )
    notes_mgr.append_note(summary_note, tag="Session Complete Summary")

    if verbose:
        print("\n" + "=" * 65, flush=True)
        print("[Multi-Agent System] Execution Complete!", flush=True)
        print(f"Total Iterations: {final_state['iteration']}", flush=True)
        print(f"Worker Steps Taken: {len(final_state['scratchpad'])}", flush=True)
        print(f"Manager Tokens:     {manager_tracker.summary()}", flush=True)
        print(f"Web Search Tokens:  {web_tracker.summary()}", flush=True)
        print(f"Calculator Tokens:  {calc_tracker.summary()}", flush=True)
        print(f"Combined Total:     {total_tracker.summary()}", flush=True)
        print("=" * 65 + "\n", flush=True)

    return {
        "system": "Multi-Agent System (LangGraph)",
        "query": user_query,
        "answer": final_state.get("final_answer", ""),
        "iterations": final_state.get("iteration", 0),
        "scratchpad": final_state.get("scratchpad", []),
        "manager_tokens": manager_tracker,
        "web_search_tokens": web_tracker,
        "calculator_tokens": calc_tracker,
        "total_token_usage": total_tracker,
        "notes_file": str(notes_file),
    }
