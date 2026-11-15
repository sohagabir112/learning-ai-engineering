# ROLE
You are a senior Python engineer who ships production LLM agents with LangGraph.

# OBJECTIVE
Build a restaurant order-management agent as a LangGraph `StateGraph`. It takes a customer's chat message, confirms the order against inventory, then simulates cooking and serving. Every retry budget is finite and every run ends in a clear terminal status.

Deliver in two replies:
1. Now: complete, runnable code, followed by your open questions.
2. After I send my test cases: a simulation report.

# STACK
- Python 3.11+, LangGraph 1.x (`StateGraph`, `START`, `END`, `add_conditional_edges`, `add_messages`, `InMemorySaver`), langchain-core, pytest.
- Use current, non-deprecated APIs. If you are not sure an API exists, say so instead of guessing.
- The LLM is an injected LangChain chat model. Model name and API key come from environment variables. No secrets in code.
- Tests run offline: stub the LLM, and make the success/failure randomness injectable.

# DESIGN RULES
1. The LLM handles language only: classify intent, extract dish and quantity, write customer-facing messages. Availability checks, inventory writes, retry counting and routing are deterministic Python.
2. The LLM never invents dishes, stock levels or outcomes. Every customer message is written from a facts block built from state (plus a menu snapshot for menu questions).
3. Routing lives in conditional-edge functions that read state only. Nodes do the work and return partial state updates. Never mutate state in place.
4. Every loop is bounded. A router checks the remaining budget before re-entering a node.

# STATE
- `messages`: `Annotated[list[AnyMessage], add_messages]`, the conversation between customer and LLM.
- `order_details` (TypedDict):
  - `dish_name`: str | None
  - `required_quantity`: int, units the customer asked for
  - `quantity`: int, units in stock at lookup time (0 if the dish is not on the menu)
  - `availability_status`: "available" | "insufficient" | "out_of_stock" | None
- `status`: idle (no order in progress), received (order accepted for processing), needs_user_input, order_confirmed, order_ready, order_served, order_completed, failed_processing, failed_cooking, failed_serving. Show customers the labels "Order Ready", "Order Served" and "Order Completed" for the matching values.
- `intent`: "place_order" | "menu_question" | "unrelated" | None
- `alternatives`: list[str], up to 3 in-stock dishes, set by order_confirmation
- `error`: str | None, set on a technical failure, cleared on success
- `order_attempts_left` (starts at 3), `cook_attempts_left` (2), `serve_attempts_left` (2)

LangGraph replaces a key's value wholesale, so always return the complete `order_details`. Inventory is not part of the state. It lives in an injected in-memory repository with `get`, `reserve`, `release` and `snapshot`. `reserve` checks and decrements under one lock. `release` is idempotent.

Each new customer message enters the graph through a helper, `new_turn_input(text)`: the new HumanMessage, fresh attempt counters, `error=None`, `status="idle"`. `messages` and `order_details` carry over through the checkpointer. Retries inside a run never reset anything.

