"""Offline tests for the restaurant order agent.

All tests stub the LLM and inject deterministic cook/serve outcomes.
"""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock

from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel

from restproject.config import AgentConfig
from restproject.inventory import InventoryRepository
from restproject.nodes import IntakeExtraction
from restproject.simulate import run_scenario


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_stub_llm(
    intake_results: list[IntakeExtraction] | None = None,
    respond_text: str = "Sure thing!",
):
    """Build a fake LLM that returns canned structured output for intake
    and plain AIMessages for respond.

    The stub distinguishes intake calls (which go through
    `with_structured_output`) from respond calls (plain `invoke`).
    """
    intake_iter = iter(intake_results or [])

    class _StructuredStub:
        def invoke(self, messages, **kw):
            return next(intake_iter)

    class _LLMStub:
        def with_structured_output(self, schema):
            return _StructuredStub()

        def invoke(self, messages, **kw):
            return AIMessage(content=respond_text)

    return _LLMStub()


def _default_inventory() -> dict[str, int]:
    return {
        "burger": 10,
        "pizza": 8,
        "pasta": 6,
        "salad": 5,
        "sushi": 0,
        "steak": 2,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestUnrelatedInput:
    """Unrelated input → polite reply, no inventory change, no cooking."""

    def test_unrelated(self):
        llm = _make_stub_llm(
            intake_results=[
                IntakeExtraction(intent="unrelated", dish_name=None, quantity=None),
            ],
            respond_text="I can only help with restaurant orders!",
        )
        visited, state, inv = run_scenario(
            messages=["What's the weather?"],
            inventory=_default_inventory(),
            cook_outcomes=[],
            serve_outcomes=[],
            llm=llm,
        )
        assert "cook" not in visited
        assert state["status"] == "idle"
        assert inv == _default_inventory()


class TestMenuQuestion:
    """Menu question → respond with menu info, no cooking."""

    def test_menu_question(self):
        llm = _make_stub_llm(
            intake_results=[
                IntakeExtraction(intent="menu_question", dish_name=None, quantity=None),
            ],
            respond_text="We have burgers, pizza, pasta, salad, sushi, and steak!",
        )
        visited, state, inv = run_scenario(
            messages=["What's on the menu?"],
            inventory=_default_inventory(),
            cook_outcomes=[],
            serve_outcomes=[],
            llm=llm,
        )
        assert "cook" not in visited
        assert inv == _default_inventory()


class TestSuccessfulOrder:
    """Available dish, sufficient stock → confirm, cook, serve, complete."""

    def test_happy_path(self):
        llm = _make_stub_llm(
            intake_results=[
                IntakeExtraction(intent="place_order", dish_name="burger", quantity=2),
            ],
        )
        visited, state, inv = run_scenario(
            messages=["I'd like 2 burgers please"],
            inventory=_default_inventory(),
            cook_outcomes=[True],
            serve_outcomes=[True],
            llm=llm,
        )
        assert "order_confirmation" in visited
        assert "cook" in visited
        assert "serve" in visited
        assert "order_completed" in visited
        assert state["status"] == "order_completed"
        assert inv["burger"] == 8  # 10 - 2


class TestInsufficientStock:
    """Requested more than available → needs_user_input, no inventory change."""

    def test_insufficient(self):
        llm = _make_stub_llm(
            intake_results=[
                IntakeExtraction(intent="place_order", dish_name="steak", quantity=5),
            ],
        )
        visited, state, inv = run_scenario(
            messages=["I want 5 steaks"],
            inventory=_default_inventory(),
            cook_outcomes=[],
            serve_outcomes=[],
            llm=llm,
        )
        assert state["status"] == "needs_user_input"
        assert state["order_details"]["availability_status"] == "insufficient"
        assert inv["steak"] == 2  # no change


class TestOutOfStock:
    """Dish with zero stock → out_of_stock, alternatives offered."""

    def test_out_of_stock(self):
        llm = _make_stub_llm(
            intake_results=[
                IntakeExtraction(intent="place_order", dish_name="sushi", quantity=1),
            ],
        )
        visited, state, inv = run_scenario(
            messages=["One sushi please"],
            inventory=_default_inventory(),
            cook_outcomes=[],
            serve_outcomes=[],
            llm=llm,
        )
        assert state["status"] == "needs_user_input"
        assert state["order_details"]["availability_status"] == "out_of_stock"
        assert len(state["alternatives"]) > 0
        assert inv["sushi"] == 0


class TestOffMenuDish:
    """Dish not on the menu → out_of_stock with alternatives."""

    def test_off_menu(self):
        llm = _make_stub_llm(
            intake_results=[
                IntakeExtraction(intent="place_order", dish_name="lobster", quantity=1),
            ],
        )
        visited, state, inv = run_scenario(
            messages=["I want lobster"],
            inventory=_default_inventory(),
            cook_outcomes=[],
            serve_outcomes=[],
            llm=llm,
        )
        assert state["status"] == "needs_user_input"
        assert state["order_details"]["availability_status"] == "out_of_stock"
        # Alternatives come only from in-stock dishes
        for alt in state["alternatives"]:
            assert inv[alt] > 0


class TestCookFailThenSuccess:
    """Cook fails once, succeeds on retry → continues to serve."""

    def test_cook_retry_success(self):
        llm = _make_stub_llm(
            intake_results=[
                IntakeExtraction(intent="place_order", dish_name="pizza", quantity=1),
            ],
        )
        visited, state, inv = run_scenario(
            messages=["One pizza"],
            inventory=_default_inventory(),
            cook_outcomes=[False, True],
            serve_outcomes=[True],
            llm=llm,
        )
        assert visited.count("cook") == 2
        assert "serve" in visited
        assert state["status"] == "order_completed"
        assert inv["pizza"] == 7  # reserved, not released


class TestCookFailTwice:
    """Cook fails both attempts → failed_cooking, stock released."""

    def test_cook_double_fail(self):
        llm = _make_stub_llm(
            intake_results=[
                IntakeExtraction(intent="place_order", dish_name="pizza", quantity=1),
            ],
        )
        visited, state, inv = run_scenario(
            messages=["One pizza"],
            inventory=_default_inventory(),
            cook_outcomes=[False, False],
            serve_outcomes=[],
            llm=llm,
        )
        assert "release_stock" in visited
        assert "serve" not in visited
        assert state["status"] == "failed_cooking"
        assert inv["pizza"] == 8  # released back


class TestServeFailThenSuccess:
    """Serve fails once, succeeds on retry."""

    def test_serve_retry_success(self):
        llm = _make_stub_llm(
            intake_results=[
                IntakeExtraction(intent="place_order", dish_name="pasta", quantity=1),
            ],
        )
        visited, state, inv = run_scenario(
            messages=["I want pasta"],
            inventory=_default_inventory(),
            cook_outcomes=[True],
            serve_outcomes=[False, True],
            llm=llm,
        )
        assert visited.count("serve") == 2
        assert "order_completed" in visited
        assert state["status"] == "order_completed"


class TestServeFailTwice:
    """Serve fails both attempts → failed_serving, stock stays consumed."""

    def test_serve_double_fail(self):
        llm = _make_stub_llm(
            intake_results=[
                IntakeExtraction(intent="place_order", dish_name="salad", quantity=1),
            ],
        )
        visited, state, inv = run_scenario(
            messages=["Salad please"],
            inventory=_default_inventory(),
            cook_outcomes=[True],
            serve_outcomes=[False, False],
            llm=llm,
        )
        assert "release_stock" not in visited
        assert state["status"] == "failed_serving"
        assert inv["salad"] == 4  # stock stays consumed


class TestProcessingFailureExhaustsAttempts:
    """LLM fails 3 times → failed_processing."""

    def test_three_intake_failures(self):
        # Build an LLM that always raises
        class _FailingLLM:
            def with_structured_output(self, schema):
                return self

            def invoke(self, messages, **kw):
                raise RuntimeError("LLM is down")

        llm = _FailingLLM()
        visited, state, inv = run_scenario(
            messages=["2 burgers"],
            inventory=_default_inventory(),
            cook_outcomes=[],
            serve_outcomes=[],
            llm=llm,
        )
        # intake is entered up to 3 times
        assert visited.count("intake") == 3
        assert state["status"] == "failed_processing"
        assert state["order_attempts_left"] == 0
        assert inv == _default_inventory()


class TestInventoryRepository:
    """Direct unit tests for the inventory."""

    def test_reserve_and_release(self):
        inv = InventoryRepository({"burger": 5})
        prev = inv.reserve("burger", 3)
        assert prev == 5
        assert inv.get("burger") == 2
        inv.release("burger", 3)
        assert inv.get("burger") == 5

    def test_reserve_insufficient(self):
        inv = InventoryRepository({"burger": 1})
        with pytest.raises(Exception):
            inv.reserve("burger", 5)

    def test_get_unknown_dish(self):
        inv = InventoryRepository({"burger": 5})
        assert inv.get("lobster") is None

    def test_snapshot_is_copy(self):
        inv = InventoryRepository({"burger": 5})
        snap = inv.snapshot()
        snap["burger"] = 999
        assert inv.get("burger") == 5
