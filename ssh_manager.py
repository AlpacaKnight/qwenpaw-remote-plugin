"""SSH connection manager singleton using paramiko."""

import asyncio
import logging
import shlex
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlparse

from .store import find_jump_host_by_name, get_jump_host

logger = logging.getLogger(__name__)


def _normalize_host_and_port(host: str, port: int) -> tuple[str, int]:
    """Accept plain hosts and common URL-shaped input."""
    raw = (host or "").strip()
    if "://" not in raw:
        return raw, port

    parsed = urlparse(raw)
    normalized_host = parsed.hostname or raw
    normalized_port = parsed.port or port
    return normalized_host, normalized_port


@dataclass
class SSHConnectionInfo:
    """Holds an active SSH connection and its metadata."""

    client: object  # paramiko.SSHClient (typed as object to avoid import at module level)
    host: str
    port: int
    username: str
    jump_client: object | None = None
    jump_host_id: str = ""
    jump_host_name: str = ""
    jump_host: str = ""
    jump_port: int = 22
    jump_username: str = ""
    connected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_used: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    default_cwd: str = "/"
    profile_id: str = ""
    _connect_params: dict = field(default_factory=dict, repr=False)
    _healthy: bool = True
    remote_os: str = ""
    remote_arch: str = ""
    remote_kernel: str = ""
    remote_shell: str = ""

    def to_dict(self) -> dict:
        """Return sanitized connection info (no credentials)."""
        return {
            "host": self.host,
            "port": self.port,
            "username": self.username,
            "connected_at": self.connected_at.isoformat(),
            "last_used": self.last_used.isoformat(),
            "default_cwd": self.default_cwd,
            "profile_id": self.profile_id,
            "jump_host_id": self.jump_host_id,
            "jump_host_name": self.jump_host_name,
            "jump_host": self.jump_host,
            "jump_port": self.jump_port,
            "jump_username": self.jump_username,
            "via_jump_host": bool(self.jump_host),
            "uptime_seconds": (
                datetime.now(timezone.utc) - self.connected_at
            ).total_seconds(),
            "remote_os": self.remote_os,
            "remote_arch": self.remote_arch,
            "remote_kernel": self.remote_kernel,
            "remote_shell": self.remote_shell,
        }


