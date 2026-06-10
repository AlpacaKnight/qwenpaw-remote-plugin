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
plugin.py          → 后端入口（注册 tools、commands、hooks）
context.py         → ContextVar，用于会话级 SSH 状态隔离
ssh_manager.py     → 单例 SSH 连接管理器（paramiko）
shell_wrapper.py   → 异步中间件：拦截 shell 命令 → SSH 执行
store.py           → JSON 文件持久化（连接配置/跳板机）
routers/           → FastAPI REST API（挂载在 /api/remote）
tools/             → 工具实现（connect、disconnect、list、exec、/remote 命令）
ui/src/index.ts    → 单文件 React 前端（无 JSX，直接用 createElement）
```

## 核心模式

- **猴子补丁（Monkey-patching）**：插件启动时 patch `QwenPawAgent._create_toolkit` 和 `QwenPawAgent.reply`，在不修改核心框架的前提下注入中间件。
- **ContextVar 会话隔离**：`context.py` 持有 `ContextVar[str | None]`，中间件在调用栈深处无需显式传参即可获取当前 session ID。
- **异步生成器中间件**：`shell_wrapper.py` 在检测到活跃 SSH 连接时拦截 `execute_shell_command`，否则 yield 给下一个 handler。
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
- 注册方式：`api.register_tool()`、`api.register_control_command()`、`api.register_startup_hook()`、`api.register_shutdown_hook()`
- 工具返回 `qwenpaw` 的 `ToolResponse`；文本块使用 `agentscope` 的 `TextBlock`

## 常见陷阱

- 前端 `dist/` 已提交到仓库 — 修改 TypeScript 后必须重新构建（在 `ui/` 下执行 `npm run build`）。
- `SSHManager` 通过 `__new__` 实现单例 — 不要期望多次实例化能获得隔离。
- 跳板机连接会创建嵌套 transport 链；必须按正确顺序断开（由 `SSHManager.disconnect()` 管理）。
