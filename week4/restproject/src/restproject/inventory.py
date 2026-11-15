"""Thread-safe in-memory inventory repository."""

from __future__ import annotations

import threading
from copy import deepcopy


class InventoryError(Exception):
    """Raised when an inventory operation fails."""


class InventoryRepository:
    """In-memory dish inventory with atomic reserve / release.

    All public methods are safe to call from concurrent threads.
    """

    def __init__(self, stock: dict[str, int]) -> None:
        self._stock: dict[str, int] = {k.strip().lower(): v for k, v in stock.items()}
        self._lock = threading.Lock()

    # -- read -----------------------------------------------------------------

    def get(self, dish: str) -> int | None:
        """Return the current stock for *dish*, or ``None`` if it is not on the menu."""
        with self._lock:
            key = dish.strip().lower()
            if key not in self._stock:
                return None
            return self._stock[key]

    def snapshot(self) -> dict[str, int]:
        """Return a full copy of the current stock levels."""
        with self._lock:
            return deepcopy(self._stock)

    # -- write ----------------------------------------------------------------

    def reserve(self, dish: str, quantity: int) -> int:
        """Atomically check stock and decrement by *quantity*.

        Returns the stock level *before* the reservation.
        Raises ``InventoryError`` if the dish is missing or stock is
        insufficient.
        """
        with self._lock:
            key = dish.strip().lower()
            if key not in self._stock:
                raise InventoryError(f"{dish!r} is not on the menu")
            current = self._stock[key]
            if current < quantity:
                raise InventoryError(
                    f"Cannot reserve {quantity} of {dish!r}: only {current} in stock"
                )
            self._stock[key] = current - quantity
            return current

    def release(self, dish: str, quantity: int) -> None:
        """Return *quantity* units back to stock.  Idempotent for unknown dishes."""
        with self._lock:
            key = dish.strip().lower()
            if key in self._stock:
                self._stock[key] += quantity
