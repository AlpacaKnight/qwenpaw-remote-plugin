/**
 * Remote SSH frontend plugin for QwenPaw
 *
 * Registers:
 * - Tool renderers for remote_connect, remote_disconnect, remote_list, remote_exec
 * - Remote SSH profile management page
 *
 * Uses window.QwenPaw plugin API
 */

function buildPlugin() {
  const { React, antd, antdIcons, getApiUrl, getApiToken } = (window as any)
    .QwenPaw.host;
  const {
    Card,
    Tag,
    Typography,
    Space,
    Button,
    Input,
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
  } = antdIcons || {};

  // ── Helpers ──────────────────────────────────────────────────────────

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

  function getSessionId(): string | null {
    return (window as any).currentSessionId ?? null;
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

  // ── Remote Management Page ──────────────────────────────────────────

  function RemotePage() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const [connectingId, setConnectingId] = useState<string | null>(null);
    const [form] = Form.useForm();

    const fetchProfiles = useCallback(async () => {
      setLoading(true);
      try {
        const sessionId = getSessionId() || "";
        const data = await apiFetch(
          `/remote/profiles?session_id=${encodeURIComponent(sessionId)}`,
        );
        setProfiles(data.profiles || []);
        setActiveProfileId(data.active_profile_id || "");
      } catch (e: any) {
        console.error("[Remote] Failed to fetch profiles:", e);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchProfiles();
      const interval = setInterval(fetchProfiles, 10000);
      return () => clearInterval(interval);
    }, [fetchProfiles]);

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
        fetchProfiles();
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
      });
      setModalOpen(true);
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
          fetchProfiles();
        } catch (e: any) {
          antdMessage.error(`Disconnect failed: ${e.message}`);
        }
      } else {
        // Connect
        setConnectingId(profile.id);
        try {
          await apiFetch(`/remote/profiles/${profile.id}/connect`, {
            method: "POST",
            body: JSON.stringify({ session_id: sessionId }),
          });
          antdMessage.success(`Connected to ${profile.name}`);
          fetchProfiles();
        } catch (e: any) {
          antdMessage.error(`Connection failed: ${e.message}`);
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
        fetchProfiles();
      } catch (e: any) {
        antdMessage.error(`Delete failed: ${e.message}`);
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
          "Remote SSH",
        ),
        React.createElement(
          Space,
          null,
          React.createElement(
            Button,
            { icon: React.createElement(ReloadOutlined), onClick: fetchProfiles },
            "Refresh",
          ),
          React.createElement(
            Button,
            {
              type: "primary",
              icon: React.createElement(PlusOutlined),
              onClick: openNewProfileModal,
            },
            "New Connection",
          ),
        ),
      ),
      // Info alert
      React.createElement(Alert, {
        type: "info",
        showIcon: true,
        style: { marginBottom: 16 },
        message:
          "Save connection profiles here. Toggle the switch to connect/disconnect. " +
          "Only one connection can be active at a time. " +
          "When connected, all shell commands in the current chat execute on the remote machine.",
      }),
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
                    "No saved connections. Click 'New Connection' to add one.",
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
                                "Connected",
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
                              ? `  |  Key: ${profile.key_path}`
                              : "",
                          ),
                        ),
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
                                  ? "Disconnect"
                                  : "Connect to this device",
                              },
                              React.createElement(Switch, {
                                checked: connected,
                                onChange: () => handleToggleConnect(profile),
                                checkedChildren: "ON",
                                unCheckedChildren: "OFF",
                              }),
                            ),
                        React.createElement(
                          Tooltip,
                          { title: "Edit this connection profile" },
                          React.createElement(Button, {
                            type: "text",
                            size: "small",
                            icon: React.createElement(EditOutlined),
                            onClick: () => openEditProfileModal(profile),
                          }),
                        ),
                        React.createElement(
                          Popconfirm,
                          {
                            title: "Delete this connection profile?",
                            onConfirm: () => handleDelete(profile.id),
                            okText: "Delete",
                            cancelText: "Cancel",
                            okButtonProps: { danger: true },
                          },
                          React.createElement(Button, {
                            type: "text",
                            danger: true,
                            size: "small",
                            icon: React.createElement(DeleteOutlined),
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
            ? "Edit SSH Connection"
            : "New SSH Connection",
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
            { name: "name", label: "Display Name" },
            React.createElement(Input, {
              placeholder: "My Server (optional, auto-generated if empty)",
            }),
          ),
          React.createElement(
            Form.Item,
            {
              name: "host",
              label: "Host",
              rules: [{ required: true, message: "Please enter the host" }],
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
                label: "Port",
                initialValue: 22,
                style: { width: 120 },
              },
              React.createElement(Input, { type: "number" }),
            ),
            React.createElement(
              Form.Item,
              {
                name: "username",
                label: "Username",
                initialValue: "root",
                style: { flex: 1 },
              },
              React.createElement(Input),
            ),
          ),
          React.createElement(
            Form.Item,
            { name: "password", label: "Password" },
            React.createElement(Input.Password, {
              placeholder: editingProfile
                ? "Leave empty to keep the saved password"
                : "Leave empty if using key auth",
            }),
          ),
          React.createElement(
            Form.Item,
            { name: "key_path", label: "SSH Key Path" },
            React.createElement(Input, {
              placeholder: "/home/user/.ssh/id_rsa (optional)",
            }),
          ),
          React.createElement(
            Form.Item,
            { name: "passphrase", label: "Key Passphrase" },
            React.createElement(Input.Password, {
              placeholder: editingProfile
                ? "Leave empty to keep the saved passphrase"
                : "If key is encrypted",
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
                loading: saving,
                style: { width: "100%" },
              },
              editingProfile ? "Update Profile" : "Save Profile",
            ),
          ),
        ),
      ),
    );
  }

  // ── Header SSH Status Indicator ──────────────────────────────────────

  function RemoteStatusIndicator() {
    const [connection, setConnection] = useState<any>(null);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string>("");
    const [connectingId, setConnectingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");

    const fetchStatus = useCallback(async () => {
      try {
        setLoading(true);
        setError("");
        const sessionId = getSessionId() || "";
        const encodedSessionId = encodeURIComponent(sessionId);
        const [connectionData, profileData] = await Promise.all([
          apiFetch(`/remote/connections?session_id=${encodedSessionId}`),
          apiFetch(`/remote/profiles?session_id=${encodedSessionId}`),
        ]);
        const conns = connectionData.connections || [];
        setConnection(conns.length > 0 ? conns[0] : null);
        setProfiles(profileData.profiles || []);
        setActiveProfileId(profileData.active_profile_id || "");
      } catch (e: any) {
        setError(e.message);
        setConnection(null);
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
        antdMessage.success("Disconnected");
        fetchStatus();
      } catch (e: any) {
        antdMessage.error(`Disconnect failed: ${e.message}`);
      }
    };

    const handleProfileClick = async (profile: any) => {
      const sessionId = getSessionId();
      if (!sessionId) {
        antdMessage.error("No active session. Open a chat first.");
        return;
      }

      const isActive = profile.id === activeProfileId;
      setConnectingId(profile.id);
      try {
        if (isActive) {
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
        fetchStatus();
      } catch (e: any) {
        antdMessage.error(
          `${isActive ? "Disconnect" : "Connection"} failed: ${e.message}`,
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

    const trigger = React.createElement(
      "button",
      {
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
          border: `1px solid ${isConnected ? "#b7eb8f" : "#d9d9d9"}`,
          borderRadius: 6,
          background: isConnected ? "#f6ffed" : "#fff",
          color: isConnected ? "#237804" : "#595959",
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
                React.createElement(Text, { strong: true }, "SSH Connected"),
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
            )
          : React.createElement(
              Text,
              { type: error ? "danger" : "secondary", style: { fontSize: 12 } },
              error || "No active SSH connection for this chat.",
            ),
        React.createElement(
          "div",
          { style: { borderTop: "1px solid #f0f0f0", paddingTop: 8 } },
          React.createElement(Text, { strong: true }, "Saved Devices"),
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
                    { style: { minWidth: 0 } },
                    React.createElement(
                      Text,
                      { strong: active, ellipsis: true, style: { maxWidth: 190 } },
                      profile.name || `${profile.username}@${profile.host}`,
                    ),
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        Text,
                        {
                          type: "secondary",
                          ellipsis: true,
                          style: { maxWidth: 190, fontSize: 12 },
                        },
                        `${profile.username}@${profile.host}:${profile.port}`,
                      ),
                    ),
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
    ];

    for (const [name, args] of candidates) {
      const register = qwenpaw?.[name];
      if (typeof register !== "function") continue;
      try {
        register.apply(qwenpaw, args);
        return true;
      } catch (e) {
        console.warn(`[Remote] ${name} failed:`, e);
      }
    }

    console.warn(
      "[Remote] No QwenPaw header extension API found; SSH status indicator was not registered.",
    );
    return false;
  }

  function mountHeaderStatusFallback() {
    const existing = document.getElementById("remote-ssh-header-status");
    if (existing) return true;

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
        (text.includes("文档资料") ||
          text.includes("GitHub") ||
          text.includes("代码"))
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
        const exact =
          text === "文档资料" || text === "GitHub" || text === "代码";
        return (exact ? 0 : 10000) + rect.width * rect.height;
      };
      return score(a) - score(b);
    });
    const target = targets[0];
    const parent = target?.parentElement;
    if (!target || !parent) {
      console.warn("[Remote] Header DOM mount point not found.");
      return false;
    }

    const root = document.createElement("div");
    root.id = "remote-ssh-header-status";
    root.style.display = "inline-flex";
    root.style.alignItems = "center";
    root.style.margin = "0 8px";

    const button = document.createElement("button");
    button.type = "button";
    button.style.height = "38px";
    button.style.minWidth = "156px";
    button.style.maxWidth = "220px";
    button.style.padding = "0 12px";
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.gap = "8px";
    button.style.border = "1px solid #d9d9d9";
    button.style.borderRadius = "6px";
    button.style.background = "#fff";
    button.style.color = "#595959";
    button.style.font = "inherit";
    button.style.cursor = "pointer";
    button.style.whiteSpace = "nowrap";

    const dot = document.createElement("span");
    dot.style.width = "8px";
    dot.style.height = "8px";
    dot.style.borderRadius = "50%";
    dot.style.background = "#bfbfbf";
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
    panel.style.border = "1px solid #d9d9d9";
    panel.style.borderRadius = "8px";
    panel.style.background = "#fff";
    panel.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
    panel.style.display = "none";

    const panelTitle = document.createElement("div");
    panelTitle.style.fontWeight = "600";
    panelTitle.style.marginBottom = "8px";

    const panelBody = document.createElement("div");
    panelBody.style.fontSize = "12px";
    panelBody.style.color = "#595959";
    panelBody.style.wordBreak = "break-all";

    const profileTitle = document.createElement("div");
    profileTitle.textContent = "Saved Devices";
    profileTitle.style.marginTop = "10px";
    profileTitle.style.paddingTop = "10px";
    profileTitle.style.borderTop = "1px solid #f0f0f0";
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
    disconnect.style.border = "1px solid #ffccc7";
    disconnect.style.borderRadius = "4px";
    disconnect.style.background = "#fff";
    disconnect.style.color = "#cf1322";
    disconnect.style.cursor = "pointer";
    disconnect.style.display = "none";

    panel.append(panelTitle, panelBody, disconnect, profileTitle, profileList);
    button.append(dot, label);
    root.append(button, panel);
    parent.insertBefore(root, target);

    let currentConnection: any = null;

    const renderProfiles = (profiles: any[], activeProfileId: string) => {
      profileList.replaceChildren();

      if (profiles.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "No saved devices. Add one from Remote SSH.";
        empty.style.color = "#8c8c8c";
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
        info.style.minWidth = "0";

        const name = document.createElement("div");
        name.textContent =
          profile.name || `${profile.username}@${profile.host}`;
        name.style.fontWeight = active ? "600" : "400";
        name.style.overflow = "hidden";
        name.style.textOverflow = "ellipsis";
        name.style.whiteSpace = "nowrap";

        const endpoint = document.createElement("div");
        endpoint.textContent = `${profile.username}@${profile.host}:${profile.port}`;
        endpoint.style.color = "#8c8c8c";
        endpoint.style.fontSize = "12px";
        endpoint.style.overflow = "hidden";
        endpoint.style.textOverflow = "ellipsis";
        endpoint.style.whiteSpace = "nowrap";

        const action = document.createElement("button");
        action.type = "button";
        action.textContent = active ? "Disconnect" : "Connect";
        action.style.height = "28px";
        action.style.padding = "0 10px";
        action.style.border = active
          ? "1px solid #ffccc7"
          : "1px solid #1677ff";
        action.style.borderRadius = "4px";
        action.style.background = active ? "#fff" : "#1677ff";
        action.style.color = active ? "#cf1322" : "#fff";
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

        info.append(name, endpoint);
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
        button.style.borderColor = "#b7eb8f";
        button.style.background = "#f6ffed";
        button.style.color = "#237804";
        dot.style.background = "#52c41a";
        label.textContent = `${connection.username}@${connection.host}`;
        button.title = host;
        panelTitle.textContent = "SSH Connected";
        panelBody.textContent = `${host}\nUptime: ${Math.round(
          connection.uptime_seconds || 0,
        )}s\nWork Dir: ${connection.default_cwd || "/"}`;
        panelBody.style.whiteSpace = "pre-line";
        disconnect.style.display = "";
      } else {
        button.style.borderColor = error ? "#ffccc7" : "#d9d9d9";
        button.style.background = "#fff";
        button.style.color = error ? "#cf1322" : "#595959";
        dot.style.background = error ? "#ff4d4f" : "#bfbfbf";
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

  // ── Register plugin ──────────────────────────────────────────────────

  (window as any).QwenPaw.registerToolRender?.("remote", {
    remote_connect: RemoteConnectRender,
    remote_disconnect: RemoteDisconnectRender,
    remote_list: RemoteListRender,
    remote_exec: RemoteExecRender,
  });

  (window as any).QwenPaw.registerRoutes?.("remote", [
    {
      path: "/remote",
      component: RemotePage,
      label: "Remote SSH",
      icon: "\u{1F517}",
      priority: 20,
    },
  ]);

  if (!registerHeaderStatus()) {
    mountHeaderStatusFallbackWhenReady();
  }
}

// Auto-initialize when loaded
if ((window as any).QwenPaw?.host) {
  buildPlugin();
} else {
  console.warn("[Remote] QwenPaw.host not available, plugin not loaded");
}
