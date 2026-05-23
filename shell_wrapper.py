"""SSH-aware shell execution and toolkit middleware factory."""

import logging
from typing import AsyncGenerator

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from .context import get_remote_session_id
from .ssh_manager import get_ssh_manager

logger = logging.getLogger(__name__)


async def _execute_remote(
    session_id: str,
    command: str,
    timeout: float = 60.0,
    cwd: str = "",
) -> ToolResponse:
    """Execute a command on the remote host via SSHManager.

    Output format matches the local execute_shell_command exactly,
    with a [remote: user@host] prefix added.
    """
    manager = get_ssh_manager()
    conn = manager.get_connection(session_id)
    if conn is None:
        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text="Error: No active SSH connection for this session. "
                    "Use remote_connect first.",
                ),
            ],
        )

    try:
        returncode, stdout_str, stderr_str = await manager.execute_command(
            session_id,
            command,
            timeout,
            cwd or None,
        )
    except Exception as e:
        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text=f"Error: Remote command execution failed: {e}",
                ),
            ],
        )

    # Format output matching local execute_shell_command (shell.py:499-521)
    prefix = f"[remote: {conn.username}@{conn.host}]"

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
            TextBlock(
                type="text",
                text=response_text,
            ),
        ],
    )


def make_ssh_middleware():
    """Create a toolkit middleware that intercepts execute_shell_command
    and redirects it to SSH when a remote connection is active.

    Returns an async generator function compatible with
    Toolkit.register_middleware().
    """

    async def ssh_middleware(
        kwargs: dict,
        next_handler,
    ) -> AsyncGenerator[ToolResponse, None]:
        tool_call = kwargs["tool_call"]

        # Only intercept execute_shell_command
        if tool_call["name"] != "execute_shell_command":
            async for chunk in await next_handler(**kwargs):
                yield chunk
            return

        # Check if there's an active SSH connection for this session
        session_id = get_remote_session_id()
        if session_id is None:
            async for chunk in await next_handler(**kwargs):
                yield chunk
            return

        manager = get_ssh_manager()
        conn = manager.get_connection(session_id)
        if conn is None:
            # No active connection — fall back to local execution
            async for chunk in await next_handler(**kwargs):
                yield chunk
            return

        # Extract command and timeout from tool_call input
        tool_input = tool_call.get("input", {})
        command = tool_input.get("command", "")
        timeout = tool_input.get("timeout", 60.0)
        cwd = tool_input.get("cwd", "")

        if isinstance(timeout, str):
            try:
                timeout = float(timeout)
            except (ValueError, TypeError):
                timeout = 60.0

        # Execute on remote and yield the result
        result = await _execute_remote(session_id, command, timeout, cwd)
        yield result

    return ssh_middleware
