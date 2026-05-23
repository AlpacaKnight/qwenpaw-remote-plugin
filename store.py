"""Persistent storage for Remote SSH connection profiles."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from uuid import uuid4

from qwenpaw.constant import WORKING_DIR

_REMOTE_DIR = WORKING_DIR / "remote"
_PROFILES_FILE = _REMOTE_DIR / "profiles.json"


def _load_profiles_file() -> dict[str, Any]:
    if _PROFILES_FILE.is_file():
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


def list_profiles() -> list[dict[str, Any]]:
    data = _load_profiles_file()
    profiles = data.get("profiles", [])
    if not isinstance(profiles, list):
        return []
    return [p for p in profiles if isinstance(p, dict)]


def create_profile(payload: dict[str, Any]) -> dict[str, Any]:
    data = _load_profiles_file()
    profiles = list_profiles()

    profile = {
        "id": uuid4().hex,
        "name": str(payload.get("name", "")).strip() or _default_name(payload),
        "host": str(payload.get("host", "")).strip(),
        "port": int(payload.get("port", 22)),
        "username": str(payload.get("username", "root")).strip() or "root",
        "password": str(payload.get("password", "")),
        "key_path": str(payload.get("key_path", "")).strip(),
        "passphrase": str(payload.get("passphrase", "")),
    }

    profiles.append(profile)
    data["profiles"] = profiles
    _save_profiles_file(data)
    return profile


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
