"""REST API for SSH connection management."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..ssh_manager import get_ssh_manager
from ..store import create_profile, delete_profile, get_profile, list_profiles

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


class ExecRequest(BaseModel):
    """Request body for executing a command on the remote host."""

    command: str = Field(..., description="Shell command to execute")
    timeout: float = Field(
        default=60.0, ge=1, le=600, description="Timeout in seconds"
    )
    cwd: str = Field(default="", description="Remote working directory")


# --------------- Endpoints ---------------


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
        item.pop("password", None)
        item.pop("passphrase", None)
        result.append(item)

    return {
        "profiles": result,
        "active_profile_id": active_profile_id,
    }


@router.post("/profiles")
async def create_profile_route(req: ProfileRequest):
    """Create and persist an SSH profile."""
    try:
        profile = create_profile(req.model_dump())
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    response = dict(profile)
    response.pop("password", None)
    response.pop("passphrase", None)
    return response


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
        info = await manager.connect(
            session_id=session_id,
            host=str(profile.get("host", "")),
            port=int(profile.get("port", 22)),
            username=str(profile.get("username", "root")),
            password=str(profile.get("password", "")),
            key_path=str(profile.get("key_path", "")),
            passphrase=str(profile.get("passphrase", "")),
            profile_id=profile_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ConnectionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    info["session_id"] = session_id
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
    conn = manager.get_connection(session_id)

    if conn is None:
        return {"connected": False}

    info = conn.to_dict()
    info["connected"] = True
    info["session_id"] = session_id
    return info
