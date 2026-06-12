# Remote SSH 功能增强计划

本文档规划 6 项增强功能：

1. 连接健康状态更细
2. 一键重连 UI
3. 远程工作目录管理
4. 远程环境摘要缓存
5. Profile 测试连接
6. sudo / 提权体验

目标是在不破坏现有透明 SSH 执行模型的前提下，让插件更适合长期远程开发会话：状态更可信，断线可恢复，目录上下文明确，环境信息响应更快，连接配置可验证，提权命令更可控。

## 总体原则

- 保持当前架构：`SSHManager` 继续作为连接生命周期中心，REST API 继续挂载在 `/api/remote`，工具继续返回 `ToolResponse`。
- 优先会话隔离：所有运行态信息以 `session_id` 为主键，不把一个会话的连接、目录、sudo 状态泄漏到其他会话。
- 敏感信息只保存在必要范围内：密码、私钥 passphrase、sudo password 不通过 `to_dict()`、REST 响应、日志、前端状态暴露。
- 前端和工具共用同一套后端能力：UI 按钮、工具调用、`/remote` 命令应复用 `SSHManager` 或 routers 中的核心实现。
- 失败要可解释：连接失败、心跳失败、sudo 失败、目录不存在等场景都返回具体原因，而不是仅返回 false 或空列表。

## 现有基础

当前已有能力：

- `SSHManager.connect()` / `disconnect()` / `execute_command()`
- `SSHConnectionInfo` 保存连接元数据
- `remote_connect`、`remote_disconnect`、`remote_list`、`remote_exec`
- `/remote` 控制命令
- `/remote/connections`、`/remote/profiles`、`/remote/jump-hosts` 等 REST API
- `ui/src/index.ts` 单文件 React 前端
- 初步新增的 `remote_reconnect`、`remote_info`、心跳和环境探测

建议先稳定运行态模型，再扩展 UI 和工具：

```text
SSHManager
  ├─ active connections: session_id -> SSHConnectionInfo
  ├─ reconnect cache: session_id -> sanitized runtime reconnect params
  ├─ health state: session_id -> RemoteHealth
  ├─ env cache: session_id -> RemoteEnvSnapshot
  └─ sudo state: session_id -> SudoConfig / SudoCache
```

## 里程碑

### M1：连接健康和重连基础

交付内容：

- `SSHConnectionInfo` 增加健康状态字段
- 心跳记录 RTT、失败次数、最后检查时间
- stale 连接移除后保留可重连参数
- REST 返回更细健康状态
- UI 显示连接健康摘要
- UI 提供一键重连按钮

优先级：最高。

原因：这是所有长期远程会话体验的基础，也能让现有 `remote_reconnect` 真正可用。

### M2：远程工作目录管理

交付内容：

- API 支持获取和设置当前会话默认远程目录
- 工具支持 `remote_set_cwd`
- `/remote cd <path>` 支持切换目录
- Profile 可选保存默认目录
- UI 显示并编辑默认目录

优先级：高。

原因：透明 shell 转发最容易让用户困惑的是“当前命令到底在哪个目录执行”。

### M3：远程环境摘要缓存和 profile 测试连接

交付内容：

- `remote_info` 使用缓存，支持强制刷新
- API 支持环境信息查询
- Profile 保存前/列表中支持测试连接
- 测试连接不影响当前会话连接

优先级：中高。

原因：提升配置可靠性和信息响应速度。

### M4：sudo / 提权体验

交付内容：

- `remote_exec(..., sudo=True)` 支持
- `/remote sudo <command>` 支持
- Profile 可选 sudo 配置
- UI 可配置 sudo 选项
- 提权失败时给出明确提示

优先级：中。

原因：有价值但涉及敏感信息和安全边界，应该在连接状态模型稳定后实现。

## 1. 连接健康状态更细

### 目标

当前 UI 和工具主要知道“连接存在 / 不存在”。增强后应能知道：

