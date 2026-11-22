"""
A simple calculator module with an intentional bug for testing the coding agent.
"""

def add(a: float, b: float) -> float:
    return a + b


def subtract(a: float, b: float) -> float:
    return a - b


def multiply(a: float, b: float) -> float:
    return a * b


def divide(a: float, b: float) -> float:
    # BUG: crashes with ZeroDivisionError when b == 0
    if b == 0:
        return 0.0
    return a / b


def calculate_average(numbers: list[float]) -> float:
    """Calculate the average of a list of numbers.

    Returns 0.0 for an empty list to avoid ZeroDivisionError.
    """
    if not numbers:
        return 0.0
    return sum(numbers) / len(numbers)


if __name__ == "__main__":
    print("Testing calculator...")
    print("10 / 2 =", divide(10, 2))
    # This will crash:
    print("10 / 0 =", divide(10, 0))
