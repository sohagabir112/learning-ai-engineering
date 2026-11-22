"""
Fibonacci sequence generator with memoization.

This module provides efficient Fibonacci number computation
using memoization to avoid redundant recursive calculations.
"""

from typing import Optional


def fibonacci_memoized(
    n: int,
    memo: Optional[dict[int, int]] = None,
) -> int:
    """Compute the nth Fibonacci number using memoization.

    Args:
        n: The index of the Fibonacci number to compute.
            Must be a non-negative integer.
        memo: An optional dictionary for caching previously
            computed Fibonacci values. If None, a new cache
            is created.

    Returns:
        The nth Fibonacci number.

    Raises:
        ValueError: If n is a negative integer.
        TypeError: If n is not an integer.
    """
    if not isinstance(n, int):
        raise TypeError(f"Expected an integer, got {type(n).__name__}.")
    if n < 0:
        raise ValueError(f"Fibonacci is not defined for negative numbers: {n}.")

    if memo is None:
        memo = {}

    if n in memo:
        return memo[n]

    if n <= 1:
        return n

    memo[n] = fibonacci_memoized(n - 1, memo) + fibonacci_memoized(n - 2, memo)
    return memo[n]


def generate_fibonacci_sequence(length: int) -> list[int]:
    """Generate a Fibonacci sequence of the specified length.

    Args:
        length: The number of Fibonacci numbers to generate.
            Must be a non-negative integer.

    Returns:
        A list containing the first `length` Fibonacci numbers.

    Raises:
        ValueError: If length is negative.
    """
    if length < 0:
        raise ValueError(f"Length must be non-negative, got {length}.")

    memo: dict[int, int] = {}
    return [fibonacci_memoized(i, memo) for i in range(length)]


def main() -> None:
    """Demonstrate Fibonacci computation with sample inputs."""
    print("Fibonacci sequence (first 15 numbers):")
    sequence: list[int] = generate_fibonacci_sequence(15)
    print(sequence)

    print(f"\nFibonacci(10) = {fibonacci_memoized(10)}")
    print(f"Fibonacci(20) = {fibonacci_memoized(20)}")
    print(f"Fibonacci(30) = {fibonacci_memoized(30)}")


if __name__ == "__main__":
    main()
