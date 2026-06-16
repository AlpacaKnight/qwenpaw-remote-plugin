"""Shared SSH data structures and command helpers."""

from __future__ import annotations

import shlex
from dataclasses import dataclass, field
from datetime import datetime, timezone
from urllib.parse import urlparse


def normalize_host_and_port(host: str, port: int) -> tuple[str, int]:
    """Accept plain hosts and common URL-shaped input."""
    raw = (host or "").strip()
    if "://" not in raw:
        return raw, port

    parsed = urlparse(raw)
    normalized_host = parsed.hostname or raw
    normalized_port = parsed.port or port
    return normalized_host, normalized_port


@dataclass
class SudoState:
    """Sudo configuration for a session."""

    enabled: bool = False
    password: str = ""
    verified_at: datetime | None = None
    last_error: str = ""

    def to_dict(self) -> dict:
        return {
            "enabled": self.enabled,
            "verified_at": (
                self.verified_at.isoformat() if self.verified_at else None
            ),
            "last_error": self.last_error,
        }


@dataclass
class RemoteEnvSnapshot:
    """Cached remote environment information."""

    remote_os: str = ""
    remote_arch: str = ""
    remote_kernel: str = ""
    remote_shell: str = ""
    hostname: str = ""
    cpu_cores: str = ""
    memory: str = ""
    disk_root: str = ""
    tools: dict[str, bool] = field(default_factory=dict)
    detected_at: datetime | None = None
    last_error: str = ""

    def to_dict(self) -> dict:
        return {
            "remote_os": self.remote_os,
            "remote_arch": self.remote_arch,
            "remote_kernel": self.remote_kernel,
            "remote_shell": self.remote_shell,
            "hostname": self.hostname,
            "cpu_cores": self.cpu_cores,
            "memory": self.memory,
            "disk_root": self.disk_root,
            "tools": self.tools,
            "detected_at": (
                self.detected_at.isoformat() if self.detected_at else None
            ),
            "last_error": self.last_error,
        }


@dataclass
class SSHHealthInfo:
    """Health status for an SSH connection."""

    connected: bool = True
    status: str = "connected"  # connected | degraded | stale | disconnected
    last_checked_at: datetime | None = None
    last_success_at: datetime | None = None
    latency_ms: float | None = None
    consecutive_failures: int = 0
    last_error: str = ""
    reconnect_available: bool = False
    cwd_ok: bool | None = None

    def to_dict(self) -> dict:
        return {
            "connected": self.connected,
            "status": self.status,
            "last_checked_at": (
                self.last_checked_at.isoformat() if self.last_checked_at else None
            ),
            "last_success_at": (
                self.last_success_at.isoformat() if self.last_success_at else None
            ),
            "latency_ms": self.latency_ms,
            "consecutive_failures": self.consecutive_failures,
            "last_error": self.last_error,
            "reconnect_available": self.reconnect_available,
            "cwd_ok": self.cwd_ok,
        }


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
    health: SSHHealthInfo = field(default_factory=SSHHealthInfo)
    env_snapshot: RemoteEnvSnapshot | None = None

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
            "health": self.health.to_dict(),
        }


def wrap_command_with_cwd(command: str, cwd: str, shell: str = "") -> str:
    """Wrap a command with cd to the given working directory.

    Handles fish shell syntax and proper quoting.
    """
    if not cwd or cwd == "/":
        return command
    quoted_cwd = shlex.quote(cwd)
    is_fish = "fish" in (shell or "")
    separator = "; and " if is_fish else " && "
    return f"cd {quoted_cwd}{separator}{command}"
