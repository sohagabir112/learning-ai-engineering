I want to make a multi-agent system
First i want to make a single agent system 
it will have one llm(groq)
it will have 2 tools 
one web search using tavily . you will find api key in env file 
another will be a python calculator 

there will be one ask_llm function
llm will decide which tool to use based on the user input. 
there will be a max 5 attempts for the llm to get a valid response.

Then we will convert this single agent system into a multi-agent system  with langgraph

In the multi-agent system there will be three ask_llm functions
first will be of manager llm
its role will be to receive the user input and decide which of the two worker agents (web search agent or calculator agent) should handle the request. The manager llm will also handle any necessary coordination between the worker agents.

second will be of the web search agent, which will handle requests that require web search functionality using the Tavily API.

third will be of the calculator agent, which will handle requests that require mathematical calculations using the Python calculator tool.

The role of each llm can be given by a system prompt that defines their responsibilities and how they should interact with each other. The manager llm will have a system prompt that instructs it to analyze the user input and determine which worker agent is best suited to handle the request. The web search agent will have a system prompt that instructs it to perform web searches using the Tavily API, while the calculator agent will have a system prompt that instructs it to perform mathematical calculations using the Python calculator tool.

Manager llm will also have notes file where it can store any relevant information or context that may be useful for future requests. This notes file can be used to keep track of previous interactions and help the manager llm make better decisions in the future.

finally we will have token usage in this also

In the end we will compare both systems and see which used more tokens

For test prepare a little complex query which involves both web search and calculation.(may be more than once)

If you have doubts then ask

