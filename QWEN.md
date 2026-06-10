# QWEN.md - Remote SSH Plugin

## Project Overview

Remote SSH 是一个 **QwenPaw 插件**，为聊天会话提供 SSH 远程连接能力。连接建立后，同一会话内的所有 shell 命令会通过 SSH 透明转发到远端机器执行。

### Key Technologies

- **Backend:** Python 3.10+, FastAPI, paramiko (SSH 客户端), agentscope SDK
- **Frontend:** React 18, TypeScript, Vite
- **Plugin Host:** QwenPaw (min_version: 1.1.7)

### Architecture

插件通过 **monkey-patching** 机制注入 QwenPaw 核心，不修改宿主源码：

```
plugin.py (入口)
├── _patch_create_toolkit()  → shell_wrapper.py (SSH 中间件)
├── _patch_reply()           → context.py (ContextVar 会话绑定)
└── _mount_router()          → routers/connections.py (REST API)

ssh_manager.py (SSH 连接单例，按 session_id 管理)
store.py (持久化连接配置/跳板机到 profiles.json)
tools/ (remote_connect, remote_disconnect, remote_list, remote_exec, RemoteCommandHandler)
```

### Core Components

| File | Purpose |
|------|---------|
| `plugin.py` | 插件入口，注册 tools/startup/shutdown hooks，执行 monkey-patch |
| `ssh_manager.py` | SSH 连接管理器单例，支持密码/密钥认证及跳板机，基于 paramiko |
| `context.py` | ContextVar 用于 session_id 会话隔离 |
| `shell_wrapper.py` | Toolkit 中间件，拦截 `execute_shell_command` 并转发到 SSH |
| `store.py` | 连接配置/跳板机的持久化存储（JSON 文件） |
| `routers/connections.py` | FastAPI 路由，提供 REST API 管理 SSH 连接 |
| `tools/` | 注册到 QwenPaw 的 tool 函数 |
| `ui/` | React 前端管理页面 |

### Features

- 密码 / SSH 私钥认证
- 跳板机（Jump Host）支持
- 连接配置持久化（Profiles）
- 透明 shell 命令转发
- `/remote` 对话命令
- 前端连接管理页面

## Building and Running

### Frontend

```powershell
cd ui
npm ci
npm run build
```

构建产物输出到 `ui/dist/index.js`，这是插件安装所需的入口文件。

### Packaging

Windows:
```powershell
.\scripts\package.ps1
```

Linux / macOS:
```bash
chmod +x scripts/package.sh
./scripts/package.sh
```

生成 `dist\qwenpaw-remote-plugin-<version>.zip`。ZIP 根目录必须包含 `plugin.json`。

跳过前端依赖安装：
```powershell
.\scripts\package.ps1 -SkipInstall
```

### Installation

通过 QwenPaw 插件管理页面上传 ZIP 安装包，或调用插件安装 API。QwenPaw 会自动安装 `requirements.txt` 中的 Python 依赖。

## Development Conventions

- **Python 类型注解：** 全面使用类型提示，`from __future__ import annotations` 用于延迟求值
- **异步优先：** SSH 操作通过 `asyncio.to_thread` 包装阻塞调用，所有 API 路由为 async
- **日志前缀：** 日志使用 `[Remote]` 前缀
- **测试：** 项目当前无测试文件
- **敏感字段处理：** 响应中必须移除 `password` / `passphrase`（`_sanitize_secret_fields`）
- **配置持久化：** 存储到 `WORKING_DIR/remote/profiles.json`，密码更新时保留未提供的敏感字段
