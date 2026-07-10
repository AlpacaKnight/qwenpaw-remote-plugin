/**
 * Remote SSH frontend plugin for QwenPaw
 *
 * Registers:
 * - Tool renderers for remote_connect, remote_disconnect, remote_list, remote_exec
 * - Remote SSH profile management page
 *
 * Uses window.QwenPaw plugin API
 */

declare const __REMOTE_PLUGIN_VERSION__: string;

const REMOTE_PLUGIN_BUILD_ID = __REMOTE_PLUGIN_VERSION__;

function buildPlugin() {
  const runtime = window as any;
  if (runtime.__remotePluginInitializedBuild === REMOTE_PLUGIN_BUILD_ID) return;
  runtime.__remotePluginInitialized = true;
  runtime.__remotePluginInitializedBuild = REMOTE_PLUGIN_BUILD_ID;

  const { React, antd, antdIcons, getApiUrl, getApiToken } = (window as any)
    .QwenPaw.host;
  const {
    Card,
    Tag,
    Typography,
    Space,
    Button,
    Input,
    Select,
    Form,
    Modal,
    Spin,
    Alert,
    Switch,
    message: antdMessage,
    List,
    Badge,
    Popconfirm,
    Empty,
    Tooltip,
    Popover,
  } = antd;
  const { Text, Title, Paragraph } = Typography;
  const { useState, useEffect, useCallback } = React;
  const {
    CloudOutlined,
    LinkOutlined,
    DisconnectOutlined,
    CodeOutlined,
    ReloadOutlined,
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    LoadingOutlined,
    LaptopOutlined,
    ThunderboltOutlined,
    InfoCircleOutlined,
    HeartOutlined,
    FolderOutlined,
    SafetyOutlined,
  } = antdIcons || {};

  // ── Language Detection ─────────────────────────────────────────────

  function isChinese(): boolean {
    try {
      const qwenpaw = (window as any).QwenPaw || {};
      const host = qwenpaw.host || {};
      const readMaybeFunction = (value: any) =>
        typeof value === "function" ? value() : value;
      const storageLang = (() => {
        try {
          const stores = [window.localStorage, window.sessionStorage];
          for (const store of stores) {
            for (let i = 0; i < store.length; i += 1) {
              const key = store.key(i) || "";
              if (!/(locale|language|lang)/i.test(key)) continue;
              const value = store.getItem(key) || "";
              if (/^zh/i.test(value) || /"zh/i.test(value)) return value;
            }
          }
        } catch {
          return "";
        }
        return "";
      })();
      const lang =
        readMaybeFunction(host.getLocale) ||
        readMaybeFunction(host.getLanguage) ||
        host.locale ||
        host.language ||
        host.lang ||
        host.settings?.locale ||
        host.settings?.language ||
        host.config?.locale ||
        host.config?.language ||
        host.i18n?.locale ||
        host.i18n?.language ||
        qwenpaw.locale ||
        qwenpaw.language ||
        qwenpaw.lang ||
        qwenpaw.settings?.locale ||
        qwenpaw.settings?.language ||
        qwenpaw.config?.locale ||
        qwenpaw.config?.language ||
        qwenpaw.i18n?.locale ||
        qwenpaw.i18n?.language ||
        storageLang ||
        document.documentElement.lang ||
        "";
      return String(lang).toLowerCase().startsWith("zh");
    } catch {
      return false;
    }
  }

  function useZh(): boolean {
    const [zh, setZh] = useState(isChinese());

    useEffect(() => {
      const syncLanguage = () => setZh(isChinese());
      syncLanguage();
      const interval = window.setInterval(syncLanguage, 1000);
      window.addEventListener("languagechange", syncLanguage);
      window.addEventListener("storage", syncLanguage);
      return () => {
        window.clearInterval(interval);
        window.removeEventListener("languagechange", syncLanguage);
        window.removeEventListener("storage", syncLanguage);
      };
    }, []);

    return zh;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  function renderIcon(icon: any, fallback: string = "•") {
    if (icon) return React.createElement(icon);
    return React.createElement("span", null, fallback);
  }

  function parseToolArgs(data: any): Record<string, any> {
    const firstData = data?.content?.[0]?.data;
    const rawArgs = firstData?.arguments;
    if (typeof rawArgs === "string") {
      try {
        return JSON.parse(rawArgs);
      } catch {
        return {};
      }
    }
    return rawArgs ?? {};
  }

  function parseToolOutput(data: any): string {
    const content = data?.content;
    if (!content || !Array.isArray(content)) return "";
    return content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text || "")
      .join("\n");
  }

  function getSessionId(): string {
    try {
      const sid = (window as any).currentSessionId ||
                  (window as any).sessionId ||
                  localStorage?.getItem?.("sessionId");
      if (sid) return sid;
    } catch (e) {
      console.debug("[Remote] Error getting sessionId:", e);
    }
    return "default-session";
  }

  async function apiFetch(path: string, options: RequestInit = {}) {
    const token = getApiToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };
    const res = await fetch(getApiUrl(path), { ...options, headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status}: ${body}`);
    }
    return res.json();
  }

  const theme = {
    text: "var(--ant-color-text, CanvasText)",
    secondaryText:
      "var(--ant-color-text-secondary, color-mix(in srgb, CanvasText 62%, transparent))",
    border:
      "var(--ant-color-border, color-mix(in srgb, CanvasText 18%, transparent))",
    bgContainer: "var(--ant-color-bg-container, Canvas)",
    bgElevated:
      "var(--ant-color-bg-elevated, var(--ant-color-bg-container, Canvas))",
    fillSecondary:
      "var(--ant-color-fill-secondary, color-mix(in srgb, CanvasText 8%, transparent))",
    success: "var(--ant-color-success, #52c41a)",
    successBorder:
      "var(--ant-color-success-border, var(--ant-color-success, #52c41a))",
    successBg: "var(--ant-color-success-bg, transparent)",
    error: "var(--ant-color-error, #ff4d4f)",
    errorBorder:
      "var(--ant-color-error-border, var(--ant-color-error, #ff4d4f))",
    errorBg: "var(--ant-color-error-bg, transparent)",
    primary: "var(--ant-color-primary, #1677ff)",
    primaryText: "var(--ant-color-white, #fff)",
    shadow:
      "var(--ant-box-shadow-secondary, 0 8px 24px rgba(0, 0, 0, 0.18))",
  };

  // ── Tool Renderers ──────────────────────────────────────────────────

  function RemoteConnectRender({ data }: { data: any }) {
    const output = parseToolOutput(data);
    const args = parseToolArgs(data);
    const isSuccess = output.includes("Connected to");
    const isFailure = output.includes("Error") || output.includes("failed");

    return React.createElement(
      Card,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${isSuccess ? "#52c41a" : isFailure ? "#ff4d4f" : "#1890ff"}`,
        },
      },
      React.createElement(
        Space,
        { direction: "vertical", style: { width: "100%" } },
        React.createElement(
          Space,
          null,
          React.createElement(LinkOutlined || "\u{1F517}"),
          React.createElement(Text, { strong: true }, "Remote SSH Connect"),
          args.host
            ? React.createElement(
                Tag,
                { color: "blue" },
                `${args.username}@${args.host}:${args.port || 22}`,
              )
            : null,
        ),
        React.createElement(
          Text,
          {
            type: isFailure ? "danger" : "success",
            style: { whiteSpace: "pre-wrap" },
          },
          output,
        ),
      ),
    );
  }

  function RemoteDisconnectRender({ data }: { data: any }) {
    const output = parseToolOutput(data);
    const isSuccess = output.includes("Disconnected");

    return React.createElement(
      Card,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${isSuccess ? "#52c41a" : "#faad14"}`,
        },
      },
      React.createElement(
        Space,
        { direction: "vertical", style: { width: "100%" } },
        React.createElement(
          Space,
          null,
          React.createElement(DisconnectOutlined || "\u{1F50C}"),
          React.createElement(Text, { strong: true }, "Remote SSH Disconnect"),
        ),
        React.createElement(
          Text,
          { style: { whiteSpace: "pre-wrap" } },
          output,
        ),
      ),
    );
  }

  function RemoteListRender({ data }: { data: any }) {
    const output = parseToolOutput(data);
    const hasConnection = output.includes("Active SSH connection");

    return React.createElement(
      Card,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${hasConnection ? "#52c41a" : "#d9d9d9"}`,
        },
      },
      React.createElement(
        Space,
        { direction: "vertical", style: { width: "100%" } },
        React.createElement(
          Space,
          null,
          React.createElement(CloudOutlined || "☁"),
          React.createElement(Text, { strong: true }, "Remote SSH Status"),
          hasConnection
            ? React.createElement(Badge, {
                status: "success",
                text: "Connected",
              })
            : React.createElement(Badge, {
                status: "default",
                text: "Not Connected",
              }),
        ),
        React.createElement(
          Text,
          { style: { whiteSpace: "pre-wrap" } },
          output,
        ),
      ),
    );
  }

  function RemoteExecRender({ data }: { data: any }) {
    const output = parseToolOutput(data);
    const args = parseToolArgs(data);
    const isRemote = output.includes("[remote:");
    const isFailure = output.includes("failed with exit code");

    return React.createElement(
      Card,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${isFailure ? "#ff4d4f" : isRemote ? "#722ed1" : "#d9d9d9"}`,
        },
      },
      React.createElement(
        Space,
        { direction: "vertical", style: { width: "100%" } },
        React.createElement(
          Space,
          null,
          React.createElement(CodeOutlined || ">_"),
          React.createElement(Text, { strong: true }, "Remote Command"),
          args.command
            ? React.createElement(
                Text,
                { code: true, ellipsis: true, style: { maxWidth: 400 } },
                args.command,
              )
            : null,
        ),
        React.createElement(
          "pre",
          {
            style: {
              margin: 0,
              padding: "8px 12px",
              background: "#f5f5f5",
              borderRadius: 4,
              fontSize: 12,
              maxHeight: 300,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            },
          },
          output,
        ),
      ),
    );
  }

  function RemoteReconnectRender({ data }: { data: any }) {
    const output = parseToolOutput(data);
    const isSuccess = output.includes("Reconnected to");
    const isFailure = output.includes("failed") || output.includes("Error");

    return React.createElement(
      Card,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${isSuccess ? "#52c41a" : isFailure ? "#ff4d4f" : "#faad14"}`,
        },
      },
      React.createElement(
        Space,
        { direction: "vertical", style: { width: "100%" } },
        React.createElement(
          Space,
          null,
          React.createElement(ReloadOutlined || "\u{21BB}"),
          React.createElement(Text, { strong: true }, "Remote SSH Reconnect"),
        ),
        React.createElement(
          Text,
          { type: isFailure ? "danger" : "success", style: { whiteSpace: "pre-wrap" } },
          output,
        ),
      ),
    );
  }

  function RemoteInfoRender({ data }: { data: any }) {
    const zh = useZh();
    const output = parseToolOutput(data);
    const hasInfo = output.includes("Remote Environment");

    return React.createElement(
      Card,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: "3px solid #1677ff",
        },
      },
      React.createElement(
        Space,
        { direction: "vertical", style: { width: "100%" } },
        React.createElement(
          Space,
          null,
          React.createElement(InfoCircleOutlined || CloudOutlined || "\u{2139}"),
          React.createElement(Text, { strong: true }, zh ? "远程设备信息" : "Remote Machine Info"),
        ),
        React.createElement(
          "pre",
          {
            style: {
              margin: 0,
              padding: "8px 12px",
              background: "#f5f5f5",
              borderRadius: 4,
              fontSize: 12,
              maxHeight: 400,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            },
          },
          output,
        ),
      ),
    );
  }

  function RemoteHealthRender({ data }: { data: any }) {
    const zh = useZh();
    const output = parseToolOutput(data);
    const isDegraded = output.includes("Unstable");
    const isStale = output.includes("Disconnected");
    const isConnected = output.includes("Status: Connected");
    const borderColor = isStale ? "#ff4d4f" : isDegraded ? "#faad14" : isConnected ? "#52c41a" : "#d9d9d9";
    return React.createElement(
      Card, { size: "small", style: { marginTop: 8, borderLeft: `3px solid ${borderColor}` } },
      React.createElement(Space, { direction: "vertical", style: { width: "100%" } },
        React.createElement(Space, null,
          React.createElement(HeartOutlined || "\u{2764}"),
          React.createElement(Text, { strong: true }, zh ? "连接健康状态" : "Connection Health"),
        ),
        React.createElement("pre", { style: { margin: 0, padding: "8px 12px", background: "#f5f5f5", borderRadius: 4, fontSize: 12, maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" } }, output),
      ),
    );
  }

  function RemoteSetCwdRender({ data }: { data: any }) {
    const zh = useZh();
    const output = parseToolOutput(data);
    const isSuccess = output.includes("set to:");
    const isFailure = output.includes("Error");
    return React.createElement(
      Card, { size: "small", style: { marginTop: 8, borderLeft: `3px solid ${isSuccess ? "#52c41a" : isFailure ? "#ff4d4f" : "#d9d9d9"}` } },
      React.createElement(Space, { direction: "vertical", style: { width: "100%" } },
        React.createElement(Space, null,
          React.createElement(FolderOutlined || "\u{1F4C1}"),
          React.createElement(Text, { strong: true }, zh ? "设置工作目录" : "Set Working Directory"),
        ),
        React.createElement(Text, { type: isFailure ? "danger" : "success", style: { whiteSpace: "pre-wrap" } }, output),
      ),
    );
  }

  function RemoteSudoRender({ data }: { data: any }) {
    const zh = useZh();
    const output = parseToolOutput(data);
    const isFailure = output.includes("failed with exit code") || output.includes("Error");
    return React.createElement(
      Card, { size: "small", style: { marginTop: 8, borderLeft: `3px solid ${isFailure ? "#ff4d4f" : "#faad14"}` } },
      React.createElement(Space, { direction: "vertical", style: { width: "100%" } },
        React.createElement(Space, null,
          React.createElement(SafetyOutlined || "\u{1F6E1}"),
          React.createElement(Text, { strong: true }, zh ? "Sudo 命令" : "Sudo Command"),
        ),
        React.createElement("pre", { style: { margin: 0, padding: "8px 12px", background: "#f5f5f5", borderRadius: 4, fontSize: 12, maxHeight: 300, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" } }, output),
      ),
    );
  }

  // ── Remote Management Page ──────────────────────────────────────────

  function RemotePage() {
    const zh = useZh();
    const [profiles, setProfiles] = useState([] as any[]);
    const [jumpHosts, setJumpHosts] = useState([] as any[]);
    const [activeProfileId, setActiveProfileId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [jumpModalOpen, setJumpModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null as any | null);
    const [editingJumpHost, setEditingJumpHost] = useState(null as any | null);
    const [saving, setSaving] = useState(false);
    const [savingJumpHost, setSavingJumpHost] = useState(false);
    const [connectingId, setConnectingId] = useState(null as string | null);
    const [cwdValue, setCwdValue] = useState("/");
    const [cwdEditing, setCwdEditing] = useState(false);
    const [form] = Form.useForm();
    const [jumpForm] = Form.useForm();

    const fetchData = useCallback(async () => {
      setLoading(true);
      setError("");
      try {
        const sessionId = getSessionId() || "";
        const encodedSessionId = encodeURIComponent(sessionId);
        const profileUrl = `/remote/profiles?session_id=${encodedSessionId}`;
        const jumpUrl = `/remote/jump-hosts`;
        const connectionUrl = `/remote/connections?session_id=${encodedSessionId}`;

        console.log("[Remote] Fetching data from:", profileUrl, jumpUrl);
        const [profileData, jumpHostData, connectionData] = await Promise.all([
          apiFetch(profileUrl),
          apiFetch(jumpUrl),
          apiFetch(connectionUrl).catch(() => ({ connections: [] })),
        ]);
        console.log("[Remote] Profiles data:", profileData);
        console.log("[Remote] Jump hosts data:", jumpHostData);
        const nextProfiles = profileData.profiles || [];
        const nextActiveProfileId = profileData.active_profile_id || "";
        const activeProfile = nextProfiles.find(
          (profile: any) => profile.id === nextActiveProfileId,
        );
        const activeConnection = (connectionData.connections || [])[0] || null;
        setProfiles(nextProfiles);
        setActiveProfileId(nextActiveProfileId);
        setJumpHosts(jumpHostData.jump_hosts || []);
        setCwdValue(
          activeConnection?.default_cwd ||
            activeProfile?.default_cwd ||
            "/",
        );
      } catch (e: any) {
        const errMsg = e.message || String(e);
        console.error("[Remote] Failed to fetch data:", e);
        setError(errMsg);
        antdMessage.error(`Failed to load profiles: ${errMsg}`);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }, [fetchData]);

    const handleSave = async (values: any) => {
      setSaving(true);
      try {
        await apiFetch(
          editingProfile
            ? `/remote/profiles/${editingProfile.id}`
            : "/remote/profiles",
          {
            method: editingProfile ? "PUT" : "POST",
            body: JSON.stringify(values),
          },
        );
        antdMessage.success(
          editingProfile
            ? "Connection profile updated"
            : "Connection profile saved",
        );
        setModalOpen(false);
        setEditingProfile(null);
        form.resetFields();
        fetchData();
      } catch (e: any) {
        antdMessage.error(`Save failed: ${e.message}`);
      } finally {
        setSaving(false);
      }
    };

    const openNewProfileModal = () => {
      setEditingProfile(null);
      form.resetFields();
      setModalOpen(true);
    };

    const openEditProfileModal = (profile: any) => {
      setEditingProfile(profile);
      form.setFieldsValue({
        name: profile.name,
        host: profile.host,
        port: profile.port,
        username: profile.username,
        password: "",
        key_path: profile.key_path,
        passphrase: "",
        jump_host_id: profile.jump_host_id || "",
        default_cwd: profile.default_cwd || "",
      });
      setModalOpen(true);
    };

    const handleSaveJumpHost = async (values: any) => {
      setSavingJumpHost(true);
      try {
        await apiFetch(
          editingJumpHost
            ? `/remote/jump-hosts/${editingJumpHost.id}`
            : "/remote/jump-hosts",
          {
            method: editingJumpHost ? "PUT" : "POST",
            body: JSON.stringify(values),
          },
        );
        antdMessage.success(
          editingJumpHost ? "Jump host updated" : "Jump host saved",
        );
        setJumpModalOpen(false);
        setEditingJumpHost(null);
        jumpForm.resetFields();
        fetchData();
      } catch (e: any) {
        antdMessage.error(`Save jump host failed: ${e.message}`);
      } finally {
        setSavingJumpHost(false);
      }
    };

    const openNewJumpHostModal = () => {
      setEditingJumpHost(null);
      jumpForm.resetFields();
      setJumpModalOpen(true);
    };

    const openEditJumpHostModal = (jumpHost: any) => {
      setEditingJumpHost(jumpHost);
      jumpForm.setFieldsValue({
        name: jumpHost.name,
        host: jumpHost.host,
        port: jumpHost.port,
        username: jumpHost.username,
        password: "",
        key_path: jumpHost.key_path,
        passphrase: "",
      });
      setJumpModalOpen(true);
    };

    const handleDeleteJumpHost = async (jumpHostId: string) => {
      try {
        await apiFetch(`/remote/jump-hosts/${jumpHostId}`, {
          method: "DELETE",
        });
        antdMessage.success("Jump host deleted");
        fetchData();
      } catch (e: any) {
        antdMessage.error(`Delete jump host failed: ${e.message}`);
      }
    };

    const handleToggleConnect = async (profile: any) => {
      const sessionId = getSessionId();
      if (!sessionId) {
        antdMessage.error("No active session. Open a chat first.");
        return;
      }

      const isCurrentlyConnected = profile.id === activeProfileId;

      if (isCurrentlyConnected) {
        // Disconnect
        try {
          await apiFetch(`/remote/connections/${sessionId}`, {
            method: "DELETE",
          });
          antdMessage.success("Disconnected");
          fetchData();
        } catch (e: any) {
          antdMessage.error(`Disconnect failed: ${e.message}`);
        }
      } else {
        // Connect
        setConnectingId(profile.id);
        try {
          const result = await apiFetch(`/remote/profiles/${profile.id}/connect`, {
            method: "POST",
            body: JSON.stringify({ session_id: sessionId }),
          });
          antdMessage.success(zh ? `已连接到 ${profile.name}` : `Connected to ${profile.name}`);

          if (result.sudo_needs_password) {
            const sudoPwd = prompt(
              zh ? "SSH 使用密钥认证，需要输入 sudo 密码：" : "SSH uses key auth. Enter sudo password:"
            );
            if (sudoPwd) {
              await apiFetch(`/remote/connections/${sessionId}/sudo`, {
                method: "POST",
                body: JSON.stringify({ password: sudoPwd, enabled: true }),
              });
            }
          }

          fetchData();
        } catch (e: any) {
          antdMessage.error(zh ? `连接失败: ${e.message}` : `Connection failed: ${e.message}`);
        } finally {
          setConnectingId(null);
        }
      }
    };

    const handleDelete = async (profileId: string) => {
      try {
        await apiFetch(`/remote/profiles/${profileId}`, {
          method: "DELETE",
        });
        antdMessage.success("Profile deleted");
        fetchData();
      } catch (e: any) {
        antdMessage.error(`Delete failed: ${e.message}`);
      }
    };

    const handleSetCwd = async (nextCwd?: string) => {
      const sessionId = getSessionId();
      if (!sessionId) return;
      const targetCwd = (nextCwd ?? cwdValue).trim();
      if (!targetCwd) return;
      setCwdEditing(true);
      try {
        await apiFetch(`/remote/connections/${sessionId}/cwd`, {
          method: "PUT",
          body: JSON.stringify({ cwd: targetCwd, verify: true }),
        });
        setCwdValue(targetCwd);
        // Sync to profile config if connected via profile
        if (activeProfileId) {
          await apiFetch(`/remote/profiles/${activeProfileId}/cwd`, {
            method: "PATCH",
            body: JSON.stringify({ cwd: targetCwd }),
          }).catch(() => {});
        }
        antdMessage.success(zh ? "工作目录已更新" : "Working directory updated");
      } catch (e: any) {
        antdMessage.error(zh ? `失败: ${e.message}` : `Failed: ${e.message}`);
      } finally {
        setCwdEditing(false);
      }
    };

    const isConnected = (profileId: string) => profileId === activeProfileId;

    return React.createElement(
      "div",
      { style: { padding: 24, maxWidth: 900, margin: "0 auto" } },
      // Header
      React.createElement(
        Space,
        {
          style: {
            marginBottom: 16,
            width: "100%",
            justifyContent: "space-between",
          },
        },
        React.createElement(
          Title,
          { level: 4, style: { margin: 0 } },
          zh ? "远程 SSH" : "Remote SSH",
        ),
        React.createElement(
          Space,
          null,
          React.createElement(
            Button,
            { icon: renderIcon(ReloadOutlined), onClick: fetchData },
            zh ? "刷新" : "Refresh",
          ),
          React.createElement(
            Button,
            {
              icon: renderIcon(PlusOutlined),
              onClick: openNewJumpHostModal,
            },
            zh ? "新建跳板机" : "New Jump Host",
          ),
          React.createElement(
            Button,
            {
              type: "primary",
              icon: renderIcon(PlusOutlined),
              onClick: openNewProfileModal,
            },
            zh ? "新建连接" : "New Connection",
          ),
        ),
      ),
      // Info alert + error alert if any
      React.createElement(Alert, {
        type: "info",
        showIcon: true,
        style: { marginBottom: 16 },
        message:
          zh
            ? "在这里保存 SSH 连接配置。使用开关连接或断开设备；同一时间只能有一个连接处于活跃状态。连接后，当前对话中的 shell 命令会在远程设备上执行。"
            : "Save connection profiles here. Toggle the switch to connect/disconnect. " +
              "Only one connection can be active at a time. " +
              "When connected, all shell commands in the current chat execute on the remote machine.",
      }),
      error
        ? React.createElement(Alert, {
            type: "error",
            showIcon: true,
            style: { marginBottom: 16 },
            message: zh ? "加载数据失败" : "Error loading data",
            description: error,
          })
        : null,
      React.createElement(
        Card,
        {
          size: "small",
          title: zh ? "跳板机" : "Jump Hosts",
          style: { marginBottom: 16 },
        },
        jumpHosts.length === 0
          ? React.createElement(
              Empty,
              {
                image: Empty.PRESENTED_IMAGE_SIMPLE,
                description: zh ? "暂无保存的跳板机。" : "No saved jump hosts.",
              },
            )
          : React.createElement(
              List,
              {
                dataSource: jumpHosts,
                renderItem: (jumpHost: any) =>
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: "1px solid #f0f0f0",
                      },
                    },
                    React.createElement(
                      "div",
                      { style: { minWidth: 0 } },
                      React.createElement(
                        Text,
                        { strong: true },
                        jumpHost.name ||
                          `${jumpHost.username}@${jumpHost.host}`,
                      ),
                      React.createElement(
                        "div",
                        { style: { marginTop: 4 } },
                        React.createElement(
                          Text,
                          { type: "secondary", style: { fontSize: 12 } },
                          `${jumpHost.username}@${jumpHost.host}:${jumpHost.port}`,
                          jumpHost.key_path
                            ? `  |  ${zh ? "密钥" : "Key"}: ${jumpHost.key_path}`
                            : "",
                        ),
                      ),
                    ),
                    React.createElement(
                      Space,
                      null,
                      React.createElement(
                        Tooltip,
                        { title: zh ? "编辑此跳板机" : "Edit this jump host" },
                        React.createElement(Button, {
                          type: "text",
                          size: "small",
                          icon: renderIcon(EditOutlined),
                          onClick: () => openEditJumpHostModal(jumpHost),
                        }),
                      ),
                      React.createElement(
                        Popconfirm,
                        {
                          title: zh ? "删除此跳板机？" : "Delete this jump host?",
                          onConfirm: () => handleDeleteJumpHost(jumpHost.id),
                          okText: zh ? "删除" : "Delete",
                          cancelText: zh ? "取消" : "Cancel",
                          okButtonProps: { danger: true },
                        },
                        React.createElement(Button, {
                          type: "text",
                          danger: true,
                          size: "small",
                          icon: renderIcon(DeleteOutlined),
                        }),
                      ),
                    ),
                  ),
              },
            ),
      ),
      React.createElement(
        Title,
        { level: 5, style: { marginTop: 0 } },
        zh ? "设备" : "Devices",
      ),
      // Profile list
      loading
        ? React.createElement(Spin, {
            style: { display: "block", margin: "40px auto" },
          })
        : profiles.length === 0
          ? React.createElement(
              Card,
              null,
              React.createElement(
                Empty,
                {
                  description: React.createElement(
                    Paragraph,
                    { type: "secondary" },
                    zh ? "暂无保存的连接。点击“新建连接”添加一个。" : "No saved connections. Click 'New Connection' to add one.",
                  ),
                },
              ),
            )
          : React.createElement(
              List,
              {
                dataSource: profiles,
                renderItem: (profile: any) => {
                  const connected = isConnected(profile.id);
                  const isConnecting = connectingId === profile.id;

                  return React.createElement(
                    Card,
                    {
                      size: "small",
                      style: {
                        marginBottom: 8,
                        borderColor: connected ? "#52c41a" : undefined,
                      },
                    },
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        },
                      },
                      // Left: profile info
                      React.createElement(
                        "div",
                        { style: { flex: 1, minWidth: 0 } },
                        React.createElement(
                          Space,
                          { align: "center" },
                          React.createElement(
                            Text,
                            { strong: true, style: { fontSize: 14 } },
                            profile.name ||
                              `${profile.username}@${profile.host}`,
                          ),
                          connected
                            ? React.createElement(
                                Tag,
                                { color: "success" },
                                zh ? "已连接" : "Connected",
                              )
                            : null,
                        ),
                        React.createElement(
                          "div",
                          { style: { marginTop: 4 } },
                          React.createElement(
                            Text,
                            { type: "secondary", style: { fontSize: 12 } },
                            `${profile.username}@${profile.host}:${profile.port}`,
                            profile.key_path
                              ? `  |  ${zh ? "密钥" : "Key"}: ${profile.key_path}`
                              : "",
                            profile.jump_host_name
                              ? `  |  ${zh ? "经由" : "via"} ${profile.jump_host_name}`
                              : "",
                          ),
                        ),
                        connected
                          ? React.createElement(
                              "div",
                              { style: { marginTop: 4, display: "flex", alignItems: "center", gap: 6 } },
                              React.createElement(
                                Text,
                                { type: "secondary", style: { fontSize: 12 } },
                                `cwd: ${cwdValue}`,
                              ),
                              React.createElement(Button, {
                                type: "text", size: "small", icon: renderIcon(EditOutlined),
                                onClick: () => {
                                  const newCwd = prompt(zh ? "设置工作目录:" : "Set working directory:", cwdValue);
                                  if (newCwd && newCwd.trim()) {
                                    handleSetCwd(newCwd.trim());
                                  }
                                },
                              }),
                            )
                          : null,
                      ),
                      // Right: actions
                      React.createElement(
                        Space,
                        null,
                        isConnecting
                          ? React.createElement(LoadingOutlined, {
                              style: { fontSize: 18 },
                            })
                          : React.createElement(
                              Tooltip,
                              {
                                title: connected
                                  ? (zh ? "断开连接" : "Disconnect")
                                  : (zh ? "连接到此设备" : "Connect to this device"),
                              },
                              React.createElement(Switch, {
                                checked: connected,
                                onChange: () => handleToggleConnect(profile),
                                checkedChildren: zh ? "开" : "ON",
                                unCheckedChildren: zh ? "关" : "OFF",
                              }),
                            ),
                        React.createElement(
                          Tooltip,
                          { title: zh ? "编辑此连接配置" : "Edit this connection profile" },
                          React.createElement(Button, {
                            type: "text",
                            size: "small",
                            icon: renderIcon(EditOutlined),
                            onClick: () => openEditProfileModal(profile),
                          }),
                        ),
                        React.createElement(
                          Popconfirm,
                          {
                            title: zh ? "删除此连接配置？" : "Delete this connection profile?",
                            onConfirm: () => handleDelete(profile.id),
                            okText: zh ? "删除" : "Delete",
                            cancelText: zh ? "取消" : "Cancel",
                            okButtonProps: { danger: true },
                          },
                          React.createElement(Button, {
                            type: "text",
                            danger: true,
                            size: "small",
                            icon: renderIcon(DeleteOutlined),
                          }),
                        ),
                      ),
                    ),
                  );
                },
              },
            ),
      // New Connection Modal
      React.createElement(
        Modal,
        {
          title: editingProfile
            ? (zh ? "编辑 SSH 连接" : "Edit SSH Connection")
            : (zh ? "新建 SSH 连接" : "New SSH Connection"),
          open: modalOpen,
          onCancel: () => {
            setModalOpen(false);
            setEditingProfile(null);
            form.resetFields();
          },
          footer: null,
        },
        React.createElement(
          Form,
          { form, layout: "vertical", onFinish: handleSave },
          React.createElement(
            Form.Item,
            { name: "name", label: zh ? "显示名称" : "Display Name" },
            React.createElement(Input, {
              placeholder: zh ? "我的服务器（可选，留空自动生成）" : "My Server (optional, auto-generated if empty)",
            }),
          ),
          React.createElement(
            Form.Item,
            {
              name: "host",
              label: zh ? "主机" : "Host",
              rules: [{ required: true, message: zh ? "请输入主机地址" : "Please enter the host" }],
            },
            React.createElement(Input, {
              placeholder: "192.168.1.100 or example.com",
            }),
          ),
          React.createElement(
            Space,
            { style: { width: "100%" } },
            React.createElement(
              Form.Item,
              {
                name: "port",
                label: zh ? "端口" : "Port",
                initialValue: 22,
                style: { width: 120 },
              },
              React.createElement(Input, { type: "number" }),
            ),
            React.createElement(
              Form.Item,
              {
                name: "username",
                label: zh ? "用户名" : "Username",
                initialValue: "root",
                style: { flex: 1 },
              },
              React.createElement(Input),
            ),
          ),
          React.createElement(
            Form.Item,
            {
              name: "password",
              label: React.createElement(Space, null,
                zh ? "密码" : "Password",
                editingProfile?.has_password
                  ? React.createElement(Tag, { color: "green", style: { marginLeft: 4 } }, zh ? "已设置" : "Set")
                  : null,
              ),
            },
            React.createElement(Input.Password, {
              placeholder: editingProfile
                ? (zh ? "留空则保留已保存的密码" : "Leave empty to keep the saved password")
                : (zh ? "使用密钥认证时可留空" : "Leave empty if using key auth"),
            }),
          ),
          React.createElement(
            Form.Item,
            { name: "key_path", label: zh ? "SSH 密钥路径" : "SSH Key Path" },
            React.createElement(Input, {
              placeholder: editingProfile?.has_passphrase
                ? (zh ? "留空则保留已保存的密钥口令" : "Leave empty to keep saved passphrase")
                : (zh ? "/home/user/.ssh/id_rsa（可选）" : "/home/user/.ssh/id_rsa (optional)"),
            }),
          ),
          React.createElement(
            Form.Item,
            {
              name: "passphrase",
              label: React.createElement(Space, null,
                zh ? "密钥口令" : "Key Passphrase",
                editingProfile?.has_passphrase
                  ? React.createElement(Tag, { color: "green", style: { marginLeft: 4 } }, zh ? "已设置" : "Set")
                  : null,
              ),
            },
            React.createElement(Input.Password, {
              placeholder: editingProfile
                ? (zh ? "留空则保留已保存的密钥口令" : "Leave empty to keep the saved passphrase")
                : (zh ? "密钥加密时填写" : "If key is encrypted"),
            }),
          ),
          React.createElement(
            Form.Item,
            { name: "jump_host_id", label: zh ? "跳板机" : "Jump Host" },
            React.createElement(Select, {
              allowClear: true,
              placeholder: zh ? "直连（不使用跳板机）" : "Direct connection (no jump host)",
              options: jumpHosts.map((jumpHost: any) => ({
                label:
                  jumpHost.name ||
                  `${jumpHost.username}@${jumpHost.host}:${jumpHost.port}`,
                value: jumpHost.id,
              })),
            }),
          ),
          React.createElement(
            Form.Item,
            { name: "default_cwd", label: zh ? "默认工作目录" : "Default Working Directory" },
            React.createElement(Input, {
              placeholder: zh ? "/workspace/app（可选，默认 /）" : "/workspace/app (optional, default: /)",
            }),
          ),
          React.createElement(
            Form.Item,
            null,
            React.createElement(
              Space,
              { wrap: true, style: { width: "100%" } },
              React.createElement(
                Button,
                {
                  htmlType: "button",
                  onClick: async () => {
                    const values = form.getFieldsValue();
                    if (!values.host) {
                      antdMessage.error(zh ? "请填写主机地址" : "Host is required for testing");
                      return;
                    }
                    try {
                      const useSavedProfile = editingProfile && !values.password && !values.passphrase;
                      const result = useSavedProfile
                        ? await apiFetch(`/remote/profiles/${editingProfile.id}/test`, { method: "POST" })
                        : await apiFetch("/remote/profiles/test", { method: "POST", body: JSON.stringify(values) });
                      if (result.ok) {
                        antdMessage.success(
                          zh
                            ? `连接成功 \u00B7 ${result.remote_os} \u00B7 ${result.remote_shell} \u00B7 ${result.latency_ms} ms`
                            : `Connection OK \u00B7 ${result.remote_os} \u00B7 ${result.remote_shell} \u00B7 ${result.latency_ms} ms`
                        );
                      } else {
                        antdMessage.error(zh ? `测试失败: ${result.error}` : `Test failed: ${result.error}`);
                      }
                    } catch (e: any) {
                      antdMessage.error(zh ? `测试失败: ${e.message}` : `Test failed: ${e.message}`);
                    }
                  },
                  style: { flex: 1, minWidth: 140 },
                },
                zh ? "测试连接" : "Test Connection",
              ),
              React.createElement(
                Button,
                {
                  type: "primary",
                  htmlType: "submit",
                  loading: saving,
                  style: { flex: 1, minWidth: 140 },
                },
                editingProfile ? (zh ? "更新配置" : "Update Profile") : (zh ? "保存配置" : "Save Profile"),
              ),
            ),
          ),
        ),
      ),
      React.createElement(
        Modal,
        {
          title: editingJumpHost
            ? (zh ? "编辑跳板机" : "Edit Jump Host")
            : (zh ? "新建跳板机" : "New Jump Host"),
          open: jumpModalOpen,
          onCancel: () => {
            setJumpModalOpen(false);
            setEditingJumpHost(null);
            jumpForm.resetFields();
          },
          footer: null,
        },
        React.createElement(
          Form,
          { form: jumpForm, layout: "vertical", onFinish: handleSaveJumpHost },
          React.createElement(
            Form.Item,
            { name: "name", label: zh ? "显示名称" : "Display Name" },
            React.createElement(Input, {
              placeholder: zh ? "跳板机（可选，留空自动生成）" : "Bastion (optional, auto-generated if empty)",
            }),
          ),
          React.createElement(
            Form.Item,
            {
              name: "host",
              label: zh ? "主机" : "Host",
              rules: [{ required: true, message: zh ? "请输入主机地址" : "Please enter the host" }],
            },
            React.createElement(Input, {
              placeholder: "bastion.example.com or 192.168.1.10",
            }),
          ),
          React.createElement(
            Space,
            { style: { width: "100%" } },
            React.createElement(
              Form.Item,
              {
                name: "port",
                label: zh ? "端口" : "Port",
                initialValue: 22,
                style: { width: 120 },
              },
              React.createElement(Input, { type: "number" }),
            ),
            React.createElement(
              Form.Item,
              {
                name: "username",
                label: zh ? "用户名" : "Username",
                initialValue: "root",
                style: { flex: 1 },
              },
              React.createElement(Input),
            ),
          ),
          React.createElement(
            Form.Item,
            {
              name: "password",
              label: React.createElement(Space, null,
                zh ? "密码" : "Password",
                editingJumpHost?.has_password
                  ? React.createElement(Tag, { color: "green", style: { marginLeft: 4 } }, zh ? "已设置" : "Set")
                  : null,
              ),
            },
            React.createElement(Input.Password, {
              placeholder: editingJumpHost
                ? (zh ? "留空则保留已保存的密码" : "Leave empty to keep the saved password")
                : (zh ? "使用密钥认证时可留空" : "Leave empty if using key auth"),
            }),
          ),
          React.createElement(
            Form.Item,
            { name: "key_path", label: zh ? "SSH 密钥路径" : "SSH Key Path" },
            React.createElement(Input, {
              placeholder: editingJumpHost?.has_passphrase
                ? (zh ? "留空则保留已保存的密钥口令" : "Leave empty to keep saved passphrase")
                : (zh ? "/home/user/.ssh/id_rsa（可选）" : "/home/user/.ssh/id_rsa (optional)"),
            }),
          ),
          React.createElement(
            Form.Item,
            {
              name: "passphrase",
              label: React.createElement(Space, null,
                zh ? "密钥口令" : "Key Passphrase",
                editingJumpHost?.has_passphrase
                  ? React.createElement(Tag, { color: "green", style: { marginLeft: 4 } }, zh ? "已设置" : "Set")
                  : null,
              ),
            },
            React.createElement(Input.Password, {
              placeholder: editingJumpHost
                ? (zh ? "留空则保留已保存的密钥口令" : "Leave empty to keep the saved passphrase")
                : (zh ? "密钥加密时填写" : "If key is encrypted"),
            }),
          ),
          React.createElement(
            Form.Item,
            null,
            React.createElement(
              Button,
              {
                type: "primary",
                htmlType: "submit",
                loading: savingJumpHost,
                style: { width: "100%" },
              },
              editingJumpHost
                ? (zh ? "更新跳板机" : "Update Jump Host")
                : (zh ? "保存跳板机" : "Save Jump Host"),
            ),
          ),
        ),
      ),
    );
  }

  // ── Header SSH Status Indicator ──────────────────────────────────────

  function RemoteStatusIndicator() {
    const zh = useZh();
    const [connection, setConnection] = useState(null as any);
    const [profiles, setProfiles] = useState([] as any[]);
    const [activeProfileId, setActiveProfileId] = useState("");
    const [connectingId, setConnectingId] = useState(null as string | null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [health, setHealth] = useState(null as any);
    const [remoteInfo, setRemoteInfo] = useState(null as any);
    const [reconnecting, setReconnecting] = useState(false);
    const prevConnectedRef = React.useRef(false);

    const fetchStatus = useCallback(async () => {
      try {
        setLoading(true);
        setError("");
        const sessionId = getSessionId() || "";
        const encodedSessionId = encodeURIComponent(sessionId);
        const [connectionData, profileData, healthData] = await Promise.all([
          apiFetch(`/remote/connections?session_id=${encodedSessionId}`),
          apiFetch(`/remote/profiles?session_id=${encodedSessionId}`),
          apiFetch(`/remote/connections/${encodedSessionId}/health`).catch(() => ({ health: null })),
        ]);
        const conns = connectionData.connections || [];
        const newConn = conns.length > 0 ? conns[0] : null;
        let nextRemoteInfo = null as any;
        if (newConn) {
          const infoData = await apiFetch(
            `/remote/connections/${encodedSessionId}/info`,
          ).catch(() => ({ info: null }));
          nextRemoteInfo = infoData.info || null;
        }
        const wasConnected = prevConnectedRef.current;
        const isNowConnected = newConn !== null;
        if (wasConnected && !isNowConnected) {
          antdMessage.warning(zh ? "SSH 连接已断开" : "SSH connection lost");
        }
        prevConnectedRef.current = isNowConnected;
        setConnection(newConn);
        setProfiles(profileData.profiles || []);
        setActiveProfileId(profileData.active_profile_id || "");
        setHealth(healthData.health || null);
        setRemoteInfo(nextRemoteInfo);
      } catch (e: any) {
        const errorMsg = e.message || String(e);
        console.error("[Remote] Failed to fetch status:", e);
        if (prevConnectedRef.current) {
          antdMessage.warning(zh ? "SSH 连接已断开" : "SSH connection lost");
        }
        prevConnectedRef.current = false;
        setError(errorMsg);
        setConnection(null);
        setHealth(null);
        setRemoteInfo(null);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleDisconnect = async () => {
      const sessionId = getSessionId();
      if (!sessionId) return;
      try {
        await apiFetch(`/remote/connections/${sessionId}`, {
          method: "DELETE",
        });
        fetchStatus();
      } catch (e: any) {
        antdMessage.error(zh ? `断开连接失败: ${e.message}` : `Disconnect failed: ${e.message}`);
      }
    };

    const handleReconnect = async () => {
      const sessionId = getSessionId();
      if (!sessionId) return;
      setReconnecting(true);
      try {
        await apiFetch(`/remote/connections/${sessionId}/reconnect`, {
          method: "POST",
        });
        antdMessage.success(zh ? "已重连" : "Reconnected");
        fetchStatus();
      } catch (e: any) {
        antdMessage.error(zh ? `重连失败: ${e.message}` : `Reconnect failed: ${e.message}`);
      } finally {
        setReconnecting(false);
      }
    };

    const handleProfileClick = async (profile: any) => {
      const sessionId = getSessionId();
      if (!sessionId) {
        antdMessage.error(zh ? "无活跃会话，请先打开一个对话。" : "No active session. Open a chat first.");
        return;
      }

      const isActive = profile.id === activeProfileId;
      setConnectingId(profile.id);
      try {
        if (isActive) {
          await apiFetch(`/remote/connections/${sessionId}`, {
            method: "DELETE",
          });
        } else {
          const result = await apiFetch(`/remote/profiles/${profile.id}/connect`, {
            method: "POST",
            body: JSON.stringify({ session_id: sessionId }),
          });
          antdMessage.success(zh ? `已连接到 ${profile.name}` : `Connected to ${profile.name}`);

          if (result.sudo_needs_password) {
            const sudoPwd = prompt(
              zh ? "SSH 使用密钥认证，需要输入 sudo 密码：" : "SSH uses key auth. Enter sudo password:"
            );
            if (sudoPwd) {
              await apiFetch(`/remote/connections/${sessionId}/sudo`, {
                method: "POST",
                body: JSON.stringify({ password: sudoPwd, enabled: true }),
              });
            }
          }
        }
        fetchStatus();
      } catch (e: any) {
        antdMessage.error(
          zh
            ? `${isActive ? "断开" : "连接"}失败: ${e.message}`
            : `${isActive ? "Disconnect" : "Connection"} failed: ${e.message}`,
        );
      } finally {
        setConnectingId(null);
      }
    };

    const isConnected = connection !== null;
    const uptime = connection?.uptime_seconds || 0;
    let uptimeStr = "";
    if (isConnected) {
      if (uptime < 60) uptimeStr = `${uptime.toFixed(0)}s`;
      else if (uptime < 3600) uptimeStr = `${(uptime / 60).toFixed(0)}m`;
      else uptimeStr = `${(uptime / 3600).toFixed(1)}h`;
    }
    const deviceOs = remoteInfo?.remote_os || connection?.remote_os || "";
    const deviceArch = remoteInfo?.remote_arch || connection?.remote_arch || "";
    const deviceShell = remoteInfo?.remote_shell || connection?.remote_shell || "";
    const deviceSummary = [deviceOs, deviceArch, deviceShell].filter(Boolean).join(" · ");
    const shortDeviceLabel = [deviceOs, deviceArch].filter(Boolean).join(" ");

    const trigger = React.createElement(
      "button",
      {
        id: "remote-ssh-header-status-react",
        type: "button",
        style: {
          height: 38,
          minWidth: 156,
          maxWidth: 220,
          padding: "0 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          border: `1px solid ${isConnected ? theme.successBorder : theme.border}`,
          borderRadius: 6,
          background: isConnected ? theme.successBg : theme.bgContainer,
          color: isConnected ? theme.success : theme.text,
          font: "inherit",
          cursor: "pointer",
          whiteSpace: "nowrap",
          overflow: "hidden",
        },
        "aria-label": isConnected
          ? `SSH connected to ${connection.username}@${connection.host}`
          : "SSH disconnected",
      },
      React.createElement(Badge, {
        status: isConnected ? "success" : error ? "error" : "default",
      }),
      React.createElement(
        "span",
        {
          style: {
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: 14,
            fontWeight: 600,
          },
        },
        isConnected
          ? `${connection.username}@${connection.host}`
          : loading
            ? "SSH Checking"
            : "SSH Offline",
      ),
      isConnected && shortDeviceLabel
        ? React.createElement(
            Tag,
            {
              color: "green",
              style: {
                marginInlineStart: 0,
                maxWidth: 92,
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            },
            shortDeviceLabel,
          )
        : null,
    );

    const content = React.createElement(
      "div",
      { style: { width: 320 } },
      React.createElement(
        Space,
        { direction: "vertical", size: 10, style: { width: "100%" } },
        isConnected
          ? React.createElement(
              Space,
              { direction: "vertical", size: 6, style: { width: "100%" } },
              React.createElement(
                Space,
                { align: "center" },
                React.createElement(LaptopOutlined || CloudOutlined || "span"),
                React.createElement(Text, { strong: true }, zh ? "SSH 已连接" : "SSH Connected"),
                health?.latency_ms != null
                  ? React.createElement(Tag, { color: "blue", style: { marginLeft: 4 } }, `${health.latency_ms.toFixed(0)} ms`)
                  : null,
              ),
              React.createElement(
                Text,
                { code: true, ellipsis: true, style: { maxWidth: 296 } },
                `${connection.username}@${connection.host}:${connection.port}`,
              ),
              React.createElement(
                Space,
                { size: 6 },
                React.createElement(ThunderboltOutlined || "span"),
                React.createElement(Text, { type: "secondary" }, uptimeStr),
              ),
              deviceSummary
                ? React.createElement(
                    "div",
                    { style: { fontSize: 12, color: "var(--ant-color-text-secondary, #888)" } },
                    deviceSummary,
                  )
                : null,
            )
          : React.createElement(
              Space,
              { direction: "vertical", size: 6, style: { width: "100%" } },
              React.createElement(
                Text,
                { type: error ? "danger" : "secondary", style: { fontSize: 12 } },
                error || (zh ? "当前会话无活跃 SSH 连接。" : "No active SSH connection for this chat."),
              ),
              health?.reconnect_available
                ? React.createElement(
                    Button,
                    { type: "primary", size: "small", loading: reconnecting, onClick: handleReconnect },
                    zh ? "重新连接" : "Reconnect",
                  )
                : null,
            ),
        React.createElement(
          "div",
          { style: { borderTop: `1px solid ${theme.border}`, paddingTop: 8 } },
          React.createElement(Text, { strong: true }, zh ? "已保存设备" : "Saved Devices"),
        ),
        profiles.length === 0
          ? React.createElement(
              Text,
              { type: "secondary", style: { fontSize: 12 } },
              "No saved devices. Add one from Remote SSH.",
            )
          : React.createElement(
              Space,
              { direction: "vertical", size: 6, style: { width: "100%" } },
              ...profiles.map((profile: any) => {
                const active = profile.id === activeProfileId;
                return React.createElement(
                  "div",
                  {
                    key: profile.id,
                    style: {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    },
                  },
                  React.createElement(
                    "div",
                    { style: { flex: 1, minWidth: 0, overflow: "hidden" } },
                    React.createElement(
                      "div",
                      {
                        title:
                          profile.name ||
                          `${profile.username}@${profile.host}`,
                        style: {
                          color: theme.text,
                          fontSize: 14,
                          fontWeight: active ? 600 : 500,
                          lineHeight: "20px",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        },
                      },
                      profile.name || `${profile.username}@${profile.host}`,
                    ),
                    React.createElement(
                      "div",
                      {
                        title: `${profile.username}@${profile.host}:${profile.port}`,
                        style: {
                          color: theme.secondaryText,
                          fontSize: 12,
                          lineHeight: "18px",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        },
                      },
                      `${profile.username}@${profile.host}:${profile.port}`,
                    ),
                    profile.jump_host_name
                      ? React.createElement(
                          "div",
                          {
                            title: `via ${profile.jump_host_name}`,
                            style: {
                              color: theme.secondaryText,
                              fontSize: 12,
                              lineHeight: "18px",
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            },
                          },
                          `via ${profile.jump_host_name}`,
                        )
                      : null,
                  ),
                  React.createElement(
                    Button,
                    {
                      size: "small",
                      type: active ? "default" : "primary",
                      danger: active,
                      loading: connectingId === profile.id,
                      onClick: () => handleProfileClick(profile),
                    },
                    active ? "Disconnect" : "Connect",
                  ),
                );
              }),
            ),
      ),
    );

    return React.createElement(
      Popover,
      {
        content,
        trigger: "click",
        placement: "bottom",
      },
      React.createElement(Tooltip, {
        title: isConnected
          ? `${connection.username}@${connection.host}:${connection.port}`
          : "No active SSH connection",
      }, trigger),
    );
  }

  function registerHeaderStatus() {
    const qwenpaw = (window as any).QwenPaw;
    const slot = qwenpaw?.slot;
    if (typeof slot?.fill === "function") {
      try {
        slot.fill(
          "remote",
          "header.left",
          () => React.createElement(RemoteStatusIndicator),
          { id: "remote-ssh-status", order: 15 },
        );
        console.log("[Remote] Registered header status via QwenPaw.slot.fill");
        return true;
      } catch (e) {
        console.debug("[Remote] QwenPaw.slot.fill failed:", e);
      }
    }

    const item = {
      id: "remote-ssh-status",
      key: "remote-ssh-status",
      pluginId: "remote",
      label: "Remote SSH",
      component: RemoteStatusIndicator,
      priority: 15,
      placement: "left",
    };

    const candidates: Array<[string, any[]]> = [
      ["registerHeaderWidget", [item]],
      ["registerTopBarItem", [item]],
      ["registerNavWidget", [item]],
      ["registerNavbarItem", [item]],
      ["registerToolbarItem", [item]],
      ["registerStatusWidget", [item]],
      ["registerSlot", ["header:left", item]],
      ["registerSlot", ["topbar:left", item]],
      ["registerSlot", ["toolbar:left", item]],
      ["registerSlot", ["navbar:left", item]],
    ];

    for (const [name, args] of candidates) {
      const register = qwenpaw?.[name];
      if (typeof register !== "function") continue;
      try {
        register.apply(qwenpaw, args);
        console.log(`[Remote] Registered header widget via ${name}`);
        return true;
      } catch (e) {
        console.debug(`[Remote] ${name} failed:`, e);
      }
    }

    console.debug(
      "[Remote] No QwenPaw header extension API found; will use DOM fallback.",
    );
    return false;
  }

  function findHeaderMountContainer(): HTMLElement | null {
    const selectors = [
      "[data-qwenpaw-header]",
      "[data-qwenpaw-topbar]",
      "[data-app-header]",
      ".qwenpaw-header",
      ".qwenpaw-topbar",
      ".app-header",
      ".topbar",
      ".top-bar",
      ".navbar",
      ".nav-bar",
      ".ant-layout-header",
      "header",
      "nav",
    ];

    for (const selector of selectors) {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(selector),
      );
      for (const candidate of candidates) {
        const rect = candidate.getBoundingClientRect();
        if (
          rect.top >= 0 &&
          rect.top < 120 &&
          rect.width >= 320 &&
          rect.height >= 32 &&
          rect.height <= 120
        ) {
          return candidate;
        }
      }
    }

    // Web 端备选策略：查找最顶部的 flex 容器
    const topContainers = Array.from(
      document.querySelectorAll<HTMLElement>("div[style*='flex'],div[class*='flex']"),
    )
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        if (
          rect.top < -50 ||
          rect.top >= 100 ||
          rect.width < 480 ||
          rect.height < 40 ||
          rect.height > 120
        ) {
          return false;
        }
        const style = window.getComputedStyle(el);
        return (
          style.display === "flex" ||
          style.display === "grid" ||
          style.alignItems === "center"
        );
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return ar.top - br.top || ar.height - br.height;
      });

    return topContainers[0] || null;
  }

  function mountHeaderStatusFallback() {
    const existingFallback = document.getElementById(
      "remote-ssh-header-status",
    );
    if (
      existingFallback &&
      existingFallback.dataset.remoteBuild !== REMOTE_PLUGIN_BUILD_ID
    ) {
      existingFallback.remove();
    }

    const existing =
      document.getElementById("remote-ssh-header-status") ||
      document.getElementById("remote-ssh-header-status-react");
    if (existing) return true;

    const headerLabels = [
      "文档资料",
      "Docs",
      "Documentation",
      "GitHub",
      "代码",
      "Code",
    ];
    const matched = Array.from(
      document.querySelectorAll<HTMLElement>(
        "button,a,[role='button'],span,div",
      ),
    ).filter((el) => {
      const text = (el.textContent || "").trim();
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.top < 96 &&
        rect.width > 0 &&
        rect.width < 320 &&
        rect.height > 0 &&
        headerLabels.some((label) => text.includes(label))
      );
    });
    const targets = Array.from(
      new Set(
        matched.map(
          (el) =>
            (el.closest("button,a,[role='button']") as HTMLElement | null) ||
            el,
        ),
      ),
    ).sort((a, b) => {
      const score = (el: HTMLElement) => {
        const text = (el.textContent || "").trim();
        const rect = el.getBoundingClientRect();
        const exact = headerLabels.includes(text);
        return (exact ? 0 : 10000) + rect.width * rect.height;
      };
      return score(a) - score(b);
    });
    const target = targets[0];
    const parent = target?.parentElement || findHeaderMountContainer();
    if (!parent) {
      console.warn("[Remote] Header DOM mount point not found.");
      return false;
    }

    const root = document.createElement("div");
    root.id = "remote-ssh-header-status";
    root.dataset.remoteBuild = REMOTE_PLUGIN_BUILD_ID;
    root.style.display = "inline-flex";
    root.style.alignItems = "center";
    root.style.flex = "0 0 auto";
    root.style.minWidth = "156px";
    root.style.margin = "0 8px";

    const button = document.createElement("button");
    button.type = "button";
    button.style.height = "38px";
    button.style.minWidth = "156px";
    button.style.maxWidth = "220px";
    button.style.padding = "0 12px";
    button.style.display = "inline-flex";
    button.style.flex = "0 0 auto";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.gap = "8px";
    button.style.border = `1px solid ${theme.border}`;
    button.style.borderRadius = "6px";
    button.style.background = theme.bgContainer;
    button.style.color = theme.text;
    button.style.font = "inherit";
    button.style.cursor = "pointer";
    button.style.whiteSpace = "nowrap";

    const dot = document.createElement("span");
    dot.style.width = "8px";
    dot.style.height = "8px";
    dot.style.borderRadius = "50%";
    dot.style.background = theme.secondaryText;
    dot.style.flex = "0 0 auto";

    const label = document.createElement("span");
    label.textContent = "SSH Offline";
    label.style.minWidth = "0";
    label.style.overflow = "hidden";
    label.style.textOverflow = "ellipsis";
    label.style.fontSize = "14px";
    label.style.fontWeight = "600";

    const panel = document.createElement("div");
    panel.style.position = "fixed";
    panel.style.zIndex = "10000";
    panel.style.width = "320px";
    panel.style.padding = "12px";
    panel.style.border = `1px solid ${theme.border}`;
    panel.style.borderRadius = "8px";
    panel.style.background = theme.bgElevated;
    panel.style.color = theme.text;
    panel.style.boxShadow = theme.shadow;
    panel.style.display = "none";

    const panelTitle = document.createElement("div");
    panelTitle.style.fontWeight = "600";
    panelTitle.style.marginBottom = "8px";

    const panelBody = document.createElement("div");
    panelBody.style.fontSize = "12px";
    panelBody.style.color = theme.secondaryText;
    panelBody.style.wordBreak = "break-all";

    const profileTitle = document.createElement("div");
    profileTitle.textContent = "Saved Devices";
    profileTitle.style.marginTop = "10px";
    profileTitle.style.paddingTop = "10px";
    profileTitle.style.borderTop = `1px solid ${theme.border}`;
    profileTitle.style.fontWeight = "600";

    const profileList = document.createElement("div");
    profileList.style.display = "flex";
    profileList.style.flexDirection = "column";
    profileList.style.gap = "6px";
    profileList.style.marginTop = "8px";

    const disconnect = document.createElement("button");
    disconnect.type = "button";
    disconnect.textContent = "Disconnect";
    disconnect.style.marginTop = "10px";
    disconnect.style.height = "28px";
    disconnect.style.padding = "0 10px";
    disconnect.style.border = `1px solid ${theme.errorBorder}`;
    disconnect.style.borderRadius = "4px";
    disconnect.style.background = theme.bgElevated;
    disconnect.style.color = theme.error;
    disconnect.style.cursor = "pointer";
    disconnect.style.display = "none";

    panel.append(panelTitle, panelBody, disconnect, profileTitle, profileList);
    button.append(dot, label);
    root.append(button, panel);
    if (target && target.parentElement === parent) {
      parent.insertBefore(root, target);
    } else {
      parent.appendChild(root);
    }

    const ensureVisibleMount = () => {
      const rootRect = root.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      if (rootRect.width >= 120 && buttonRect.width >= 120) return;

      document.body.appendChild(root);
      root.style.position = "fixed";
      root.style.top = "12px";
      root.style.right = "156px";
      root.style.zIndex = "10000";
      root.style.margin = "0";
      root.style.minWidth = "156px";
      console.debug("[Remote] Header status moved to fixed fallback mount.");
    };

    window.setTimeout(ensureVisibleMount, 50);
    window.setTimeout(ensureVisibleMount, 1000);

    let currentConnection: any = null;

    const renderProfiles = (profiles: any[], activeProfileId: string) => {
      profileList.replaceChildren();

      if (profiles.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "No saved devices. Add one from Remote SSH.";
        empty.style.color = theme.secondaryText;
        empty.style.fontSize = "12px";
        profileList.append(empty);
        return;
      }

      for (const profile of profiles) {
        const active = profile.id === activeProfileId;
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.justifyContent = "space-between";
        row.style.gap = "8px";

        const info = document.createElement("div");
        info.style.flex = "1";
        info.style.minWidth = "0";
        info.style.overflow = "hidden";

        const name = document.createElement("div");
        name.textContent =
          profile.name || `${profile.username}@${profile.host}`;
        name.title = name.textContent;
        name.style.color = theme.text;
        name.style.fontSize = "14px";
        name.style.fontWeight = active ? "600" : "500";
        name.style.lineHeight = "20px";
        name.style.maxWidth = "200px";
        name.style.overflow = "hidden";
        name.style.textOverflow = "ellipsis";
        name.style.whiteSpace = "nowrap";

        const endpoint = document.createElement("div");
        endpoint.textContent = `${profile.username}@${profile.host}:${profile.port}`;
        endpoint.title = endpoint.textContent;
        endpoint.style.color = theme.secondaryText;
        endpoint.style.fontSize = "12px";
        endpoint.style.lineHeight = "18px";
        endpoint.style.maxWidth = "200px";
        endpoint.style.overflow = "hidden";
        endpoint.style.textOverflow = "ellipsis";
        endpoint.style.whiteSpace = "nowrap";

        const via = document.createElement("div");
        via.textContent = profile.jump_host_name
          ? `via ${profile.jump_host_name}`
          : "";
        via.title = via.textContent;
        via.style.color = theme.secondaryText;
        via.style.fontSize = "12px";
        via.style.lineHeight = "18px";
        via.style.maxWidth = "200px";
        via.style.overflow = "hidden";
        via.style.textOverflow = "ellipsis";
        via.style.whiteSpace = "nowrap";
        via.style.display = profile.jump_host_name ? "" : "none";

        const action = document.createElement("button");
        action.type = "button";
        action.textContent = active ? "Disconnect" : "Connect";
        action.style.height = "28px";
        action.style.padding = "0 10px";
        action.style.border = active
          ? `1px solid ${theme.errorBorder}`
          : `1px solid ${theme.primary}`;
        action.style.borderRadius = "4px";
        action.style.background = active ? theme.bgElevated : theme.primary;
        action.style.color = active ? theme.error : theme.primaryText;
        action.style.cursor = "pointer";
        action.addEventListener("click", async () => {
          const sessionId = getSessionId();
          if (!sessionId) {
            antdMessage.error("No active session. Open a chat first.");
            return;
          }

          action.disabled = true;
          action.textContent = active ? "Disconnecting" : "Connecting";
          try {
            if (active) {
              await apiFetch(`/remote/connections/${sessionId}`, {
                method: "DELETE",
              });
              antdMessage.success("Disconnected");
            } else {
              await apiFetch(`/remote/profiles/${profile.id}/connect`, {
                method: "POST",
                body: JSON.stringify({ session_id: sessionId }),
              });
              antdMessage.success(`Connected to ${profile.name}`);
            }
            await refresh();
          } catch (e: any) {
            antdMessage.error(
              `${active ? "Disconnect" : "Connection"} failed: ${e.message}`,
            );
          } finally {
            action.disabled = false;
          }
        });

        info.append(name, endpoint, via);
        row.append(info, action);
        profileList.append(row);
      }
    };

    const render = (
      connection: any,
      profiles: any[] = [],
      activeProfileId = "",
      error = "",
    ) => {
      currentConnection = connection;
      if (connection) {
        const host = `${connection.username}@${connection.host}:${connection.port}`;
        button.style.borderColor = theme.successBorder;
        button.style.background = theme.successBg;
        button.style.color = theme.success;
        dot.style.background = theme.success;
        label.textContent = `${connection.username}@${connection.host}`;
        button.title = host;
        panelTitle.textContent = "SSH Connected";
        panelBody.textContent = `${host}\nUptime: ${Math.round(
          connection.uptime_seconds || 0,
        )}s\nWork Dir: ${connection.default_cwd || "/"}`;
        panelBody.style.whiteSpace = "pre-line";
        disconnect.style.display = "";
      } else {
        button.style.borderColor = error ? theme.errorBorder : theme.border;
        button.style.background = error ? theme.errorBg : theme.bgContainer;
        button.style.color = error ? theme.error : theme.text;
        dot.style.background = error ? theme.error : theme.secondaryText;
        label.textContent = error ? "SSH Error" : "SSH Offline";
        button.title = error || "No active SSH connection";
        panelTitle.textContent = error ? "SSH Status Error" : "SSH Offline";
        panelBody.textContent =
          error || "No active SSH connection for this chat.";
        panelBody.style.whiteSpace = "normal";
        disconnect.style.display = "none";
      }
      renderProfiles(profiles, activeProfileId);
    };

    const refresh = async () => {
      try {
        const sessionId = getSessionId() || "";
        const encodedSessionId = encodeURIComponent(sessionId);
        const [connectionData, profileData] = await Promise.all([
          apiFetch(`/remote/connections?session_id=${encodedSessionId}`),
          apiFetch(`/remote/profiles?session_id=${encodedSessionId}`),
        ]);
        const conns = connectionData.connections || [];
        render(
          conns.length > 0 ? conns[0] : null,
          profileData.profiles || [],
          profileData.active_profile_id || "",
        );
      } catch (e: any) {
        render(null, [], "", e.message || "Failed to load SSH status.");
      }
    };

    const placePanel = () => {
      const rect = button.getBoundingClientRect();
      panel.style.top = `${rect.bottom + 8}px`;
      panel.style.left = `${Math.min(
        rect.left,
        window.innerWidth - 340,
      )}px`;
    };

    button.addEventListener("click", () => {
      placePanel();
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
    document.addEventListener("click", (event) => {
      if (!root.contains(event.target as Node)) panel.style.display = "none";
    });
    disconnect.addEventListener("click", async () => {
      const sessionId = getSessionId();
      if (!sessionId || !currentConnection) return;
      try {
        await apiFetch(`/remote/connections/${sessionId}`, {
          method: "DELETE",
        });
        antdMessage.success("Disconnected");
        await refresh();
      } catch (e: any) {
        antdMessage.error(`Disconnect failed: ${e.message}`);
      }
    });

    refresh();
    window.setInterval(refresh, 5000);
    return true;
  }

  function mountHeaderStatusFallbackWhenReady() {
    if (mountHeaderStatusFallback()) return;

    let attempts = 0;
    const maxAttempts = 40;
    let observer: MutationObserver | null = null;

    const tryMount = () => {
      attempts += 1;
      if (mountHeaderStatusFallback()) {
        observer?.disconnect();
        window.clearInterval(timer);
        return;
      }

      if (attempts >= maxAttempts) {
        observer?.disconnect();
        window.clearInterval(timer);
      }
    };

    const timer = window.setInterval(tryMount, 250);
    observer = new MutationObserver(tryMount);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function warnIfRemotePageLooksCached() {
    const text = document.body?.textContent || "";
    if (!text.includes("Remote SSH")) return;
    if (text.includes("Jump Hosts") || text.includes("New Jump Host")) return;
    console.warn(
      "[Remote] Remote SSH page is missing Jump Hosts UI. " +
        "The web host may still be serving a cached older frontend bundle.",
    );
  }

  // ── Register plugin ──────────────────────────────────────────────────

  (window as any).QwenPaw.registerToolRender?.("remote", {
    remote_connect: RemoteConnectRender,
    remote_disconnect: RemoteDisconnectRender,
    remote_list: RemoteListRender,
    remote_exec: RemoteExecRender,
    remote_reconnect: RemoteReconnectRender,
    remote_info: RemoteInfoRender,
    remote_health: RemoteHealthRender,
    remote_set_cwd: RemoteSetCwdRender,
    remote_sudo: RemoteSudoRender,
  });

  const remoteRoute = {
    id: "remote",
    key: "remote",
    pluginId: "remote",
    path: "/remote",
    component: RemotePage,
    label: "Remote SSH",
    title: "Remote SSH",
    name: "Remote SSH",
    icon: "\u{1F517}",
    priority: 20,
  };

  function registerRemotePage() {
    const qwenpaw = (window as any).QwenPaw;
    const legacyRouteId = "legacy:remote:remote";
    const sdkRouteId = "remote.main";
    let triedLegacyRoute = false;

    if (typeof qwenpaw?.registerRoutes === "function") {
      try {
        triedLegacyRoute = true;
        qwenpaw.registerRoutes("remote", [remoteRoute]);
        console.log("[Remote] Registered page via legacy registerRoutes");
      } catch (e) {
        console.debug("[Remote] registerRoutes failed:", e);
      }
    }

    if (triedLegacyRoute && typeof qwenpaw?.route?.replace === "function") {
      try {
        qwenpaw.route.replace("remote", legacyRouteId, RemotePage);
        console.log("[Remote] Replaced legacy route via QwenPaw.route.replace");
        return true;
      } catch (e) {
        console.debug("[Remote] QwenPaw.route.replace legacy failed:", e);
      }
    }

    if (typeof qwenpaw?.route?.add === "function") {
      try {
        qwenpaw.route.add("remote", {
          id: sdkRouteId,
          path: remoteRoute.path,
          component: RemotePage,
        });
        qwenpaw.menu?.add?.("remote", {
          id: "remote.main",
          location: "primary.settings",
          parentId: "plugins-group",
          label: remoteRoute.label,
          icon: remoteRoute.icon,
          route: sdkRouteId,
          order: remoteRoute.priority,
        });
        console.log("[Remote] Registered page via QwenPaw.route/menu SDK");
        return true;
      } catch (e) {
        console.debug("[Remote] QwenPaw.route/menu SDK failed:", e);
      }
    }

    const candidates: Array<[string, any[]]> = [
      ["registerRoute", ["remote", remoteRoute]],
      ["registerRoute", [remoteRoute]],
      ["registerPage", ["remote", remoteRoute]],
      ["registerPage", [remoteRoute]],
      ["registerPluginPage", ["remote", remoteRoute]],
      ["registerPluginPage", [remoteRoute]],
      ["registerMenuItem", [remoteRoute]],
      ["registerNavigationItem", [remoteRoute]],
      ["registerNavItem", [remoteRoute]],
    ];

    for (const [name, args] of candidates) {
      const register = qwenpaw?.[name];
      if (typeof register !== "function") continue;
      try {
        register.apply(qwenpaw, args);
        console.log(`[Remote] Registered page via ${name}`);
        return true;
      } catch (e) {
        console.debug(`[Remote] ${name} failed:`, e);
      }
    }

    console.warn("[Remote] No QwenPaw page registration API found.");
    return false;
  }

  registerRemotePage();

  window.setTimeout(warnIfRemotePageLooksCached, 1000);
  window.setTimeout(warnIfRemotePageLooksCached, 3000);

  const registeredHeaderStatus = registerHeaderStatus();
  if (!registeredHeaderStatus) {
    mountHeaderStatusFallbackWhenReady();
  } else {
    // 延迟检查是否需要 DOM 回退（某些环境下 API 注册不生效）
    window.setTimeout(() => {
      if (!document.getElementById("remote-ssh-header-status-react")) {
        mountHeaderStatusFallbackWhenReady();
      }
    }, 1000);
  }
}

// Auto-initialize when loaded
function isQwenPawHostReady() {
  const host = (window as any).QwenPaw?.host;
  return Boolean(
    host?.React &&
      host?.antd &&
      host?.getApiUrl &&
      host?.getApiToken,
  );
}

function initializeWhenReady() {
  if (isQwenPawHostReady()) {
    buildPlugin();
    return;
  }

  let attempts = 0;
  const maxAttempts = 120;
  let observer: MutationObserver | null = null;

  const tryInitialize = () => {
    attempts += 1;
    if (isQwenPawHostReady()) {
      observer?.disconnect();
      window.clearInterval(timer);
      buildPlugin();
      return;
    }

    if (attempts >= maxAttempts) {
      observer?.disconnect();
      window.clearInterval(timer);
      console.warn("[Remote] QwenPaw.host not available, plugin not loaded");
    }
  };

  const timer = window.setInterval(tryInitialize, 250);
  if (document.body) {
    observer = new MutationObserver(tryInitialize);
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

initializeWhenReady();
