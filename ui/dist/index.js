function ge() {
  var R, $, T, k;
  const { React: e, antd: z, antdIcons: F, getApiUrl: N, getApiToken: A } = window.QwenPaw.host, {
    Card: y,
    Tag: b,
    Typography: H,
    Space: l,
    Button: f,
    Input: p,
    Form: s,
    Modal: B,
    Descriptions: we,
    Spin: j,
    Alert: Q,
    Switch: M,
    message: d,
    List: W,
    Badge: x,
    Popconfirm: J,
    Empty: K,
    Tooltip: U
  } = z, { Text: i, Title: V, Paragraph: q } = H, { useState: h, useEffect: G, useCallback: X } = e, {
    CloudOutlined: Y,
    LinkOutlined: Z,
    DisconnectOutlined: ee,
    CodeOutlined: te,
    ReloadOutlined: ne,
    PlusOutlined: oe,
    DeleteOutlined: re,
    LoadingOutlined: ce
  } = F || {};
  function P(r) {
    var m, a;
    const n = (a = (m = r == null ? void 0 : r.content) == null ? void 0 : m[0]) == null ? void 0 : a.data, o = n == null ? void 0 : n.arguments;
    if (typeof o == "string")
      try {
        return JSON.parse(o);
      } catch {
        return {};
      }
    return o ?? {};
  }
  function g(r) {
    const n = r == null ? void 0 : r.content;
    return !n || !Array.isArray(n) ? "" : n.filter((o) => o.type === "text").map((o) => o.text || "").join(`
`);
  }
  function I() {
    return window.currentSessionId ?? null;
  }
  async function E(r, n = {}) {
    const o = A(), m = {
      "Content-Type": "application/json",
      ...o ? { Authorization: `Bearer ${o}` } : {},
      ...n.headers || {}
    }, a = await fetch(N(r), { ...n, headers: m });
    if (!a.ok) {
      const w = await a.text();
      throw new Error(`${a.status}: ${w}`);
    }
    return a.json();
  }
  function ae({ data: r }) {
    const n = g(r), o = P(r), m = n.includes("Connected to"), a = n.includes("Error") || n.includes("failed");
    return e.createElement(
      y,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${m ? "#52c41a" : a ? "#ff4d4f" : "#1890ff"}`
        }
      },
      e.createElement(
        l,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          l,
          null,
          e.createElement(Z || "🔗"),
          e.createElement(i, { strong: !0 }, "Remote SSH Connect"),
          o.host ? e.createElement(
            b,
            { color: "blue" },
            `${o.username}@${o.host}:${o.port || 22}`
          ) : null
        ),
        e.createElement(
          i,
          {
            type: a ? "danger" : "success",
            style: { whiteSpace: "pre-wrap" }
          },
          n
        )
      )
    );
  }
  function le({ data: r }) {
    const n = g(r), o = n.includes("Disconnected");
    return e.createElement(
      y,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${o ? "#52c41a" : "#faad14"}`
        }
      },
      e.createElement(
        l,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          l,
          null,
          e.createElement(ee || "🔌"),
          e.createElement(i, { strong: !0 }, "Remote SSH Disconnect")
        ),
        e.createElement(
          i,
          { style: { whiteSpace: "pre-wrap" } },
          n
        )
      )
    );
  }
  function se({ data: r }) {
    const n = g(r), o = n.includes("Active SSH connection");
    return e.createElement(
      y,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${o ? "#52c41a" : "#d9d9d9"}`
        }
      },
      e.createElement(
        l,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          l,
          null,
          e.createElement(Y || "☁"),
          e.createElement(i, { strong: !0 }, "Remote SSH Status"),
          o ? e.createElement(x, {
            status: "success",
            text: "Connected"
          }) : e.createElement(x, {
            status: "default",
            text: "Not Connected"
          })
        ),
        e.createElement(
          i,
          { style: { whiteSpace: "pre-wrap" } },
          n
        )
      )
    );
  }
  function ie({ data: r }) {
    const n = g(r), o = P(r), m = n.includes("[remote:"), a = n.includes("failed with exit code");
    return e.createElement(
      y,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${a ? "#ff4d4f" : m ? "#722ed1" : "#d9d9d9"}`
        }
      },
      e.createElement(
        l,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          l,
          null,
          e.createElement(te || ">_"),
          e.createElement(i, { strong: !0 }, "Remote Command"),
          o.command ? e.createElement(
            i,
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
          n
        )
      )
    );
  }
  function me() {
    const [r, n] = h([]), [o, m] = h(""), [a, w] = h(!1), [de, S] = h(!1), [ue, O] = h(!1), [pe, D] = h(null), [C] = s.useForm(), u = X(async () => {
      w(!0);
      try {
        const t = I() || "", c = await E(
          `/remote/profiles?session_id=${encodeURIComponent(t)}`
        );
        n(c.profiles || []), m(c.active_profile_id || "");
      } catch (t) {
        console.error("[Remote] Failed to fetch profiles:", t);
      } finally {
        w(!1);
      }
    }, []);
    G(() => {
      u();
      const t = setInterval(u, 1e4);
      return () => clearInterval(t);
    }, [u]);
    const ye = async (t) => {
      O(!0);
      try {
        await E("/remote/profiles", {
          method: "POST",
          body: JSON.stringify(t)
        }), d.success("Connection profile saved"), S(!1), C.resetFields(), u();
      } catch (c) {
        d.error(`Save failed: ${c.message}`);
      } finally {
        O(!1);
      }
    }, he = async (t) => {
      const c = I();
      if (!c) {
        d.error("No active session. Open a chat first.");
        return;
      }
      if (t.id === o)
        try {
          await E(`/remote/connections/${c}`, {
            method: "DELETE"
          }), d.success("Disconnected"), u();
        } catch (v) {
          d.error(`Disconnect failed: ${v.message}`);
        }
      else {
        D(t.id);
        try {
          await E(`/remote/profiles/${t.id}/connect`, {
            method: "POST",
            body: JSON.stringify({ session_id: c })
          }), d.success(`Connected to ${t.name}`), u();
        } catch (v) {
          d.error(`Connection failed: ${v.message}`);
        } finally {
          D(null);
        }
      }
    }, Ee = async (t) => {
      try {
        await E(`/remote/profiles/${t}`, {
          method: "DELETE"
        }), d.success("Profile deleted"), u();
      } catch (c) {
        d.error(`Delete failed: ${c.message}`);
      }
    }, fe = (t) => t === o;
    return e.createElement(
      "div",
      { style: { padding: 24, maxWidth: 900, margin: "0 auto" } },
      // Header
      e.createElement(
        l,
        {
          style: {
            marginBottom: 16,
            width: "100%",
            justifyContent: "space-between"
          }
        },
        e.createElement(
          V,
          { level: 4, style: { margin: 0 } },
          "Remote SSH"
        ),
        e.createElement(
          l,
          null,
          e.createElement(
            f,
            { icon: e.createElement(ne), onClick: u },
            "Refresh"
          ),
          e.createElement(
            f,
            {
              type: "primary",
              icon: e.createElement(oe),
              onClick: () => S(!0)
            },
            "New Connection"
          )
        )
      ),
      // Info alert
      e.createElement(Q, {
        type: "info",
        showIcon: !0,
        style: { marginBottom: 16 },
        message: "Save connection profiles here. Toggle the switch to connect/disconnect. Only one connection can be active at a time. When connected, all shell commands in the current chat execute on the remote machine."
      }),
      // Profile list
      a ? e.createElement(j, {
        style: { display: "block", margin: "40px auto" }
      }) : r.length === 0 ? e.createElement(
        y,
        null,
        e.createElement(
          K,
          {
            description: e.createElement(
              q,
              { type: "secondary" },
              "No saved connections. Click 'New Connection' to add one."
            )
          }
        )
      ) : e.createElement(
        W,
        {
          dataSource: r,
          renderItem: (t) => {
            const c = fe(t.id), _ = pe === t.id;
            return e.createElement(
              y,
              {
                size: "small",
                style: {
                  marginBottom: 8,
                  borderColor: c ? "#52c41a" : void 0
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
                    l,
                    { align: "center" },
                    e.createElement(
                      i,
                      { strong: !0, style: { fontSize: 14 } },
                      t.name || `${t.username}@${t.host}`
                    ),
                    c ? e.createElement(
                      b,
                      { color: "success" },
                      "Connected"
                    ) : null
                  ),
                  e.createElement(
                    "div",
                    { style: { marginTop: 4 } },
                    e.createElement(
                      i,
                      { type: "secondary", style: { fontSize: 12 } },
                      `${t.username}@${t.host}:${t.port}`,
                      t.key_path ? `  |  Key: ${t.key_path}` : ""
                    )
                  )
                ),
                // Right: actions
                e.createElement(
                  l,
                  null,
                  _ ? e.createElement(ce, {
                    style: { fontSize: 18 }
                  }) : e.createElement(
                    U,
                    {
                      title: c ? "Disconnect" : "Connect to this device"
                    },
                    e.createElement(M, {
                      checked: c,
                      onChange: () => he(t),
                      checkedChildren: "ON",
                      unCheckedChildren: "OFF"
                    })
                  ),
                  e.createElement(
                    J,
                    {
                      title: "Delete this connection profile?",
                      onConfirm: () => Ee(t.id),
                      okText: "Delete",
                      cancelText: "Cancel",
                      okButtonProps: { danger: !0 }
                    },
                    e.createElement(f, {
                      type: "text",
                      danger: !0,
                      size: "small",
                      icon: e.createElement(re)
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
        B,
        {
          title: "New SSH Connection",
          open: de,
          onCancel: () => {
            S(!1), C.resetFields();
          },
          footer: null
        },
        e.createElement(
          s,
          { form: C, layout: "vertical", onFinish: ye },
          e.createElement(
            s.Item,
            { name: "name", label: "Display Name" },
            e.createElement(p, {
              placeholder: "My Server (optional, auto-generated if empty)"
            })
          ),
          e.createElement(
            s.Item,
            {
              name: "host",
              label: "Host",
              rules: [{ required: !0, message: "Please enter the host" }]
            },
            e.createElement(p, {
              placeholder: "192.168.1.100 or example.com"
            })
          ),
          e.createElement(
            l,
            { style: { width: "100%" } },
            e.createElement(
              s.Item,
              {
                name: "port",
                label: "Port",
                initialValue: 22,
                style: { width: 120 }
              },
              e.createElement(p, { type: "number" })
            ),
            e.createElement(
              s.Item,
              {
                name: "username",
                label: "Username",
                initialValue: "root",
                style: { flex: 1 }
              },
              e.createElement(p)
            )
          ),
          e.createElement(
            s.Item,
            { name: "password", label: "Password" },
            e.createElement(p.Password, {
              placeholder: "Leave empty if using key auth"
            })
          ),
          e.createElement(
            s.Item,
            { name: "key_path", label: "SSH Key Path" },
            e.createElement(p, {
              placeholder: "/home/user/.ssh/id_rsa (optional)"
            })
          ),
          e.createElement(
            s.Item,
            { name: "passphrase", label: "Key Passphrase" },
            e.createElement(p.Password, {
              placeholder: "If key is encrypted"
            })
          ),
          e.createElement(
            s.Item,
            null,
            e.createElement(
              f,
              {
                type: "primary",
                htmlType: "submit",
                loading: ue,
                style: { width: "100%" }
              },
              "Save Profile"
            )
          )
        )
      )
    );
  }
  ($ = (R = window.QwenPaw).registerToolRender) == null || $.call(R, "remote", {
    remote_connect: ae,
    remote_disconnect: le,
    remote_list: se,
    remote_exec: ie
  }), (k = (T = window.QwenPaw).registerRoutes) == null || k.call(T, "remote", [
    {
      path: "/remote",
      component: me,
      label: "Remote SSH",
      icon: "🔗",
      priority: 20
    }
  ]);
}
var L;
(L = window.QwenPaw) != null && L.host ? ge() : console.warn("[Remote] QwenPaw.host not available, plugin not loaded");
