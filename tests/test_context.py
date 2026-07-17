"""Tests for request-scoped remote session resolution."""

import importlib.util
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch


CONTEXT_PATH = Path(__file__).parents[1] / "remote" / "context.py"
SPEC = importlib.util.spec_from_file_location("remote_context_under_test", CONTEXT_PATH)
assert SPEC is not None and SPEC.loader is not None
remote_context = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(remote_context)


def qwenpaw_modules(session_id: str | None) -> dict[str, types.ModuleType]:
    """Create minimal QwenPaw modules exposing the 2.x session getter."""
    qwenpaw = types.ModuleType("qwenpaw")
    qwenpaw.__path__ = []
    app = types.ModuleType("qwenpaw.app")
    app.__path__ = []
    agent_context = types.ModuleType("qwenpaw.app.agent_context")
    agent_context.get_current_session_id = lambda: session_id
    qwenpaw.app = app
    app.agent_context = agent_context
    return {
        "qwenpaw": qwenpaw,
        "qwenpaw.app": app,
        "qwenpaw.app.agent_context": agent_context,
    }


class GetRemoteSessionIdTests(unittest.TestCase):
    def setUp(self) -> None:
        remote_context.set_remote_session_id(None)

    def tearDown(self) -> None:
        remote_context.set_remote_session_id(None)

    def test_prefers_plugin_context_for_qwenpaw_1_x(self) -> None:
        modules = qwenpaw_modules("v2-session")
        remote_context.set_remote_session_id("legacy-session")

        with patch.dict(sys.modules, modules):
            self.assertEqual(
                remote_context.get_remote_session_id(),
                "legacy-session",
            )

    def test_falls_back_to_qwenpaw_2_x_request_context(self) -> None:
        with patch.dict(sys.modules, qwenpaw_modules("v2-session")):
            self.assertEqual(
                remote_context.get_remote_session_id(),
                "v2-session",
            )

    def test_returns_none_when_both_contexts_are_empty(self) -> None:
        with patch.dict(sys.modules, qwenpaw_modules(None)):
            self.assertIsNone(remote_context.get_remote_session_id())

    def test_returns_none_when_qwenpaw_is_unavailable(self) -> None:
        unavailable = {
            "qwenpaw": None,
            "qwenpaw.app": None,
            "qwenpaw.app.agent_context": None,
        }
        with patch.dict(sys.modules, unavailable):
            self.assertIsNone(remote_context.get_remote_session_id())


if __name__ == "__main__":
    unittest.main()
