"""Remote working directory management tool."""

import logging

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from ..context import get_remote_session_id
from ..ssh_manager import get_ssh_manager

logger = logging.getLogger(__name__)


async def remote_set_cwd(path: str, verify: bool = True) -> ToolResponse:
    """Set the default remote working directory for this session.

    All subsequent shell commands and remote_exec calls will execute
    in this directory by default.

    Args:
        path: The remote directory path to set as default.
        verify: If True (default), verify the directory exists before setting.

    Returns:
        ToolResponse with the result of the operation.
    """
    session_id = get_remote_session_id()
    if session_id is None:
        return ToolResponse(
            content=[
                TextBlock(type="text", text="Error: No active session."),
            ],
        )

    if not path or not path.strip():
        return ToolResponse(
            content=[
                TextBlock(type="text", text="Error: path is required."),
            ],
        )

    manager = get_ssh_manager()

    try:
        result = await manager.set_default_cwd(
            session_id=session_id,
            cwd=path.strip(),
            verify=verify,
        )
    except ValueError as e:
        return ToolResponse(
            content=[
                TextBlock(type="text", text=f"Error: {e}"),
            ],
        )
    except ConnectionError as e:
        return ToolResponse(
            content=[
                TextBlock(type="text", text=f"Error: {e}"),
            ],
        )

    return ToolResponse(
        content=[
            TextBlock(
                type="text",
                text=(
                    f"Working directory set to: {result['default_cwd']}\n"
                    f"All subsequent commands will execute in this directory."
                ),
            ),
        ],
    )
