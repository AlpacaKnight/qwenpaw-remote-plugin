"""Single bridge to the host's per-request session context.

Legacy ``PluginApi``-registered tools do not receive a ``ToolContext``,
so they read the session ID from QwenPaw's request-scoped ContextVar.
Keep this import in one place so a future public SDK API only needs to
be adopted here.
"""

from __future__ import annotations

from qwenpaw.config.context import get_current_session_id


def get_remote_session_id() -> str | None:
    """Return the session ID bound to the current agent request.

    QwenPaw may store an empty string when no session is bound, so
    normalise it to ``None`` to keep a single "no session" condition.
    When tool execution runs in an offloaded task where the request
    ContextVar is not visible, fall back to the only active connection.
    """
    session_id = get_current_session_id() or None
    if session_id:
        return session_id
    from .ssh_manager import get_ssh_manager

    return get_ssh_manager().get_single_session_id()