- 是否连接中
- SSH transport 是否活跃
- 最近一次心跳时间
- 最近一次心跳是否成功
- 心跳 RTT
- 连续失败次数
- 连接是否已被标记为 stale
- 是否有可用重连参数
- 最近一次错误信息
- 远程默认目录是否仍可访问

### 后端数据结构

新增 dataclass：

```python
@dataclass
class SSHHealthInfo:
    connected: bool = True
    status: str = "connected"  # connected | degraded | stale | disconnected
    last_checked_at: datetime | None = None
    last_success_at: datetime | None = None
    latency_ms: float | None = None
    consecutive_failures: int = 0
    last_error: str = ""
    reconnect_available: bool = False
    cwd_ok: bool | None = None
```

`SSHConnectionInfo` 增加：

```python
health: SSHHealthInfo = field(default_factory=SSHHealthInfo)
```

`to_dict()` 返回脱敏健康状态：

```json
{
  "connected": true,
  "health": {
    "status": "connected",
    "last_checked_at": "...",
    "last_success_at": "...",
    "latency_ms": 24.5,
    "consecutive_failures": 0,
    "last_error": "",
    "reconnect_available": true,
    "cwd_ok": true
  }
}
```

### 心跳策略

建议心跳分两层：

- 轻量检查：`transport.send_ignore()`，用于确认 SSH transport 仍活跃。
- 深度检查：低频执行 `pwd` 或 `test -d <cwd>`，用于确认默认目录可用。

默认参数：

- 轻量心跳间隔：15 秒
- 深度检查间隔：60 秒
- 连续失败 1 次：`degraded`
- 连续失败 2 次：`stale`
- 标记 stale 后从 active connections 移除，但保留 reconnect cache

### API 设计

新增或扩展：

```http
GET /api/remote/connections/{session_id}/status
```

返回更完整状态。

新增：

```http
GET /api/remote/connections/{session_id}/health
POST /api/remote/connections/{session_id}/health/check
```

`health/check` 强制立即检查一次，适合 UI 上“刷新状态”按钮。

### 工具和命令

新增工具：

```python
async def remote_health(refresh: bool = False) -> ToolResponse:
    ...
```

`/remote status` 输出增加：

```text
Active SSH connection:
- Host: root@192.168.1.10:22
- Status: connected
- Latency: 24 ms
- Last checked: 2026-06-12T...
- Reconnect available: yes
- Remote working directory: /workspace/app (ok)
```

### 前端 UI

在连接卡片和 header popover 中展示：

- 绿色：connected
- 黄色：degraded
- 红色：stale / disconnected
- 文案：`Connected · 24 ms`、`Unstable · last error ...`、`Disconnected · reconnect available`

按钮：

- 刷新状态
- 重新连接
- 断开连接

### 风险

- 心跳太频繁会打扰远端或跳板机。
- `send_ignore()` 对部分设备表现可能不一致。
- 深度检查命令不能阻塞 UI，请后台执行并设置短超时。

## 2. 一键重连 UI

### 目标

当连接丢失但仍有缓存参数时，用户可以在 UI 中一键重连，不需要让模型调用 `remote_reconnect`。

### 后端能力

新增 API：

```http
POST /api/remote/connections/{session_id}/reconnect
```

返回：

```json
{
  "session_id": "...",
  "connected": true,
  "host": "192.168.1.10",
  "port": 22,
  "username": "root",
  "default_cwd": "/workspace/app",
  "health": {...}
}
```

失败状态：

- `404`：没有 active connection，也没有 reconnect cache
- `502`：SSH 连接失败
- `400`：缓存参数不完整

### SSHManager 改造

保留：

```python
_connections: dict[str, SSHConnectionInfo]
_reconnect_params: dict[str, dict]
```

行为：

- `connect()` 成功后写入 `_reconnect_params`
- 心跳清理 stale 连接时只移除 `_connections`，保留 `_reconnect_params`
- 用户显式 `disconnect()` 时同时清理 `_connections` 和 `_reconnect_params`
- 更新 / 删除 profile 或 jump host 时清理相关 reconnect cache