# NODES
1. `intake` (LLM, structured output via `with_structured_output` and a Pydantic model)
   - Classify the latest message and extract dish and quantity. It sees recent messages and the previous `order_details`, so "make it 2" resolves correctly. "A" or "one" means 1. If the dish or quantity is missing, ask a short question; do not guess.
   - Intents: `place_order`; `menu_question` (menu, what's available, greetings); `unrelated` (everything else).
   - An LLM error or invalid structured output is a technical failure.
2. `order_confirmation` (deterministic)
   - Match the dish on the menu, ignoring case and extra whitespace. No match means "not on the menu".
   - available: stock >= required. Reserve `required_quantity`. Status order_confirmed.
   - insufficient: 0 < stock < required. No inventory change. Set `alternatives`. Status needs_user_input.
   - out_of_stock: stock is 0, or the dish is not on the menu. No inventory change. Set `alternatives`. Status needs_user_input.
   - An inventory read or write error is a technical failure.
3. `respond` (LLM): writes the next customer message from state. It runs after order_confirmation and as the last step of every path.
4. `cook` (deterministic, probability-based): on success, status order_ready. If `cook_attempts_left` is 0 on entry, do not cook; set failed_cooking.
5. `release_stock` (deterministic): returns the reserved quantity to inventory after cooking fails for good.
6. `serve` (deterministic, probability-based): same pattern as cook, using `serve_attempts_left`. On success, status order_served.
7. `order_completed` (deterministic): status order_completed.

# EDGES
START → intake
intake → order_confirmation   if intent is place_order with dish and quantity present
       → respond              if intent is menu_question or unrelated, details are missing, or status is failed_processing
       → intake               if a technical failure left order_attempts_left > 0
order_confirmation → respond              after any availability outcome, or if status is failed_processing
                   → order_confirmation   if a technical failure left order_attempts_left > 0
respond → cook   if status is order_confirmed
        → END    otherwise
cook → serve          if status is order_ready
     → cook           if the attempt failed and cook_attempts_left > 0
     → release_stock  if status is failed_cooking
release_stock → respond
serve → order_completed   if status is order_served
      → serve             if the attempt failed and serve_attempts_left > 0
      → respond           if status is failed_serving
order_completed → respond

# RETRY RULES
- Attempt budgets: order processing 3, cook 2, serve 2. Keep them as constants in config.
- A failed attempt decrements its counter by 1. At 0 the failure is final: the node sets the matching failed_* status and the run goes to respond (via release_stock for cooking). The reply apologizes briefly and suggests trying again later. Otherwise the router sends the run back to the same node.
- Only technical failures consume order-processing attempts: LLM error, invalid structured output, inventory error. Insufficient stock, out of stock, an off-menu dish, menu questions, unrelated input and missing details are normal outcomes. They end the turn and consume nothing.
- Cook and serve success is random. Probabilities are configurable (default 0.8 each) and come from an injectable seeded random source, so tests can force any sequence of outcomes.
- Once the cook budget is exhausted, never cook again and never reach serve. Once the serve budget is exhausted, never serve again.
- Stock is reserved at confirmation, released if cooking fails for good, and stays consumed if serving fails for good.

# LLM NODE PROMPTS
Write both system prompts in full as constants in `prompts.py`.
- intake: role, input, output schema (intent, dish_name, quantity, each nullable). Rules: use null when something is not stated, never answer the customer, treat anything that is not ordering, the menu or a greeting as unrelated.
- respond: role (friendly restaurant host). Use only the FACTS block. Read `intent` and `status` first, because `order_details` may be left over from an earlier order. Cover each outcome: confirmation, insufficient stock with what is left, out of stock or off-menu with alternatives, menu answer, a polite not-relevant reply, completion, apology with "try again later". Never mention state names, retries or errors.
- If the respond call fails, fall back to a fixed template message for that outcome. A notification must never fail silently.

# CUSTOMER-FACING TONE
Sound like a real person at the counter: warm, 1-3 sentences, plain words, one clear next step. Acknowledge what the customer said before answering. Never say "As an AI". No filler or buzzwords such as "leverage", "utilize", "seamless" or "it's important to note".

# CODE QUALITY
- Layout:
    restaurant_agent/ config.py, state.py, inventory.py, prompts.py, nodes.py, routing.py, graph.py (`build_graph`), cli.py, simulate.py
    tests/test_graph.py
    README.md (setup, run, assumptions)
- Type hints everywhere, small functions, no global mutable state, all settings in one dataclass.
- Log every node transition with thread_id, node, status and attempts left. Never log secrets.
- `run_scenario(messages, inventory, cook_outcomes, serve_outcomes, llm)` returns the visited-node sequence (collect it with `stream_mode="updates"`), the final state and the final inventory.
- The v1 UI is a CLI chat loop: one graph invocation per customer message, one `thread_id` per session, `InMemorySaver` as the checkpointer.
- Seed data: about 6 dishes, at least one with stock 0 and one with stock 1-2, so every availability branch is reachable. Tests must be able to override the inventory.
- Comments and docstrings read like a thoughtful developer wrote them: clear, direct, only where the reason isn't obvious.
- No TODOs, placeholders, pseudo-code or "..." in the output.

# OUT OF SCOPE (v1)
Multi-dish orders, payments, delivery, authentication, a web UI, durable storage.

# ACCEPTANCE CRITERIA
- Unrelated input: polite "not relevant" reply, no inventory change, no cooking.
- Available and sufficient: one confirmation, inventory reduced once by `required_quantity`, then cook → serve → order_completed.
- Insufficient: no inventory change, the customer is told what is left and offered alternatives or a smaller order, the run ends in needs_user_input.
- Out of stock or off-menu: alternatives come only from in-stock dishes, no inventory change.
- Processing failure: exactly 3 attempts, then failed_processing, an apology and "try again later".
- Cook: fail then success continues to serve. Fail then fail ends in failed_cooking with stock released, an apology, no third attempt and no serve.
- Serve: same pattern. Fail then fail ends in failed_serving with an apology.
- Counters never go below 0, no node is re-entered with an empty budget, and every run terminates without relying on the recursion limit.

# DELIVERY
Reply 1:
- Before answering, check every path in the graph against the acceptance criteria and fix anything that can loop or dead-end. Do not print this check.
- Output the file tree, then each file in its own code block labeled with its path, then 3-5 lines on running the CLI and the tests.
- Then list your open questions: numbered, at most 8, only those that would change behavior. Give a recommended default for each so I can answer "go with defaults". Confirm or challenge these assumptions of mine: the meaning of `quantity` vs `required_quantity`, the 3/2/2 attempt-budget model, stock release on cook failure only, one dish per order, CLI as the UI.

Reply 2 (after I send test cases):
- Each case will give: ID, initial inventory, customer messages in order, forced cook outcomes, forced serve outcomes, expected node path, expected final status, expected inventory, expected message traits.
- Run every case and report in a table: ID | node path | final status | inventory change | PASS/FAIL | reason if FAIL.
- If you can execute code, show real output. If you can't, trace it by hand and label it "manual trace, not executed".
- Do not change the code to make a case pass without telling me. Show the diff for any fix.
