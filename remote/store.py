"""Persistent storage for Remote SSH connection profiles."""

from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any
from uuid import uuid4

from qwenpaw.constant import WORKING_DIR

_REMOTE_DIR = WORKING_DIR / "remote"
_PROFILES_FILE = _REMOTE_DIR / "profiles.json"
# Plugin-owned host-key store.  paramiko's ``load_host_keys()`` records this
# path, so ``AutoAddPolicy`` persists first-contact keys here (TOFU) and
# later connections verify against it instead of blindly re-accepting.
KNOWN_HOSTS_FILE = _REMOTE_DIR / "known_hosts"
_KNOWN_HOSTS_LOCK = threading.RLock()


def _restrict_permissions() -> None:
    """Keep stored credentials readable only by the current user."""
    for path, mode in (
        (_REMOTE_DIR, 0o700),
        (_PROFILES_FILE, 0o600),
        (KNOWN_HOSTS_FILE, 0o600),
    ):
        try:
            os.chmod(path, mode)
        except OSError:
            pass


def ensure_known_hosts_file() -> Path:
    """Return the plugin known_hosts path, creating it with strict perms."""
    _REMOTE_DIR.mkdir(parents=True, exist_ok=True)
    KNOWN_HOSTS_FILE.touch(exist_ok=True)
    _restrict_permissions()
    if os.name != "nt":
        mode = KNOWN_HOSTS_FILE.stat().st_mode & 0o777
        if mode & 0o077:
            raise PermissionError(f"Unsafe permissions on {KNOWN_HOSTS_FILE}: {mode:o}")
    return KNOWN_HOSTS_FILE


def known_hosts_lock() -> threading.RLock:
    """Serialize host-key file read/modify/write operations."""
    return _KNOWN_HOSTS_LOCK


def load_known_hosts(client: Any) -> None:
    """Load the pinned host keys while serialized with persistence."""
    with _KNOWN_HOSTS_LOCK:
        client.load_host_keys(str(ensure_known_hosts_file()))


def persist_known_hosts(*clients: Any) -> None:
    """Merge newly observed keys into the current file without lost updates."""
    import paramiko

    with _KNOWN_HOSTS_LOCK:
        path = ensure_known_hosts_file()
        merged = paramiko.HostKeys()
        merged.load(str(path))
        for client in clients:
            if client is None:
                continue
            for hostname, keys in client.get_host_keys().items():
                for key_type, key in keys.items():
                    # Existing pins are authoritative; never overwrite a
                    # different key for the same host and key algorithm.
                    if key_type not in merged.get(hostname, {}):
                        merged.add(hostname, key_type, key)
        merged.save(str(path))
        _restrict_permissions()