class SSHManager:
    """Singleton manager for SSH connections keyed by session_id."""

    _instance: Optional["SSHManager"] = None

    def __new__(cls) -> "SSHManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._connections: dict[str, SSHConnectionInfo] = {}
            cls._instance._reconnect_params: dict[str, dict] = {}
            cls._instance._lock = asyncio.Lock()
            cls._instance._heartbeat_task: asyncio.Task | None = None
        return cls._instance

    async def connect(
        self,
        session_id: str,
        host: str,
        port: int = 22,
        username: str = "root",
        password: str = "",
        key_path: str = "",
        passphrase: str = "",
        profile_id: str = "",
        jump_host_id: str = "",
        jump_name: str = "",
        jump_host: str = "",
        jump_port: int = 22,
        jump_username: str = "",
        jump_password: str = "",
        jump_key_path: str = "",
        jump_passphrase: str = "",
    ) -> dict:
        """Establish an SSH connection and store it for the session.

        Returns connection info dict on success.
        Raises on failure with a clear error message.
        """
        import paramiko

        host, port = _normalize_host_and_port(host, port)

        if not host:
            raise ValueError("host is required")
        if not username:
            raise ValueError("username is required")

        async with self._lock:
            # Disconnect existing connection for this session
            if session_id in self._connections:
                old = self._connections[session_id]
                try:
                    old.client.close()
                except Exception:
                    pass
                del self._connections[session_id]
                logger.info(
                    "[Remote] Closed previous connection for session %s",
                    session_id,
                )

        jump_config = self._resolve_jump_config(
            jump_host_id=jump_host_id,
            jump_name=jump_name,
            jump_host=jump_host,
            jump_port=jump_port,
            jump_username=jump_username,
            jump_password=jump_password,
            jump_key_path=jump_key_path,
            jump_passphrase=jump_passphrase,
        )

        def _build_connect_kwargs(
            *,
            hostname: str,
            port: int,
            username: str,
            password: str = "",
            key_path: str = "",
            passphrase: str = "",
            sock: object | None = None,
        ) -> dict:
            connect_kwargs: dict[str, Any] = {
                "hostname": hostname,
                "port": port,
                "username": username,
                "timeout": 15,
            }
            if password:
                connect_kwargs["password"] = password
            if key_path:
                connect_kwargs["key_filename"] = key_path
            if passphrase:
                connect_kwargs["passphrase"] = passphrase
            if sock is not None:
                connect_kwargs["sock"] = sock
            return connect_kwargs

        def _new_client() -> paramiko.SSHClient:
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            return client

        def _do_connect() -> tuple[paramiko.SSHClient, paramiko.SSHClient | None]:
            jump_client = None
            sock = None
            if jump_config:
                jump_client = _new_client()
                try:
                    jump_client.connect(
                        **_build_connect_kwargs(
                            hostname=jump_config["host"],
                            port=jump_config["port"],
                            username=jump_config["username"],
                            password=jump_config.get("password", ""),
                            key_path=jump_config.get("key_path", ""),
                            passphrase=jump_config.get("passphrase", ""),
                        )
                    )
                    transport = jump_client.get_transport()
                    if transport is None or not transport.is_active():
                        raise ConnectionError("Jump host SSH transport is closed")
                    sock = transport.open_channel(
                        "direct-tcpip",
                        (host, port),
                        ("", 0),
                    )
                except paramiko.AuthenticationException as e:
                    jump_client.close()
                    raise ConnectionError(
                        "Jump host authentication failed for "
                        f"{jump_config['username']}@"
                        f"{jump_config['host']}:{jump_config['port']}. "
                        "Check your jump host username and password/key. "
                        f"({e})"
                    ) from e
                except Exception:
                    jump_client.close()
                    raise

            client = _new_client()
            try:
                client.connect(
                    **_build_connect_kwargs(
                        hostname=host,
                        port=port,
                        username=username,
                        password=password,
                        key_path=key_path,
                        passphrase=passphrase,
                        sock=sock,
                    )
                )
            except Exception:
                client.close()
                if jump_client is not None:
                    jump_client.close()
                raise
            return client, jump_client

        try:
            client, jump_client = await asyncio.to_thread(_do_connect)
        except paramiko.AuthenticationException as e:
            raise ConnectionError(
                f"Authentication failed for {username}@{host}:{port}. "
                f"Check your username and password/key. ({e})"
            ) from e
        except paramiko.SSHException as e:
            via = (
                f" via jump host {jump_config['host']}:{jump_config['port']}"
                if jump_config
                else ""
            )
            raise ConnectionError(
                f"SSH error connecting to {host}:{port}{via}: {e}"
            ) from e
        except (OSError, ConnectionError, TimeoutError) as e:
            via = (
                f" via jump host {jump_config['host']}:{jump_config['port']}"
                if jump_config
                else ""
            )
            raise ConnectionError(
                f"Could not connect to {host}:{port}{via}: {e}"
            ) from e

        info = SSHConnectionInfo(
            client=client,
            host=host,
            port=port,
            username=username,
            jump_client=jump_client,
            jump_host_id=jump_config.get("id", "") if jump_config else "",
            jump_host_name=jump_config.get("name", "") if jump_config else "",
            jump_host=jump_config.get("host", "") if jump_config else "",
            jump_port=jump_config.get("port", 22) if jump_config else 22,
            jump_username=jump_config.get("username", "") if jump_config else "",
            profile_id=profile_id,
            _connect_params={
                "host": host,
                "port": port,
                "username": username,
                "password": password,
                "key_path": key_path,
                "passphrase": passphrase,
                "profile_id": profile_id,
                "jump_host_id": jump_config.get("id", "") if jump_config else "",
                "jump_name": jump_config.get("name", "") if jump_config else "",
                "jump_host": jump_config.get("host", "") if jump_config else "",
                "jump_port": jump_config.get("port", 22) if jump_config else 22,
                "jump_username": jump_config.get("username", "") if jump_config else "",
                "jump_password": jump_config.get("password", "") if jump_config else "",
                "jump_key_path": jump_config.get("key_path", "") if jump_config else "",
                "jump_passphrase": jump_config.get("passphrase", "") if jump_config else "",
            },
        )

        async with self._lock:
            self._connections[session_id] = info
            self._reconnect_params[session_id] = dict(info._connect_params)
            if self._heartbeat_task is None:
                self._start_heartbeat()

        logger.info(
            "[Remote] Connected: %s@%s:%d (session=%s)",
            username,
            host,
            port,
            session_id,
        )

        # Auto-detect remote environment in background
        asyncio.create_task(self._safe_detect_env(session_id))

        return info.to_dict()

    @staticmethod
    def _resolve_jump_config(
        *,
        jump_host_id: str = "",
        jump_name: str = "",
        jump_host: str = "",
        jump_port: int = 22,
        jump_username: str = "",
        jump_password: str = "",
        jump_key_path: str = "",
        jump_passphrase: str = "",
    ) -> dict[str, Any] | None:
        jump_host, jump_port = _normalize_host_and_port(jump_host, jump_port)
        if jump_host:
            if not jump_username:
                raise ValueError("jump_username is required when jump_host is set")
            return {
                "id": "",
                "name": "",
                "host": jump_host,
                "port": jump_port,
                "username": jump_username,
                "password": jump_password,
                "key_path": jump_key_path,
                "passphrase": jump_passphrase,
            }

        jump_config = None
        if jump_host_id:
            jump_config = get_jump_host(jump_host_id)
            if jump_config is None:
                raise ValueError(f"jump host not found: {jump_host_id}")
        elif jump_name:
            jump_config = find_jump_host_by_name(jump_name)
            if jump_config is None:
                raise ValueError(f"jump host not found: {jump_name}")

        if jump_config is None:
            return None

        resolved = dict(jump_config)
        resolved["host"], resolved["port"] = _normalize_host_and_port(
            str(resolved.get("host", "")),
            int(resolved.get("port", 22)),
        )
        return resolved

    async def disconnect(self, session_id: str) -> bool:
        """Disconnect the SSH session. Returns True if disconnected."""
        async with self._lock:
            info = self._connections.pop(session_id, None)
            self._reconnect_params.pop(session_id, None)

        if info is None:
            return False

        try:
            info.client.close()
        except Exception:
            pass
        if info.jump_client is not None:
            try:
                info.jump_client.close()
            except Exception:
                pass

        logger.info(
            "[Remote] Disconnected %s@%s:%d (session=%s)",
            info.username,
            info.host,
            info.port,
            session_id,
        )
        return True

    async def disconnect_profile(self, profile_id: str) -> int:
        """Disconnect all sessions currently using the saved profile."""
        async with self._lock:
            matches = [
                (sid, info)
                for sid, info in self._connections.items()
                if info.profile_id == profile_id
            ]
            for sid, _info in matches:
                self._connections.pop(sid, None)
                self._reconnect_params.pop(sid, None)

        for sid, info in matches:
            try:
                info.client.close()
            except Exception:
                pass
            if info.jump_client is not None:
                try:
                    info.jump_client.close()
                except Exception:
                    pass
            logger.info(
                "[Remote] Disconnected profile %s connection "
                "%s@%s:%d (session=%s)",
                profile_id,
                info.username,
                info.host,
                info.port,
                sid,
            )
        return len(matches)

    async def disconnect_jump_host(self, jump_host_id: str) -> int:
        """Disconnect all sessions currently using the saved jump host."""
        async with self._lock:
            matches = [
                (sid, info)
                for sid, info in self._connections.items()
                if info.jump_host_id == jump_host_id
            ]
            for sid, _info in matches:
                self._connections.pop(sid, None)
                self._reconnect_params.pop(sid, None)

        for sid, info in matches:
            try:
                info.client.close()
            except Exception:
                pass
            if info.jump_client is not None:
                try:
                    info.jump_client.close()
                except Exception:
                    pass
            logger.info(
                "[Remote] Disconnected jump host %s connection "
                "%s@%s:%d (session=%s)",
                jump_host_id,
                info.username,
                info.host,
                info.port,
                sid,
            )
        return len(matches)

    def get_connection(self, session_id: str) -> Optional[SSHConnectionInfo]:
        """Get the active connection for a session, or None."""
        info = self._connections.get(session_id)
        if info is None:
            return None

        # Check transport health
        transport = info.client.get_transport()
        if transport is None or not transport.is_active():
            # Stale connection — remove it
            logger.warning(
                "[Remote] Stale connection detected for session %s, removing",
                session_id,
            )
            try:
                info.client.close()
            except Exception:
                pass
            if info.jump_client is not None:
                try:
                    info.jump_client.close()
                except Exception:
                    pass
            self._connections.pop(session_id, None)
            return None

        info.last_used = datetime.now(timezone.utc)
        return info

    async def execute_command(
        self,
        session_id: str,
        command: str,
        timeout: float = 60.0,
        cwd: Optional[str] = None,
    ) -> tuple[int, str, str]:
        """Execute a command on the remote host.

        Returns (returncode, stdout, stderr).
        Raises ConnectionError if no active connection.
        """
        info = self.get_connection(session_id)
        if info is None:
            raise ConnectionError(
                f"No active SSH connection for session {session_id}"
            )

        # Wrap command with cd if cwd is specified
        effective_cwd = cwd or info.default_cwd
        if effective_cwd and effective_cwd != "/":
            quoted_cwd = shlex.quote(effective_cwd)
            is_fish = "fish" in (info.remote_shell or "")
            separator = "; and " if is_fish else " && "
            cmd = f"cd {quoted_cwd}{separator}{command}"
        else:
            cmd = command

        def _do_exec() -> tuple[int, str, str]:
            transport = info.client.get_transport()
            if transport is None:
                raise ConnectionError("SSH transport is closed")

            channel = transport.open_session()
            channel.settimeout(timeout)
            channel.exec_command(cmd)

            # Read stdout and stderr
            stdout_bytes = b""
            stderr_bytes = b""

            # Read until channel closes
            channel.shutdown_write()

            import select
            import time

            start = time.monotonic()
            while not channel.exit_status_ready():
                if time.monotonic() - start > timeout:
                    channel.close()
                    return (-1, stdout_bytes.decode("utf-8", errors="replace"),
                            f"Command timed out after {timeout} seconds")
                readable, _, _ = select.select(
                    [channel], [], [], min(1.0, timeout)
                )
                if readable:
                    if channel.recv_ready():
                        stdout_bytes += channel.recv(65536)
                    if channel.recv_stderr_ready():
                        stderr_bytes += channel.recv_stderr(65536)

            # Drain remaining data
            while channel.recv_ready():
                stdout_bytes += channel.recv(65536)
            while channel.recv_stderr_ready():
                stderr_bytes += channel.recv_stderr(65536)

            returncode = channel.recv_exit_status()
            channel.close()

            return (
                returncode,
                stdout_bytes.decode("utf-8", errors="replace"),
                stderr_bytes.decode("utf-8", errors="replace"),
            )

        try:
            return await asyncio.to_thread(_do_exec)
        except ConnectionError:
            raise
        except Exception as e:
            raise ConnectionError(
                f"Remote command execution failed: {e}"
            ) from e

    async def close_all(self) -> None:
        """Close all SSH connections (called on shutdown)."""
        self._stop_heartbeat()
        async with self._lock:
            for sid, info in self._connections.items():
                try:
                    info.client.close()
                except Exception:
                    pass
                if info.jump_client is not None:
                    try:
                        info.jump_client.close()
                    except Exception:
                        pass
                logger.info(
                    "[Remote] Closed connection %s@%s:%d (session=%s)",
                    info.username,
                    info.host,
                    info.port,
                    sid,
                )
            self._connections.clear()
            self._reconnect_params.clear()

    def list_connections(self) -> list[dict]:
        """Return sanitized info for all active connections."""
        result = []
        for sid, info in self._connections.items():
            d = info.to_dict()
            d["session_id"] = sid
            result.append(d)
        return result

    # ── Heartbeat ────────────────────────────────────────────────────

    def _start_heartbeat(self, interval: float = 15.0) -> None:
        """Start a background heartbeat task to detect stale connections."""
        if self._heartbeat_task is not None:
            return

        async def _heartbeat_loop():
            while True:
                await asyncio.sleep(interval)
                try:
                    await self._check_all_connections()
                except asyncio.CancelledError:
                    raise
                except Exception as e:
                    logger.warning("[Remote] Heartbeat check failed: %s", e)

                async with self._lock:
                    if not self._connections:
                        self._heartbeat_task = None
                        logger.debug("[Remote] Heartbeat stopped (no connections)")
                        return

        self._heartbeat_task = asyncio.create_task(_heartbeat_loop())
        logger.debug("[Remote] Heartbeat started (interval=%.1fs)", interval)

    def _stop_heartbeat(self) -> None:
        """Stop the heartbeat task."""
        if self._heartbeat_task is not None:
            self._heartbeat_task.cancel()
            self._heartbeat_task = None
            logger.debug("[Remote] Heartbeat stopped")

    async def _check_all_connections(self) -> None:
        """Check health of all active connections."""
        async with self._lock:
            session_ids = list(self._connections.keys())

        stale: list[str] = []
        for sid in session_ids:
            info = self._connections.get(sid)
            if info is None:
                continue
            transport = info.client.get_transport()
            if transport is None or not transport.is_active():
                stale.append(sid)
                continue
            try:
                await asyncio.to_thread(transport.send_ignore)
            except Exception:
                stale.append(sid)

        if stale:
            async with self._lock:
                for sid in stale:
                    info = self._connections.pop(sid, None)
                    if info is not None:
                        info._healthy = False
                        try:
                            info.client.close()
                        except Exception:
                            pass
                        if info.jump_client is not None:
                            try:
                                info.jump_client.close()
                            except Exception:
                                pass
                        logger.warning(
                            "[Remote] Heartbeat: stale connection removed "
                            "%s@%s:%d (session=%s)",
                            info.username,
                            info.host,
                            info.port,
                            sid,
                        )

    # ── Auto Reconnect ──────────────────────────────────────────────

    async def auto_reconnect(self, session_id: str) -> dict:
        """Reconnect using cached connection parameters.

        Returns connection info dict on success.
        Raises on failure.
        """
        info = self._connections.get(session_id)
        params = dict(
            info._connect_params if info is not None
            else self._reconnect_params.get(session_id, {})
        )
        if not params:
            raise ConnectionError(
                "No cached connection parameters. Use remote_connect instead."
            )

        # Close stale connection if present
        if info is not None:
            try:
                info.client.close()
            except Exception:
                pass
            if info.jump_client is not None:
                try:
                    info.jump_client.close()
                except Exception:
                    pass
            self._connections.pop(session_id, None)

        return await self.connect(session_id=session_id, **params)

    # ── Remote Environment Detection ────────────────────────────────

    async def detect_remote_env(self, session_id: str) -> dict:
        """Detect remote OS, arch, kernel, shell and cache on connection info.

        Returns dict with remote_os, remote_arch, remote_kernel, remote_shell.
        """
        info = self.get_connection(session_id)
        if info is None:
            return {}

        try:
            _, os_name, _ = await self.execute_command(
                session_id, "uname -s", timeout=5
            )
            _, arch, _ = await self.execute_command(
                session_id, "uname -m", timeout=5
            )
            _, kernel, _ = await self.execute_command(
                session_id, "uname -r", timeout=5
            )
            _, shell, _ = await self.execute_command(
                session_id, "echo $SHELL", timeout=5
            )
            info.remote_os = os_name.strip()
            info.remote_arch = arch.strip()
            info.remote_kernel = kernel.strip()
            info.remote_shell = shell.strip()
        except Exception as e:
            logger.debug("[Remote] Environment detection failed: %s", e)

        return {
            "remote_os": info.remote_os,
            "remote_arch": info.remote_arch,
            "remote_kernel": info.remote_kernel,
            "remote_shell": info.remote_shell,
        }

    async def _safe_detect_env(self, session_id: str) -> None:
        """Detect remote env, swallowing errors."""
        try:
            await self.detect_remote_env(session_id)
        except Exception as e:
            logger.debug("[Remote] Background env detection failed: %s", e)


def get_ssh_manager() -> SSHManager:
    """Get the SSHManager singleton."""
    return SSHManager()