### 前端 UI

显示条件：

- 当前 session 无 active connection
- 最近状态显示 `reconnect_available = true`

位置：

- Header SSH popover 顶部
- Remote 管理页当前连接区域

交互：

```text
Disconnected from root@192.168.1.10
[Reconnect] [Choose another profile]
```

点击 `Reconnect`：

1. 按钮进入 loading
2. 调用 `/connections/{sessionId}/reconnect`
3. 成功后刷新 `connections` 和 `profiles`
4. 失败后展示具体错误

### 工具渲染

已有 `remote_reconnect` 渲染器可以保留。建议输出文案与 API 一致：

```text
Reconnected to root@192.168.1.10:22
Remote working directory: /workspace/app
Health: connected, 23 ms
```

## 3. 远程工作目录管理

### 目标

让当前会话有明确、可见、可修改的远程默认工作目录。所有透明 shell 命令和 `remote_exec` 默认在该目录执行。

### 后端数据结构

现有：

```python
default_cwd: str = "/"
```

建议补充：

```python
cwd_source: str = "default"  # default | profile | user
cwd_last_verified_at: datetime | None = None
cwd_last_error: str = ""
```

Profile 增加可选字段：

```json
{
  "default_cwd": "/workspace/app"
}
```

### API 设计

```http
GET /api/remote/connections/{session_id}/cwd
PUT /api/remote/connections/{session_id}/cwd
```

请求：

```json
{
  "cwd": "/workspace/app",
  "verify": true
}
```

返回：

```json
{
  "session_id": "...",
  "default_cwd": "/workspace/app",
  "cwd_ok": true
}
```

### SSHManager 方法

新增：

```python
async def set_default_cwd(
    self,
    session_id: str,
    cwd: str,
    verify: bool = True,
) -> dict:
    ...
```

验证命令：

```sh
test -d <quoted_cwd> && cd <quoted_cwd> && pwd
```

fish shell：

```fish
test -d <quoted_cwd>; and cd <quoted_cwd>; and pwd
```

注意：路径必须 `shlex.quote()`。

### 工具

新增：

```python
async def remote_set_cwd(path: str, verify: bool = True) -> ToolResponse:
    ...
```

可选新增：

```python
async def remote_pwd() -> ToolResponse:
    ...
```

### `/remote` 命令

新增：

```text
/remote pwd
/remote cd /workspace/app
```

注意：当前 `/remote pwd` 已经会执行远端 `pwd`，需要区分：

- `/remote pwd`：显示远端真实当前目录，或默认目录
- `/remote exec pwd`：执行命令
- `/remote cd <path>`：修改默认目录

推荐行为：

- `/remote pwd` 输出 `default_cwd`
- `/remote exec pwd` 运行远端命令
- `/remote cd <path>` 验证并设置 `default_cwd`

### 前端 UI

当前连接区域增加：

- 默认目录文本
- 编辑按钮
- 验证状态

交互：

```text
Working directory: /workspace/app  [Edit]
```

编辑时：

- 输入路径
- `Verify and save`
- 成功后刷新连接状态

Profile 表单增加 `Default working directory`，默认空，空表示 `/` 或远端登录默认目录。

### 执行包装

统一通过一个 helper 生成带 cwd 的命令：

```python
def wrap_command_with_cwd(command: str, cwd: str, shell: str) -> str:
    ...
```

避免 `shell_wrapper.py` 和 `ssh_manager.py` 各自拼接，减少 fish、quoting、路径空格问题。

## 4. 远程环境摘要缓存

### 目标

`remote_info` 首次获取环境信息后缓存，避免每次调用都跑十几条 SSH 命令。支持手动刷新。

### 数据结构

新增：

```python
@dataclass
class RemoteEnvSnapshot:
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
    expires_at: datetime | None = None
    last_error: str = ""
```

可以挂在 `SSHConnectionInfo.env`，也可以单独放在：

```python
_env_cache: dict[str, RemoteEnvSnapshot]
```

