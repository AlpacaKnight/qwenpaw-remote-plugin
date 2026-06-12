"""REST API for SSH connection management."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..ssh_manager import get_ssh_manager
from ..store import (
    create_jump_host,
    create_profile,
    delete_jump_host,
    delete_profile,
    get_jump_host,
    get_profile,
    list_jump_hosts,
    list_profiles,
    update_jump_host,
    update_profile,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["remote"])


# --------------- Request / Response models ---------------


class ConnectRequest(BaseModel):
    """Request body for creating an SSH connection."""

    host: str = Field(..., description="Remote host IP or hostname")
    port: int = Field(default=22, ge=1, le=65535, description="SSH port")
    username: str = Field(default="root", description="SSH username")
    password: str = Field(default="", description="SSH password")
    key_path: str = Field(
        default="", description="Path to SSH private key file"
    )
    passphrase: str = Field(
        default="", description="Passphrase for the private key"
    )
    session_id: str = Field(
        ..., description="Session ID to associate with this connection"
    )
    profile_id: str = Field(
        default="", description="Saved connection profile ID"
    )
    jump_host_id: str = Field(default="", description="Saved jump host ID")
    jump_name: str = Field(default="", description="Saved jump host name")
    jump_host: str = Field(default="", description="Inline jump host")
    jump_port: int = Field(default=22, ge=1, le=65535, description="Jump SSH port")
    jump_username: str = Field(default="", description="Jump SSH username")
    jump_password: str = Field(default="", description="Jump SSH password")
    jump_key_path: str = Field(
        default="", description="Path to jump host SSH private key file"
    )
    jump_passphrase: str = Field(
        default="", description="Passphrase for the jump host private key"
    )
    default_cwd: str = Field(default="", description="Default remote working directory")


class ProfileRequest(BaseModel):
    """Request body for creating a saved SSH profile."""

    name: str = Field(default="", description="Display name")
    host: str = Field(..., description="Remote host IP or hostname")
    port: int = Field(default=22, ge=1, le=65535, description="SSH port")
    username: str = Field(default="root", description="SSH username")
    password: str = Field(default="", description="SSH password")
    key_path: str = Field(
        default="", description="Path to SSH private key file"
    )
    passphrase: str = Field(
        default="", description="Passphrase for the private key"
    )
    jump_host_id: str = Field(default="", description="Saved jump host ID")
    default_cwd: str = Field(default="", description="Default remote working directory")


class JumpHostRequest(BaseModel):
    """Request body for creating a saved SSH jump host."""

    name: str = Field(default="", description="Display name")
    host: str = Field(..., description="Jump host IP or hostname")
    port: int = Field(default=22, ge=1, le=65535, description="SSH port")
    username: str = Field(default="root", description="SSH username")
    password: str = Field(default="", description="SSH password")
    key_path: str = Field(
        default="", description="Path to SSH private key file"
    )
    passphrase: str = Field(
        default="", description="Passphrase for the private key"
    )


class ExecRequest(BaseModel):
    """Request body for executing a command on the remote host."""

    command: str = Field(..., description="Shell command to execute")
    timeout: float = Field(
        default=60.0, ge=1, le=600, description="Timeout in seconds"
    )
    cwd: str = Field(default="", description="Remote working directory")


class CwdRequest(BaseModel):
    """Request body for setting the remote working directory."""

    cwd: str = Field(..., description="Remote working directory path")
    verify: bool = Field(default=True, description="Verify directory exists before setting")


# --------------- Endpoints ---------------


def _sanitize_secret_fields(item: dict) -> dict:
    response = dict(item)
    response.pop("password", None)
    response.pop("passphrase", None)
    return response


def _jump_host_name_map() -> dict[str, str]:
    return {
        str(jump_host.get("id", "")): str(jump_host.get("name", ""))
        for jump_host in list_jump_hosts()
    }


def _validate_profile_jump_host(profile: dict) -> None:
    jump_host_id = str(profile.get("jump_host_id", "")).strip()
    if jump_host_id and get_jump_host(jump_host_id) is None:
        raise ValueError(f"jump host not found: {jump_host_id}")


@router.get("/connections")
async def list_connections(session_id: Optional[str] = None):
    """List SSH connections, optionally filtered by session_id."""
    manager = get_ssh_manager()

    if session_id:
        conn = manager.get_connection(session_id)
        if conn is None:
            return {"connections": []}
        info = conn.to_dict()
        info["session_id"] = session_id
        return {"connections": [info]}

    return {"connections": manager.list_connections()}


@router.get("/profiles")
async def get_profiles(session_id: Optional[str] = None):
    """List saved SSH profiles with current connection state."""
    profiles = list_profiles()
    jump_host_names = _jump_host_name_map()
    active_profile_id = ""
    if session_id:
        conn = get_ssh_manager().get_connection(session_id)
        active_profile_id = conn.profile_id if conn else ""

    result = []
    for profile in profiles:
        item = dict(profile)
        item["connected"] = bool(
            active_profile_id and item.get("id") == active_profile_id
        )
        item["jump_host_name"] = jump_host_names.get(
            str(item.get("jump_host_id", "")),
            "",
        )
        item.pop("password", None)
        item.pop("passphrase", None)
        result.append(item)

    return {
        "profiles": result,
        "active_profile_id": active_profile_id,
    }


@router.get("/jump-hosts")
async def get_jump_hosts():
    """List saved SSH jump hosts."""
    return {
        "jump_hosts": [
            _sanitize_secret_fields(jump_host)
            for jump_host in list_jump_hosts()
        ]
    }


@router.post("/jump-hosts")
async def create_jump_host_route(req: JumpHostRequest):
    """Create and persist an SSH jump host."""
    try:
        jump_host = create_jump_host(req.model_dump())
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _sanitize_secret_fields(jump_host)


@router.put("/jump-hosts/{jump_host_id}")
async def update_jump_host_route(jump_host_id: str, req: JumpHostRequest):
    """Update a persisted SSH jump host."""
    try:
        jump_host = update_jump_host(jump_host_id, req.model_dump())
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if jump_host is None:
        raise HTTPException(
            status_code=404,
            detail=f"Jump host not found: {jump_host_id}",
        )

    await get_ssh_manager().disconnect_jump_host(jump_host_id)

    return _sanitize_secret_fields(jump_host)


@router.delete("/jump-hosts/{jump_host_id}")
async def delete_jump_host_route(jump_host_id: str):
    """Delete a persisted SSH jump host."""
    try:
        deleted = delete_jump_host(jump_host_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Jump host not found: {jump_host_id}",
        )
    await get_ssh_manager().disconnect_jump_host(jump_host_id)
    return {"status": "ok", "jump_host_id": jump_host_id}


@router.post("/profiles")
async def create_profile_route(req: ProfileRequest):
    """Create and persist an SSH profile."""
    payload = req.model_dump()
    try:
        _validate_profile_jump_host(payload)
        profile = create_profile(payload)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _sanitize_secret_fields(profile)


@router.put("/profiles/{profile_id}")
async def update_profile_route(profile_id: str, req: ProfileRequest):
    """Update a persisted SSH profile."""
    payload = req.model_dump()
    try:
        _validate_profile_jump_host(payload)
        profile = update_profile(profile_id, payload)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail=f"Profile not found: {profile_id}",
        )

    await get_ssh_manager().disconnect_profile(profile_id)

    return _sanitize_secret_fields(profile)


@router.delete("/profiles/{profile_id}")
async def delete_profile_route(profile_id: str):
    """Delete a persisted SSH profile."""
    await get_ssh_manager().disconnect_profile(profile_id)
    deleted = delete_profile(profile_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Profile not found: {profile_id}",
        )
    return {"status": "ok", "profile_id": profile_id}


@router.patch("/profiles/{profile_id}/cwd")
async def update_profile_cwd(profile_id: str, body: dict):
    """Update the default working directory of a saved profile."""
    cwd = str(body.get("cwd", "")).strip()
    profile = get_profile(profile_id)
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail=f"Profile not found: {profile_id}",
        )
    updated = update_profile(profile_id, {"default_cwd": cwd})
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Profile not found: {profile_id}")
    return {"status": "ok", "profile_id": profile_id, "default_cwd": cwd}


@router.post("/profiles/{profile_id}/connect")
async def connect_profile(profile_id: str, body: dict):
    """Connect the current session using a saved SSH profile."""
    session_id = str(body.get("session_id", "")).strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    profile = get_profile(profile_id)
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail=f"Profile not found: {profile_id}",
        )

    manager = get_ssh_manager()
    try:
        jump_host_id = str(profile.get("jump_host_id", ""))
        if jump_host_id and get_jump_host(jump_host_id) is None:
            raise ValueError(f"jump host not found: {jump_host_id}")
        info = await manager.connect(
            session_id=session_id,
            host=str(profile.get("host", "")),
            port=int(profile.get("port", 22)),
            username=str(profile.get("username", "root")),
            password=str(profile.get("password", "")),
            key_path=str(profile.get("key_path", "")),
            passphrase=str(profile.get("passphrase", "")),
            profile_id=profile_id,
            jump_host_id=jump_host_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ConnectionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Set default_cwd from profile if specified
    profile_cwd = str(profile.get("default_cwd", "")).strip()
    if profile_cwd:
        try:
            await manager.set_default_cwd(
                session_id=session_id,
                cwd=profile_cwd,
                verify=False,
            )
        except Exception:
            pass  # Best effort, don't fail the connection

    # Configure sudo - always available
    sudo_configured = False
    sudo_password = str(profile.get("password", ""))
    if sudo_password:
        manager.set_sudo(session_id, sudo_password, enabled=True)
        sudo_configured = True

    info["session_id"] = session_id
    info["sudo_configured"] = sudo_configured
    info["sudo_needs_password"] = not sudo_configured
    return info


@router.post("/connections")
async def create_connection(req: ConnectRequest):
    """Create a new SSH connection."""
    manager = get_ssh_manager()

    try:
        info = await manager.connect(
            session_id=req.session_id,
            host=req.host,
            port=req.port,
            username=req.username,
            password=req.password,
            key_path=req.key_path,
            passphrase=req.passphrase,
            profile_id=req.profile_id,
            jump_host_id=req.jump_host_id,
            jump_name=req.jump_name,
            jump_host=req.jump_host,
            jump_port=req.jump_port,
            jump_username=req.jump_username,
            jump_password=req.jump_password,
            jump_key_path=req.jump_key_path,
            jump_passphrase=req.jump_passphrase,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e))

    info["session_id"] = req.session_id
    return info


@router.delete("/connections/{session_id}")
async def delete_connection(session_id: str):
    """Disconnect an SSH session."""
    manager = get_ssh_manager()
    disconnected = await manager.disconnect(session_id)

    if not disconnected:
        raise HTTPException(
            status_code=404,
            detail=f"No active connection for session {session_id}",
        )

    return {"status": "ok", "session_id": session_id}


@router.post("/connections/{session_id}/exec")
async def exec_command(session_id: str, req: ExecRequest):
    """Execute a command on the remote host."""
    manager = get_ssh_manager()

    try:
        returncode, stdout, stderr = await manager.execute_command(
            session_id=session_id,
            command=req.command,
            timeout=req.timeout,
            cwd=req.cwd or None,
        )
    except ConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "returncode": returncode,
        "stdout": stdout,
        "stderr": stderr,
    }


@router.get("/connections/{session_id}/status")
async def connection_status(session_id: str):
    """Check connection health."""
    manager = get_ssh_manager()
    health = manager.get_health(session_id)
    conn = manager.get_connection(session_id)

    if conn is None:
        return {"connected": False, "health": health}

    info = conn.to_dict()
    info["connected"] = True
    info["session_id"] = session_id
    info["health"] = health
    return info


@router.get("/connections/{session_id}/health")
async def get_connection_health(session_id: str):
    """Get detailed health status for a session's connection."""
    manager = get_ssh_manager()
    return {
        "session_id": session_id,
        "health": manager.get_health(session_id),
    }


