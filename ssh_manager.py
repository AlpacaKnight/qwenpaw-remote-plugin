"""SSH connection manager singleton using paramiko."""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

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
    connected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_used: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    default_cwd: str = "/"
    profile_id: str = ""

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
            "uptime_seconds": (
                datetime.now(timezone.utc) - self.connected_at
            ).total_seconds(),
        }


class SSHManager:
    """Singleton manager for SSH connections keyed by session_id."""

    _instance: Optional["SSHManager"] = None

    def __new__(cls) -> "SSHManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._connections: dict[str, SSHConnectionInfo] = {}
            cls._instance._lock = asyncio.Lock()
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

        def _do_connect() -> paramiko.SSHClient:
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            connect_kwargs: dict = {
                "hostname": host,
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

            client.connect(**connect_kwargs)
            return client

        try:
            client = await asyncio.to_thread(_do_connect)
        except paramiko.AuthenticationException as e:
            raise ConnectionError(
                f"Authentication failed for {username}@{host}:{port}. "
                f"Check your username and password/key. ({e})"
            ) from e
        except paramiko.SSHException as e:
            raise ConnectionError(
                f"SSH error connecting to {host}:{port}: {e}"
            ) from e
        except (OSError, ConnectionError, TimeoutError) as e:
            raise ConnectionError(
                f"Could not connect to {host}:{port}: {e}"
            ) from e

        info = SSHConnectionInfo(
            client=client,
            host=host,
            port=port,
            username=username,
            profile_id=profile_id,
        )

        async with self._lock:
            self._connections[session_id] = info

        logger.info(
            "[Remote] Connected: %s@%s:%d (session=%s)",
            username,
            host,
            port,
            session_id,
        )
        return info.to_dict()

    async def disconnect(self, session_id: str) -> bool:
        """Disconnect the SSH session. Returns True if disconnected."""
        async with self._lock:
            info = self._connections.pop(session_id, None)

        if info is None:
            return False

        try:
            info.client.close()
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

        for sid, info in matches:
            try:
                info.client.close()
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
            cmd = f"cd {effective_cwd} && {command}"
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
        async with self._lock:
            for sid, info in self._connections.items():
                try:
                    info.client.close()
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

    def list_connections(self) -> list[dict]:
        """Return sanitized info for all active connections."""
        result = []
        for sid, info in self._connections.items():
            d = info.to_dict()
            d["session_id"] = sid
            result.append(d)
        return result


def get_ssh_manager() -> SSHManager:
    """Get the SSHManager singleton."""
    return SSHManager()
