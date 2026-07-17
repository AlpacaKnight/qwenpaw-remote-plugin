"""Context variable for remote SSH session scoping."""

from contextvars import ContextVar

remote_session_id: ContextVar[str | None] = ContextVar(
    "remote_session_id",
    default=None,
)


def get_remote_session_id() -> str | None:
    """Get the current remote session ID from context."""
    session_id = remote_session_id.get()
    if session_id:
        return session_id

    try:
        from qwenpaw.app.agent_context import get_current_session_id
    except ImportError:
        return None

    return get_current_session_id() or None


def set_remote_session_id(session_id: str | None) -> None:
    """Set the current remote session ID in context."""
    remote_session_id.set(session_id)