@router.post("/connections/{session_id}/health/check")
async def force_health_check(session_id: str):
    """Force an immediate health check."""
    manager = get_ssh_manager()
    health = await manager.force_health_check(session_id)
    return {
        "session_id": session_id,
        "health": health,
    }


@router.post("/connections/{session_id}/reconnect")
async def reconnect_session(session_id: str):
    """Reconnect using cached connection parameters."""
    manager = get_ssh_manager()
    try:
        info = await manager.auto_reconnect(session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e))

    info["session_id"] = session_id
    return info


@router.get("/connections/{session_id}/cwd")
async def get_cwd(session_id: str):
    """Get the current default working directory for a session."""
    manager = get_ssh_manager()
    conn = manager.get_connection(session_id)
    if conn is None:
        return {"session_id": session_id, "default_cwd": "/", "cwd_ok": None}
    return {
        "session_id": session_id,
        "default_cwd": conn.default_cwd,
        "cwd_ok": conn.health.cwd_ok if conn.health else None,
    }


@router.put("/connections/{session_id}/cwd")
async def set_cwd(session_id: str, req: CwdRequest):
    """Set the default working directory for a session."""
    manager = get_ssh_manager()
    try:
        result = await manager.set_default_cwd(
            session_id=session_id,
            cwd=req.cwd,
            verify=req.verify,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e))

    result["session_id"] = session_id
    return result


