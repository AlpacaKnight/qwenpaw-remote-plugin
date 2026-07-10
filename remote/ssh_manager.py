"""SSH connection manager singleton using paramiko."""

import asyncio
import logging
import shlex
from datetime import datetime, timezone
from typing import Any, Optional

from .store import find_jump_host_by_name, get_jump_host
from .ssh_types import (
    RemoteEnvSnapshot,
    SSHConnectionInfo,
    SSHHealthInfo,
    SudoState,
    normalize_host_and_port,
    wrap_command_with_cwd,
)

logger = logging.getLogger(__name__)


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
            cls._instance._env_cache: dict[str, RemoteEnvSnapshot] = {}
            cls._instance._ENV_TTL = 60.0  # seconds
            cls._instance._sudo_state: dict[str, SudoState] = {}
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

        host, port = normalize_host_and_port(host, port)

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
        jump_host, jump_port = normalize_host_and_port(jump_host, jump_port)
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
        resolved["host"], resolved["port"] = normalize_host_and_port(
            str(resolved.get("host", "")),
            int(resolved.get("port", 22)),
        )
        return resolved

    async def disconnect(self, session_id: str) -> bool:
        """Disconnect the SSH session. Returns True if disconnected."""
        async with self._lock:
            info = self._connections.pop(session_id, None)
            self._reconnect_params.pop(session_id, None)
            self._sudo_state.pop(session_id, None)

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
        sudo: bool = False,
        sudo_password: str = "",
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

        # Resolve sudo password from state if not provided
        if sudo and not sudo_password:
            sudo_state = self._sudo_state.get(session_id)
            if sudo_state and sudo_state.password:
                sudo_password = sudo_state.password

        # Wrap command with cd if cwd is specified
        effective_cwd = cwd or info.default_cwd
        inner_cmd = wrap_command_with_cwd(command, effective_cwd, info.remote_shell)

        # Determine remote shell type to apply correct command wrapping.
        # - sh-compatible shells (bash, zsh, dash, fish): use sh -c to
        #   ensure consistent parsing of &&, ;, nested quotes across platforms.
        # - Windows shells (cmd, powershell): send command directly; they have
        #   their own quoting semantics and no sh -c wrapper.
        shell = (info.remote_shell or "").lower()
        is_windows_shell = any(
            s in shell for s in ("cmd", "powershell", "pwsh")
        )

        if sudo:
            if not sudo_password:
                raise ConnectionError(
                    "Sudo password not configured. "
                    "Use /remote sudo or set sudo password in profile."
                )
            # sudo always needs sh -c, regardless of local shell
            cmd = f"sudo -S -p '' sh -c {shlex.quote(inner_cmd)}"
        elif is_windows_shell:
            # Windows shells: send raw command, no sh -c wrapper
            cmd = inner_cmd
        else:
            # Unix shells: use exec_command directly — SSH server invokes the
            # user's login shell to parse the command string, so wrapping in
            # sh -c is unnecessary for simple commands and causes quoting
            # issues (double-shell parsing) for complex ones.
            cmd = inner_cmd

        logger.debug("[Remote] execute_command cmd=%r", cmd)

        def _do_exec() -> tuple[int, str, str]:
            transport = info.client.get_transport()
            if transport is None:
                raise ConnectionError("SSH transport is closed")

            channel = transport.open_session()
            channel.settimeout(timeout)
            channel.exec_command(cmd)

            # Write sudo password to stdin if needed
            if sudo and sudo_password:
                channel.sendall((sudo_password + "\n").encode("utf-8"))

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

    # ── Sudo Management ─────────────────────────────────────────────

    def set_sudo(self, session_id: str, password: str, enabled: bool = True) -> None:
        """Configure sudo for a session."""
        self._sudo_state[session_id] = SudoState(
            enabled=enabled,
            password=password if enabled else "",
        )

    def clear_sudo(self, session_id: str) -> None:
        """Clear sudo configuration for a session."""
        self._sudo_state.pop(session_id, None)

    def get_sudo_state(self, session_id: str) -> dict:
        """Get sudo state for a session."""
        state = self._sudo_state.get(session_id)
        if state is None:
            return SudoState().to_dict()
        return state.to_dict()

    async def verify_sudo(self, session_id: str) -> dict:
        """Verify sudo access by running 'sudo -S -p '' true'.

        Returns dict with ok, verified_at, or error.
        """
        state = self._sudo_state.get(session_id)
        if state is None or not state.password:
            return {"ok": False, "error": "Sudo password not configured"}

        try:
            returncode, _, stderr = await self.execute_command(
                session_id,
                "true",
                timeout=10,
                sudo=True,
                sudo_password=state.password,
            )
            if returncode == 0:
                state.verified_at = datetime.now(timezone.utc)
                state.last_error = ""
                return {"ok": True, "verified_at": state.verified_at.isoformat()}
            else:
                error_msg = stderr.strip() or f"sudo returned exit code {returncode}"
                state.last_error = error_msg
                return {"ok": False, "error": error_msg}
        except Exception as e:
            state.last_error = str(e)
            return {"ok": False, "error": str(e)}

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

    _HEARTBEAT_INTERVAL = 15.0
    _DEEP_CHECK_INTERVAL = 60.0
    _DEGRADED_THRESHOLD = 1
    _STALE_THRESHOLD = 2

    def _start_heartbeat(self) -> None:
        """Start a background heartbeat task to detect stale connections."""
        if self._heartbeat_task is not None:
            return

        async def _heartbeat_loop():
            tick = 0
            while True:
                await asyncio.sleep(self._HEARTBEAT_INTERVAL)
                tick += 1
                try:
                    deep = (tick * self._HEARTBEAT_INTERVAL) % self._DEEP_CHECK_INTERVAL < self._HEARTBEAT_INTERVAL
                    await self._check_all_connections(deep_check=deep)
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
        logger.debug("[Remote] Heartbeat started (interval=%.1fs)", self._HEARTBEAT_INTERVAL)

    def _stop_heartbeat(self) -> None:
        """Stop the heartbeat task."""
        if self._heartbeat_task is not None:
            self._heartbeat_task.cancel()
            self._heartbeat_task = None
            logger.debug("[Remote] Heartbeat stopped")

    async def _check_all_connections(self, deep_check: bool = False) -> None:
        """Check health of all active connections."""
        async with self._lock:
            session_ids = list(self._connections.keys())

        now = datetime.now(timezone.utc)
        stale: list[str] = []

        for sid in session_ids:
            info = self._connections.get(sid)
            if info is None:
                continue

            transport = info.client.get_transport()
            if transport is None or not transport.is_active():
                stale.append(sid)
                continue

            # Lightweight: send_ignore + measure RTT
            try:
                import time
                t0 = time.monotonic()
                await asyncio.to_thread(transport.send_ignore)
                rtt_ms = (time.monotonic() - t0) * 1000

                info.health.last_checked_at = now
                info.health.last_success_at = now
                info.health.latency_ms = round(rtt_ms, 1)
                info.health.last_error = ""

                if info.health.consecutive_failures > 0:
                    info.health.consecutive_failures = 0
                    info.health.status = "connected"
                    info.health.connected = True
            except Exception as e:
                info.health.consecutive_failures += 1
                info.health.last_checked_at = now
                info.health.last_error = str(e)
                if info.health.consecutive_failures >= self._STALE_THRESHOLD:
                    info.health.status = "stale"
                    stale.append(sid)
                elif info.health.consecutive_failures >= self._DEGRADED_THRESHOLD:
                    info.health.status = "degraded"

            # Deep check: verify cwd accessibility
            if deep_check and sid not in stale:
                try:
                    _, stdout, _ = await self.execute_command(
                        sid, "pwd", timeout=5
                    )
                    info.health.cwd_ok = bool(stdout.strip())
                except Exception:
                    info.health.cwd_ok = False

        if stale:
            async with self._lock:
                for sid in stale:
                    info = self._connections.pop(sid, None)
                    if info is not None:
                        info.health.status = "stale"
                        info.health.connected = False
                        info.health.reconnect_available = bool(
                            self._reconnect_params.get(sid)
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

    # ── Health API ──────────────────────────────────────────────────

    def get_health(self, session_id: str) -> dict:
        """Get health status for a session's connection.

        Returns health dict. If connection is gone, returns stale status
        with reconnect availability.
        """
        info = self._connections.get(session_id)
        if info is not None:
            info.health.reconnect_available = True
            return info.health.to_dict()

        # Connection gone — check if reconnect is available
        has_params = bool(self._reconnect_params.get(session_id))
        return SSHHealthInfo(
            connected=False,
            status="disconnected",
            reconnect_available=has_params,
        ).to_dict()

    async def force_health_check(self, session_id: str) -> dict:
        """Force an immediate health check for a session.

        Returns updated health dict.
        """
        info = self._connections.get(session_id)
        if info is None:
            return self.get_health(session_id)

        now = datetime.now(timezone.utc)
        transport = info.client.get_transport()
        if transport is None or not transport.is_active():
            info.health.status = "stale"
            info.health.connected = False
            info.health.last_checked_at = now
            info.health.last_error = "SSH transport is closed"
            info.health.reconnect_available = bool(
                self._reconnect_params.get(session_id)
            )
            # Remove stale connection
            async with self._lock:
                self._connections.pop(session_id, None)
            try:
                info.client.close()
            except Exception:
                pass
            if info.jump_client is not None:
                try:
                    info.jump_client.close()
                except Exception:
                    pass
            return info.health.to_dict()

        # Measure RTT
        try:
            import time
            t0 = time.monotonic()
            await asyncio.to_thread(transport.send_ignore)
            rtt_ms = (time.monotonic() - t0) * 1000

            info.health.latency_ms = round(rtt_ms, 1)
            info.health.last_checked_at = now
            info.health.last_success_at = now
            info.health.last_error = ""
            info.health.consecutive_failures = 0
            info.health.status = "connected"
            info.health.connected = True
        except Exception as e:
            info.health.consecutive_failures += 1
            info.health.last_checked_at = now
            info.health.last_error = str(e)
            if info.health.consecutive_failures >= self._STALE_THRESHOLD:
                info.health.status = "stale"
                info.health.connected = False
                info.health.reconnect_available = bool(
                    self._reconnect_params.get(session_id)
                )
                async with self._lock:
                    self._connections.pop(session_id, None)
                try:
                    info.client.close()
                except Exception:
                    pass
                if info.jump_client is not None:
                    try:
                        info.jump_client.close()
                    except Exception:
                        pass
                return info.health.to_dict()
            elif info.health.consecutive_failures >= self._DEGRADED_THRESHOLD:
                info.health.status = "degraded"
                info.health.connected = True

        # Deep check: verify cwd
        try:
            _, stdout, _ = await self.execute_command(session_id, "pwd", timeout=5)
            info.health.cwd_ok = bool(stdout.strip())
        except Exception:
            info.health.cwd_ok = False

        info.health.reconnect_available = True
        return info.health.to_dict()

    # ── Remote Environment Detection ────────────────────────────────

    _ENV_DETECT_SCRIPT = r"""printf 'os=%s\n' "$(uname -s 2>/dev/null)"
printf 'arch=%s\n' "$(uname -m 2>/dev/null)"
printf 'kernel=%s\n' "$(uname -r 2>/dev/null)"
printf 'shell=%s\n' "$SHELL"
printf 'hostname=%s\n' "$(hostname 2>/dev/null)"
printf 'cpu=%s\n' "$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo '')"
printf 'memory=%s\n' "$(free -h 2>/dev/null | awk '/^Mem:/{print $2}' || sysctl -n hw.memsize 2>/dev/null | awk '{printf "%.1fG", $1/1073741824}' || echo '')"
printf 'disk_root=%s\n' "$(df -h / 2>/dev/null | awk 'NR==2{print $2 " total, " $3 " used, " $4 " avail"}')"
for t in git python3 python node npm docker curl wget vim nano; do
  command -v "$t" >/dev/null 2>&1 && echo "tool_$t=1" || echo "tool_$t=0"
done"""

    _ENV_KEY_TO_FIELD = {
        "os": "remote_os",
        "arch": "remote_arch",
        "kernel": "remote_kernel",
        "shell": "remote_shell",
        "hostname": "hostname",
        "cpu": "cpu_cores",
        "memory": "memory",
        "disk_root": "disk_root",
    }

    async def get_remote_env(
        self, session_id: str, refresh: bool = False
    ) -> RemoteEnvSnapshot:
        """Get remote environment info, using cache when valid.

        If refresh=True or cache expired, re-detect from remote.
        """
        now = datetime.now(timezone.utc)

        if not refresh:
            cached = self._env_cache.get(session_id)
            if cached is not None and cached.detected_at is not None:
                age = (now - cached.detected_at).total_seconds()
                if age < self._ENV_TTL:
                    return cached

        snapshot = await self._detect_remote_env(session_id)
        self._env_cache[session_id] = snapshot
        return snapshot

    async def _detect_remote_env(self, session_id: str) -> RemoteEnvSnapshot:
        """Detect remote environment using a single SSH command."""
        info = self.get_connection(session_id)
        if info is None:
            return RemoteEnvSnapshot(last_error="No active connection")

        snapshot = RemoteEnvSnapshot(detected_at=datetime.now(timezone.utc))

        try:
            returncode, stdout, stderr = await self.execute_command(
                session_id, self._ENV_DETECT_SCRIPT, timeout=15
            )
            if returncode != 0 and not stdout:
                snapshot.last_error = stderr.strip() or "Detection script failed"
                return snapshot

            tools: dict[str, bool] = {}
            for line in stdout.splitlines():
                line = line.strip()
                if "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip()

                if key.startswith("tool_"):
                    tool_name = key[5:]
                    tools[tool_name] = value == "1"
                elif key in self._ENV_KEY_TO_FIELD:
                    setattr(snapshot, self._ENV_KEY_TO_FIELD[key], value)

            snapshot.tools = tools
            # Also update connection info
            info.remote_os = snapshot.remote_os
            info.remote_arch = snapshot.remote_arch
            info.remote_kernel = snapshot.remote_kernel
            info.remote_shell = snapshot.remote_shell
            info.env_snapshot = snapshot
        except Exception as e:
            snapshot.last_error = str(e)

        return snapshot

    async def _safe_detect_env(self, session_id: str) -> None:
        """Detect remote env, swallowing errors."""
        try:
            await self.get_remote_env(session_id)
        except Exception as e:
            logger.debug("[Remote] Background env detection failed: %s", e)

    # ── Working Directory Management ────────────────────────────────

    async def test_connection(
        self,
        host: str,
        port: int = 22,
        username: str = "root",
        password: str = "",
        key_path: str = "",
        passphrase: str = "",
        jump_host_id: str = "",
        jump_name: str = "",
        jump_host: str = "",
        jump_port: int = 22,
        jump_username: str = "",
        jump_password: str = "",
        jump_key_path: str = "",
        jump_passphrase: str = "",
    ) -> dict:
        """Test an SSH connection without affecting current sessions.

        Returns dict with latency_ms, remote_os, remote_shell on success.
        Raises on failure.
        """
        import paramiko
        import time as _time

        host, port = normalize_host_and_port(host, port)
        if not host:
            raise ValueError("host is required")
        if not username:
            raise ValueError("username is required")

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

        def _do_test() -> dict:
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
                except Exception:
                    jump_client.close()
                    raise

            client = _new_client()
            try:
                t0 = _time.monotonic()
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
                latency_ms = round((_time.monotonic() - t0) * 1000, 1)

                # Quick env detection
                transport = client.get_transport()
                channel = transport.open_session()
                channel.exec_command(
                    "uname -s; echo $SHELL"
                )
                channel.shutdown_write()
                output_bytes = b""
                start = _time.monotonic()
                while not channel.exit_status_ready():
                    if _time.monotonic() - start > 5:
                        channel.close()
                        break
                    if channel.recv_ready():
                        output_bytes += channel.recv(65536)
                    _time.sleep(0.05)
                while channel.recv_ready():
                    output_bytes += channel.recv(65536)
                output = output_bytes.decode("utf-8", errors="replace")
                channel.close()

                lines = output.strip().split("\n")
                remote_os = lines[0].strip() if len(lines) > 0 else ""
                remote_shell = lines[1].strip() if len(lines) > 1 else ""

                return {
                    "latency_ms": latency_ms,
                    "remote_os": remote_os,
                    "remote_shell": remote_shell,
                }
            finally:
                client.close()
                if jump_client is not None:
                    jump_client.close()

        try:
            return await asyncio.to_thread(_do_test)
        except paramiko.AuthenticationException as e:
            raise ConnectionError(
                f"Authentication failed for {username}@{host}:{port}. "
                f"({e})"
            ) from e
        except paramiko.SSHException as e:
            raise ConnectionError(
                f"SSH error connecting to {host}:{port}: {e}"
            ) from e
        except (OSError, ConnectionError, TimeoutError) as e:
            raise ConnectionError(
                f"Could not connect to {host}:{port}: {e}"
            ) from e

    async def set_default_cwd(
        self,
        session_id: str,
        cwd: str,
        verify: bool = True,
    ) -> dict:
        """Set the default remote working directory for a session.

        If verify=True, checks that the directory exists and is accessible.
        Returns dict with default_cwd and cwd_ok.
        Raises ConnectionError or ValueError on failure.
        """
        info = self.get_connection(session_id)
        if info is None:
            raise ConnectionError(
                f"No active SSH connection for session {session_id}"
            )

        if not cwd or not cwd.strip():
            raise ValueError("cwd path is required")

        cwd = cwd.strip()

        if verify:
            test_cmd = "pwd"
            try:
                returncode, stdout, stderr = await self.execute_command(
                    session_id, test_cmd, timeout=5, cwd=cwd
                )
                if returncode != 0:
                    raise ValueError(
                        f"Directory not accessible: {cwd}\n{stderr.strip()}"
                    )
            except ConnectionError:
                raise
            except ValueError:
                raise
            except Exception as e:
                raise ValueError(
                    f"Failed to verify directory {cwd}: {e}"
                )

        info.default_cwd = cwd
        info.health.cwd_ok = True if verify else None
        logger.info(
            "[Remote] Default cwd set to %s (session=%s)",
            cwd,
            session_id,
        )
        return {
            "default_cwd": info.default_cwd,
            "cwd_ok": info.health.cwd_ok,
        }


def get_ssh_manager() -> SSHManager:
    """Get the SSHManager singleton."""
    return SSHManager()
