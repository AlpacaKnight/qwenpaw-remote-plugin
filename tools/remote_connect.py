"""Remote SSH connect tool."""

import logging

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from ..context import get_remote_session_id
from ..ssh_manager import get_ssh_manager

logger = logging.getLogger(__name__)


async def remote_connect(
    host: str,
    username: str,
    port: int = 22,
    password: str = "",
    key_path: str = "",
    passphrase: str = "",
) -> ToolResponse:
    """Connect to a remote device via SSH.

    After connecting, all shell commands in this conversation will
    execute on the remote machine transparently.

    Args:
        host: Remote host IP or hostname.
        username: SSH username.
        port: SSH port (default 22).
        password: SSH password. Key-based auth is recommended.
        key_path: Path to SSH private key file.
        passphrase: Passphrase for the private key (if encrypted).

    Returns:
        ToolResponse with connection status.
    """
    session_id = get_remote_session_id()
    if session_id is None:
        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text="Error: No active session. Cannot connect.",
                ),
            ],
        )

    if not host:
        return ToolResponse(
            content=[
                TextBlock(type="text", text="Error: host is required."),
            ],
        )
    if not username:
        return ToolResponse(
            content=[
                TextBlock(type="text", text="Error: username is required."),
            ],
        )

    manager = get_ssh_manager()

    try:
        info = await manager.connect(
            session_id=session_id,
            host=host,
            port=port,
            username=username,
            password=password,
            key_path=key_path,
            passphrase=passphrase,
        )
    except (ConnectionError, ValueError) as e:
        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text=f"Connection failed: {e}",
                ),
            ],
        )

    return ToolResponse(
        content=[
            TextBlock(
                type="text",
                text=(
                    f"Connected to {username}@{host}:{port}\n"
                    f"Remote working directory: {info['default_cwd']}\n"
                    f"All subsequent shell commands in this conversation "
                    f"will execute on this remote machine.\n"
                    f"Use remote_disconnect to stop."
                ),
            ),
        ],
    )