@router.get("/connections/{session_id}/info")
async def get_remote_info(session_id: str, refresh: bool = False):
    """Get cached remote environment info."""
    manager = get_ssh_manager()
    snapshot = await manager.get_remote_env(session_id, refresh=refresh)
    return {
        "session_id": session_id,
        "info": snapshot.to_dict(),
    }


@router.post("/connections/{session_id}/info/refresh")
async def refresh_remote_info(session_id: str):
    """Force refresh remote environment info."""
    manager = get_ssh_manager()
    snapshot = await manager.get_remote_env(session_id, refresh=True)
    return {
        "session_id": session_id,
        "info": snapshot.to_dict(),
    }


class ProfileTestRequest(BaseModel):
    """Request body for testing an SSH profile connection."""

    host: str = Field(..., description="Remote host IP or hostname")
    port: int = Field(default=22, ge=1, le=65535, description="SSH port")
    username: str = Field(default="root", description="SSH username")
    password: str = Field(default="", description="SSH password")
    key_path: str = Field(default="", description="Path to SSH private key file")
    passphrase: str = Field(default="", description="Passphrase for the private key")
    jump_host_id: str = Field(default="", description="Saved jump host ID")
    jump_name: str = Field(default="", description="Saved jump host name")
    jump_host: str = Field(default="", description="Inline jump host")
    jump_port: int = Field(default=22, ge=1, le=65535, description="Jump SSH port")
    jump_username: str = Field(default="", description="Jump SSH username")
    jump_password: str = Field(default="", description="Jump SSH password")
    jump_key_path: str = Field(default="", description="Jump host private key path")
    jump_passphrase: str = Field(default="", description="Jump host key passphrase")


