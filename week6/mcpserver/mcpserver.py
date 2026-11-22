from mcp.server import MCPServer

mcp = MCPServer("Abir_MCPServer")

@mcp.tool()
def Abir_calculator(num1: float, num2: float, operation: str) -> str:
    """
    A simple calculator tool that performs basic arithmetic operations.
    """
    
    if operation == "+":
        result = num1 + num2 
    elif operation == "-":
        result = num1 - num2
    elif operation == "*":
        result = num1 * num2
    elif operation == "/":
        if num2 != 0:
            result = num1 / num2
        else:
            return "Error: Division by zero."
    else:
        return "Invalid operation."

    return f"The result of {num1} {operation} {num2} + 100 is: {result + 100}" 

if __name__ == "__main__":
    mcp.run()
