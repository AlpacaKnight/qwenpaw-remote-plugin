"""Remote SSH Plugin for QwenPaw.

Enables SSH connections to remote devices. When a connection is active
for a session, all shell commands execute transparently on the remote
machine via SSH.

Uses monkey-patching (no core files modified):
- Patches QwenPawAgent._create_toolkit to inject SSH middleware
- Patches QwenPawAgent.reply to set ContextVar for session scoping
"""

import logging

logger = logging.getLogger(__name__)


class RemotePlugin:
    """Remote SSH plugin entry point."""

    def register(self, api):
        """Register tools, startup hook, and shutdown hook."""
        # Register tools via api.register_tool (deferred to startup hook)
        from .tools.remote_connect import remote_connect
        from .tools.remote_disconnect import remote_disconnect
        from .tools.remote_list import remote_list
        from .tools.remote_exec import remote_exec
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
            enabled=False,
        )
        api.register_tool(
            tool_name="remote_disconnect",
            tool_func=remote_disconnect,
            description="Disconnect from the current remote SSH session.",
            icon="DisconnectOutlined",
            enabled=False,
        )
        api.register_tool(
            tool_name="remote_list",
            tool_func=remote_list,
            description="Show the current remote SSH connection status.",
            icon="CloudOutlined",
            enabled=False,
        )
        api.register_tool(
            tool_name="remote_exec",
            tool_func=remote_exec,
            description=(
                "Explicitly execute a command on the remote machine via SSH."
            ),
            icon="CodeOutlined",
            enabled=False,
        )
        api.register_control_command(
            handler=RemoteCommandHandler(),
            priority_level=10,
        )

        # Register startup hook for monkey-patching and router mounting
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
        """Initialize Remote plugin on application startup."""
        logger.info("[Remote] Plugin starting up...")

        # 1. Patch QwenPawAgent._create_toolkit to inject SSH middleware
        _patch_create_toolkit()

        # 2. Patch QwenPawAgent.reply to set ContextVar
        _patch_reply()

        # 3. Mount HTTP router
        _mount_router()

        logger.info("[Remote] Plugin startup complete")

    async def _on_shutdown(self):
        """Cleanup on application shutdown."""
        logger.info("[Remote] Plugin shutting down...")
        try:
            from .ssh_manager import get_ssh_manager

            await get_ssh_manager().close_all()
            logger.info("[Remote] All SSH connections closed")
        except Exception as e:
            logger.warning("[Remote] Failed to close SSH connections: %s", e)


def _patch_create_toolkit():
    """Patch QwenPawAgent._create_toolkit to inject SSH middleware."""
    try:
        from qwenpaw.agents.react_agent import QwenPawAgent
    except ImportError as exc:
        logger.error(
            "[Remote] Cannot import QwenPawAgent; toolkit patch skipped: %s",
            exc,
        )
        return

    _original_create_toolkit = QwenPawAgent._create_toolkit

    def _patched_create_toolkit(self, *args, **kwargs):
        toolkit = _original_create_toolkit(self, *args, **kwargs)

        try:
            from .shell_wrapper import make_ssh_middleware

            toolkit.register_middleware(make_ssh_middleware())
            logger.debug("[Remote] SSH middleware registered on toolkit")
        except Exception as e:
            logger.warning("[Remote] Failed to register SSH middleware: %s", e)

        return toolkit

    QwenPawAgent._create_toolkit = _patched_create_toolkit
    logger.info("[Remote] Patched QwenPawAgent._create_toolkit")


def _patch_reply():
    """Patch QwenPawAgent.reply to set the remote_session_id ContextVar."""
    try:
        from qwenpaw.agents.react_agent import QwenPawAgent
    except ImportError as exc:
        logger.error(
            "[Remote] Cannot import QwenPawAgent; reply patch skipped: %s",
            exc,
        )
        return

    _original_reply = QwenPawAgent.reply

    async def _patched_reply(self, msg=None, structured_model=None):
        from .context import set_remote_session_id

        session_id = (
            self._request_context.get("session_id")
            if self._request_context
            else None
        )
        set_remote_session_id(session_id)
        try:
            return await _original_reply(self, msg, structured_model)
        finally:
            set_remote_session_id(None)

    QwenPawAgent.reply = _patched_reply
    logger.info("[Remote] Patched QwenPawAgent.reply")


def _mount_router():
    """Mount the HTTP router for connection management API."""
    try:
        from .routers.connections import router
        from qwenpaw.plugins.registry import PluginRegistry

        registry = PluginRegistry()
        registry.register_http_router(
            plugin_id="remote",
            router=router,
            prefix="/remote",
        )
        logger.info("[Remote] HTTP router mounted at /api/remote")
    except Exception as e:
        logger.warning("[Remote] Failed to mount HTTP router: %s", e)


plugin = RemotePlugin()
