"""Remote SSH explicit command execution tool."""

import logging

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from ..context import get_remote_session_id
from ..shell_wrapper import _execute_remote

logger = logging.getLogger(__name__)


async def remote_exec(
    command: str,
    timeout: float = 60.0,
    cwd: str = "",
    sudo: bool = False,
) -> ToolResponse:
    """Execute a command explicitly on the remote machine via SSH.

    Use this when you want to run a command specifically on the remote
    host, even if transparent shell redirection is active.

    Args:
        command: The shell command to execute on the remote host.
        timeout: Maximum execution time in seconds (default 60).
        cwd: Remote working directory (default: connection's default).
        sudo: If True, execute with sudo using configured sudo password.

    Returns:
        ToolResponse with command output.
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

    if not command:
        return ToolResponse(
            content=[
                TextBlock(type="text", text="Error: command is required."),
            ],
        )

    return await _execute_remote(session_id, command, timeout, cwd, sudo=sudo)
