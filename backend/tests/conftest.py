"""Pytest configuration for the backend test suite."""
import pytest


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
