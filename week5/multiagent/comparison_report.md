# Multi-Agent vs. Single Agent System Comparison Report

## Test Configuration
- **Model**: `openai/gpt-oss-120b`
- **Tools Available**: Tavily Web Search & Python Safe Calculator
- **Multi-Agent Framework**: LangGraph StateGraph (Manager, Web Search Agent, Calculator Agent)
- **Notes File**: `manager_notes.txt`

## Test Query
> Find the current market price or market capitalization of Apple (AAPL) and Microsoft (MSFT). Then perform the following calculations: 1. Calculate the absolute difference between their values. 2. Calculate Apple's value as a percentage of Microsoft's value. 3. If Apple's value grows by 12% and Microsoft's value grows by 18% over the next year, what will their new projected values be, what will be their new combined total value, and what is the overall percentage growth of the combined total?

---

## Token Usage Comparison

| Metric | Single Agent System | Multi-Agent System (LangGraph) | Difference |
| :--- | :--- | :--- | :--- |
| **Total Tokens** | **10,773** | **7,612** | **-3,161 (-29.3%)** |
| Prompt Tokens | 9,623 | 5,227 | -4,396 |
| Completion Tokens | 1,150 | 2,385 | +1,235 |
| Total LLM Calls | 3 | 6 | +3 |
| Execution Time | 22.87s | 26.58s | +3.71s |
| Iterations / Steps | 3 attempts | 2 iterations | 1 worker steps |

### Multi-Agent Token Consumption Breakdown
- **Manager LLM**: 4,486 tokens (2 calls)
  - Prompt: 2,695 | Completion: 1,791
- **Web Search Agent**: 0 tokens (0 calls)
  - Prompt: 0 | Completion: 0
- **Calculator Agent**: 3,126 tokens (4 calls)
  - Prompt: 2,532 | Completion: 594

---

## Output Comparison

### 1. Single Agent System Response
**Current market capitalizations (as of the latest data in the search results)**  

| Company | Ticker | Market Capitalization |
|---------|--------|-----------------------|
| Apple   | AAPL   | **$5.177 trillion** |
| Microsoft | MSFT | **$3.890 trillion** |

*Source:* CompaniesMarketCap.com listing shows Apple at $5.177 T and Microsoft at $3.890 T【1†L1-L8】.

---

### 1. Absolute difference  
\[
\text{Difference} = 5.177\ \text{T} - 3.890\ \text{T} = \mathbf{1.287\ \text{trillion}}
\]

### 2. Apple’s value as a percentage of Microsoft’s value  
\[
\frac{5.177}{3.890}\times 100 = \mathbf{133.08\%}
\]

### 3. Projected values after one year of growth  

| Company | Current (T) | Growth Rate | Projected (T) |
|---------|-------------|-------------|---------------|
| Apple   | 5.177 | **12 %** | \(5.177 \times 1.12 = \mathbf{5.798\ \text{trillion}}\) |
| Microsoft | 3.890 | **18 %** | \(3.890 \times 1.18 = \mathbf{4.590\ \text{trillion}}\) |

**New combined total**  
\[
5.798\ \text{T} + 4.590\ \text{T} = \mathbf{10.388\ \text{trillion}}
\]

**Overall percentage growth of the combined total**  

\[
\frac{(10.388\ \text{T}) - (5.177\ \text{T} + 3.890\ \text{T})}{5.177\ \text{T} + 3.890\ \text{T}} \times 100
= \frac{10.388 - 9.067}{9.067} \times 100
= \mathbf{14.57\%}
\]

---

### Summary of results
- **Absolute difference:** **$1.287 trillion**  
- **Apple’s market cap as % of Microsoft’s:** **133.08 %**  
- **Projected Apple market cap (12 % growth):** **$5.798 trillion**  
- **Projected Microsoft market cap (18 % growth):** **$4.590 trillion**  
- **Projected combined market cap:** **$10.388 trillion**  
- **Overall combined growth:** **14.57 %**  

These figures give a clear picture of the current size relationship between Apple and Microsoft and how their valuations would change under the specified growth assumptions.

### 2. Multi-Agent System (LangGraph) Response
**Current Market Capitalizations (Nov 2026)**
- Apple (AAPL): **$5,177 billion**
- Microsoft (MSFT): **$3,950 billion**

**1. Absolute difference**
- $5,177 B − $3,950 B = **$1,227 billion**

**2. Apple’s value as a percentage of Microsoft’s value**
- ($5,177 B / $3,950 B) × 100 ≈ **131.2 %**

**3. Projected values after one year of growth**
- Apple grows by 12 %: $5,177 B × 1.12 = **$5,798.24 billion**
- Microsoft grows by 18 %: $3,950 B × 1.18 = **$4,661.00 billion**

**New combined total value**
- $5,798.24 B + $4,661.00 B = **$10,459.24 billion**