建议挂在 `SSHConnectionInfo`，因为它是连接生命周期的一部分。

### 缓存策略

默认 TTL：

- 基础环境：10 分钟
- 磁盘信息：60 秒
- 工具 availability：10 分钟

简单实现可以先统一 TTL 60 秒：

```python
async def get_remote_env(session_id: str, refresh: bool = False) -> dict:
    if cache_valid and not refresh:
        return cached
    snapshot = await detect_remote_env(...)
    return snapshot
```

### 命令优化

将多条命令合并为一条脚本，减少 SSH round trip：

```sh
printf 'os=%s\n' "$(uname -s 2>/dev/null)"
printf 'arch=%s\n' "$(uname -m 2>/dev/null)"
printf 'kernel=%s\n' "$(uname -r 2>/dev/null)"
printf 'shell=%s\n' "$SHELL"
printf 'hostname=%s\n' "$(hostname 2>/dev/null)"
printf 'cpu=%s\n' "$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo '')"
printf 'memory=%s\n' "$(free -h 2>/dev/null | awk '/^Mem:/{print $2}' || sysctl -n hw.memsize 2>/dev/null | awk '{printf "%.1fG", $1/1073741824}')"
printf 'disk_root=%s\n' "$(df -h / 2>/dev/null | awk 'NR==2{print $2 " total, " $3 " used, " $4 " avail"}')"
for t in git python3 python node npm docker curl wget vim nano; do
  command -v "$t" >/dev/null 2>&1 && echo "tool_$t=1" || echo "tool_$t=0"
done
```

解析时只接受 `key=value` 行，未知行忽略。

### API

```http
GET /api/remote/connections/{session_id}/info
POST /api/remote/connections/{session_id}/info/refresh
```

### 工具

修改：

```python
async def remote_info(refresh: bool = False) -> ToolResponse:
    ...
```

输出增加：

```text
Cached at: 2026-06-12T...
Cache TTL: 60s
```

### 前端

在当前连接详情中增加 `Environment` 折叠区：

- OS / Arch / Kernel / Shell
- CPU / Memory / Disk
- Tool availability
- Refresh 按钮
- 显示 `Updated 35s ago`

## 5. Profile 测试连接

### 目标

用户保存或使用 profile 前，可以验证 SSH 参数是否正确。测试连接不得改变当前 session 的 active connection。

### API

新增：

```http
POST /api/remote/profiles/test
POST /api/remote/profiles/{profile_id}/test
```

`/profiles/test` 用于表单内未保存配置：

```json
{
  "host": "192.168.1.10",
  "port": 22,
  "username": "root",
  "password": "...",
  "key_path": "",
  "passphrase": "",
  "jump_host_id": ""
}
```

返回：

```json
{
  "ok": true,
  "latency_ms": 120.4,
  "host": "192.168.1.10",
  "username": "root",
  "remote_os": "Linux",
  "remote_shell": "/bin/bash"
}
```

失败：

```json
{
  "ok": false,
  "error": "Authentication failed for root@192.168.1.10:22..."
}
```

### SSHManager 方法

新增：

```python
async def test_connection(
    self,
    host: str,
    port: int,
    username: str,
    password: str = "",
    key_path: str = "",
    passphrase: str = "",
    jump_host_id: str = "",
    ...
) -> dict:
    ...
```

实现建议：

- 复用 `connect()` 内部的 `_resolve_jump_config()` 和连接参数构造逻辑
- 不写入 `_connections`
- 连接成功后执行轻量命令：`uname -s; echo $SHELL`
- 最后一定关闭 client 和 jump_client

为避免复制大量逻辑，建议把 `connect()` 中的私有内部函数提取为类方法：

```python
def _build_connect_kwargs(...)
def _new_client(...)
def _connect_clients(...) -> tuple[client, jump_client]
```

### 前端

Profile 表单按钮：

- `Test`
- `Save`
- `Save and connect`

测试时：

- 表单禁用或按钮 loading
- 成功展示 `Connection OK · Linux · /bin/bash · 120 ms`
- 失败展示具体错误

