# Agent 指引 — QwenPaw Remote SSH 插件

QwenPaw 插件，为聊天会话提供透明的 SSH 远程执行能力。连接建立后，会话中所有 `execute_shell_command` 调用自动通过 paramiko 转发到远端机器。

## 快速参考

| 操作 | 命令 |
|------|------|
| 安装前端依赖 | `cd ui && npm ci` |
| 构建前端 | `cd ui && npm run build` |
| 开发模式（监听） | `cd ui && npm run dev` |
| 打包 ZIP | `./scripts/package.sh` |
| 打包（跳过 npm ci） | `./scripts/package.sh --skip-install` |

项目无测试框架，无 lint/格式化工具。

## 架构

```
plugin.py              → 插件系统后端入口 shim（导出 remote.plugin.plugin）
remote/plugin.py       → 后端实现入口（注册 tools、commands、middleware、hooks、REST 路由）
remote/ssh_types.py    → SSH 数据结构、健康状态、环境快照和 cwd 命令包装 helper
remote/ssh_manager.py  → 单例 SSH 连接管理器（paramiko）
remote/shell_wrapper.py → 异步中间件：拦截 shell 命令 → SSH 执行
remote/store.py        → JSON 文件持久化（连接配置/跳板机）
remote/routers/        → FastAPI REST API 和请求 schema（挂载在 /api/remote）
remote/tools/          → 工具实现（connect、disconnect、list、exec、/remote 命令）
ui/src/index.ts        → 单文件 React 前端（无 JSX，直接用 createElement）
```

## 核心模式

- **官方中间件注册**：2.x 通过 `api.register_middleware()` 注册 `agentscope` 的 `MiddlewareBase` 工厂；`remote/shell_wrapper.py` 在检测到活跃 SSH 连接时拦截 `execute_shell_command`，否则交给下一个 handler。不要再猴补丁 `QwenPawAgent`。
- **宿主会话上下文**：工具和中间件通过 `qwenpaw.config.context.get_current_session_id()` 获取当前 session ID，不访问 `agent._request_context` 等私有属性。
- **仅支持 QwenPaw 2.2.2+**：manifest 声明 `qwenpaw_version >=2.2.2,<2.99.0`，不保留旧版本兼容分支。
- **远端工作目录**：连接成功后自动探测远端 `pwd` 作为 `default_cwd`；透明转发忽略智能体传入的本地 `cwd`，始终使用远端目录；`register_prompt_section` 把远端目录写入系统提示。
- **命令串行化**：同一 session 的 SSH 命令通过 `asyncio.Lock` 串行执行，`open_session` 带超时。跳板机嵌套 transport 上并发打开 channel 会导致永久阻塞，不要移除该锁或改回后台自动探测。
- **自动重连**：channel 打开失败或连接被判定失效时，使用缓存的连接参数自动重连并重试一次，保留原 `default_cwd`/`remote_shell`。
- **单例 `SSHManager`**：所有连接以 `session_id` 为键。负责跳板机隧道、健康检查、命令超时。
- **前端宿主 API**：React、ReactDOM、Ant Design 由宿主通过 `window.QwenPaw.host` 提供，不要直接 import。

## 编码约定

- **Python**：3.10+ 语法（`str | None`、`from __future__ import annotations`）。异步优先，阻塞的 paramiko 调用用 `asyncio.to_thread()` 包装。
- **前端**：单文件 `ui/src/index.ts`，无 JSX，使用 `React.createElement()`。Vite library 模式打包为单个 ES module。React/ReactDOM 作为 peer deps 外部化。
- **打包**：以扁平 ZIP 分发，根目录必须直接包含 `plugin.json`。仅包含运行时文件（完整列表见 [README.md](README.md#安装包内容)）。
- **语言**：面向用户的字符串和文档使用中文，代码标识符使用英文。

## 插件系统契约

- `plugin.json` 声明元数据、tools 和 commands
- `plugin.py` 导出 `plugin` 实例，提供 `register(api)` 方法
- 注册方式：`api.register_tool()`、`api.register_slash_command()`、`api.register_middleware()`、`api.register_http_router()`、`api.register_startup_hook()`、`api.register_shutdown_hook()`
- 工具返回 `agentscope` 的 `ToolResponse`；文本块使用 `agentscope` 的 `TextBlock`
- 新 SDK 的 `PluginContext` 目前不提供 middleware/HTTP 路由能力，因此本插件不声明 `sdk` 块，继续使用受支持的 `PluginApi`（与官方 `plugins/middleware-demo` 一致）

## 常见陷阱

- 前端 `ui/dist/` 不提交到仓库 — 修改 TypeScript 后必须重新构建（在 `ui/` 下执行 `npm run build`），打包脚本会把构建产物放进 ZIP。
- `SSHManager` 通过 `__new__` 实现单例 — 不要期望多次实例化能获得隔离。
- 跳板机连接会创建嵌套 transport 链；必须按正确顺序断开（由 `SSHManager.disconnect()` 管理）。
- 不要访问宿主私有成员（`api._registry`、`agent._request_context`、registry 内部对象）；会话 ID 统一用 `qwenpaw.config.context.get_current_session_id()`。
- `profiles.json` 含明文密码/密钥口令，写入时会强制目录 `0700`、文件 `0600`；不要放宽权限或把该文件提交到仓库。
