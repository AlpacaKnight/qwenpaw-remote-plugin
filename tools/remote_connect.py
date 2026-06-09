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
    jump_id: str = "",
    jump_name: str = "",
    jump_host: str = "",
    jump_port: int = 22,
    jump_username: str = "",
    jump_password: str = "",
    jump_key_path: str = "",
    jump_passphrase: str = "",
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
        jump_id: Saved jump host ID.
        jump_name: Saved jump host display name.
        jump_host: Inline jump host IP or hostname.
        jump_port: Inline jump host SSH port.
        jump_username: Inline jump host SSH username.
        jump_password: Inline jump host SSH password.
        jump_key_path: Inline jump host private key path.
        jump_passphrase: Inline jump host private key passphrase.

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
            jump_host_id=jump_id,
            jump_name=jump_name,
            jump_host=jump_host,
            jump_port=jump_port,
            jump_username=jump_username,
            jump_password=jump_password,
            jump_key_path=jump_key_path,
            jump_passphrase=jump_passphrase,
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

    via = ""
    if info.get("via_jump_host"):
        jump_label = info.get("jump_host_name") or (
            f"{info.get('jump_username')}@"
            f"{info.get('jump_host')}:{info.get('jump_port')}"
        )
        via = f"Via jump host: {jump_label}\n"

    return ToolResponse(
        content=[
            TextBlock(
                type="text",
                text=(
                    f"Connected to {username}@{host}:{port}\n"
                    f"{via}"
                    f"Remote working directory: {info['default_cwd']}\n"
                    f"All subsequent shell commands in this conversation "
                    f"will execute on this remote machine.\n"
                    f"Use remote_disconnect to stop."
                ),
            ),
        ],
    )
