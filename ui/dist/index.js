const te = "0.1.2-jump-host-status-theme";
function be() {
  var we, xe, ve, Se;
  const v = window;
  if (v.__remotePluginInitializedBuild === te) return;
  v.__remotePluginInitialized = !0, v.__remotePluginInitializedBuild = te;
  const { React: e, antd: N, antdIcons: X, getApiUrl: Y, getApiToken: $e } = window.QwenPaw.host, {
    Card: j,
    Tag: re,
    Typography: Ie,
    Space: x,
    Button: A,
    Input: z,
    Select: ke,
    Form: E,
    Modal: ae,
    Spin: Te,
    Alert: _e,
    Switch: Pe,
    message: f,
    List: le,
    Badge: ne,
    Popconfirm: ie,
    Empty: oe,
    Tooltip: Z,
    Popover: Re
  } = N, { Text: C, Title: ce, Paragraph: De } = Ie, { useState: k, useEffect: de, useCallback: me } = e, {
    CloudOutlined: ue,
    LinkOutlined: He,
    DisconnectOutlined: Oe,
    CodeOutlined: Be,
    ReloadOutlined: ze,
    PlusOutlined: pe,
    DeleteOutlined: ye,
    EditOutlined: he,
    LoadingOutlined: Le,
    LaptopOutlined: Ne,
    ThunderboltOutlined: We
  } = X || {};
  function fe(n) {
    var m, c;
    const r = (c = (m = n == null ? void 0 : n.content) == null ? void 0 : m[0]) == null ? void 0 : c.data, o = r == null ? void 0 : r.arguments;
    if (typeof o == "string")
      try {
        return JSON.parse(o);
      } catch {
        return {};
      }
    return o ?? {};
  }
  function ee(n) {
    const r = n == null ? void 0 : n.content;
    return !r || !Array.isArray(r) ? "" : r.filter((o) => o.type === "text").map((o) => o.text || "").join(`
`);
  }
  function U() {
    return window.currentSessionId ?? null;
  }
  async function T(n, r = {}) {
    const o = $e(), m = {
      "Content-Type": "application/json",
      ...o ? { Authorization: `Bearer ${o}` } : {},
      ...r.headers || {}
    }, c = await fetch(Y(n), { ...r, headers: m });
    if (!c.ok) {
      const h = await c.text();
      throw new Error(`${c.status}: ${h}`);
    }
    return c.json();
  }
  const s = {
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
  function Ae({ data: n }) {
    const r = ee(n), o = fe(n), m = r.includes("Connected to"), c = r.includes("Error") || r.includes("failed");
    return e.createElement(
      j,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${m ? "#52c41a" : c ? "#ff4d4f" : "#1890ff"}`
        }
      },
      e.createElement(
        x,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          x,
          null,
          e.createElement(He || "🔗"),
          e.createElement(C, { strong: !0 }, "Remote SSH Connect"),
          o.host ? e.createElement(
            re,
            { color: "blue" },
            `${o.username}@${o.host}:${o.port || 22}`
          ) : null
        ),
        e.createElement(
          C,
          {
            type: c ? "danger" : "success",
            style: { whiteSpace: "pre-wrap" }
          },
          r
        )
      )
    );
  }
  function Fe({ data: n }) {
    const r = ee(n), o = r.includes("Disconnected");
    return e.createElement(
      j,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${o ? "#52c41a" : "#faad14"}`
        }
      },
      e.createElement(
        x,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          x,
          null,
          e.createElement(Oe || "🔌"),
          e.createElement(C, { strong: !0 }, "Remote SSH Disconnect")
        ),
        e.createElement(
          C,
          { style: { whiteSpace: "pre-wrap" } },
          r
        )
      )
    );
  }
  function Je({ data: n }) {
    const r = ee(n), o = r.includes("Active SSH connection");
    return e.createElement(
      j,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${o ? "#52c41a" : "#d9d9d9"}`
        }
      },
      e.createElement(
        x,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          x,
          null,
          e.createElement(ue || "☁"),
          e.createElement(C, { strong: !0 }, "Remote SSH Status"),
          o ? e.createElement(ne, {
            status: "success",
            text: "Connected"
          }) : e.createElement(ne, {
            status: "default",
            text: "Not Connected"
          })
        ),
        e.createElement(
          C,
          { style: { whiteSpace: "pre-wrap" } },
          r
        )
      )
    );
  }
  function Me({ data: n }) {
    const r = ee(n), o = fe(n), m = r.includes("[remote:"), c = r.includes("failed with exit code");
    return e.createElement(
      j,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${c ? "#ff4d4f" : m ? "#722ed1" : "#d9d9d9"}`
        }
      },
      e.createElement(
        x,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          x,
          null,
          e.createElement(Be || ">_"),
          e.createElement(C, { strong: !0 }, "Remote Command"),
          o.command ? e.createElement(
            C,
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
          r
        )
      )
    );
  }
  function je() {
    const [n, r] = k([]), [o, m] = k([]), [c, h] = k(""), [F, D] = k(!1), [d, _] = k(!1), [H, p] = k(!1), [S, O] = k(null), [y, b] = k(null), [g, Q] = k(!1), [q, i] = k(!1), [$, M] = k(null), [a] = E.useForm(), [w] = E.useForm(), l = me(async () => {
      D(!0);
      try {
        const t = U() || "", I = encodeURIComponent(t), [V, G] = await Promise.all([
          T(`/remote/profiles?session_id=${I}`),
          T("/remote/jump-hosts")
        ]);
        r(V.profiles || []), h(V.active_profile_id || ""), m(G.jump_hosts || []);
      } catch (t) {
        console.error("[Remote] Failed to fetch data:", t);
      } finally {
        D(!1);
      }
    }, []);
    de(() => {
      l();
      const t = setInterval(l, 1e4);
      return () => clearInterval(t);
    }, [l]);
    const u = async (t) => {
      Q(!0);
      try {
        await T(
          S ? `/remote/profiles/${S.id}` : "/remote/profiles",
          {
            method: S ? "PUT" : "POST",
            body: JSON.stringify(t)
          }
        ), f.success(
          S ? "Connection profile updated" : "Connection profile saved"
        ), _(!1), O(null), a.resetFields(), l();
      } catch (I) {
        f.error(`Save failed: ${I.message}`);
      } finally {
        Q(!1);
      }
    }, P = () => {
      O(null), a.resetFields(), _(!0);
    }, J = (t) => {
      O(t), a.setFieldsValue({
        name: t.name,
        host: t.host,
        port: t.port,
        username: t.username,
        password: "",
        key_path: t.key_path,
        passphrase: "",
        jump_host_id: t.jump_host_id || ""
      }), _(!0);
    }, B = async (t) => {
      i(!0);
      try {
        await T(
          y ? `/remote/jump-hosts/${y.id}` : "/remote/jump-hosts",
          {
            method: y ? "PUT" : "POST",
            body: JSON.stringify(t)
          }
        ), f.success(
          y ? "Jump host updated" : "Jump host saved"
        ), p(!1), b(null), w.resetFields(), l();
      } catch (I) {
        f.error(`Save jump host failed: ${I.message}`);
      } finally {
        i(!1);
      }
    }, W = () => {
      b(null), w.resetFields(), p(!0);
    }, L = (t) => {
      b(t), w.setFieldsValue({
        name: t.name,
        host: t.host,
        port: t.port,
        username: t.username,
        password: "",
        key_path: t.key_path,
        passphrase: ""
      }), p(!0);
    }, R = async (t) => {
      try {
        await T(`/remote/jump-hosts/${t}`, {
          method: "DELETE"
        }), f.success("Jump host deleted"), l();
      } catch (I) {
        f.error(`Delete jump host failed: ${I.message}`);
      }
    }, K = async (t) => {
      const I = U();
      if (!I) {
        f.error("No active session. Open a chat first.");
        return;
      }
      if (t.id === c)
        try {
          await T(`/remote/connections/${I}`, {
            method: "DELETE"
          }), f.success("Disconnected"), l();
        } catch (G) {
          f.error(`Disconnect failed: ${G.message}`);
        }
      else {
        M(t.id);
        try {
          await T(`/remote/profiles/${t.id}/connect`, {
            method: "POST",
            body: JSON.stringify({ session_id: I })
          }), f.success(`Connected to ${t.name}`), l();
        } catch (G) {
          f.error(`Connection failed: ${G.message}`);
        } finally {
          M(null);
        }
      }
    }, se = async (t) => {
      try {
        await T(`/remote/profiles/${t}`, {
          method: "DELETE"
        }), f.success("Profile deleted"), l();
      } catch (I) {
        f.error(`Delete failed: ${I.message}`);
      }
    }, Ke = (t) => t === c;
    return e.createElement(
      "div",
      { style: { padding: 24, maxWidth: 900, margin: "0 auto" } },
      // Header
      e.createElement(
        x,
        {
          style: {
            marginBottom: 16,
            width: "100%",
            justifyContent: "space-between"
          }
        },
        e.createElement(
          ce,
          { level: 4, style: { margin: 0 } },
          "Remote SSH"
        ),
        e.createElement(
          x,
          null,
          e.createElement(
            A,
            { icon: e.createElement(ze), onClick: l },
            "Refresh"
          ),
          e.createElement(
            A,
            {
              icon: e.createElement(pe),
              onClick: W
            },
            "New Jump Host"
          ),
          e.createElement(
            A,
            {
              type: "primary",
              icon: e.createElement(pe),
              onClick: P
            },
            "New Connection"
          )
        )
      ),
      // Info alert
      e.createElement(_e, {
        type: "info",
        showIcon: !0,
        style: { marginBottom: 16 },
        message: "Save connection profiles here. Toggle the switch to connect/disconnect. Only one connection can be active at a time. When connected, all shell commands in the current chat execute on the remote machine."
      }),
      e.createElement(
        j,
        {
          size: "small",
          title: "Jump Hosts",
          style: { marginBottom: 16 }
        },
        o.length === 0 ? e.createElement(
          oe,
          {
            image: oe.PRESENTED_IMAGE_SIMPLE,
            description: "No saved jump hosts."
          }
        ) : e.createElement(
          le,
          {
            dataSource: o,
            renderItem: (t) => e.createElement(
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
                  C,
                  { strong: !0 },
                  t.name || `${t.username}@${t.host}`
                ),
                e.createElement(
                  "div",
                  { style: { marginTop: 4 } },
                  e.createElement(
                    C,
                    { type: "secondary", style: { fontSize: 12 } },
                    `${t.username}@${t.host}:${t.port}`,
                    t.key_path ? `  |  Key: ${t.key_path}` : ""
                  )
                )
              ),
              e.createElement(
                x,
                null,
                e.createElement(
                  Z,
                  { title: "Edit this jump host" },
                  e.createElement(A, {
                    type: "text",
                    size: "small",
                    icon: e.createElement(he),
                    onClick: () => L(t)
                  })
                ),
                e.createElement(
                  ie,
                  {
                    title: "Delete this jump host?",
                    onConfirm: () => R(t.id),
                    okText: "Delete",
                    cancelText: "Cancel",
                    okButtonProps: { danger: !0 }
                  },
                  e.createElement(A, {
                    type: "text",
                    danger: !0,
                    size: "small",
                    icon: e.createElement(ye)
                  })
                )
              )
            )
          }
        )
      ),
      e.createElement(
        ce,
        { level: 5, style: { marginTop: 0 } },
        "Devices"
      ),
      // Profile list
      F ? e.createElement(Te, {
        style: { display: "block", margin: "40px auto" }
      }) : n.length === 0 ? e.createElement(
        j,
        null,
        e.createElement(
          oe,
          {
            description: e.createElement(
              De,
              { type: "secondary" },
              "No saved connections. Click 'New Connection' to add one."
            )
          }
        )
      ) : e.createElement(
        le,
        {
          dataSource: n,
          renderItem: (t) => {
            const I = Ke(t.id), V = $ === t.id;
            return e.createElement(
              j,
              {
                size: "small",
                style: {
                  marginBottom: 8,
                  borderColor: I ? "#52c41a" : void 0
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
                    x,
                    { align: "center" },
                    e.createElement(
                      C,
                      { strong: !0, style: { fontSize: 14 } },
                      t.name || `${t.username}@${t.host}`
                    ),
                    I ? e.createElement(
                      re,
                      { color: "success" },
                      "Connected"
                    ) : null
                  ),
                  e.createElement(
                    "div",
                    { style: { marginTop: 4 } },
                    e.createElement(
                      C,
                      { type: "secondary", style: { fontSize: 12 } },
                      `${t.username}@${t.host}:${t.port}`,
                      t.key_path ? `  |  Key: ${t.key_path}` : "",
                      t.jump_host_name ? `  |  via ${t.jump_host_name}` : ""
                    )
                  )
                ),
                // Right: actions
                e.createElement(
                  x,
                  null,
                  V ? e.createElement(Le, {
                    style: { fontSize: 18 }
                  }) : e.createElement(
                    Z,
                    {
                      title: I ? "Disconnect" : "Connect to this device"
                    },
                    e.createElement(Pe, {
                      checked: I,
                      onChange: () => K(t),
                      checkedChildren: "ON",
                      unCheckedChildren: "OFF"
                    })
                  ),
                  e.createElement(
                    Z,
                    { title: "Edit this connection profile" },
                    e.createElement(A, {
                      type: "text",
                      size: "small",
                      icon: e.createElement(he),
                      onClick: () => J(t)
                    })
                  ),
                  e.createElement(
                    ie,
                    {
                      title: "Delete this connection profile?",
                      onConfirm: () => se(t.id),
                      okText: "Delete",
                      cancelText: "Cancel",
                      okButtonProps: { danger: !0 }
                    },
                    e.createElement(A, {
                      type: "text",
                      danger: !0,
                      size: "small",
                      icon: e.createElement(ye)
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
        ae,
        {
          title: S ? "Edit SSH Connection" : "New SSH Connection",
          open: d,
          onCancel: () => {
            _(!1), O(null), a.resetFields();
          },
          footer: null
        },
        e.createElement(
          E,
          { form: a, layout: "vertical", onFinish: u },
          e.createElement(
            E.Item,
            { name: "name", label: "Display Name" },
            e.createElement(z, {
              placeholder: "My Server (optional, auto-generated if empty)"
            })
          ),
          e.createElement(
            E.Item,
            {
              name: "host",
              label: "Host",
              rules: [{ required: !0, message: "Please enter the host" }]
            },
            e.createElement(z, {
              placeholder: "192.168.1.100 or example.com"
            })
          ),
          e.createElement(
            x,
            { style: { width: "100%" } },
            e.createElement(
              E.Item,
              {
                name: "port",
                label: "Port",
                initialValue: 22,
                style: { width: 120 }
              },
              e.createElement(z, { type: "number" })
            ),
            e.createElement(
              E.Item,
              {
                name: "username",
                label: "Username",
                initialValue: "root",
                style: { flex: 1 }
              },
              e.createElement(z)
            )
          ),
          e.createElement(
            E.Item,
            { name: "password", label: "Password" },
            e.createElement(z.Password, {
              placeholder: S ? "Leave empty to keep the saved password" : "Leave empty if using key auth"
            })
          ),
          e.createElement(
            E.Item,
            { name: "key_path", label: "SSH Key Path" },
            e.createElement(z, {
              placeholder: "/home/user/.ssh/id_rsa (optional)"
            })
          ),
          e.createElement(
            E.Item,
            { name: "passphrase", label: "Key Passphrase" },
            e.createElement(z.Password, {
              placeholder: S ? "Leave empty to keep the saved passphrase" : "If key is encrypted"
            })
          ),
          e.createElement(
            E.Item,
            { name: "jump_host_id", label: "Jump Host" },
            e.createElement(ke, {
              allowClear: !0,
              placeholder: "Direct connection (no jump host)",
              options: o.map((t) => ({
                label: t.name || `${t.username}@${t.host}:${t.port}`,
                value: t.id
              }))
            })
          ),
          e.createElement(
            E.Item,
            null,
            e.createElement(
              A,
              {
                type: "primary",
                htmlType: "submit",
                loading: g,
                style: { width: "100%" }
              },
              S ? "Update Profile" : "Save Profile"
            )
          )
        )
      ),
      e.createElement(
        ae,
        {
          title: y ? "Edit Jump Host" : "New Jump Host",
          open: H,
          onCancel: () => {
            p(!1), b(null), w.resetFields();
          },
          footer: null
        },
        e.createElement(
          E,
          { form: w, layout: "vertical", onFinish: B },
          e.createElement(
            E.Item,
            { name: "name", label: "Display Name" },
            e.createElement(z, {
              placeholder: "Bastion (optional, auto-generated if empty)"
            })
          ),
          e.createElement(
            E.Item,
            {
              name: "host",
              label: "Host",
              rules: [{ required: !0, message: "Please enter the host" }]
            },
            e.createElement(z, {
              placeholder: "bastion.example.com or 192.168.1.10"
            })
          ),
          e.createElement(
            x,
            { style: { width: "100%" } },
            e.createElement(
              E.Item,
              {
                name: "port",
                label: "Port",
                initialValue: 22,
                style: { width: 120 }
              },
              e.createElement(z, { type: "number" })
            ),
            e.createElement(
              E.Item,
              {
                name: "username",
                label: "Username",
                initialValue: "root",
                style: { flex: 1 }
              },
              e.createElement(z)
            )
          ),
          e.createElement(
            E.Item,
            { name: "password", label: "Password" },
            e.createElement(z.Password, {
              placeholder: y ? "Leave empty to keep the saved password" : "Leave empty if using key auth"
            })
          ),
          e.createElement(
            E.Item,
            { name: "key_path", label: "SSH Key Path" },
            e.createElement(z, {
              placeholder: "/home/user/.ssh/id_rsa (optional)"
            })
          ),
          e.createElement(
            E.Item,
            { name: "passphrase", label: "Key Passphrase" },
            e.createElement(z.Password, {
              placeholder: y ? "Leave empty to keep the saved passphrase" : "If key is encrypted"
            })
          ),
          e.createElement(
            E.Item,
            null,
            e.createElement(
              A,
              {
                type: "primary",
                htmlType: "submit",
                loading: q,
                style: { width: "100%" }
              },
              y ? "Update Jump Host" : "Save Jump Host"
            )
          )
        )
      )
    );
  }
  function Ue() {
    const [n, r] = k(null), [o, m] = k([]), [c, h] = k(""), [F, D] = k(null), [d, _] = k(!1), [H, p] = k(""), S = me(async () => {
      try {
        _(!0), p("");
        const i = U() || "", $ = encodeURIComponent(i), [M, a] = await Promise.all([
          T(`/remote/connections?session_id=${$}`),
          T(`/remote/profiles?session_id=${$}`)
        ]), w = M.connections || [];
        r(w.length > 0 ? w[0] : null), m(a.profiles || []), h(a.active_profile_id || "");
      } catch (i) {
        p(i.message), r(null);
      } finally {
        _(!1);
      }
    }, []);
    de(() => {
      S();
      const i = setInterval(S, 5e3);
      return () => clearInterval(i);
    }, [S]);
    const O = async (i) => {
      const $ = U();
      if (!$) {
        f.error("No active session. Open a chat first.");
        return;
      }
      const M = i.id === c;
      D(i.id);
      try {
        M ? (await T(`/remote/connections/${$}`, {
          method: "DELETE"
        }), f.success("Disconnected")) : (await T(`/remote/profiles/${i.id}/connect`, {
          method: "POST",
          body: JSON.stringify({ session_id: $ })
        }), f.success(`Connected to ${i.name}`)), S();
      } catch (a) {
        f.error(
          `${M ? "Disconnect" : "Connection"} failed: ${a.message}`
        );
      } finally {
        D(null);
      }
    }, y = n !== null, b = (n == null ? void 0 : n.uptime_seconds) || 0;
    let g = "";
    y && (b < 60 ? g = `${b.toFixed(0)}s` : b < 3600 ? g = `${(b / 60).toFixed(0)}m` : g = `${(b / 3600).toFixed(1)}h`);
    const Q = e.createElement(
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
          border: `1px solid ${y ? s.successBorder : s.border}`,
          borderRadius: 6,
          background: y ? s.successBg : s.bgContainer,
          color: y ? s.success : s.text,
          font: "inherit",
          cursor: "pointer",
          whiteSpace: "nowrap",
          overflow: "hidden"
        },
        "aria-label": y ? `SSH connected to ${n.username}@${n.host}` : "SSH disconnected"
      },
      e.createElement(ne, {
        status: y ? "success" : H ? "error" : "default"
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
        y ? `${n.username}@${n.host}` : d ? "SSH Checking" : "SSH Offline"
      )
    ), q = e.createElement(
      "div",
      { style: { width: 320 } },
      e.createElement(
        x,
        { direction: "vertical", size: 10, style: { width: "100%" } },
        y ? e.createElement(
          x,
          { direction: "vertical", size: 6, style: { width: "100%" } },
          e.createElement(
            x,
            { align: "center" },
            e.createElement(Ne || ue || "span"),
            e.createElement(C, { strong: !0 }, "SSH Connected")
          ),
          e.createElement(
            C,
            { code: !0, ellipsis: !0, style: { maxWidth: 296 } },
            `${n.username}@${n.host}:${n.port}`
          ),
          e.createElement(
            x,
            { size: 6 },
            e.createElement(We || "span"),
            e.createElement(C, { type: "secondary" }, g)
          )
        ) : e.createElement(
          C,
          { type: H ? "danger" : "secondary", style: { fontSize: 12 } },
          H || "No active SSH connection for this chat."
        ),
        e.createElement(
          "div",
          { style: { borderTop: `1px solid ${s.border}`, paddingTop: 8 } },
          e.createElement(C, { strong: !0 }, "Saved Devices")
        ),
        o.length === 0 ? e.createElement(
          C,
          { type: "secondary", style: { fontSize: 12 } },
          "No saved devices. Add one from Remote SSH."
        ) : e.createElement(
          x,
          { direction: "vertical", size: 6, style: { width: "100%" } },
          ...o.map((i) => {
            const $ = i.id === c;
            return e.createElement(
              "div",
              {
                key: i.id,
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
                    title: i.name || `${i.username}@${i.host}`,
                    style: {
                      color: s.text,
                      fontSize: 14,
                      fontWeight: $ ? 600 : 500,
                      lineHeight: "20px",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }
                  },
                  i.name || `${i.username}@${i.host}`
                ),
                e.createElement(
                  "div",
                  {
                    title: `${i.username}@${i.host}:${i.port}`,
                    style: {
                      color: s.secondaryText,
                      fontSize: 12,
                      lineHeight: "18px",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }
                  },
                  `${i.username}@${i.host}:${i.port}`
                ),
                i.jump_host_name ? e.createElement(
                  "div",
                  {
                    title: `via ${i.jump_host_name}`,
                    style: {
                      color: s.secondaryText,
                      fontSize: 12,
                      lineHeight: "18px",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }
                  },
                  `via ${i.jump_host_name}`
                ) : null
              ),
              e.createElement(
                A,
                {
                  size: "small",
                  type: $ ? "default" : "primary",
                  danger: $,
                  loading: F === i.id,
                  onClick: () => O(i)
                },
                $ ? "Disconnect" : "Connect"
              )
            );
          })
        )
      )
    );
    return e.createElement(
      Re,
      {
        content: q,
        trigger: "click",
        placement: "bottom"
      },
      e.createElement(Z, {
        title: y ? `${n.username}@${n.host}:${n.port}` : "No active SSH connection"
      }, Q)
    );
  }
  function Qe() {
    const n = window.QwenPaw, r = {
      id: "remote-ssh-status",
      key: "remote-ssh-status",
      pluginId: "remote",
      label: "Remote SSH",
      component: Ue,
      priority: 15,
      placement: "left"
    }, o = [
      ["registerHeaderWidget", [r]],
      ["registerTopBarItem", [r]],
      ["registerNavWidget", [r]],
      ["registerNavbarItem", [r]],
      ["registerToolbarItem", [r]],
      ["registerStatusWidget", [r]],
      ["registerSlot", ["header:left", r]],
      ["registerSlot", ["topbar:left", r]]
    ];
    for (const [m, c] of o) {
      const h = n == null ? void 0 : n[m];
      if (typeof h == "function")
        try {
          return h.apply(n, c), !0;
        } catch (F) {
          console.warn(`[Remote] ${m} failed:`, F);
        }
    }
    return console.warn(
      "[Remote] No QwenPaw header extension API found; SSH status indicator was not registered."
    ), !1;
  }
  function qe() {
    const n = [
      "[data-qwenpaw-header]",
      "[data-app-header]",
      ".qwenpaw-header",
      ".app-header",
      ".topbar",
      ".top-bar",
      ".navbar",
      ".nav-bar",
      ".ant-layout-header",
      "header",
      "nav"
    ];
    for (const o of n) {
      const m = Array.from(
        document.querySelectorAll(o)
      );
      for (const c of m) {
        const h = c.getBoundingClientRect();
        if (h.top >= 0 && h.top < 120 && h.width >= 320 && h.height >= 32 && h.height <= 120)
          return c;
      }
    }
    return Array.from(
      document.querySelectorAll("div,section")
    ).filter((o) => {
      const m = o.getBoundingClientRect();
      if (m.top < 0 || m.top >= 96 || m.width < 480 || m.height < 40 || m.height > 120)
        return !1;
      const c = window.getComputedStyle(o);
      return c.display === "flex" || c.display === "grid" || c.alignItems === "center";
    }).sort((o, m) => {
      const c = o.getBoundingClientRect(), h = m.getBoundingClientRect();
      return c.top - h.top || c.height - h.height;
    })[0] || null;
  }
  function ge() {
    const n = document.getElementById(
      "remote-ssh-header-status"
    );
    if (n && n.dataset.remoteBuild !== te && n.remove(), document.getElementById("remote-ssh-header-status") || document.getElementById("remote-ssh-header-status-react")) return !0;
    const o = [
      "文档资料",
      "Docs",
      "Documentation",
      "GitHub",
      "代码",
      "Code"
    ], m = Array.from(
      document.querySelectorAll(
        "button,a,[role='button'],span,div"
      )
    ).filter((a) => {
      const w = (a.textContent || "").trim(), l = a.getBoundingClientRect();
      return l.top >= 0 && l.top < 96 && l.width > 0 && l.width < 320 && l.height > 0 && o.some((u) => w.includes(u));
    }), h = Array.from(
      new Set(
        m.map(
          (a) => a.closest("button,a,[role='button']") || a
        )
      )
    ).sort((a, w) => {
      const l = (u) => {
        const P = (u.textContent || "").trim(), J = u.getBoundingClientRect();
        return (o.includes(P) ? 0 : 1e4) + J.width * J.height;
      };
      return l(a) - l(w);
    })[0], F = (h == null ? void 0 : h.parentElement) || qe();
    if (!F)
      return console.warn("[Remote] Header DOM mount point not found."), !1;
    const D = document.createElement("div");
    D.id = "remote-ssh-header-status", D.dataset.remoteBuild = te, D.style.display = "inline-flex", D.style.alignItems = "center", D.style.margin = "0 8px";
    const d = document.createElement("button");
    d.type = "button", d.style.height = "38px", d.style.minWidth = "156px", d.style.maxWidth = "220px", d.style.padding = "0 12px", d.style.display = "inline-flex", d.style.alignItems = "center", d.style.justifyContent = "center", d.style.gap = "8px", d.style.border = `1px solid ${s.border}`, d.style.borderRadius = "6px", d.style.background = s.bgContainer, d.style.color = s.text, d.style.font = "inherit", d.style.cursor = "pointer", d.style.whiteSpace = "nowrap";
    const _ = document.createElement("span");
    _.style.width = "8px", _.style.height = "8px", _.style.borderRadius = "50%", _.style.background = s.secondaryText, _.style.flex = "0 0 auto";
    const H = document.createElement("span");
    H.textContent = "SSH Offline", H.style.minWidth = "0", H.style.overflow = "hidden", H.style.textOverflow = "ellipsis", H.style.fontSize = "14px", H.style.fontWeight = "600";
    const p = document.createElement("div");
    p.style.position = "fixed", p.style.zIndex = "10000", p.style.width = "320px", p.style.padding = "12px", p.style.border = `1px solid ${s.border}`, p.style.borderRadius = "8px", p.style.background = s.bgElevated, p.style.color = s.text, p.style.boxShadow = s.shadow, p.style.display = "none";
    const S = document.createElement("div");
    S.style.fontWeight = "600", S.style.marginBottom = "8px";
    const O = document.createElement("div");
    O.style.fontSize = "12px", O.style.color = s.secondaryText, O.style.wordBreak = "break-all";
    const y = document.createElement("div");
    y.textContent = "Saved Devices", y.style.marginTop = "10px", y.style.paddingTop = "10px", y.style.borderTop = `1px solid ${s.border}`, y.style.fontWeight = "600";
    const b = document.createElement("div");
    b.style.display = "flex", b.style.flexDirection = "column", b.style.gap = "6px", b.style.marginTop = "8px";
    const g = document.createElement("button");
    g.type = "button", g.textContent = "Disconnect", g.style.marginTop = "10px", g.style.height = "28px", g.style.padding = "0 10px", g.style.border = `1px solid ${s.errorBorder}`, g.style.borderRadius = "4px", g.style.background = s.bgElevated, g.style.color = s.error, g.style.cursor = "pointer", g.style.display = "none", p.append(S, O, g, y, b), d.append(_, H), D.append(d, p), h && h.parentElement === F ? F.insertBefore(D, h) : F.appendChild(D);
    let Q = null;
    const q = (a, w) => {
      if (b.replaceChildren(), a.length === 0) {
        const l = document.createElement("div");
        l.textContent = "No saved devices. Add one from Remote SSH.", l.style.color = s.secondaryText, l.style.fontSize = "12px", b.append(l);
        return;
      }
      for (const l of a) {
        const u = l.id === w, P = document.createElement("div");
        P.style.display = "flex", P.style.alignItems = "center", P.style.justifyContent = "space-between", P.style.gap = "8px";
        const J = document.createElement("div");
        J.style.flex = "1", J.style.minWidth = "0", J.style.overflow = "hidden";
        const B = document.createElement("div");
        B.textContent = l.name || `${l.username}@${l.host}`, B.title = B.textContent, B.style.color = s.text, B.style.fontSize = "14px", B.style.fontWeight = u ? "600" : "500", B.style.lineHeight = "20px", B.style.maxWidth = "200px", B.style.overflow = "hidden", B.style.textOverflow = "ellipsis", B.style.whiteSpace = "nowrap";
        const W = document.createElement("div");
        W.textContent = `${l.username}@${l.host}:${l.port}`, W.title = W.textContent, W.style.color = s.secondaryText, W.style.fontSize = "12px", W.style.lineHeight = "18px", W.style.maxWidth = "200px", W.style.overflow = "hidden", W.style.textOverflow = "ellipsis", W.style.whiteSpace = "nowrap";
        const L = document.createElement("div");
        L.textContent = l.jump_host_name ? `via ${l.jump_host_name}` : "", L.title = L.textContent, L.style.color = s.secondaryText, L.style.fontSize = "12px", L.style.lineHeight = "18px", L.style.maxWidth = "200px", L.style.overflow = "hidden", L.style.textOverflow = "ellipsis", L.style.whiteSpace = "nowrap", L.style.display = l.jump_host_name ? "" : "none";
        const R = document.createElement("button");
        R.type = "button", R.textContent = u ? "Disconnect" : "Connect", R.style.height = "28px", R.style.padding = "0 10px", R.style.border = u ? `1px solid ${s.errorBorder}` : `1px solid ${s.primary}`, R.style.borderRadius = "4px", R.style.background = u ? s.bgElevated : s.primary, R.style.color = u ? s.error : s.primaryText, R.style.cursor = "pointer", R.addEventListener("click", async () => {
          const K = U();
          if (!K) {
            f.error("No active session. Open a chat first.");
            return;
          }
          R.disabled = !0, R.textContent = u ? "Disconnecting" : "Connecting";
          try {
            u ? (await T(`/remote/connections/${K}`, {
              method: "DELETE"
            }), f.success("Disconnected")) : (await T(`/remote/profiles/${l.id}/connect`, {
              method: "POST",
              body: JSON.stringify({ session_id: K })
            }), f.success(`Connected to ${l.name}`)), await $();
          } catch (se) {
            f.error(
              `${u ? "Disconnect" : "Connection"} failed: ${se.message}`
            );
          } finally {
            R.disabled = !1;
          }
        }), J.append(B, W, L), P.append(J, R), b.append(P);
      }
    }, i = (a, w = [], l = "", u = "") => {
      if (Q = a, a) {
        const P = `${a.username}@${a.host}:${a.port}`;
        d.style.borderColor = s.successBorder, d.style.background = s.successBg, d.style.color = s.success, _.style.background = s.success, H.textContent = `${a.username}@${a.host}`, d.title = P, S.textContent = "SSH Connected", O.textContent = `${P}
Uptime: ${Math.round(
          a.uptime_seconds || 0
        )}s
Work Dir: ${a.default_cwd || "/"}`, O.style.whiteSpace = "pre-line", g.style.display = "";
      } else
        d.style.borderColor = u ? s.errorBorder : s.border, d.style.background = u ? s.errorBg : s.bgContainer, d.style.color = u ? s.error : s.text, _.style.background = u ? s.error : s.secondaryText, H.textContent = u ? "SSH Error" : "SSH Offline", d.title = u || "No active SSH connection", S.textContent = u ? "SSH Status Error" : "SSH Offline", O.textContent = u || "No active SSH connection for this chat.", O.style.whiteSpace = "normal", g.style.display = "none";
      q(w, l);
    }, $ = async () => {
      try {
        const a = U() || "", w = encodeURIComponent(a), [l, u] = await Promise.all([
          T(`/remote/connections?session_id=${w}`),
          T(`/remote/profiles?session_id=${w}`)
        ]), P = l.connections || [];
        i(
          P.length > 0 ? P[0] : null,
          u.profiles || [],
          u.active_profile_id || ""
        );
      } catch (a) {
        i(null, [], "", a.message || "Failed to load SSH status.");
      }
    }, M = () => {
      const a = d.getBoundingClientRect();
      p.style.top = `${a.bottom + 8}px`, p.style.left = `${Math.min(
        a.left,
        window.innerWidth - 340
      )}px`;
    };
    return d.addEventListener("click", () => {
      M(), p.style.display = p.style.display === "none" ? "block" : "none";
    }), document.addEventListener("click", (a) => {
      D.contains(a.target) || (p.style.display = "none");
    }), g.addEventListener("click", async () => {
      const a = U();
      if (!(!a || !Q))
        try {
          await T(`/remote/connections/${a}`, {
            method: "DELETE"
          }), f.success("Disconnected"), await $();
        } catch (w) {
          f.error(`Disconnect failed: ${w.message}`);
        }
    }), $(), window.setInterval($, 5e3), !0;
  }
  function Ee() {
    if (ge()) return;
    let n = 0;
    const r = 40;
    let o = null;
    const m = () => {
      if (n += 1, ge()) {
        o == null || o.disconnect(), window.clearInterval(c);
        return;
      }
      n >= r && (o == null || o.disconnect(), window.clearInterval(c));
    }, c = window.setInterval(m, 250);
    o = new MutationObserver(m), o.observe(document.body, { childList: !0, subtree: !0 });
  }
  (xe = (we = window.QwenPaw).registerToolRender) == null || xe.call(we, "remote", {
    remote_connect: Ae,
    remote_disconnect: Fe,
    remote_list: Je,
    remote_exec: Me
  }), (Se = (ve = window.QwenPaw).registerRoutes) == null || Se.call(ve, "remote", [
    {
      path: "/remote",
      component: je,
      label: "Remote SSH",
      icon: "🔗",
      priority: 20
    }
  ]), Qe() ? window.setTimeout(Ee, 750) : Ee();
}
function Ce() {
  var e, N;
  const v = (e = window.QwenPaw) == null ? void 0 : e.host;
  return !!(v != null && v.React && (v != null && v.antd) && (v != null && v.getApiUrl) && (v != null && v.getApiToken) && ((N = window.QwenPaw) != null && N.registerRoutes));
}
function Ve() {
  if (Ce()) {
    be();
    return;
  }
  let v = 0;
  const e = 120;
  let N = null;
  const X = () => {
    if (v += 1, Ce()) {
      N == null || N.disconnect(), window.clearInterval(Y), be();
      return;
    }
    v >= e && (N == null || N.disconnect(), window.clearInterval(Y), console.warn("[Remote] QwenPaw.host not available, plugin not loaded"));
  }, Y = window.setInterval(X, 250);
  document.body && (N = new MutationObserver(X), N.observe(document.body, { childList: !0, subtree: !0 }));
}
Ve();
