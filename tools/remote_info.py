"""Remote environment info tool."""

import logging

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from ..context import get_remote_session_id
from ..ssh_manager import get_ssh_manager

logger = logging.getLogger(__name__)


async def remote_info(refresh: bool = False) -> ToolResponse:
    """Show detailed information about the remote machine environment.

    Returns OS, architecture, kernel, shell, CPU, memory, disk usage,
    and availability of common development tools. Results are cached
    for 60 seconds.

    Args:
        refresh: If True, force re-detection instead of using cache.

    Returns:
        ToolResponse with remote environment details.
    """
    session_id = get_remote_session_id()
    if session_id is None:
        return ToolResponse(
            content=[
                TextBlock(type="text", text="Error: No active session."),
            ],
        )

    manager = get_ssh_manager()
    snapshot = await manager.get_remote_env(session_id, refresh=refresh)

    lines: list[str] = []
    lines.append("=== Remote Environment ===")
    lines.append(f"OS: {snapshot.remote_os or 'unknown'}")
    lines.append(f"Arch: {snapshot.remote_arch or 'unknown'}")
    lines.append(f"Kernel: {snapshot.remote_kernel or 'unknown'}")
    lines.append(f"Shell: {snapshot.remote_shell or 'unknown'}")
    lines.append(f"Hostname: {snapshot.hostname or 'unknown'}")

    if snapshot.cpu_cores:
        lines.append(f"CPU cores: {snapshot.cpu_cores}")
    if snapshot.memory:
        lines.append(f"Memory: {snapshot.memory}")
    if snapshot.disk_root:
        lines.append(f"Disk (/): {snapshot.disk_root}")

    if snapshot.tools:
        lines.append("")
        lines.append("=== Tool Availability ===")
        for tool, available in sorted(snapshot.tools.items()):
            lines.append(f"  {tool}: {'found' if available else 'not found'}")

    if snapshot.detected_at:
        age = ""
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        seconds = (now - snapshot.detected_at).total_seconds()
        if seconds < 60:
            age = f"{seconds:.0f}s ago"
        elif seconds < 3600:
            age = f"{seconds / 60:.0f}m ago"
        else:
            age = f"{seconds / 3600:.1f}h ago"
        lines.append(f"\nCached at: {snapshot.detected_at.isoformat()} ({age})")

    if snapshot.last_error:
        lines.append(f"\nWarning: {snapshot.last_error}")

    return ToolResponse(
        content=[
            TextBlock(type="text", text="\n".join(lines)),
        ],
    )
