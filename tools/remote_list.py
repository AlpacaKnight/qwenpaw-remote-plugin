"""Remote SSH connection status tool."""

import logging

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from ..context import get_remote_session_id
from ..ssh_manager import get_ssh_manager

logger = logging.getLogger(__name__)


async def remote_list() -> ToolResponse:
    """Show the current remote SSH connection status for this session.

    Returns:
        ToolResponse with connection details or "no connection" message.
    """
    session_id = get_remote_session_id()
    if session_id is None:
        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text="Error: No active session.",
                ),
            ],
        )

    manager = get_ssh_manager()
    conn = manager.get_connection(session_id)

    if conn is None:
        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text=(
                        "No active SSH connection for this session.\n"
                        "Use remote_connect to establish a connection."
                    ),
                ),
            ],
        )

    info = conn.to_dict()
    uptime = info["uptime_seconds"]
    if uptime < 60:
        uptime_str = f"{uptime:.0f}s"
    elif uptime < 3600:
        uptime_str = f"{uptime / 60:.0f}m"
    else:
        uptime_str = f"{uptime / 3600:.1f}h"

    return ToolResponse(
        content=[
            TextBlock(
                type="text",
                text=(
                    f"Active SSH connection:\n"
                    f"  Host: {info['username']}@{info['host']}:{info['port']}\n"
                    f"  Connected at: {info['connected_at']}\n"
                    f"  Uptime: {uptime_str}\n"
                    f"  Remote working directory: {info['default_cwd']}"
                ),
            ),
        ],
    )