Profile 列表每项增加测试按钮，适合排查历史配置。

### 工具

可选新增：

```python
async def remote_test_connection(profile_id: str = "", host: str = "", ...) -> ToolResponse:
    ...
```

如果希望减少工具数量，可以只做 REST + UI。

## 6. sudo / 提权体验

### 目标

支持需要 sudo 的远程命令，避免命令卡在密码提示或错误输出难以理解。

### 范围

第一阶段只支持非交互 sudo：

- `sudo -S -p '' <command>`
- 通过 stdin 写入 sudo password
- 超时后明确提示

不做完整 TTY 交互，不做持续 root shell。

### 数据结构

Profile 不保存 sudo 配置字段。sudo 密码只作为会话级运行态凭据存在：如果 SSH 使用密码登录，sudo 默认复用当前登录用户密码并只写入运行态 session；如果 SSH 使用密钥登录或 sudo 密码不同，由前端在需要验证或执行 sudo 时弹窗输入，输入值只保存到当前 session 的运行态 sudo state。

运行态：

```python
@dataclass
class SudoState:
    enabled: bool = False
    password: str = ""
    verified_at: datetime | None = None
    last_error: str = ""
```

敏感字段要求：

- profile 不持久化 `sudo_password`
- 日志不打印
- `to_dict()` 不返回
- 显式 disconnect 时清理 session 级 sudo state

### SSHManager 执行接口

扩展：

```python
async def execute_command(
    self,
    session_id: str,
    command: str,
    timeout: float = 60.0,
    cwd: str | None = None,
    sudo: bool = False,
    sudo_password: str = "",
) -> tuple[int, str, str]:
    ...
```

sudo 包装：

```sh
sudo -S -p '' sh -lc '<quoted command>'
```

fish 登录 shell 下也建议用 `sh -lc` 执行 sudo 内部命令，降低 shell 差异。

stdin：

```text
<sudo_password>\n
```

注意：当前 `execute_command()` 使用 paramiko channel，需要支持向 channel 写入 stdin。实现时不要在 sudo 模式下过早 `channel.shutdown_write()`，应先发送密码。

### 工具

扩展：

```python
async def remote_exec(
    command: str,
    timeout: float = 60.0,
    cwd: str = "",
    sudo: bool = False,
) -> ToolResponse:
    ...
```

新增：

```python
async def remote_sudo(command: str, timeout: float = 60.0, cwd: str = "") -> ToolResponse:
    ...
```

`remote_sudo` 可以更容易被模型选择，描述明确。

### `/remote` 命令

新增：

```text
/remote sudo systemctl restart nginx
```

### 前端

Profile 表单：

- `Verify sudo`

连接详情：

- 显示 `sudo configured` / `sudo not configured`
- 提供 `Verify sudo` 按钮

### 验证命令

```sh
sudo -S -p '' true
```

成功：

```json
{
  "ok": true,
  "verified_at": "..."
}
```

失败：

- 密码错误：`sudo authentication failed`
- 用户不在 sudoers：`user is not allowed to run sudo`
- 需要 TTY：`sudo requires a tty`

### 安全风险

- sudo password 是高敏感信息，应尽量只保存在运行态或本地 store 的既有敏感字段策略中。
- 如果持久化 sudo password，必须和 SSH password 一样在所有响应中脱敏。
- 命令包装必须严格 quote，避免 `sudo=True` 时改变命令语义。

## plugin.json 和工具注册

预计新增工具：

```json
[
  "remote_health",
  "remote_set_cwd",
  "remote_test_connection",
  "remote_sudo"
]
```

已有工具扩展：

```text
remote_exec(command, timeout, cwd, sudo)
remote_info(refresh)
remote_reconnect()
remote_list()
```

`plugin.py` 中同步注册工具，`plugin.json` 中同步声明 metadata。

## 前端实现计划

`ui/src/index.ts` 是单文件 React，无 JSX。建议按现有结构新增：