@router.post("/profiles/test")
async def test_profile_connection(req: ProfileTestRequest):
    """Test an SSH profile connection without affecting current session."""
    manager = get_ssh_manager()
    try:
        result = await manager.test_connection(
            host=req.host,
            port=req.port,
            username=req.username,
            password=req.password,
            key_path=req.key_path,
            passphrase=req.passphrase,
            jump_host_id=req.jump_host_id,
            jump_name=req.jump_name,
            jump_host=req.jump_host,
            jump_port=req.jump_port,
            jump_username=req.jump_username,
            jump_password=req.jump_password,
            jump_key_path=req.jump_key_path,
            jump_passphrase=req.jump_passphrase,
        )
    except (ConnectionError, ValueError) as e:
        return {"ok": False, "error": str(e)}

    return {"ok": True, **result}


@router.post("/profiles/{profile_id}/test")
async def test_saved_profile(profile_id: str):
    """Test a saved SSH profile connection."""
    profile = get_profile(profile_id)
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail=f"Profile not found: {profile_id}",
        )

    manager = get_ssh_manager()
    jump_host_id = str(profile.get("jump_host_id", ""))
    if jump_host_id and get_jump_host(jump_host_id) is None:
        raise HTTPException(
            status_code=400,
            detail=f"Jump host not found: {jump_host_id}",
        )

    try:
        result = await manager.test_connection(
            host=str(profile.get("host", "")),
            port=int(profile.get("port", 22)),
            username=str(profile.get("username", "root")),
            password=str(profile.get("password", "")),
            key_path=str(profile.get("key_path", "")),
            passphrase=str(profile.get("passphrase", "")),
            jump_host_id=jump_host_id,
        )
    except (ConnectionError, ValueError) as e:
        return {"ok": False, "error": str(e)}

    return {"ok": True, **result}


class SudoConfigRequest(BaseModel):
    """Request body for configuring sudo."""

    password: str = Field(..., description="Sudo password")
    enabled: bool = Field(default=True, description="Enable sudo")


@router.post("/connections/{session_id}/sudo")
async def configure_sudo(session_id: str, req: SudoConfigRequest):
    """Configure sudo for a session."""
    manager = get_ssh_manager()
    manager.set_sudo(session_id, req.password, req.enabled)
    return {"status": "ok", "session_id": session_id}


@router.get("/connections/{session_id}/sudo")
async def get_sudo_state(session_id: str):
    """Get sudo state for a session."""
    manager = get_ssh_manager()
    return {
        "session_id": session_id,
        "sudo": manager.get_sudo_state(session_id),
    }


@router.post("/connections/{session_id}/sudo/verify")
async def verify_sudo(session_id: str):
    """Verify sudo access."""
    manager = get_ssh_manager()
    result = await manager.verify_sudo(session_id)
    result["session_id"] = session_id
    return result
