"""
A simple calculator module providing basic arithmetic operations.

This module implements a Calculator class with methods for addition,
subtraction, multiplication, and division, along with comprehensive
error handling and input validation.
"""

from typing import Union

Number = Union[int, float]


class Calculator:
    """A calculator that performs basic arithmetic operations.

    Attributes:
        history: A list of tuples containing the operation name,
                 operands, and result for each calculation performed.
    """

    def __init__(self) -> None:
        """Initialize the Calculator with an empty history."""
        self.history: list[tuple[str, Number, Number, Number]] = []

    def _validate_inputs(self, a: Number, b: Number) -> None:
        """Validate that both inputs are numeric types.

        Args:
            a: The first operand.
            b: The second operand.

        Raises:
            TypeError: If either operand is not a numeric type.
        """
        if not isinstance(a, (int, float)):
            raise TypeError(f"Expected numeric type for first operand, got {type(a).__name__}")
        if not isinstance(b, (int, float)):
            raise TypeError(f"Expected numeric type for second operand, got {type(b).__name__}")

    def add(self, a: Number, b: Number) -> Number:
        """Add two numbers together.

        Args:
            a: The first number.
            b: The second number.

        Returns:
            The sum of a and b.

        Raises:
            TypeError: If either argument is not a numeric type.
        """
        self._validate_inputs(a, b)
        result: Number = a + b
        self.history.append(("add", a, b, result))
        return result

    def subtract(self, a: Number, b: Number) -> Number:
        """Subtract the second number from the first.

        Args:
            a: The number to subtract from.
            b: The number to subtract.

        Returns:
            The difference of a and b.

        Raises:
            TypeError: If either argument is not a numeric type.
        """
        self._validate_inputs(a, b)
        result: Number = a - b
        self.history.append(("subtract", a, b, result))
        return result

    def multiply(self, a: Number, b: Number) -> Number:
        """Multiply two numbers together.

        Args:
            a: The first factor.
            b: The second factor.

        Returns:
            The product of a and b.

        Raises:
            TypeError: If either argument is not a numeric type.
        """
        self._validate_inputs(a, b)
        result: Number = a * b
        self.history.append(("multiply", a, b, result))
        return result

    def divide(self, a: Number, b: Number) -> float:
        """Divide the first number by the second.

        Args:
            a: The dividend.
            b: The divisor.

        Returns:
            The quotient of a divided by b as a float.

        Raises:
            TypeError: If either argument is not a numeric type.
            ZeroDivisionError: If the divisor is zero.
        """
        self._validate_inputs(a, b)
        if b == 0:
            raise ZeroDivisionError("Cannot divide by zero.")
        result: float = a / b
        self.history.append(("divide", a, b, result))
        return result

    def get_history(self) -> list[tuple[str, Number, Number, Number]]:
        """Retrieve the full calculation history.

        Returns:
            A list of tuples, each containing the operation name,
            the two operands, and the result.
        """
        return list(self.history)

    def clear_history(self) -> None:
        """Clear all entries from the calculation history."""
        self.history.clear()


def main() -> None:
    """Demonstrate the Calculator class with sample operations."""
    calc: Calculator = Calculator()

    print(f"Addition:       10 + 3 = {calc.add(10, 3)}")
    print(f"Subtraction:    10 - 3 = {calc.subtract(10, 3)}")
    print(f"Multiplication: 10 * 3 = {calc.multiply(10, 3)}")
    print(f"Division:       10 / 3 = {calc.divide(10, 3):.4f}")

    print(f"\nCalculation history: {calc.get_history()}")


if __name__ == "__main__":
    main()
