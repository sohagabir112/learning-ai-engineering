"""Comparison benchmark between Single Agent and Multi-Agent systems."""

import time
from pathlib import Path
from typing import Any, Dict, Optional

from multiagent.config import DEFAULT_GROQ_MODEL, DEFAULT_NOTES_FILE
from multiagent.notes_manager import NotesManager
from multiagent.single_agent import run_single_agent
from multiagent.multi_agent import run_multi_agent

# A complex query involving both web search and multiple calculations
DEFAULT_COMPLEX_QUERY = (
    "Find the current market price or market capitalization of Apple (AAPL) and Microsoft (MSFT). "
    "Then perform the following calculations: "
    "1. Calculate the absolute difference between their values. "
    "2. Calculate Apple's value as a percentage of Microsoft's value. "
    "3. If Apple's value grows by 12% and Microsoft's value grows by 18% over the next year, "
    "what will their new projected values be, what will be their new combined total value, "
    "and what is the overall percentage growth of the combined total?"
)


def run_comparison(
    query: str = DEFAULT_COMPLEX_QUERY,
    model: str = DEFAULT_GROQ_MODEL,
    output_report_path: Optional[Path] = None,
    verbose: bool = True,
) -> Dict[str, Any]:
    """Run both Single Agent and Multi-Agent systems on the same complex query and compare token usage."""
    print("=" * 80)
    print("AGENT SYSTEM BENCHMARK & COMPARISON")
    print("=" * 80)
    print(f"Model: {model}")
    print(f"Test Query:\n{query}\n")

    # -------------------------------------------------------------
    # 1. Run Single Agent System
    # -------------------------------------------------------------
    print("\n" + "#" * 80)
    print("PART 1: RUNNING SINGLE AGENT SYSTEM")
    print("#" * 80)
    t0_single = time.time()
    single_result = run_single_agent(
        user_query=query,
        max_attempts=5,
        model=model,
        verbose=verbose,
    )
    t1_single = time.time()
    single_elapsed = t1_single - t0_single

    # -------------------------------------------------------------
    # 2. Run Multi-Agent System (LangGraph)
    # -------------------------------------------------------------
    print("\n" + "#" * 80)
    print("PART 2: RUNNING MULTI-AGENT SYSTEM (LANGGRAPH)")
    print("#" * 80)
    
    # Use clean notes file or existing notes
    notes_file = DEFAULT_NOTES_FILE
    t0_multi = time.time()
    multi_result = run_multi_agent(
        user_query=query,
        max_iterations=6,
        notes_file=notes_file,
        model=model,
        verbose=verbose,
    )
    t1_multi = time.time()
    multi_elapsed = t1_multi - t0_multi

    # -------------------------------------------------------------
    # 3. Analyze & Compare Token Usages
    # -------------------------------------------------------------
    single_tokens = single_result["token_usage"]
    multi_tokens = multi_result["total_token_usage"]
    mgr_tokens = multi_result["manager_tokens"]
    web_tokens = multi_result["web_search_tokens"]
    calc_tokens = multi_result["calculator_tokens"]

    diff_tokens = multi_tokens.total_tokens - single_tokens.total_tokens
    if single_tokens.total_tokens > 0:
        pct_diff = (diff_tokens / single_tokens.total_tokens) * 100
    else:
        pct_diff = 0.0

    if diff_tokens > 0:
        winner_msg = f"Multi-Agent used {abs(diff_tokens):,} MORE tokens (+{pct_diff:.1f}%) than Single Agent."
    elif diff_tokens < 0:
        winner_msg = f"Single Agent used {abs(diff_tokens):,} MORE tokens than Multi-Agent (-{abs(pct_diff):.1f}%)."
    else:
        winner_msg = "Both systems used the exact same number of tokens."

    # Build Comparison Summary Table
    comparison_table = f"""
========================================================================================
                               TOKEN USAGE COMPARISON
========================================================================================
Metric                   Single Agent               Multi-Agent System (LangGraph)
----------------------------------------------------------------------------------------
Total Tokens             {single_tokens.total_tokens:<26,} {multi_tokens.total_tokens:<26,}
  - Prompt Tokens        {single_tokens.prompt_tokens:<26,} {multi_tokens.prompt_tokens:<26,}
  - Completion Tokens    {single_tokens.completion_tokens:<26,} {multi_tokens.completion_tokens:<26,}
LLM API Calls            {single_tokens.requests_count:<26} {multi_tokens.requests_count:<26}
Execution Time           {single_elapsed:<24.2f}s  {multi_elapsed:<24.2f}s
Iterations / Attempts    {single_result['attempts']:<26} {multi_result['iterations']:<26}
----------------------------------------------------------------------------------------
Multi-Agent Breakdown:
  * Manager LLM:         {mgr_tokens.total_tokens:,} tokens ({mgr_tokens.requests_count} calls) [P: {mgr_tokens.prompt_tokens:,} / C: {mgr_tokens.completion_tokens:,}]
  * Web Search Agent:    {web_tokens.total_tokens:,} tokens ({web_tokens.requests_count} calls) [P: {web_tokens.prompt_tokens:,} / C: {web_tokens.completion_tokens:,}]
  * Calculator Agent:    {calc_tokens.total_tokens:,} tokens ({calc_tokens.requests_count} calls) [P: {calc_tokens.prompt_tokens:,} / C: {calc_tokens.completion_tokens:,}]
----------------------------------------------------------------------------------------
Conclusion: {winner_msg}
========================================================================================
"""
    print(comparison_table)

    # Generate Markdown Report
    notes_mgr = NotesManager(notes_file)
    latest_notes = notes_mgr.read_notes()

    report_md = f"""# Multi-Agent vs. Single Agent System Comparison Report

## Test Configuration
- **Model**: `{model}`
- **Tools Available**: Tavily Web Search & Python Safe Calculator
- **Multi-Agent Framework**: LangGraph StateGraph (Manager, Web Search Agent, Calculator Agent)
- **Notes File**: `{notes_file.name}`

## Test Query
> {query}

---

## Token Usage Comparison

| Metric | Single Agent System | Multi-Agent System (LangGraph) | Difference |
| :--- | :--- | :--- | :--- |
| **Total Tokens** | **{single_tokens.total_tokens:,}** | **{multi_tokens.total_tokens:,}** | **{diff_tokens:+,} ({pct_diff:+.1f}%)** |
| Prompt Tokens | {single_tokens.prompt_tokens:,} | {multi_tokens.prompt_tokens:,} | {multi_tokens.prompt_tokens - single_tokens.prompt_tokens:+,} |
| Completion Tokens | {single_tokens.completion_tokens:,} | {multi_tokens.completion_tokens:,} | {multi_tokens.completion_tokens - single_tokens.completion_tokens:+,} |
| Total LLM Calls | {single_tokens.requests_count} | {multi_tokens.requests_count} | {multi_tokens.requests_count - single_tokens.requests_count:+} |
| Execution Time | {single_elapsed:.2f}s | {multi_elapsed:.2f}s | {multi_elapsed - single_elapsed:+.2f}s |
| Iterations / Steps | {single_result['attempts']} attempts | {multi_result['iterations']} iterations | {len(multi_result['scratchpad'])} worker steps |

### Multi-Agent Token Consumption Breakdown
- **Manager LLM**: {mgr_tokens.total_tokens:,} tokens ({mgr_tokens.requests_count} calls)
  - Prompt: {mgr_tokens.prompt_tokens:,} | Completion: {mgr_tokens.completion_tokens:,}
- **Web Search Agent**: {web_tokens.total_tokens:,} tokens ({web_tokens.requests_count} calls)
  - Prompt: {web_tokens.prompt_tokens:,} | Completion: {web_tokens.completion_tokens:,}
- **Calculator Agent**: {calc_tokens.total_tokens:,} tokens ({calc_tokens.requests_count} calls)
  - Prompt: {calc_tokens.prompt_tokens:,} | Completion: {calc_tokens.completion_tokens:,}

---

## Output Comparison

### 1. Single Agent System Response
{single_result['answer']}

### 2. Multi-Agent System (LangGraph) Response
{multi_result['answer']}

---

## Manager Notes File
The Manager LLM persisted the following interaction context to `{notes_file.name}`:
```
{latest_notes}
```

---

## Architectural Analysis & Token Dynamics

1. **Why do token counts differ?**
   - **Single Agent Overhead vs Context Accumulation**: The single agent system uses a single message thread where each tool call and its output accumulate into the context history of subsequent turns. If tool responses (e.g. web search snippets) are large, every following attempt re-sends that entire accumulated history.
   - **Multi-Agent Coordination Overhead**: The multi-agent system introduces an orchestrator (Manager LLM) which requires its own prompt, scratchpad summary, and routing decisions. However, worker agents (Search and Calculator) operate with specialized, isolated prompts containing only their specific instruction, keeping their individual tool contexts focused.
   - **Token Winner**: {winner_msg}

2. **Key Benefits of Multi-Agent Architecture**:
   - **Modularity**: Specialized prompts and instructions for each domain (web research vs precision math).
   - **State Persistence**: The Manager Agent has a dedicated notes file for long-term memory and context retention across user interactions.
   - **Scalability**: New specialized worker agents (e.g., Code Executor, SQL Agent, Summarizer) can be added to the LangGraph graph without polluting the single agent's prompt.
"""

    if output_report_path:
        Path(output_report_path).write_text(report_md, encoding="utf-8")
        print(f"\n[Comparison] Detailed report written to: {output_report_path}")

    return {
        "query": query,
        "single_result": single_result,
        "multi_result": multi_result,
        "comparison_table": comparison_table,
        "report_md": report_md,
        "diff_tokens": diff_tokens,
        "pct_diff": pct_diff,
        "winner_msg": winner_msg,
    }
