"""Control command handler for /remote."""

from __future__ import annotations

import shlex

from qwenpaw.app.runner.control_commands.base import (
    BaseControlCommandHandler,
    ControlContext,
)

from ..ssh_manager import get_ssh_manager


class RemoteCommandHandler(BaseControlCommandHandler):
    """Handle /remote control commands.

    Supported forms:
    - /remote
    - /remote status
    - /remote connect host=192.168.0.10 username=root password=...
    - /remote connect root@192.168.0.10 password=...
    - /remote disconnect
    - /remote pwd
    - /remote exec pwd
    - /remote run pwd
    - /remote 执行pwd
    """

    command_name = "/remote"

    async def handle(self, context: ControlContext) -> str:
        raw_args = context.args.get("_raw_args", "").strip()

        if not raw_args or raw_args.lower() in ("status", "list", "ls"):
            return self._format_status(context.session_id)

        lowered = raw_args.lower()
        if lowered in ("help", "-h", "--help"):
            return self._help()

        if lowered.startswith("connect"):
            return await self._connect(
                context.session_id,
                raw_args[len("connect") :].strip(),
            )

        if lowered in ("disconnect", "close", "off"):
            return await self._disconnect(context.session_id)

        if lowered in ("reconnect", "reconn"):
            return await self._reconnect(context.session_id)

        if lowered.startswith("cd "):
            return await self._cd(context.session_id, raw_args[3:].strip())

        if lowered.startswith("sudo "):
            return await self._sudo(context.session_id, raw_args[5:].strip())

        if lowered.startswith("set-sudo ") or lowered.startswith("setsudo "):
            return await self._set_sudo(context.session_id, raw_args.split(" ", 1)[1].strip() if " " in raw_args else "")

        command = self._extract_command(raw_args)
        if not command:
            return self._help()
        return await self._exec(context.session_id, command)

    async def _connect(self, session_id: str, args: str) -> str:
        parsed = self._parse_args(args)
        host = parsed.get("host", "")
        username = parsed.get("username") or parsed.get("user") or ""

        if not host and parsed["positional"]:
            first = parsed["positional"][0]
            if "@" in first:
                username, host = first.split("@", 1)
            else:
                host = first

        try:
            port = int(parsed.get("port", "22"))
        except ValueError:
            return "Invalid port. Example: `/remote connect host=192.168.0.10 username=root port=22`"
        try:
            jump_port = int(parsed.get("jump_port", "22"))
        except ValueError:
            return "Invalid jump_port. Example: `/remote connect root@10.0.0.5 jump_host=1.2.3.4 jump_username=jump jump_port=22`"

        if not host or not username:
            return (
                "Missing host or username.\n\n"
                "Examples:\n"
                "`/remote connect host=192.168.0.10 username=root password=...`\n"
                "`/remote connect root@192.168.0.10 key_path=/home/me/.ssh/id_rsa`"
            )

        try:
            info = await get_ssh_manager().connect(
                session_id=session_id,
                host=host,
                port=port,
                username=username,
                password=parsed.get("password", ""),
                key_path=parsed.get("key_path", ""),
                passphrase=parsed.get("passphrase", ""),
                jump_host_id=parsed.get("jump_id", ""),
                jump_name=parsed.get("jump_name", ""),
                jump_host=parsed.get("jump_host", ""),
                jump_port=jump_port,
                jump_username=parsed.get("jump_username", ""),
                jump_password=parsed.get("jump_password", ""),
                jump_key_path=parsed.get("jump_key_path", ""),
                jump_passphrase=parsed.get("jump_passphrase", ""),
            )
        except (ConnectionError, ValueError) as exc:
            return f"Remote connection failed: {exc}"

        via = ""
        if info.get("via_jump_host"):
            jump_label = info.get("jump_host_name") or (
                f"{info.get('jump_username')}@"
                f"{info.get('jump_host')}:{info.get('jump_port')}"
            )
            via = f"\nVia jump host: {jump_label}."

        return (
            f"Connected to {info['username']}@{info['host']}:{info['port']}."
            f"{via}\nUse `/remote <command>` to run commands on the remote machine, "
            "or `/remote disconnect` to close the connection."
        )

    async def _disconnect(self, session_id: str) -> str:
        conn = get_ssh_manager().get_connection(session_id)
        if conn is None:
            return "No active SSH connection for this session."

        host_info = f"{conn.username}@{conn.host}:{conn.port}"
        disconnected = await get_ssh_manager().disconnect(session_id)
        if disconnected:
            return f"Disconnected from {host_info}."
        return "Failed to disconnect. The connection may already be closed."

    async def _reconnect(self, session_id: str) -> str:
        manager = get_ssh_manager()
        try:
            info = await manager.auto_reconnect(session_id)
        except (ConnectionError, ValueError) as exc:
            return f"Reconnect failed: {exc}"

        via = ""
        if info.get("via_jump_host"):
            jump_label = info.get("jump_host_name") or (
                f"{info.get('jump_username')}@"
                f"{info.get('jump_host')}:{info.get('jump_port')}"
            )
            via = f"\nVia jump host: {jump_label}."

        return (
            f"Reconnected to {info['username']}@{info['host']}:{info['port']}."
            f"{via}\nUse `/remote <command>` to run commands on the remote machine."
        )

    async def _cd(self, session_id: str, path: str) -> str:
        if not path:
            return "Usage: `/remote cd <path>`"

        manager = get_ssh_manager()
        try:
            result = await manager.set_default_cwd(
                session_id=session_id,
                cwd=path,
                verify=True,
            )
        except ValueError as exc:
            return f"Failed: {exc}"
        except ConnectionError as exc:
            return f"Failed: {exc}"

        return f"Working directory set to: {result['default_cwd']}"

    async def _sudo(self, session_id: str, command: str) -> str:
        if not command:
            return "Usage: `/remote sudo <command>`"

        manager = get_ssh_manager()
        try:
            returncode, stdout, stderr = await manager.execute_command(
                session_id=session_id,
                command=command,
                sudo=True,
            )
        except ConnectionError as exc:
            return f"Sudo command failed: {exc}"

        prefix = "[sudo]"
        parts = [prefix, f"$ {command}"]
        if stdout:
            parts.append(stdout.rstrip())
        if stderr:
            parts.append("[stderr]")
            parts.append(stderr.rstrip())
        if returncode != 0:
            parts.append(f"[exit code: {returncode}]")
        if len(parts) == 2:
            parts.append("Command executed successfully (no output).")
        return "\n".join(parts)

    async def _set_sudo(self, session_id: str, password: str) -> str:
        if not password:
            return "Usage: `/remote set-sudo <password>`"

        manager = get_ssh_manager()
        manager.set_sudo(session_id, password, enabled=True)

        # Verify sudo
        result = await manager.verify_sudo(session_id)
        if result.get("ok"):
            return f"Sudo configured and verified at {result['verified_at']}."
        else:
            return f"Sudo configured but verification failed: {result.get('error', 'unknown error')}"

    async def _exec(self, session_id: str, command: str) -> str:
        manager = get_ssh_manager()
        conn = manager.get_connection(session_id)
        if conn is None:
            return (
                "No active SSH connection for this session.\n"
                "Use `/remote connect host=<host> username=<user> ...` first."
            )

        try:
            returncode, stdout, stderr = await manager.execute_command(
                session_id=session_id,
                command=command,
            )
        except ConnectionError as exc:
            return f"Remote command failed: {exc}"

        prefix = f"[remote: {conn.username}@{conn.host}]"
        parts = [prefix, f"$ {command}"]
        if stdout:
            parts.append(stdout.rstrip())
        if stderr:
            parts.append("[stderr]")
            parts.append(stderr.rstrip())
        if returncode != 0:
            parts.append(f"[exit code: {returncode}]")
        if len(parts) == 2:
            parts.append("Command executed successfully (no output).")
        return "\n".join(parts)

    def _format_status(self, session_id: str) -> str:
        manager = get_ssh_manager()
        conn = manager.get_connection(session_id)
        health = manager.get_health(session_id)

        if conn is None:
            reconnect_hint = ""
            if health.get("reconnect_available"):
                reconnect_hint = "\nReconnect available. Use `/remote reconnect` or the reconnect button."
            return (
                "No active SSH connection for this session.\n"
                f"{reconnect_hint}\n\n"
                "Connect with `/remote connect host=<host> username=<user> ...`."
            )

        info = conn.to_dict()
        via = ""
        if info.get("via_jump_host"):
            jump_label = info.get("jump_host_name") or (
                f"{info.get('jump_username')}@"
                f"{info.get('jump_host')}:{info.get('jump_port')}"
            )
            via = f"- Via jump host: {jump_label}\n"

        health_lines = ""
        status = health.get("status", "connected")
        latency = health.get("latency_ms")
        if latency is not None:
            health_lines += f"- Latency: {latency:.0f} ms\n"
        cwd_ok = health.get("cwd_ok")
        if cwd_ok is not None:
            health_lines += f"- Remote directory: {'accessible' if cwd_ok else 'inaccessible'}\n"

        return (
            "Active SSH connection:\n"
            f"- Host: {info['username']}@{info['host']}:{info['port']}\n"
            f"- Status: {status}\n"
            f"{via}"
            f"{health_lines}"
            f"- Connected at: {info['connected_at']}\n"
            f"- Remote working directory: {info['default_cwd']}"
        )

    @staticmethod
    def _extract_command(raw_args: str) -> str:
        text = raw_args.strip()
        lowered = text.lower()
        for prefix in ("exec ", "run "):
            if lowered.startswith(prefix):
                return text[len(prefix) :].strip()
        if text.startswith("执行"):
            return text[len("执行") :].strip()
        return text

    @staticmethod
    def _parse_args(args: str) -> dict:
        try:
            tokens = shlex.split(args)
        except ValueError:
            tokens = args.split()

        result = {"positional": []}
        for token in tokens:
            if "=" in token:
                key, value = token.split("=", 1)
                result[key.strip().lower()] = value.strip()
            else:
                result["positional"].append(token)
        return result

    @staticmethod
    def _help() -> str:
        return (
            "Remote SSH commands:\n\n"
            "`/remote` - Show current connection status\n"
            "`/remote connect host=<host> username=<user> password=<password>` - Connect with password\n"
            "`/remote connect <user>@<host> key_path=<path>` - Connect with SSH key\n"
            "`/remote connect <user>@<host> jump_name=<name>` - Connect through a saved jump host\n"
            "`/remote connect <user>@<host> jump_host=<host> jump_username=<user>` - Connect through an inline jump host\n"
            "`/remote disconnect` - Disconnect current session\n"
            "`/remote reconnect` - Reconnect using cached parameters\n"
            "`/remote cd <path>` - Set default working directory\n"
            "`/remote sudo <command>` - Execute command with sudo\n"
            "`/remote set-sudo <password>` - Configure sudo password\n"
            "`/remote <command>` - Run a command on the remote machine\n\n"
            "Examples:\n"
            "`/remote connect root@192.168.0.106 password=secret`\n"
            "`/remote connect root@10.0.0.5 password=secret jump_name=bastion`\n"
            "`/remote cd /workspace/app`\n"
            "`/remote sudo systemctl restart nginx`\n"
            "`/remote pwd`\n"
            "`/remote 执行pwd`"
        )
