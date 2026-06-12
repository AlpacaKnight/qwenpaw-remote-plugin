"""Remote SSH connection health tool."""

import logging

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from ..context import get_remote_session_id
from ..ssh_manager import get_ssh_manager

logger = logging.getLogger(__name__)


async def remote_health(refresh: bool = False) -> ToolResponse:
    """Check the health status of the current remote SSH connection.

    Shows connection status, latency, last check time, consecutive failures,
    and whether reconnection is available.

    Args:
        refresh: If True, force an immediate health check instead of
                 returning cached status.

    Returns:
        ToolResponse with health status details.
    """
    session_id = get_remote_session_id()
    if session_id is None:
        return ToolResponse(
            content=[
                TextBlock(type="text", text="Error: No active session."),
            ],
        )

    manager = get_ssh_manager()

    if refresh:
        health = await manager.force_health_check(session_id)
    else:
        health = manager.get_health(session_id)

    status = health.get("status", "unknown")
    status_text = {
        "connected": "Connected",
        "degraded": "Unstable (degraded)",
        "stale": "Disconnected (stale)",
        "disconnected": "Disconnected",
    }.get(status, status)

    lines: list[str] = []
    lines.append(f"Status: {status_text}")

    latency = health.get("latency_ms")
    if latency is not None:
        lines.append(f"Latency: {latency:.0f} ms")

    last_checked = health.get("last_checked_at")
    if last_checked:
        lines.append(f"Last checked: {last_checked}")

    failures = health.get("consecutive_failures", 0)
    if failures > 0:
        lines.append(f"Consecutive failures: {failures}")

    last_error = health.get("last_error", "")
    if last_error:
        lines.append(f"Last error: {last_error}")

    cwd_ok = health.get("cwd_ok")
    if cwd_ok is not None:
        lines.append(f"Remote directory: {'accessible' if cwd_ok else 'inaccessible'}")

    reconnect = health.get("reconnect_available", False)
    if reconnect:
        lines.append("Reconnect: available")

    return ToolResponse(
        content=[
            TextBlock(type="text", text="\n".join(lines)),
        ],
    )
