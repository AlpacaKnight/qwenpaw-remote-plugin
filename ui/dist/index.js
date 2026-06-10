const se = "0.1.2-qwenpaw-sdk-cache-bust";
function Te() {
  var Re, Pe;
  const C = window;
  if (C.__remotePluginInitializedBuild === se) return;
  C.__remotePluginInitialized = !0, C.__remotePluginInitializedBuild = se;
  const { React: e, antd: A, antdIcons: ee, getApiUrl: te, getApiToken: He } = window.QwenPaw.host, {
    Card: K,
    Tag: de,
    Typography: De,
    Space: v,
    Button: M,
    Input: B,
    Select: Oe,
    Form: x,
    Modal: me,
    Spin: Be,
    Alert: ue,
    Switch: ze,
    message: E,
    List: pe,
    Badge: re,
    Popconfirm: ye,
    Empty: ae,
    Tooltip: ne,
    Popover: Ne
  } = A, { Text: I, Title: he, Paragraph: Le } = De, { useState: R, useEffect: ge, useCallback: fe } = e, {
    CloudOutlined: Ee,
    LinkOutlined: We,
    DisconnectOutlined: Fe,
    CodeOutlined: Je,
    ReloadOutlined: Ae,
    PlusOutlined: we,
    DeleteOutlined: xe,
    EditOutlined: ve,
    LoadingOutlined: Me,
    LaptopOutlined: je,
    ThunderboltOutlined: Ue
  } = ee || {};
  function V(t, s = "•") {
    return t ? e.createElement(t) : e.createElement("span", null, s);
  }
  function be(t) {
    var u, a;
    const s = (a = (u = t == null ? void 0 : t.content) == null ? void 0 : u[0]) == null ? void 0 : a.data, o = s == null ? void 0 : s.arguments;
    if (typeof o == "string")
      try {
        return JSON.parse(o);
      } catch {
        return {};
      }
    return o ?? {};
  }
  function oe(t) {
    const s = t == null ? void 0 : t.content;
    return !s || !Array.isArray(s) ? "" : s.filter((o) => o.type === "text").map((o) => o.text || "").join(`
`);
  }
  function G() {
    var t;
    try {
      const s = window.currentSessionId || window.sessionId || ((t = localStorage == null ? void 0 : localStorage.getItem) == null ? void 0 : t.call(localStorage, "sessionId"));
      if (s) return s;
    } catch (s) {
      console.debug("[Remote] Error getting sessionId:", s);
    }
    return "default-session";
  }
  async function k(t, s = {}) {
    const o = He(), u = {
      "Content-Type": "application/json",
      ...o ? { Authorization: `Bearer ${o}` } : {},
      ...s.headers || {}
    }, a = await fetch(te(t), { ...s, headers: u });
    if (!a.ok) {
      const g = await a.text();
      throw new Error(`${a.status}: ${g}`);
    }
    return a.json();
  }
  const r = {
    text: "var(--ant-color-text, CanvasText)",
    secondaryText: "var(--ant-color-text-secondary, color-mix(in srgb, CanvasText 62%, transparent))",
    border: "var(--ant-color-border, color-mix(in srgb, CanvasText 18%, transparent))",
    bgContainer: "var(--ant-color-bg-container, Canvas)",
    bgElevated: "var(--ant-color-bg-elevated, var(--ant-color-bg-container, Canvas))",
    success: "var(--ant-color-success, #52c41a)",
    successBorder: "var(--ant-color-success-border, var(--ant-color-success, #52c41a))",
    successBg: "var(--ant-color-success-bg, transparent)",
    error: "var(--ant-color-error, #ff4d4f)",
    errorBorder: "var(--ant-color-error-border, var(--ant-color-error, #ff4d4f))",
    errorBg: "var(--ant-color-error-bg, transparent)",
    primary: "var(--ant-color-primary, #1677ff)",
    primaryText: "var(--ant-color-white, #fff)",
    shadow: "var(--ant-box-shadow-secondary, 0 8px 24px rgba(0, 0, 0, 0.18))"
  };
  function Qe({ data: t }) {
    const s = oe(t), o = be(t), u = s.includes("Connected to"), a = s.includes("Error") || s.includes("failed");
    return e.createElement(
      K,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${u ? "#52c41a" : a ? "#ff4d4f" : "#1890ff"}`
        }
      },
      e.createElement(
        v,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          v,
          null,
          e.createElement(We || "🔗"),
          e.createElement(I, { strong: !0 }, "Remote SSH Connect"),
          o.host ? e.createElement(
            de,
            { color: "blue" },
            `${o.username}@${o.host}:${o.port || 22}`
          ) : null
        ),
        e.createElement(
          I,
          {
            type: a ? "danger" : "success",
            style: { whiteSpace: "pre-wrap" }
          },
          s
        )
      )
    );
  }
  function Ke({ data: t }) {
    const s = oe(t), o = s.includes("Disconnected");
    return e.createElement(
      K,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${o ? "#52c41a" : "#faad14"}`
        }
      },
      e.createElement(
        v,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          v,
          null,
          e.createElement(Fe || "🔌"),
          e.createElement(I, { strong: !0 }, "Remote SSH Disconnect")
        ),
        e.createElement(
          I,
          { style: { whiteSpace: "pre-wrap" } },
          s
        )
      )
    );
  }
  function Ve({ data: t }) {
    const s = oe(t), o = s.includes("Active SSH connection");
    return e.createElement(
      K,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${o ? "#52c41a" : "#d9d9d9"}`
        }
      },
      e.createElement(
        v,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          v,
          null,
          e.createElement(Ee || "☁"),
          e.createElement(I, { strong: !0 }, "Remote SSH Status"),
          o ? e.createElement(re, {
            status: "success",
            text: "Connected"
          }) : e.createElement(re, {
            status: "default",
            text: "Not Connected"
          })
        ),
        e.createElement(
          I,
          { style: { whiteSpace: "pre-wrap" } },
          s
        )
      )
    );
  }
  function Ge({ data: t }) {
    const s = oe(t), o = be(t), u = s.includes("[remote:"), a = s.includes("failed with exit code");
    return e.createElement(
      K,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${a ? "#ff4d4f" : u ? "#722ed1" : "#d9d9d9"}`
        }
      },
      e.createElement(
        v,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          v,
          null,
          e.createElement(Je || ">_"),
          e.createElement(I, { strong: !0 }, "Remote Command"),
          o.command ? e.createElement(
            I,
            { code: !0, ellipsis: !0, style: { maxWidth: 400 } },
            o.command
          ) : null
        ),
        e.createElement(
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
              wordBreak: "break-all"
            }
          },
          s
        )
      )
    );
  }
  function le() {
    const [t, s] = R([]), [o, u] = R([]), [a, g] = R(""), [N, p] = R(!1), [i, w] = R(""), [T, h] = R(!1), [L, D] = R(!1), [f, $] = R(null), [y, U] = R(null), [q, c] = R(!1), [P, J] = R(!1), [Q, l] = R(null), [b] = x.useForm(), [d] = x.useForm(), m = fe(async () => {
      p(!0), w("");
      try {
        const n = G() || "", Z = `/remote/profiles?session_id=${encodeURIComponent(n)}`, X = "/remote/jump-hosts";
        console.log("[Remote] Fetching data from:", Z, X);
        const [ce, ke] = await Promise.all([
          k(Z),
          k(X)
        ]);
        console.log("[Remote] Profiles data:", ce), console.log("[Remote] Jump hosts data:", ke), s(ce.profiles || []), g(ce.active_profile_id || ""), u(ke.jump_hosts || []);
      } catch (n) {
        const S = n.message || String(n);
        console.error("[Remote] Failed to fetch data:", n), w(S), E.error(`Failed to load profiles: ${S}`);
      } finally {
        p(!1);
      }
    }, []);
    ge(() => {
      m();
      const n = setInterval(m, 1e4);
      return () => clearInterval(n);
    }, [m]);
    const _ = async (n) => {
      c(!0);
      try {
        await k(
          f ? `/remote/profiles/${f.id}` : "/remote/profiles",
          {
            method: f ? "PUT" : "POST",
            body: JSON.stringify(n)
          }
        ), E.success(
          f ? "Connection profile updated" : "Connection profile saved"
        ), h(!1), $(null), b.resetFields(), m();
      } catch (S) {
        E.error(`Save failed: ${S.message}`);
      } finally {
        c(!1);
      }
    }, j = () => {
      $(null), b.resetFields(), h(!0);
    }, O = (n) => {
      $(n), b.setFieldsValue({
        name: n.name,
        host: n.host,
        port: n.port,
        username: n.username,
        password: "",
        key_path: n.key_path,
        passphrase: "",
        jump_host_id: n.jump_host_id || ""
      }), h(!0);
    }, F = async (n) => {
      J(!0);
      try {
        await k(
          y ? `/remote/jump-hosts/${y.id}` : "/remote/jump-hosts",
          {
            method: y ? "PUT" : "POST",
            body: JSON.stringify(n)
          }
        ), E.success(
          y ? "Jump host updated" : "Jump host saved"
        ), D(!1), U(null), d.resetFields(), m();
      } catch (S) {
        E.error(`Save jump host failed: ${S.message}`);
      } finally {
        J(!1);
      }
    }, W = () => {
      U(null), d.resetFields(), D(!0);
    }, H = (n) => {
      U(n), d.setFieldsValue({
        name: n.name,
        host: n.host,
        port: n.port,
        username: n.username,
        password: "",
        key_path: n.key_path,
        passphrase: ""
      }), D(!0);
    }, Y = async (n) => {
      try {
        await k(`/remote/jump-hosts/${n}`, {
          method: "DELETE"
        }), E.success("Jump host deleted"), m();
      } catch (S) {
        E.error(`Delete jump host failed: ${S.message}`);
      }
    }, ie = async (n) => {
      const S = G();
      if (!S) {
        E.error("No active session. Open a chat first.");
        return;
      }
      if (n.id === a)
        try {
          await k(`/remote/connections/${S}`, {
            method: "DELETE"
          }), E.success("Disconnected"), m();
        } catch (X) {
          E.error(`Disconnect failed: ${X.message}`);
        }
      else {
        l(n.id);
        try {
          await k(`/remote/profiles/${n.id}/connect`, {
            method: "POST",
            body: JSON.stringify({ session_id: S })
          }), E.success(`Connected to ${n.name}`), m();
        } catch (X) {
          E.error(`Connection failed: ${X.message}`);
        } finally {
          l(null);
        }
      }
    }, Ze = async (n) => {
      try {
        await k(`/remote/profiles/${n}`, {
          method: "DELETE"
        }), E.success("Profile deleted"), m();
      } catch (S) {
        E.error(`Delete failed: ${S.message}`);
      }
    }, et = (n) => n === a;
    return e.createElement(
      "div",
      { style: { padding: 24, maxWidth: 900, margin: "0 auto" } },
      // Header
      e.createElement(
        v,
        {
          style: {
            marginBottom: 16,
            width: "100%",
            justifyContent: "space-between"
          }
        },
        e.createElement(
          he,
          { level: 4, style: { margin: 0 } },
          "Remote SSH"
        ),
        e.createElement(
          v,
          null,
          e.createElement(
            M,
            { icon: V(Ae), onClick: m },
            "Refresh"
          ),
          e.createElement(
            M,
            {
              icon: V(we),
              onClick: W
            },
            "New Jump Host"
          ),
          e.createElement(
            M,
            {
              type: "primary",
              icon: V(we),
              onClick: j
            },
            "New Connection"
          )
        )
      ),
      // Info alert + error alert if any
      e.createElement(ue, {
        type: "info",
        showIcon: !0,
        style: { marginBottom: 16 },
        message: "Save connection profiles here. Toggle the switch to connect/disconnect. Only one connection can be active at a time. When connected, all shell commands in the current chat execute on the remote machine."
      }),
      i ? e.createElement(ue, {
        type: "error",
        showIcon: !0,
        style: { marginBottom: 16 },
        message: "Error loading data",
        description: i
      }) : null,
      e.createElement(
        K,
        {
          size: "small",
          title: "Jump Hosts",
          style: { marginBottom: 16 }
        },
        o.length === 0 ? e.createElement(
          ae,
          {
            image: ae.PRESENTED_IMAGE_SIMPLE,
            description: "No saved jump hosts."
          }
        ) : e.createElement(
          pe,
          {
            dataSource: o,
            renderItem: (n) => e.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #f0f0f0"
                }
              },
              e.createElement(
                "div",
                { style: { minWidth: 0 } },
                e.createElement(
                  I,
                  { strong: !0 },
                  n.name || `${n.username}@${n.host}`
                ),
                e.createElement(
                  "div",
                  { style: { marginTop: 4 } },
                  e.createElement(
                    I,
                    { type: "secondary", style: { fontSize: 12 } },
                    `${n.username}@${n.host}:${n.port}`,
                    n.key_path ? `  |  Key: ${n.key_path}` : ""
                  )
                )
              ),
              e.createElement(
                v,
                null,
                e.createElement(
                  ne,
                  { title: "Edit this jump host" },
                  e.createElement(M, {
                    type: "text",
                    size: "small",
                    icon: V(ve),
                    onClick: () => H(n)
                  })
                ),
                e.createElement(
                  ye,
                  {
                    title: "Delete this jump host?",
                    onConfirm: () => Y(n.id),
                    okText: "Delete",
                    cancelText: "Cancel",
                    okButtonProps: { danger: !0 }
                  },
                  e.createElement(M, {
                    type: "text",
                    danger: !0,
                    size: "small",
                    icon: V(xe)
                  })
                )
              )
            )
          }
        )
      ),
      e.createElement(
        he,
        { level: 5, style: { marginTop: 0 } },
        "Devices"
      ),
      // Profile list
      N ? e.createElement(Be, {
        style: { display: "block", margin: "40px auto" }
      }) : t.length === 0 ? e.createElement(
        K,
        null,
        e.createElement(
          ae,
          {
            description: e.createElement(
              Le,
              { type: "secondary" },
              "No saved connections. Click 'New Connection' to add one."
            )
          }
        )
      ) : e.createElement(
        pe,
        {
          dataSource: t,
          renderItem: (n) => {
            const S = et(n.id), Z = Q === n.id;
            return e.createElement(
              K,
              {
                size: "small",
                style: {
                  marginBottom: 8,
                  borderColor: S ? "#52c41a" : void 0
                }
              },
              e.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }
                },
                // Left: profile info
                e.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  e.createElement(
                    v,
                    { align: "center" },
                    e.createElement(
                      I,
                      { strong: !0, style: { fontSize: 14 } },
                      n.name || `${n.username}@${n.host}`
                    ),
                    S ? e.createElement(
                      de,
                      { color: "success" },
                      "Connected"
                    ) : null
                  ),
                  e.createElement(
                    "div",
                    { style: { marginTop: 4 } },
                    e.createElement(
                      I,
                      { type: "secondary", style: { fontSize: 12 } },
                      `${n.username}@${n.host}:${n.port}`,
                      n.key_path ? `  |  Key: ${n.key_path}` : "",
                      n.jump_host_name ? `  |  via ${n.jump_host_name}` : ""
                    )
                  )
                ),
                // Right: actions
                e.createElement(
                  v,
                  null,
                  Z ? e.createElement(Me, {
                    style: { fontSize: 18 }
                  }) : e.createElement(
                    ne,
                    {
                      title: S ? "Disconnect" : "Connect to this device"
                    },
                    e.createElement(ze, {
                      checked: S,
                      onChange: () => ie(n),
                      checkedChildren: "ON",
                      unCheckedChildren: "OFF"
                    })
                  ),
                  e.createElement(
                    ne,
                    { title: "Edit this connection profile" },
                    e.createElement(M, {
                      type: "text",
                      size: "small",
                      icon: V(ve),
                      onClick: () => O(n)
                    })
                  ),
                  e.createElement(
                    ye,
                    {
                      title: "Delete this connection profile?",
                      onConfirm: () => Ze(n.id),
                      okText: "Delete",
                      cancelText: "Cancel",
                      okButtonProps: { danger: !0 }
                    },
                    e.createElement(M, {
                      type: "text",
                      danger: !0,
                      size: "small",
                      icon: V(xe)
                    })
                  )
                )
              )
            );
          }
        }
      ),
      // New Connection Modal
      e.createElement(
        me,
        {
          title: f ? "Edit SSH Connection" : "New SSH Connection",
          open: T,
          onCancel: () => {
            h(!1), $(null), b.resetFields();
          },
          footer: null
        },
        e.createElement(
          x,
          { form: b, layout: "vertical", onFinish: _ },
          e.createElement(
            x.Item,
            { name: "name", label: "Display Name" },
            e.createElement(B, {
              placeholder: "My Server (optional, auto-generated if empty)"
            })
          ),
          e.createElement(
            x.Item,
            {
              name: "host",
              label: "Host",
              rules: [{ required: !0, message: "Please enter the host" }]
            },
            e.createElement(B, {
              placeholder: "192.168.1.100 or example.com"
            })
          ),
          e.createElement(
            v,
            { style: { width: "100%" } },
            e.createElement(
              x.Item,
              {
                name: "port",
                label: "Port",
                initialValue: 22,
                style: { width: 120 }
              },
              e.createElement(B, { type: "number" })
            ),
            e.createElement(
              x.Item,
              {
                name: "username",
                label: "Username",
                initialValue: "root",
                style: { flex: 1 }
              },
              e.createElement(B)
            )
          ),
          e.createElement(
            x.Item,
            { name: "password", label: "Password" },
            e.createElement(B.Password, {
              placeholder: f ? "Leave empty to keep the saved password" : "Leave empty if using key auth"
            })
          ),
          e.createElement(
            x.Item,
            { name: "key_path", label: "SSH Key Path" },
            e.createElement(B, {
              placeholder: "/home/user/.ssh/id_rsa (optional)"
            })
          ),
          e.createElement(
            x.Item,
            { name: "passphrase", label: "Key Passphrase" },
            e.createElement(B.Password, {
              placeholder: f ? "Leave empty to keep the saved passphrase" : "If key is encrypted"
            })
          ),
          e.createElement(
            x.Item,
            { name: "jump_host_id", label: "Jump Host" },
            e.createElement(Oe, {
              allowClear: !0,
              placeholder: "Direct connection (no jump host)",
              options: o.map((n) => ({
                label: n.name || `${n.username}@${n.host}:${n.port}`,
                value: n.id
              }))
            })
          ),
          e.createElement(
            x.Item,
            null,
            e.createElement(
              M,
              {
                type: "primary",
                htmlType: "submit",
                loading: q,
                style: { width: "100%" }
              },
              f ? "Update Profile" : "Save Profile"
            )
          )
        )
      ),
      e.createElement(
        me,
        {
          title: y ? "Edit Jump Host" : "New Jump Host",
          open: L,
          onCancel: () => {
            D(!1), U(null), d.resetFields();
          },
          footer: null
        },
        e.createElement(
          x,
          { form: d, layout: "vertical", onFinish: F },
          e.createElement(
            x.Item,
            { name: "name", label: "Display Name" },
            e.createElement(B, {
              placeholder: "Bastion (optional, auto-generated if empty)"
            })
          ),
          e.createElement(
            x.Item,
            {
              name: "host",
              label: "Host",
              rules: [{ required: !0, message: "Please enter the host" }]
            },
            e.createElement(B, {
              placeholder: "bastion.example.com or 192.168.1.10"
            })
          ),
          e.createElement(
            v,
            { style: { width: "100%" } },
            e.createElement(
              x.Item,
              {
                name: "port",
                label: "Port",
                initialValue: 22,
                style: { width: 120 }
              },
              e.createElement(B, { type: "number" })
            ),
            e.createElement(
              x.Item,
              {
                name: "username",
                label: "Username",
                initialValue: "root",
                style: { flex: 1 }
              },
              e.createElement(B)
            )
          ),
          e.createElement(
            x.Item,
            { name: "password", label: "Password" },
            e.createElement(B.Password, {
              placeholder: y ? "Leave empty to keep the saved password" : "Leave empty if using key auth"
            })
          ),
          e.createElement(
            x.Item,
            { name: "key_path", label: "SSH Key Path" },
            e.createElement(B, {
              placeholder: "/home/user/.ssh/id_rsa (optional)"
            })
          ),
          e.createElement(
            x.Item,
            { name: "passphrase", label: "Key Passphrase" },
            e.createElement(B.Password, {
              placeholder: y ? "Leave empty to keep the saved passphrase" : "If key is encrypted"
            })
          ),
          e.createElement(
            x.Item,
            null,
            e.createElement(
              M,
              {
                type: "primary",
                htmlType: "submit",
                loading: P,
                style: { width: "100%" }
              },
              y ? "Update Jump Host" : "Save Jump Host"
            )
          )
        )
      )
    );
  }
  function Se() {
    const [t, s] = R(null), [o, u] = R([]), [a, g] = R(""), [N, p] = R(null), [i, w] = R(!1), [T, h] = R(""), L = fe(async () => {
      try {
        w(!0), h("");
        const c = G() || "", P = encodeURIComponent(c), [J, Q] = await Promise.all([
          k(`/remote/connections?session_id=${P}`),
          k(`/remote/profiles?session_id=${P}`)
        ]), l = J.connections || [];
        s(l.length > 0 ? l[0] : null), u(Q.profiles || []), g(Q.active_profile_id || "");
      } catch (c) {
        const P = c.message || String(c);
        console.error("[Remote] Failed to fetch status:", c), h(P), s(null);
      } finally {
        w(!1);
      }
    }, []);
    ge(() => {
      L();
      const c = setInterval(L, 5e3);
      return () => clearInterval(c);
    }, [L]);
    const D = async (c) => {
      const P = G();
      if (!P) {
        E.error("No active session. Open a chat first.");
        return;
      }
      const J = c.id === a;
      p(c.id);
      try {
        J ? (await k(`/remote/connections/${P}`, {
          method: "DELETE"
        }), E.success("Disconnected")) : (await k(`/remote/profiles/${c.id}/connect`, {
          method: "POST",
          body: JSON.stringify({ session_id: P })
        }), E.success(`Connected to ${c.name}`)), L();
      } catch (Q) {
        E.error(
          `${J ? "Disconnect" : "Connection"} failed: ${Q.message}`
        );
      } finally {
        p(null);
      }
    }, f = t !== null, $ = (t == null ? void 0 : t.uptime_seconds) || 0;
    let y = "";
    f && ($ < 60 ? y = `${$.toFixed(0)}s` : $ < 3600 ? y = `${($ / 60).toFixed(0)}m` : y = `${($ / 3600).toFixed(1)}h`);
    const U = e.createElement(
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
          border: `1px solid ${f ? r.successBorder : r.border}`,
          borderRadius: 6,
          background: f ? r.successBg : r.bgContainer,
          color: f ? r.success : r.text,
          font: "inherit",
          cursor: "pointer",
          whiteSpace: "nowrap",
          overflow: "hidden"
        },
        "aria-label": f ? `SSH connected to ${t.username}@${t.host}` : "SSH disconnected"
      },
      e.createElement(re, {
        status: f ? "success" : T ? "error" : "default"
      }),
      e.createElement(
        "span",
        {
          style: {
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: 14,
            fontWeight: 600
          }
        },
        f ? `${t.username}@${t.host}` : i ? "SSH Checking" : "SSH Offline"
      )
    ), q = e.createElement(
      "div",
      { style: { width: 320 } },
      e.createElement(
        v,
        { direction: "vertical", size: 10, style: { width: "100%" } },
        f ? e.createElement(
          v,
          { direction: "vertical", size: 6, style: { width: "100%" } },
          e.createElement(
            v,
            { align: "center" },
            e.createElement(je || Ee || "span"),
            e.createElement(I, { strong: !0 }, "SSH Connected")
          ),
          e.createElement(
            I,
            { code: !0, ellipsis: !0, style: { maxWidth: 296 } },
            `${t.username}@${t.host}:${t.port}`
          ),
          e.createElement(
            v,
            { size: 6 },
            e.createElement(Ue || "span"),
            e.createElement(I, { type: "secondary" }, y)
          )
        ) : e.createElement(
          I,
          { type: T ? "danger" : "secondary", style: { fontSize: 12 } },
          T || "No active SSH connection for this chat."
        ),
        e.createElement(
          "div",
          { style: { borderTop: `1px solid ${r.border}`, paddingTop: 8 } },
          e.createElement(I, { strong: !0 }, "Saved Devices")
        ),
        o.length === 0 ? e.createElement(
          I,
          { type: "secondary", style: { fontSize: 12 } },
          "No saved devices. Add one from Remote SSH."
        ) : e.createElement(
          v,
          { direction: "vertical", size: 6, style: { width: "100%" } },
          ...o.map((c) => {
            const P = c.id === a;
            return e.createElement(
              "div",
              {
                key: c.id,
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8
                }
              },
              e.createElement(
                "div",
                { style: { flex: 1, minWidth: 0, overflow: "hidden" } },
                e.createElement(
                  "div",
                  {
                    title: c.name || `${c.username}@${c.host}`,
                    style: {
                      color: r.text,
                      fontSize: 14,
                      fontWeight: P ? 600 : 500,
                      lineHeight: "20px",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }
                  },
                  c.name || `${c.username}@${c.host}`
                ),
                e.createElement(
                  "div",
                  {
                    title: `${c.username}@${c.host}:${c.port}`,
                    style: {
                      color: r.secondaryText,
                      fontSize: 12,
                      lineHeight: "18px",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }
                  },
                  `${c.username}@${c.host}:${c.port}`
                ),
                c.jump_host_name ? e.createElement(
                  "div",
                  {
                    title: `via ${c.jump_host_name}`,
                    style: {
                      color: r.secondaryText,
                      fontSize: 12,
                      lineHeight: "18px",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }
                  },
                  `via ${c.jump_host_name}`
                ) : null
              ),
              e.createElement(
                M,
                {
                  size: "small",
                  type: P ? "default" : "primary",
                  danger: P,
                  loading: N === c.id,
                  onClick: () => D(c)
                },
                P ? "Disconnect" : "Connect"
              )
            );
          })
        )
      )
    );
    return e.createElement(
      Ne,
      {
        content: q,
        trigger: "click",
        placement: "bottom"
      },
      e.createElement(ne, {
        title: f ? `${t.username}@${t.host}:${t.port}` : "No active SSH connection"
      }, U)
    );
  }
  function qe() {
    const t = window.QwenPaw, s = t == null ? void 0 : t.slot;
    if (typeof (s == null ? void 0 : s.fill) == "function")
      try {
        return s.fill(
          "remote",
          "header.left",
          () => e.createElement(Se),
          { id: "remote-ssh-status", order: 15 }
        ), console.log("[Remote] Registered header status via QwenPaw.slot.fill"), !0;
      } catch (a) {
        console.debug("[Remote] QwenPaw.slot.fill failed:", a);
      }
    const o = {
      id: "remote-ssh-status",
      key: "remote-ssh-status",
      pluginId: "remote",
      label: "Remote SSH",
      component: Se,
      priority: 15,
      placement: "left"
    }, u = [
      ["registerHeaderWidget", [o]],
      ["registerTopBarItem", [o]],
      ["registerNavWidget", [o]],
      ["registerNavbarItem", [o]],
      ["registerToolbarItem", [o]],
      ["registerStatusWidget", [o]],
      ["registerSlot", ["header:left", o]],
      ["registerSlot", ["topbar:left", o]],
      ["registerSlot", ["toolbar:left", o]],
      ["registerSlot", ["navbar:left", o]]
    ];
    for (const [a, g] of u) {
      const N = t == null ? void 0 : t[a];
      if (typeof N == "function")
        try {
          return N.apply(t, g), console.log(`[Remote] Registered header widget via ${a}`), !0;
        } catch (p) {
          console.debug(`[Remote] ${a} failed:`, p);
        }
    }
    return console.debug(
      "[Remote] No QwenPaw header extension API found; will use DOM fallback."
    ), !1;
  }
  function Xe() {
    const t = [
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
      "nav"
    ];
    for (const o of t) {
      const u = Array.from(
        document.querySelectorAll(o)
      );
      for (const a of u) {
        const g = a.getBoundingClientRect();
        if (g.top >= 0 && g.top < 120 && g.width >= 320 && g.height >= 32 && g.height <= 120)
          return a;
      }
    }
    return Array.from(
      document.querySelectorAll("div[style*='flex'],div[class*='flex']")
    ).filter((o) => {
      const u = o.getBoundingClientRect();
      if (u.top < -50 || u.top >= 100 || u.width < 480 || u.height < 40 || u.height > 120)
        return !1;
      const a = window.getComputedStyle(o);
      return a.display === "flex" || a.display === "grid" || a.alignItems === "center";
    }).sort((o, u) => {
      const a = o.getBoundingClientRect(), g = u.getBoundingClientRect();
      return a.top - g.top || a.height - g.height;
    })[0] || null;
  }
  function Ce() {
    const t = document.getElementById(
      "remote-ssh-header-status"
    );
    if (t && t.dataset.remoteBuild !== se && t.remove(), document.getElementById("remote-ssh-header-status") || document.getElementById("remote-ssh-header-status-react")) return !0;
    const o = [
      "文档资料",
      "Docs",
      "Documentation",
      "GitHub",
      "代码",
      "Code"
    ], u = Array.from(
      document.querySelectorAll(
        "button,a,[role='button'],span,div"
      )
    ).filter((l) => {
      const b = (l.textContent || "").trim(), d = l.getBoundingClientRect();
      return d.top >= 0 && d.top < 96 && d.width > 0 && d.width < 320 && d.height > 0 && o.some((m) => b.includes(m));
    }), g = Array.from(
      new Set(
        u.map(
          (l) => l.closest("button,a,[role='button']") || l
        )
      )
    ).sort((l, b) => {
      const d = (m) => {
        const _ = (m.textContent || "").trim(), j = m.getBoundingClientRect();
        return (o.includes(_) ? 0 : 1e4) + j.width * j.height;
      };
      return d(l) - d(b);
    })[0], N = (g == null ? void 0 : g.parentElement) || Xe();
    if (!N)
      return console.warn("[Remote] Header DOM mount point not found."), !1;
    const p = document.createElement("div");
    p.id = "remote-ssh-header-status", p.dataset.remoteBuild = se, p.style.display = "inline-flex", p.style.alignItems = "center", p.style.flex = "0 0 auto", p.style.minWidth = "156px", p.style.margin = "0 8px";
    const i = document.createElement("button");
    i.type = "button", i.style.height = "38px", i.style.minWidth = "156px", i.style.maxWidth = "220px", i.style.padding = "0 12px", i.style.display = "inline-flex", i.style.flex = "0 0 auto", i.style.alignItems = "center", i.style.justifyContent = "center", i.style.gap = "8px", i.style.border = `1px solid ${r.border}`, i.style.borderRadius = "6px", i.style.background = r.bgContainer, i.style.color = r.text, i.style.font = "inherit", i.style.cursor = "pointer", i.style.whiteSpace = "nowrap";
    const w = document.createElement("span");
    w.style.width = "8px", w.style.height = "8px", w.style.borderRadius = "50%", w.style.background = r.secondaryText, w.style.flex = "0 0 auto";
    const T = document.createElement("span");
    T.textContent = "SSH Offline", T.style.minWidth = "0", T.style.overflow = "hidden", T.style.textOverflow = "ellipsis", T.style.fontSize = "14px", T.style.fontWeight = "600";
    const h = document.createElement("div");
    h.style.position = "fixed", h.style.zIndex = "10000", h.style.width = "320px", h.style.padding = "12px", h.style.border = `1px solid ${r.border}`, h.style.borderRadius = "8px", h.style.background = r.bgElevated, h.style.color = r.text, h.style.boxShadow = r.shadow, h.style.display = "none";
    const L = document.createElement("div");
    L.style.fontWeight = "600", L.style.marginBottom = "8px";
    const D = document.createElement("div");
    D.style.fontSize = "12px", D.style.color = r.secondaryText, D.style.wordBreak = "break-all";
    const f = document.createElement("div");
    f.textContent = "Saved Devices", f.style.marginTop = "10px", f.style.paddingTop = "10px", f.style.borderTop = `1px solid ${r.border}`, f.style.fontWeight = "600";
    const $ = document.createElement("div");
    $.style.display = "flex", $.style.flexDirection = "column", $.style.gap = "6px", $.style.marginTop = "8px";
    const y = document.createElement("button");
    y.type = "button", y.textContent = "Disconnect", y.style.marginTop = "10px", y.style.height = "28px", y.style.padding = "0 10px", y.style.border = `1px solid ${r.errorBorder}`, y.style.borderRadius = "4px", y.style.background = r.bgElevated, y.style.color = r.error, y.style.cursor = "pointer", y.style.display = "none", h.append(L, D, y, f, $), i.append(w, T), p.append(i, h), g && g.parentElement === N ? N.insertBefore(p, g) : N.appendChild(p);
    const U = () => {
      const l = p.getBoundingClientRect(), b = i.getBoundingClientRect();
      l.width >= 120 && b.width >= 120 || (document.body.appendChild(p), p.style.position = "fixed", p.style.top = "12px", p.style.right = "156px", p.style.zIndex = "10000", p.style.margin = "0", p.style.minWidth = "156px", console.debug("[Remote] Header status moved to fixed fallback mount."));
    };
    window.setTimeout(U, 50), window.setTimeout(U, 1e3);
    let q = null;
    const c = (l, b) => {
      if ($.replaceChildren(), l.length === 0) {
        const d = document.createElement("div");
        d.textContent = "No saved devices. Add one from Remote SSH.", d.style.color = r.secondaryText, d.style.fontSize = "12px", $.append(d);
        return;
      }
      for (const d of l) {
        const m = d.id === b, _ = document.createElement("div");
        _.style.display = "flex", _.style.alignItems = "center", _.style.justifyContent = "space-between", _.style.gap = "8px";
        const j = document.createElement("div");
        j.style.flex = "1", j.style.minWidth = "0", j.style.overflow = "hidden";
        const O = document.createElement("div");
        O.textContent = d.name || `${d.username}@${d.host}`, O.title = O.textContent, O.style.color = r.text, O.style.fontSize = "14px", O.style.fontWeight = m ? "600" : "500", O.style.lineHeight = "20px", O.style.maxWidth = "200px", O.style.overflow = "hidden", O.style.textOverflow = "ellipsis", O.style.whiteSpace = "nowrap";
        const F = document.createElement("div");
        F.textContent = `${d.username}@${d.host}:${d.port}`, F.title = F.textContent, F.style.color = r.secondaryText, F.style.fontSize = "12px", F.style.lineHeight = "18px", F.style.maxWidth = "200px", F.style.overflow = "hidden", F.style.textOverflow = "ellipsis", F.style.whiteSpace = "nowrap";
        const W = document.createElement("div");
        W.textContent = d.jump_host_name ? `via ${d.jump_host_name}` : "", W.title = W.textContent, W.style.color = r.secondaryText, W.style.fontSize = "12px", W.style.lineHeight = "18px", W.style.maxWidth = "200px", W.style.overflow = "hidden", W.style.textOverflow = "ellipsis", W.style.whiteSpace = "nowrap", W.style.display = d.jump_host_name ? "" : "none";
        const H = document.createElement("button");
        H.type = "button", H.textContent = m ? "Disconnect" : "Connect", H.style.height = "28px", H.style.padding = "0 10px", H.style.border = m ? `1px solid ${r.errorBorder}` : `1px solid ${r.primary}`, H.style.borderRadius = "4px", H.style.background = m ? r.bgElevated : r.primary, H.style.color = m ? r.error : r.primaryText, H.style.cursor = "pointer", H.addEventListener("click", async () => {
          const Y = G();
          if (!Y) {
            E.error("No active session. Open a chat first.");
            return;
          }
          H.disabled = !0, H.textContent = m ? "Disconnecting" : "Connecting";
          try {
            m ? (await k(`/remote/connections/${Y}`, {
              method: "DELETE"
            }), E.success("Disconnected")) : (await k(`/remote/profiles/${d.id}/connect`, {
              method: "POST",
              body: JSON.stringify({ session_id: Y })
            }), E.success(`Connected to ${d.name}`)), await J();
          } catch (ie) {
            E.error(
              `${m ? "Disconnect" : "Connection"} failed: ${ie.message}`
            );
          } finally {
            H.disabled = !1;
          }
        }), j.append(O, F, W), _.append(j, H), $.append(_);
      }
    }, P = (l, b = [], d = "", m = "") => {
      if (q = l, l) {
        const _ = `${l.username}@${l.host}:${l.port}`;
        i.style.borderColor = r.successBorder, i.style.background = r.successBg, i.style.color = r.success, w.style.background = r.success, T.textContent = `${l.username}@${l.host}`, i.title = _, L.textContent = "SSH Connected", D.textContent = `${_}
Uptime: ${Math.round(
          l.uptime_seconds || 0
        )}s
Work Dir: ${l.default_cwd || "/"}`, D.style.whiteSpace = "pre-line", y.style.display = "";
      } else
        i.style.borderColor = m ? r.errorBorder : r.border, i.style.background = m ? r.errorBg : r.bgContainer, i.style.color = m ? r.error : r.text, w.style.background = m ? r.error : r.secondaryText, T.textContent = m ? "SSH Error" : "SSH Offline", i.title = m || "No active SSH connection", L.textContent = m ? "SSH Status Error" : "SSH Offline", D.textContent = m || "No active SSH connection for this chat.", D.style.whiteSpace = "normal", y.style.display = "none";
      c(b, d);
    }, J = async () => {
      try {
        const l = G() || "", b = encodeURIComponent(l), [d, m] = await Promise.all([
          k(`/remote/connections?session_id=${b}`),
          k(`/remote/profiles?session_id=${b}`)
        ]), _ = d.connections || [];
        P(
          _.length > 0 ? _[0] : null,
          m.profiles || [],
          m.active_profile_id || ""
        );
      } catch (l) {
        P(null, [], "", l.message || "Failed to load SSH status.");
      }
    }, Q = () => {
      const l = i.getBoundingClientRect();
      h.style.top = `${l.bottom + 8}px`, h.style.left = `${Math.min(
        l.left,
        window.innerWidth - 340
      )}px`;
    };
    return i.addEventListener("click", () => {
      Q(), h.style.display = h.style.display === "none" ? "block" : "none";
    }), document.addEventListener("click", (l) => {
      p.contains(l.target) || (h.style.display = "none");
    }), y.addEventListener("click", async () => {
      const l = G();
      if (!(!l || !q))
        try {
          await k(`/remote/connections/${l}`, {
            method: "DELETE"
          }), E.success("Disconnected"), await J();
        } catch (b) {
          E.error(`Disconnect failed: ${b.message}`);
        }
    }), J(), window.setInterval(J, 5e3), !0;
  }
  function $e() {
    if (Ce()) return;
    let t = 0;
    const s = 40;
    let o = null;
    const u = () => {
      if (t += 1, Ce()) {
        o == null || o.disconnect(), window.clearInterval(a);
        return;
      }
      t >= s && (o == null || o.disconnect(), window.clearInterval(a));
    }, a = window.setInterval(u, 250);
    o = new MutationObserver(u), o.observe(document.body, { childList: !0, subtree: !0 });
  }
  function Ie() {
    var s;
    const t = ((s = document.body) == null ? void 0 : s.textContent) || "";
    t.includes("Remote SSH") && (t.includes("Jump Hosts") || t.includes("New Jump Host") || console.warn(
      "[Remote] Remote SSH page is missing Jump Hosts UI. The web host may still be serving a cached older frontend bundle."
    ));
  }
  (Pe = (Re = window.QwenPaw).registerToolRender) == null || Pe.call(Re, "remote", {
    remote_connect: Qe,
    remote_disconnect: Ke,
    remote_list: Ve,
    remote_exec: Ge
  });
  const z = {
    id: "remote",
    key: "remote",
    pluginId: "remote",
    path: "/remote",
    component: le,
    label: "Remote SSH",
    title: "Remote SSH",
    name: "Remote SSH",
    icon: "🔗",
    priority: 20
  };
  function Ye() {
    var g, N, p, i;
    const t = window.QwenPaw, s = "legacy:remote:remote", o = "remote.main";
    let u = !1;
    if (typeof (t == null ? void 0 : t.registerRoutes) == "function")
      try {
        u = !0, t.registerRoutes("remote", [z]), console.log("[Remote] Registered page via legacy registerRoutes");
      } catch (w) {
        console.debug("[Remote] registerRoutes failed:", w);
      }
    if (u && typeof ((g = t == null ? void 0 : t.route) == null ? void 0 : g.replace) == "function")
      try {
        return t.route.replace("remote", s, le), console.log("[Remote] Replaced legacy route via QwenPaw.route.replace"), !0;
      } catch (w) {
        console.debug("[Remote] QwenPaw.route.replace legacy failed:", w);
      }
    if (typeof ((N = t == null ? void 0 : t.route) == null ? void 0 : N.add) == "function")
      try {
        return t.route.add("remote", {
          id: o,
          path: z.path,
          component: le
        }), (i = (p = t.menu) == null ? void 0 : p.add) == null || i.call(p, "remote", {
          id: "remote.main",
          location: "primary.settings",
          parentId: "plugins-group",
          label: z.label,
          icon: z.icon,
          route: o,
          order: z.priority
        }), console.log("[Remote] Registered page via QwenPaw.route/menu SDK"), !0;
      } catch (w) {
        console.debug("[Remote] QwenPaw.route/menu SDK failed:", w);
      }
    const a = [
      ["registerRoute", ["remote", z]],
      ["registerRoute", [z]],
      ["registerPage", ["remote", z]],
      ["registerPage", [z]],
      ["registerPluginPage", ["remote", z]],
      ["registerPluginPage", [z]],
      ["registerMenuItem", [z]],
      ["registerNavigationItem", [z]],
      ["registerNavItem", [z]]
    ];
    for (const [w, T] of a) {
      const h = t == null ? void 0 : t[w];
      if (typeof h == "function")
        try {
          return h.apply(t, T), console.log(`[Remote] Registered page via ${w}`), !0;
        } catch (L) {
          console.debug(`[Remote] ${w} failed:`, L);
        }
    }
    return console.warn("[Remote] No QwenPaw page registration API found."), !1;
  }
  Ye(), window.setTimeout(Ie, 1e3), window.setTimeout(Ie, 3e3), qe() ? window.setTimeout(() => {
    document.getElementById("remote-ssh-header-status-react") || $e();
  }, 1e3) : $e();
}
function _e() {
  var e;
  const C = (e = window.QwenPaw) == null ? void 0 : e.host;
  return !!(C != null && C.React && (C != null && C.antd) && (C != null && C.getApiUrl) && (C != null && C.getApiToken));
}
function tt() {
  if (_e()) {
    Te();
    return;
  }
  let C = 0;
  const e = 120;
  let A = null;
  const ee = () => {
    if (C += 1, _e()) {
      A == null || A.disconnect(), window.clearInterval(te), Te();
      return;
    }
    C >= e && (A == null || A.disconnect(), window.clearInterval(te), console.warn("[Remote] QwenPaw.host not available, plugin not loaded"));
  }, te = window.setInterval(ee, 250);
  document.body && (A = new MutationObserver(ee), A.observe(document.body, { childList: !0, subtree: !0 }));
}
tt();
