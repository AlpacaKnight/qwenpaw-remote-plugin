"""Remote SSH disconnect tool."""

import logging

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from ..context import get_remote_session_id
from ..ssh_manager import get_ssh_manager

logger = logging.getLogger(__name__)


async def remote_disconnect() -> ToolResponse:
    """Disconnect from the current remote SSH session.

    After disconnecting, shell commands will execute locally again.

    Returns:
        ToolResponse with disconnection status.
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
                    text="No active SSH connection for this session.",
                ),
            ],
        )

    host_info = f"{conn.username}@{conn.host}:{conn.port}"
    disconnected = await manager.disconnect(session_id)

    if disconnected:
        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text=(
                        f"Disconnected from {host_info}.\n"
                        f"Shell commands will now execute locally."
                    ),
                ),
            ],
        )

    return ToolResponse(
        content=[
            TextBlock(
                type="text",
                text="Failed to disconnect. The connection may have already been closed.",
            ),
        ],
    )
