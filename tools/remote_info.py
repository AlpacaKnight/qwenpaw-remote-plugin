"""Remote environment info tool."""

import logging

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from ..context import get_remote_session_id
from ..ssh_manager import get_ssh_manager

logger = logging.getLogger(__name__)

_KEY_TOOLS = [
    "git",
    "python3",
    "python",
    "node",
    "npm",
    "docker",
    "curl",
    "wget",
    "vim",
    "nano",
]


async def remote_info() -> ToolResponse:
    """Show detailed information about the remote machine environment.

    Returns OS, architecture, kernel, shell, CPU, memory, disk usage,
    and availability of common development tools.

    Returns:
        ToolResponse with remote environment details.
    """
    session_id = get_remote_session_id()
    if session_id is None:
        return ToolResponse(
            content=[
                TextBlock(type="text", text="Error: No active session."),
            ],
        )

    manager = get_ssh_manager()
    conn = manager.get_connection(session_id)
    if conn is None:
        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text="No active SSH connection. Use remote_connect first.",
                ),
            ],
        )

    # Use cached env if available, otherwise detect now
    if not conn.remote_os:
        await manager.detect_remote_env(session_id)

    lines: list[str] = []
    lines.append("=== Remote Environment ===")
    lines.append(f"OS: {conn.remote_os or 'unknown'}")
    lines.append(f"Arch: {conn.remote_arch or 'unknown'}")
    lines.append(f"Kernel: {conn.remote_kernel or 'unknown'}")
    lines.append(f"Shell: {conn.remote_shell or 'unknown'}")
    lines.append(f"Hostname: {conn.host}")

    # CPU info
    try:
        returncode, cpu, _ = await manager.execute_command(
            session_id,
            "nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo ?",
            timeout=5,
        )
        cpu = cpu.strip()
        if returncode == 0 and cpu and cpu != "?":
            lines.append(f"CPU cores: {cpu}")
    except Exception:
        pass

    # Memory info
    try:
        returncode, mem, _ = await manager.execute_command(
            session_id,
            "free -h 2>/dev/null | awk '/^Mem:/{print $2}' || "
            "sysctl -n hw.memsize 2>/dev/null | awk '{printf \"%.1fG\", $1/1073741824}' || "
            "echo ?",
            timeout=5,
        )
        mem = mem.strip()
        if returncode == 0 and mem and mem != "?":
            lines.append(f"Memory: {mem}")
    except Exception:
        pass

    # Disk usage
    try:
        returncode, disk, _ = await manager.execute_command(
            session_id,
            "df -h / 2>/dev/null | awk 'NR==2{print $2\" total, \"$3\" used, \"$4\" avail\"}' || echo ?",
            timeout=5,
        )
        disk = disk.strip()
        if returncode == 0 and disk and disk != "?":
            lines.append(f"Disk (/): {disk}")
    except Exception:
        pass

    # Tool availability
    lines.append("")
    lines.append("=== Tool Availability ===")
    for tool in _KEY_TOOLS:
        try:
            returncode, result, _ = await manager.execute_command(
                session_id,
                f"command -v {tool} >/dev/null 2>&1",
                timeout=5,
            )
            found = returncode == 0
            lines.append(f"  {tool}: {'found' if found else 'not found'}")
        except Exception:
            lines.append(f"  {tool}: unknown")

    return ToolResponse(
        content=[
            TextBlock(type="text", text="\n".join(lines)),
        ],
    )
