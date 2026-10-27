"""Remote SSH Plugin for QwenPaw 2.x.

Enables SSH connections to remote devices. When a connection is active
for a session, all shell commands execute transparently on the remote
machine via SSH.
"""

import logging

logger = logging.getLogger(__name__)


def _remote_prompt_section(agent) -> str:
    """Describe the active remote workspace to the model."""
    from .session import get_remote_session_id
    from .ssh_manager import get_ssh_manager

    session_id = get_remote_session_id()
    if not session_id:
        return ""

    conn = get_ssh_manager().get_connection(session_id)
    if conn is None:
        return ""

    cwd = conn.default_cwd or "/"
    return (
        "[Remote SSH session]\n"
        f"Shell commands execute on the remote host "
        f"{conn.username}@{conn.host}:{conn.port}.\n"
        f"The remote working directory is {cwd}.\n"
        "Do not pass the local workspace path as cwd: transparent shell "
        "commands always run in the remote working directory. Use "
        "remote_set_cwd to change it.\n"
        "When listing directories, prefer `ls` or `ls -1` (names only). "
        "`ls -la` stats every entry and can block for a long time on "
        "network filesystems such as NFS; if it times out, retry with a "
        "larger timeout or use `ls` plus `stat` on specific files."
    )


class RemotePlugin:
    """Remote SSH plugin entry point."""

    def __init__(self):
        self._api = None

    def register(self, api):
        """Register tools, middleware, hooks and the management API."""
        self._api = api

        # Register tools
        from .tools.remote_connect import remote_connect, remote_reconnect
        from .tools.remote_disconnect import remote_disconnect
        from .tools.remote_list import remote_list
        from .tools.remote_exec import remote_exec
        from .tools.remote_info import remote_info
        from .tools.remote_health import remote_health
        from .tools.remote_set_cwd import remote_set_cwd
        from .tools.remote_sudo import remote_sudo
        from .tools.remote_command import RemoteCommandHandler

        api.register_tool(
            tool_name="remote_connect",
            tool_func=remote_connect,
            description=(
                "Connect to a remote device via SSH. After connecting, "
                "all shell commands in this conversation will execute "
                "on the remote machine."
            ),
            icon="LinkOutlined",
            enabled=True,
        )
        api.register_tool(
            tool_name="remote_reconnect",
            tool_func=remote_reconnect,
            description=(
                "Reconnect to the remote machine using cached connection "
                "parameters. Use when the previous SSH connection was lost."
            ),
            icon="ReloadOutlined",
            enabled=True,
        )
        api.register_tool(
            tool_name="remote_disconnect",
            tool_func=remote_disconnect,
            description="Disconnect from the current remote SSH session.",
            icon="DisconnectOutlined",
            enabled=True,
        )
        api.register_tool(
            tool_name="remote_list",
            tool_func=remote_list,
            description="Show the current remote SSH connection status.",
            icon="CloudOutlined",
            enabled=True,
        )
        api.register_tool(
            tool_name="remote_exec",
            tool_func=remote_exec,
            description=(
                "Explicitly execute a command on the remote machine via SSH."
            ),
            icon="CodeOutlined",
            enabled=True,
        )
        api.register_tool(
            tool_name="remote_info",
            tool_func=remote_info,
            description=(
                "Show detailed information about the remote machine: "
                "OS, architecture, kernel, shell, CPU, memory, disk, "
                "and available development tools."
            ),
            icon="InfoCircleOutlined",
            enabled=True,
        )
        api.register_tool(
            tool_name="remote_health",
            tool_func=remote_health,
            description=(
                "Check the health status of the current remote SSH "
                "connection: status, latency, failures, reconnect availability."
            ),
            icon="HeartOutlined",
            enabled=True,
        )
        api.register_tool(
            tool_name="remote_set_cwd",
            tool_func=remote_set_cwd,
            description=(
                "Set the default remote working directory for this session. "
                "All subsequent commands will execute in this directory."
            ),
            icon="FolderOutlined",
            enabled=True,
        )
        api.register_tool(
            tool_name="remote_sudo",
            tool_func=remote_sudo,
            description=(
                "Execute a command with sudo privileges on the remote machine. "
                "Requires sudo password to be configured."
            ),
            icon="SafetyOutlined",
            enabled=True,
        )
        api.register_slash_command(
            "remote",
            RemoteCommandHandler(),
            help_text=(
                "Manage the current remote SSH session and execute "
                "commands on the remote machine."
            ),
        )

        # Transparent shell interception is provided by the AgentScope
        # middleware registered below.
        from .shell_wrapper import make_ssh_middleware_factory

        api.register_middleware(
            middleware_factory=make_ssh_middleware_factory(),
            priority=50,
        )

        # Tell the model which remote directory shell commands run in.
        api.register_prompt_section(
            name="remote_ssh_context",
            after="workspace",
            provider=_remote_prompt_section,
            priority=50,
        )

        # Register hooks
        api.register_startup_hook(
            hook_name="remote_init",
            callback=self._on_startup,
            priority=50,
        )
        api.register_shutdown_hook(
            hook_name="remote_cleanup",
            callback=self._on_shutdown,
            priority=50,
        )
        logger.info("[Remote] Plugin registered")

    async def _on_startup(self):
        """Mount the management REST API once the host is ready."""
        self._mount_router()
        logger.info("[Remote] Plugin startup complete")

    async def _on_shutdown(self):
        """Close every SSH connection owned by this plugin."""
        try:
            from .ssh_manager import get_ssh_manager

            await get_ssh_manager().close_all()
            logger.info("[Remote] All SSH connections closed")
        except Exception as e:
            logger.warning("[Remote] Failed to close SSH connections: %s", e)

    def _mount_router(self):
        """Mount the connection-management REST API."""
        from .routers.connections import router

        self._api.register_http_router(
            router=router,
            prefix="/remote",
        )
        logger.info("[Remote] HTTP router mounted at /api/remote")


plugin = RemotePlugin()
