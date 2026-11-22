from typing import TypedDict
from langgraph.graph import END, StateGraph

class State(TypedDict):
    number : int

def double_number(state: State) -> dict:
    boardnumber = state["number"]
    new_number = boardnumber * 2
    print(f"Doubling {boardnumber} to get {new_number}")
    return {"number": new_number}

def finish(state: State) -> dict:
    boardnumber = state["number"]
    print(f"Finishing with number {boardnumber}")
    return {"number": boardnumber}

def dicision(state: State) -> str:
    boardnumber = state["number"]
    if boardnumber < 100:
        return "double"
    else:
        return "finish"

builder = StateGraph(State)
builder.add_node("double", double_number)
builder.add_node("finish", finish)

# Entry point 

builder.set_entry_point("double")

builder.add_conditional_edges(
    "double", 
    dicision,
    {
        "double": "double",
        "finish": "finish"
    }
)

builder.add_edge("finish", END)

graph = builder.compile()


if __name__ == "__main__":
    result = graph.invoke({"number": 98})