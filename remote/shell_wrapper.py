"""SSH-aware shell execution and middleware factory.

QwenPaw 2.x registers plugin middleware through
``PluginApi.register_middleware``. The factory below returns an
AgentScope middleware that redirects ``execute_shell_command`` to the
SSH connection bound to the session carried by
``qwenpaw.config.context``.
"""

import json
import logging
from typing import TYPE_CHECKING, Any, AsyncGenerator, Callable

from agentscope.message import TextBlock
from agentscope.middleware import MiddlewareBase
from agentscope.tool import ToolResponse

from .session import get_remote_session_id
from .ssh_manager import get_ssh_manager

if TYPE_CHECKING:
    from agentscope.agent import Agent

logger = logging.getLogger(__name__)
diagnostic = logging.getLogger("qwenpaw.plugins.remote")


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
    prefix = f"[remote: {conn.username}@{conn.host}"
    if conn.default_cwd:
        prefix += f":{conn.default_cwd}"
    prefix += "]"
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


def make_ssh_middleware_factory():
    """Create a middleware factory for ``api.register_middleware``.

    The factory is called once per request during agent assembly:
        factory(ctx, agent_config) -> MiddlewareBase
    """

    class SSHMiddleware(MiddlewareBase):
        """Intercept ``execute_shell_command`` and redirect it to SSH."""

        def __init__(self, session_id: str = ""):
            self._session_id = session_id

        async def on_acting(
            self,
            agent: "Agent",
            input_kwargs: dict[str, Any],
            next_handler: Callable[..., AsyncGenerator[Any, None]],
        ) -> AsyncGenerator[Any, None]:
            # Prefer the session captured from the request context passed to
            # the factory; tool calls may be offloaded to a task that no
            # longer sees the request ContextVar.
            session_id = self._session_id or get_remote_session_id() or ""
            async for chunk in self._handle_acting(
                session_id,
                input_kwargs,
                next_handler,
            ):
                yield chunk

        async def _handle_acting(
            self,
            session_id: str,
            input_kwargs: dict[str, Any],
            next_handler: Callable[..., AsyncGenerator[Any, None]],
        ) -> AsyncGenerator[Any, None]:
            tool_call = input_kwargs.get("tool_call")
            if tool_call is None:
                async for chunk in next_handler(**input_kwargs):
                    yield chunk
                return

            # tool_call may be a dict (agentscope) or an object with attributes
            if isinstance(tool_call, dict):
                tool_name = tool_call.get("name")
                raw_input = tool_call.get("input")
            else:
                tool_name = getattr(tool_call, "name", None)
                raw_input = getattr(tool_call, "input", None)

            if isinstance(raw_input, str):
                try:
                    tool_input = json.loads(raw_input)
                except (json.JSONDecodeError, TypeError):
                    tool_input = {}
            elif isinstance(raw_input, dict):
                tool_input = raw_input
            else:
                tool_input = {}

            # Only intercept execute_shell_command
            if tool_name != "execute_shell_command":
                async for chunk in next_handler(**input_kwargs):
                    yield chunk
                return

            if not session_id:
                async for chunk in next_handler(**input_kwargs):
                    yield chunk
                return

            manager = get_ssh_manager()
            conn = manager.get_connection(session_id)
            if conn is None:
                # The session bound to the UI/tool may differ from the one
                # that created the connection. With exactly one active
                # connection the target is unambiguous.
                fallback_id = manager.get_single_session_id()
                if fallback_id:
                    session_id = fallback_id
                    conn = manager.get_connection(session_id)
            if conn is None:
                diagnostic.warning(
                    "[Remote] No SSH connection for session %r; "
                    "execute_shell_command runs locally",
                    session_id,
                )
                async for chunk in next_handler(**input_kwargs):
                    yield chunk
                return

            # Extract command and timeout from tool_call input
            command = tool_input.get("command", "")
            timeout = tool_input.get("timeout", 60.0)

            if isinstance(timeout, str):
                try:
                    timeout = float(timeout)
                except (ValueError, TypeError):
                    timeout = 60.0

            # The agent's cwd refers to the local workspace, which usually
            # does not exist on the remote host. Transparent forwarding
            # always runs in the connection's remote working directory.
            result = await _execute_remote(session_id, command, timeout)
            yield result

    def factory(ctx: Any, agent_config: Any):
        session_id = str(getattr(ctx, "session_id", "") or "")
        return SSHMiddleware(session_id)

    return factory
