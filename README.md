# Remote SSH

Remote SSH 是一个 QwenPaw 插件，用于给当前聊天会话建立 SSH 连接。连接生效后，同一会话里的 shell 命令会被转发到远端机器执行。

## 功能

- `remote_connect`：使用密码或 SSH 私钥连接远端机器。
- `remote_disconnect`：断开当前会话的 SSH 连接。
- `remote_list`：查看当前会话的 SSH 连接状态。
- `remote_exec`：显式在远端机器执行一条命令。
- `/remote`：在对话中管理当前会话的 SSH 连接，或直接在远端执行命令。
- 透明 shell 转发：连接成功后，同一会话里的 `execute_shell_command` 会通过 SSH 在远端执行。
- 前端管理页：在 Remote SSH 页面保存多个连接选项，并用每个选项上的开关控制当前 SSH 连接。

## 前端页面

`New Connection` 只负责新增连接选项，保存后会持久化到 QwenPaw 工作目录。页面可以保存多个连接选项，但当前会话最多保持一个活跃 SSH 连接。

每个连接选项右侧都有连接开关：

- 打开开关：连接到这台设备；如果当前会话已经连接到其他设备，会自动切换到这台设备。
- 关闭开关：断开当前 SSH 连接。
- 删除按钮：删除这个连接选项；如果它正在连接，会先断开再删除。

## 对话命令

```text
/remote
```

查看当前会话的远程连接状态。

```text
/remote connect host=192.168.0.106 username=root password=你的密码
```

用密码连接远端机器。

```text
/remote connect root@192.168.0.106 key_path=C:\Users\me\.ssh\id_rsa
```

用 SSH 私钥连接远端机器。

```text
/remote pwd
```

在远端机器执行 `pwd`。

```text
/remote 执行pwd
```

同样会在远端机器执行 `pwd`。

```text
/remote disconnect
```

断开当前会话的 SSH 连接。

## 安装

可以通过 QwenPaw 插件管理页面上传打包后的 ZIP 文件安装，也可以通过插件安装 API 传入 ZIP 路径安装。

安装包根目录必须包含 `plugin.json`。运行时 Python 依赖声明在 `requirements.txt` 中，QwenPaw 会在安装插件时自动安装这些依赖。

## 构建前端

安装包需要包含已构建的前端入口文件 `ui/dist/index.js`。

```powershell
cd ui
npm ci
npm run build
```

## 打包 ZIP

从仓库根目录执行：

Windows PowerShell：

```powershell
.\scripts\package.ps1
```

Linux / macOS：

```bash
chmod +x scripts/package.sh
./scripts/package.sh
```

脚本会自动读取 `plugin.json` 中的版本号，生成安装包 `dist\qwenpaw-remote-plugin-<version>.zip`。ZIP 根目录必须直接包含 `plugin.json`，不要多包一层仓库目录。

如果本机已经安装过前端依赖，可以跳过 `npm ci`：

```powershell
.\scripts\package.ps1 -SkipInstall
```

```bash
./scripts/package.sh --skip-install
```

## 安装包内容

安装 ZIP 中只应包含运行所需文件：

- `plugin.json`
- `plugin.py`
- `requirements.txt`
- `context.py`
- `ssh_manager.py`
- `shell_wrapper.py`
- `store.py`
- `routers/`
- `tools/`
- `ui/dist/index.js`

不要包含 `node_modules`、`__pycache__`、`.venv`、`.git` 或其他开发阶段生成文件。