**Overall percentage growth of the combined total**
- Original combined total: $5,177 B + $3,950 B = $9,127 billion
- Growth: ($10,459.24 B − $9,127 B) / $9,127 B × 100 ≈ **14.6 %**

**Summary**
- Apple’s market cap exceeds Microsoft’s by $1.227 trillion.
- Apple is about 31 % larger than Microsoft (131 % of Microsoft’s size).
- After the projected growth rates, Apple would be worth roughly $5.80 trillion and Microsoft $4.66 trillion, giving a combined market cap of about $10.46 trillion—a 14.6 % increase over today’s combined $9.13 trillion.

*All figures are based on the latest publicly reported market capitalizations as of November 2026.*

---

## Manager Notes File
The Manager LLM persisted the following interaction context to `manager_notes.txt`:
```
[2026-11-15 23:56:26] [Iter 2 Note]
15% of 840 equals 126.

[2026-11-15 23:56:26] [Session Complete Summary]
Query: What is 15 percent of 840?
Resolution: Handled in 2 iterations with 1 worker steps.

[2026-11-16 00:11:51] [Iter 2 Note]
Apple market cap $5,177B; Microsoft market cap $3,950B (as of Nov 2026).

[2026-11-16 00:12:31] [Iter 3 Note]
Apple market cap $5,177.00B (Nov 15 2026); Microsoft market cap $3,950.00B (Oct 27 2026).

[2026-11-16 00:13:22] [Iter 4 Note]
Apple market cap $5,177B; Microsoft market cap $3,950B (Nov 2026).

[2026-11-16 00:13:22] [Session Complete Summary]
Query: Find the current market price or market capitalization of Apple (AAPL) and Microsoft (MSFT). Then perform the following calculations: 1. Calculate the absolute difference between their values. 2. Calculate Apple's value as a percentage of Microsoft's value. 3. If Apple's value grows by 12% and Microsoft's value grows by 18% over the next year, what will their new projected values be, what will be their new combined total value, and what is the overall percentage growth of the combined total?
Resolution: Handled in 4 iterations with 3 worker steps.

[2026-11-16 00:15:01] [Iter 1 Note]
Apple market cap $5,177 B; Microsoft market cap $3,950 B (Nov 2026).

[2026-11-16 00:15:59] [Iter 3 Note]
Apple market cap $5,177 B; Microsoft market cap $3,950 B (Nov 2026) used for calculations.

[2026-11-16 00:15:59] [Session Complete Summary]
Query: Find the current market price or market capitalization of Apple (AAPL) and Microsoft (MSFT). Then perform the following calculations: 1. Calculate the absolute difference between their values. 2. Calculate Apple's value as a percentage of Microsoft's value. 3. If Apple's value grows by 12% and Microsoft's value grows by 18% over the next year, what will their new projected values be, what will be their new combined total value, and what is the overall percentage growth of the combined total?
Resolution: Handled in 3 iterations with 2 worker steps.

[2026-11-16 00:23:16] [Iter 2 Note]
Apple market cap $5,177 B; Microsoft market cap $3,950 B (Nov 2026). Calculated: absolute diff 1,227 B; Apple = 131.2% of Microsoft; projected Apple $5,798.24 B, Microsoft $4,661.0 B; combined projected $10,459.24 B; overall combined growth 14.6%.

[2026-11-16 00:23:16] [Session Complete Summary]
Query: Find the current market price or market capitalization of Apple (AAPL) and Microsoft (MSFT). Then perform the following calculations: 1. Calculate the absolute difference between their values. 2. Calculate Apple's value as a percentage of Microsoft's value. 3. If Apple's value grows by 12% and Microsoft's value grows by 18% over the next year, what will their new projected values be, what will be their new combined total value, and what is the overall percentage growth of the combined total?
Resolution: Handled in 2 iterations with 1 worker steps.
```

---

## Architectural Analysis & Token Dynamics

1. **Why do token counts differ?**
   - **Single Agent Overhead vs Context Accumulation**: The single agent system uses a single message thread where each tool call and its output accumulate into the context history of subsequent turns. If tool responses (e.g. web search snippets) are large, every following attempt re-sends that entire accumulated history.
   - **Multi-Agent Coordination Overhead**: The multi-agent system introduces an orchestrator (Manager LLM) which requires its own prompt, scratchpad summary, and routing decisions. However, worker agents (Search and Calculator) operate with specialized, isolated prompts containing only their specific instruction, keeping their individual tool contexts focused.
   - **Token Winner**: Single Agent used 3,161 MORE tokens than Multi-Agent (-29.3%).

2. **Key Benefits of Multi-Agent Architecture**:
   - **Modularity**: Specialized prompts and instructions for each domain (web research vs precision math).
   - **State Persistence**: The Manager Agent has a dedicated notes file for long-term memory and context retention across user interactions.
   - **Scalability**: New specialized worker agents (e.g., Code Executor, SQL Agent, Summarizer) can be added to the LangGraph graph without polluting the single agent's prompt.
