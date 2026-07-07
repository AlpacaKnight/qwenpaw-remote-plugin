"""SSH-aware shell execution and middleware factory.

Supports both QwenPaw 1.x (function-based middleware + ContextVar) and
QwenPaw 2.0+ (MiddlewareBase + api.register_middleware).
"""

import logging
from typing import TYPE_CHECKING, Any, AsyncGenerator, Callable

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from .ssh_manager import get_ssh_manager
from .ssh_types import wrap_command_with_cwd

if TYPE_CHECKING:
    from agentscope.agent import Agent

logger = logging.getLogger(__name__)


async def _execute_remote(
    session_id: str,
    command: str,
    timeout: float = 60.0,
    cwd: str = "",
    sudo: bool = False,
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
            sudo=sudo,
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
    if sudo:
        prefix = f"{prefix} [sudo]"

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


# ---------------------------------------------------------------------------
# QwenPaw 1.x compatibility: function-based middleware + ContextVar
# ---------------------------------------------------------------------------

def make_ssh_middleware():
    """Create SSH middleware for QwenPaw 1.x (function-based).

    Returns an async generator function compatible with
    Toolkit.register_middleware().
    """
    from .context import get_remote_session_id

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

        # Adapt cd wrapper for fish shell
        effective_cwd = cwd or conn.default_cwd
        command = wrap_command_with_cwd(command, effective_cwd, conn.remote_shell)

        # Execute on remote and yield the result
        result = await _execute_remote(session_id, command, timeout, "")
        yield result

    return ssh_middleware


# ---------------------------------------------------------------------------
# QwenPaw 2.0+: MiddlewareBase class
# ---------------------------------------------------------------------------

def make_ssh_middleware_factory():
    """Create a middleware factory for QwenPaw 2.0+.

    Returns a factory function compatible with api.register_middleware().
    The factory is called once per request during agent assembly:
        factory(ctx, agent_config) -> MiddlewareBase | None
    """
    try:
        from agentscope.middleware import MiddlewareBase
    except ImportError:
        return None

    class SSHMiddleware(MiddlewareBase):
        """Middleware that intercepts execute_shell_command and redirects to SSH."""

        async def on_acting(
            self,
            agent: "Agent",
            input_kwargs: dict[str, Any],
            next_handler: Callable[..., AsyncGenerator[Any, None]],
        ) -> AsyncGenerator[Any, None]:
            tool_call = input_kwargs.get("tool_call")
            if tool_call is None:
                async for chunk in next_handler():
                    yield chunk
                return

            # Only intercept execute_shell_command
            tool_name = getattr(tool_call, "name", None)
            if tool_name != "execute_shell_command":
                async for chunk in next_handler():
                    yield chunk
                return

            # Get session_id from agent's request_context (QwenPaw 2.0)
            request_context = getattr(agent, "_request_context", None) or {}
            session_id = request_context.get("session_id", "")

            if not session_id:
                async for chunk in next_handler():
                    yield chunk
                return

            manager = get_ssh_manager()
            conn = manager.get_connection(session_id)
            if conn is None:
                # No active connection — fall back to local execution
                async for chunk in next_handler():
                    yield chunk
                return

            # Extract command and timeout from tool_call input
            tool_input = getattr(tool_call, "input", None) or {}
            command = tool_input.get("command", "")
            timeout = tool_input.get("timeout", 60.0)
            cwd = tool_input.get("cwd", "")

            if isinstance(timeout, str):
                try:
                    timeout = float(timeout)
                except (ValueError, TypeError):
                    timeout = 60.0

            # Adapt cd wrapper for fish shell
            effective_cwd = cwd or conn.default_cwd
            command = wrap_command_with_cwd(command, effective_cwd, conn.remote_shell)

            # Execute on remote and yield the result
            result = await _execute_remote(session_id, command, timeout, "")
            yield result

    def factory(ctx: Any, agent_config: Any):
        return SSHMiddleware()

    return factory
