"""Remote SSH sudo execution tool."""

import logging

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from ..context import get_remote_session_id
from ..ssh_manager import get_ssh_manager

logger = logging.getLogger(__name__)


async def remote_sudo(
    command: str,
    timeout: float = 60.0,
    cwd: str = "",
) -> ToolResponse:
    """Execute a command with sudo privileges on the remote machine.

    Requires sudo password to be configured in the session or profile.
    Uses non-interactive sudo (-S) to avoid TTY prompts.

    Args:
        command: The shell command to execute with sudo.
        timeout: Maximum execution time in seconds (default 60).
        cwd: Remote working directory (default: connection's default).

    Returns:
        ToolResponse with command output.
    """
    session_id = get_remote_session_id()
    if session_id is None:
        return ToolResponse(
            content=[
                TextBlock(type="text", text="Error: No active session."),
            ],
        )

    if not command:
        return ToolResponse(
            content=[
                TextBlock(type="text", text="Error: command is required."),
            ],
        )

    manager = get_ssh_manager()

    try:
        returncode, stdout_str, stderr_str = await manager.execute_command(
            session_id,
            command,
            timeout,
            cwd or None,
            sudo=True,
        )
    except ConnectionError as e:
        return ToolResponse(
            content=[
                TextBlock(type="text", text=f"Error: {e}"),
            ],
        )

    prefix = "[sudo]"

    if returncode == 0:
        if stdout_str:
            response_text = f"{prefix}\n{stdout_str}"
        else:
            response_text = f"{prefix}\nCommand executed successfully (no output)."
        if stderr_str:
            response_text += f"\n[stderr]\n{stderr_str}"
    else:
        response_parts = [
            f"{prefix}\nCommand failed with exit code {returncode}.",
        ]
        if stdout_str:
            response_parts.append(f"\n[stdout]\n{stdout_str}")
        if stderr_str:
            response_parts.append(f"\n[stderr]\n{stderr_str}")
        response_text = "".join(response_parts)

    return ToolResponse(
        content=[
            TextBlock(type="text", text=response_text),
        ],
    )
