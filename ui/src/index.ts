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
    Descriptions,
    Spin,
    Alert,
    Switch,
    message: antdMessage,
    List,
    Badge,
    Popconfirm,
    Empty,
    Tooltip,
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
    LoadingOutlined,
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
        await apiFetch("/remote/profiles", {
          method: "POST",
          body: JSON.stringify(values),
        });
        antdMessage.success("Connection profile saved");
        setModalOpen(false);
        form.resetFields();
        fetchProfiles();
      } catch (e: any) {
        antdMessage.error(`Save failed: ${e.message}`);
      } finally {
        setSaving(false);
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
              onClick: () => setModalOpen(true),
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
          title: "New SSH Connection",
          open: modalOpen,
          onCancel: () => {
            setModalOpen(false);
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
              placeholder: "Leave empty if using key auth",
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
              placeholder: "If key is encrypted",
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
              "Save Profile",
            ),
          ),
        ),
      ),
    );
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
}

// Auto-initialize when loaded
if ((window as any).QwenPaw?.host) {
  buildPlugin();
} else {
  console.warn("[Remote] QwenPaw.host not available, plugin not loaded");
}
