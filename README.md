# Remote SSH

Remote SSH 是一个 QwenPaw 插件，用于给当前聊天会话建立 SSH 连接。连接生效后，同一会话里的 shell 命令会被转发到远端机器执行。

## 功能

- `remote_connect`：使用密码或 SSH 私钥连接远端机器。
- `remote_disconnect`：断开当前会话的 SSH 连接。
- `remote_list`：查看当前会话的 SSH 连接状态。
- `remote_exec`：显式在远端机器执行一条命令。
- `/remote`：在对话中管理当前会话的 SSH 连接，或直接在远端执行命令。
- 透明 shell 转发：连接成功后，同一会话里的 `execute_shell_command` 会通过 SSH 在远端执行。
- 前端管理页：在 Remote SSH 页面保存多个连接选项、跳板机，并用每个选项上的开关控制当前 SSH 连接。
- 跳板机：连接选项可以选择已保存的 jump host，也可以通过命令行参数临时指定跳板机。
- Web 状态栏：在 QwenPaw Web 端 header 显示当前会话的 SSH 状态，并可快速连接或断开已保存设备。

## 前端页面

`New Connection` 只负责新增连接选项，保存后会持久化到 QwenPaw 工作目录。页面可以保存多个连接选项，但当前会话最多保持一个活跃 SSH 连接。

`New Jump Host` 用于保存跳板机配置。创建或编辑连接选项时，可以在 `Jump Host` 下拉框中选择一个已保存的跳板机；留空则表示直连目标设备。

每个连接选项右侧都有连接开关：

- 打开开关：连接到这台设备；如果当前会话已经连接到其他设备，会自动切换到这台设备。
- 关闭开关：断开当前 SSH 连接。
- 删除按钮：删除这个连接选项；如果它正在连接，会先断开再删除。

Web 端 header 中的 SSH 状态按钮会显示当前会话是否已连接。点击后可以查看已保存设备，并直接连接或断开。

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
/remote connect root@10.0.0.12 jump_name=bastion
```

通过已保存的跳板机连接远端机器。

```text
/remote connect root@10.0.0.12 jump_host=bastion.example.com jump_username=root
```

通过临时指定的跳板机连接远端机器。

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

前端构建会读取根目录 `plugin.json` 中的 `version`，并注入到 `ui/dist/index.js` 中作为插件初始化版本标记。不要在 `ui/src/index.ts` 中手写版本号。

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

脚本会自动读取 `plugin.json` 中的版本号，生成安装包 `dist\qwenpaw-remote-plugin-<version>.zip`。ZIP 根目录必须直接包含 `plugin.json`，不要多包一层仓库目录。打包脚本会使用跨平台的 ZIP 内部路径格式，避免在不同系统安装时找不到 `tools/`、`routers/` 等模块目录。

QwenPaw Web 端会按 `plugin.json` 的 `entry.frontend` 加载前端 bundle。`entry.frontend` 应设置为 `ui/dist/index.js`：

```json
{
	"version": "0.1.2",
	"entry": {
		"frontend": "ui/dist/index.js"
	}
}
```

打包脚本会校验这个一致性；如果 `entry.frontend` 被改成其他路径，打包会失败。

如果需要避免浏览器缓存旧的前端 bundle，应由 QwenPaw Web 宿主在加载插件前端时根据插件版本自动追加 cache-busting 参数，例如把 `ui/dist/index.js` 加载为 `ui/dist/index.js?v=0.1.2`。插件包内的 `plugin.json` 仍应保持裸路径，避免把版本号写死到入口路径里。

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

## Docker 中安装

如果 QwenPaw 运行在 Docker 中，插件目录通常位于容器内的 `/app/working/plugins`。可以把打包后的 ZIP 复制进容器，再使用容器内的 QwenPaw CLI 强制安装：

```bash
docker cp dist/qwenpaw-remote-plugin-0.1.2.zip copaw:/tmp/qwenpaw-remote-plugin-0.1.2.zip
docker exec copaw sh -lc '/app/venv/bin/qwenpaw plugin install /tmp/qwenpaw-remote-plugin-0.1.2.zip --force'
```

安装后可以检查 Web 端暴露的插件清单：

```bash
curl -sS http://127.0.0.1:8088/api/frontend_plugin
```

返回内容中应包含当前版本号。`plugin.json` 中的入口应为 `ui/dist/index.js`；如果 QwenPaw Web 宿主已支持自动 cache busting，接口返回或页面实际加载的前端 URL 可以是 `ui/dist/index.js?v=<version>`。如果浏览器页面仍显示旧 UI，先完整刷新页面；必要时重启 QwenPaw Web 服务或清理浏览器缓存，确保 Web 端重新请求新的前端 bundle。