- API helper：
  - `fetchConnectionHealth(sessionId)`
  - `reconnectSession(sessionId)`
  - `setRemoteCwd(sessionId, cwd)`
  - `fetchRemoteInfo(sessionId, refresh)`
  - `testProfile(profileId | formData)`
  - `verifySudo(sessionId | profileData)`
- 当前连接面板：
  - health badge
  - reconnect button
  - working directory editor
  - environment summary collapse
- Profile 表单：
  - default cwd
  - test connection button
  - sudo fields
- Header popover：
  - health status
  - reconnect action

前端构建要求：

```powershell
cd ui
npm run build
```

修改 TypeScript 后必须重新构建 `ui/dist/index.js`，因为 dist 已提交到仓库并用于打包。

## 后端实现计划

建议改动文件：

- `ssh_manager.py`
  - 健康状态 dataclass
  - reconnect cache
  - env cache
  - cwd setter
  - test connection
  - sudo execution
  - shared cwd wrapper helper
- `routers/connections.py`
  - health API
  - reconnect API
  - cwd API
  - info API
  - profile test API
  - sudo verify API
- `tools/remote_connect.py`
  - 保留 / 优化 `remote_reconnect`
- `tools/remote_info.py`
  - 增加缓存和 refresh 参数
- 新增 `tools/remote_health.py`
- 新增 `tools/remote_set_cwd.py`
- 新增 `tools/remote_sudo.py`
- 可选新增 `tools/remote_test_connection.py`
- `tools/remote_command.py`
  - 支持 `/remote cd`
  - 支持 `/remote sudo`
  - status 输出 health
- `store.py`
  - profile 字段扩展
  - 脱敏 sudo password
- `plugin.py`
  - 注册新增工具
- `plugin.json`
  - 声明新增工具

## 验收清单

### 连接健康

- 正常连接显示 `connected`
- 断网或远端关闭 SSH 后，状态变为 `stale` 或 `disconnected`
- UI 能显示最近错误和重连可用状态
- 心跳 task 在无连接时停止
- 新连接后心跳 task 能重新启动

### 一键重连

- 连接丢失后，UI 显示 Reconnect
- 点击后可以恢复连接
- 显式 disconnect 后不允许 reconnect
- profile / jump host 删除后不允许使用旧缓存 reconnect

### 工作目录

- 设置存在目录成功
- 设置不存在目录失败且不改变旧目录
- 路径包含空格时可正常工作
- fish shell 下命令仍遵守 cd 成功才执行
- profile 默认目录连接后生效

### 环境缓存

- 第一次 `remote_info` 执行真实探测
- TTL 内再次调用走缓存
- `refresh=true` 强制刷新
- UI 显示缓存更新时间

### Profile 测试连接

- 测试成功不改变当前 active connection
- 测试失败显示具体原因
- 跳板机 profile 可测试
- 测试完成后临时 SSH client 被关闭

### sudo

- `remote_exec(..., sudo=True)` 可执行需要 sudo 的命令
- `/remote sudo <command>` 可用
- sudo 密码错误时返回明确错误
- 不配置 sudo password 时返回明确提示
- REST 和日志不泄漏 sudo password

## 推荐实施顺序

1. 修整 `SSHManager` 内部模型：health、reconnect cache、cwd wrapper helper。
2. 增加 health / reconnect API，并接入 UI。
3. 增加 cwd API、工具和 `/remote cd`。
4. 重构 `remote_info` 为缓存 + 单脚本探测。
5. 提取临时连接逻辑，实现 profile test。
6. 扩展 profile schema 和 UI 表单。
7. 实现 sudo 执行和 sudo 验证。
8. 更新 README 中的用户说明。
9. 构建前端并打包验证。

## 暂不建议纳入本轮的内容

- 完整交互式终端
- 长时间后台命令管理
- SFTP 文件浏览器
- 多 active SSH connection 同时绑定同一 session
- 复杂密钥管理或系统 keychain 集成

这些功能价值高，但会明显扩大状态管理和安全边界，建议在上述 6 项稳定后再单独设计。
