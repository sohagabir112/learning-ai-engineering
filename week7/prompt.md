create a simple agent system
there will one llm function use groq api and model will be qwen3.8-27b

see the api key in my env file and load them using python dot env maintain the coding structure

now there willbe one tool called get_order_history
prepare 10 customers  demo data
it will have order id in the format of "ORD-XXXX" where XXXX is a random 4-digit number, customer name, and order date. The get_order_history tool will take a customer name as input and return the order history for that customer.

the system is of an electronic shop and the users can do only one action which is to get the order history of a customer by providing their name or order id.

it will return the order history in a structured format, including the order id, customer name, item_name, price and order date, status of the order (e.g.,"out for delivery", "delivered", "pending", "canceled").

code every things in single file
for now do not write any test cases and do not include any eval observility and guardrails.
also do not try to protect the llm any prompt injection attacks or unrelated requests because i want to implement later .

once it done show me how to run the code in uv
in codespace . add all required dependencie accordingly.

```python