def _load_profiles_file() -> dict[str, Any]:
    if _PROFILES_FILE.is_file():
        _restrict_permissions()
        try:
            return json.loads(_PROFILES_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {"profiles": []}
    return {"profiles": []}


def _save_profiles_file(data: dict[str, Any]) -> None:
    _REMOTE_DIR.mkdir(parents=True, exist_ok=True)
    _PROFILES_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    _restrict_permissions()


def list_profiles() -> list[dict[str, Any]]:
    data = _load_profiles_file()
    profiles = data.get("profiles", [])
    if not isinstance(profiles, list):
        return []
    return [p for p in profiles if isinstance(p, dict)]


def list_jump_hosts() -> list[dict[str, Any]]:
    data = _load_profiles_file()
    jump_hosts = data.get("jump_hosts", [])
    if not isinstance(jump_hosts, list):
        return []
    return [j for j in jump_hosts if isinstance(j, dict)]


def create_profile(payload: dict[str, Any]) -> dict[str, Any]:
    data = _load_profiles_file()
    profiles = list_profiles()

    profile = _normalize_profile_payload(payload, profile_id=uuid4().hex)

    profiles.append(profile)
    data["profiles"] = profiles
    _save_profiles_file(data)
    return profile


def update_profile(
    profile_id: str,
    payload: dict[str, Any],
) -> dict[str, Any] | None:
    data = _load_profiles_file()
    profiles = list_profiles()

    updated_profile = None
    for index, profile in enumerate(profiles):
        if profile.get("id") != profile_id:
            continue

        merged = dict(profile)
        merged.update(
            _normalize_profile_payload(
                payload,
                profile_id=profile_id,
                existing=profile,
            )
        )
        profiles[index] = merged
        updated_profile = merged
        break

    if updated_profile is None:
        return None

    data["profiles"] = profiles
    _save_profiles_file(data)
    return updated_profile


def _normalize_profile_payload(
    payload: dict[str, Any],
    profile_id: str,
    existing: dict[str, Any] | None = None,
) -> dict[str, Any]:
    # When updating, seed the normalization input with the stored profile so
    # a partial payload (e.g. PATCH with only ``default_cwd``) cannot wipe
    # fields that were omitted.  Values supplied by the caller still win,
    # including explicit empty strings for clearable fields.
    source: dict[str, Any] = dict(existing) if existing is not None else {}
    source.update(payload)

    profile = _normalize_ssh_endpoint(source, endpoint_id=profile_id)
    profile["name"] = str(source.get("name", "")).strip()
    if not profile["name"]:
        profile["name"] = _default_name(source)
    profile["jump_host_id"] = str(source.get("jump_host_id", "")).strip()
    profile["default_cwd"] = str(source.get("default_cwd", "")).strip()

    # Secret fields fall back to the stored values when the caller omits or
    # clears them (the API never echoes secrets back, so an empty value means
    # "keep the existing secret").
    if existing is not None:
        if not profile["password"]:
            profile["password"] = str(existing.get("password", ""))
        if not profile["passphrase"]:
            profile["passphrase"] = str(existing.get("passphrase", ""))

    return profile


def create_jump_host(payload: dict[str, Any]) -> dict[str, Any]:
    data = _load_profiles_file()
    jump_hosts = list_jump_hosts()

    jump_host = _normalize_jump_host_payload(payload, jump_host_id=uuid4().hex)

    jump_hosts.append(jump_host)
    data["jump_hosts"] = jump_hosts
    _save_profiles_file(data)
    return jump_host


def update_jump_host(
    jump_host_id: str,
    payload: dict[str, Any],
) -> dict[str, Any] | None:
    data = _load_profiles_file()
    jump_hosts = list_jump_hosts()

    updated_jump_host = None
    for index, jump_host in enumerate(jump_hosts):
        if jump_host.get("id") != jump_host_id:
            continue

        merged = dict(jump_host)
        merged.update(
            _normalize_jump_host_payload(
                payload,
                jump_host_id=jump_host_id,
                existing=jump_host,
            )
        )
        jump_hosts[index] = merged
        updated_jump_host = merged
        break

    if updated_jump_host is None:
        return None

    data["jump_hosts"] = jump_hosts
    _save_profiles_file(data)
    return updated_jump_host


def delete_jump_host(jump_host_id: str) -> bool:
    if any(p.get("jump_host_id") == jump_host_id for p in list_profiles()):
        raise ValueError("jump host is used by one or more profiles")

    data = _load_profiles_file()
    jump_hosts = list_jump_hosts()
    remaining = [j for j in jump_hosts if j.get("id") != jump_host_id]
    if len(remaining) == len(jump_hosts):
        return False
    data["jump_hosts"] = remaining
    _save_profiles_file(data)
    return True


def get_jump_host(jump_host_id: str) -> dict[str, Any] | None:
    for jump_host in list_jump_hosts():
        if jump_host.get("id") == jump_host_id:
            return jump_host
    return None


def find_jump_host_by_name(name: str) -> dict[str, Any] | None:
    needle = name.strip()
    if not needle:
        return None

    matches = [
        jump_host
        for jump_host in list_jump_hosts()
        if str(jump_host.get("name", "")).strip() == needle
    ]
    if len(matches) > 1:
        raise ValueError(
            f"Multiple jump hosts named {needle!r}; use jump_id instead"
        )
    return matches[0] if matches else None


def _normalize_jump_host_payload(
    payload: dict[str, Any],
    jump_host_id: str,
    existing: dict[str, Any] | None = None,
) -> dict[str, Any]:
    # Same merge semantics as profiles: omitting a field on update must not
    # reset it to a default.
    source: dict[str, Any] = dict(existing) if existing is not None else {}
    source.update(payload)

    jump_host = _normalize_ssh_endpoint(source, endpoint_id=jump_host_id)
    jump_host["name"] = str(source.get("name", "")).strip()
    if not jump_host["name"]:
        jump_host["name"] = _default_name(source)

    if existing is not None:
        if not jump_host["password"]:
            jump_host["password"] = str(existing.get("password", ""))
        if not jump_host["passphrase"]:
            jump_host["passphrase"] = str(existing.get("passphrase", ""))

    return jump_host


def _normalize_ssh_endpoint(
    payload: dict[str, Any],
    endpoint_id: str,
) -> dict[str, Any]:
    return {
        "id": endpoint_id,
        "host": str(payload.get("host", "")).strip(),
        "port": int(payload.get("port", 22)),
        "username": str(payload.get("username", "root")).strip() or "root",
        "password": str(payload.get("password", "")),
        "key_path": str(payload.get("key_path", "")).strip(),
        "passphrase": str(payload.get("passphrase", "")),
    }


def delete_profile(profile_id: str) -> bool:
    data = _load_profiles_file()
    profiles = list_profiles()
    remaining = [p for p in profiles if p.get("id") != profile_id]
    if len(remaining) == len(profiles):
        return False
    data["profiles"] = remaining
    _save_profiles_file(data)
    return True


def get_profile(profile_id: str) -> dict[str, Any] | None:
    for profile in list_profiles():
        if profile.get("id") == profile_id:
            return profile
    return None


def _default_name(payload: dict[str, Any]) -> str:
    username = str(payload.get("username", "root")).strip() or "root"
    host = str(payload.get("host", "")).strip() or "unknown-host"
    port = int(payload.get("port", 22))
    return f"{username}@{host}:{port}"
