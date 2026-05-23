"""Context variable for remote SSH session scoping."""

from contextvars import ContextVar

remote_session_id: ContextVar[str | None] = ContextVar(
    "remote_session_id",
    default=None,
)


def get_remote_session_id() -> str | None:
    """Get the current remote session ID from context."""
    return remote_session_id.get()


def set_remote_session_id(session_id: str | None) -> None:
    """Set the current remote session ID in context."""
    remote_session_id.set(session_id)
