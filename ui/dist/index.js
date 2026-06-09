function ze() {
  var q, X, Y, Z;
  const { React: e, antd: te, antdIcons: ne, getApiUrl: oe, getApiToken: se } = window.QwenPaw.host, {
    Card: L,
    Tag: U,
    Typography: re,
    Space: g,
    Button: N,
    Input: D,
    Form: R,
    Modal: le,
    Spin: ce,
    Alert: ie,
    Switch: ae,
    message: f,
    List: de,
    Badge: B,
    Popconfirm: me,
    Empty: ue,
    Tooltip: M,
    Popover: pe
  } = te, { Text: E, Title: ye, Paragraph: fe } = re, { useState: $, useEffect: Q, useCallback: J } = e, {
    CloudOutlined: K,
    LinkOutlined: he,
    DisconnectOutlined: ge,
    CodeOutlined: Ee,
    ReloadOutlined: we,
    PlusOutlined: Se,
    DeleteOutlined: xe,
    EditOutlined: be,
    LoadingOutlined: ve,
    LaptopOutlined: Ce,
    ThunderboltOutlined: $e
  } = ne || {};
  function V(n) {
    var m, a;
    const s = (a = (m = n == null ? void 0 : n.content) == null ? void 0 : m[0]) == null ? void 0 : a.data, r = s == null ? void 0 : s.arguments;
    if (typeof r == "string")
      try {
        return JSON.parse(r);
      } catch {
        return {};
      }
    return r ?? {};
  }
  function F(n) {
    const s = n == null ? void 0 : n.content;
    return !s || !Array.isArray(s) ? "" : s.filter((r) => r.type === "text").map((r) => r.text || "").join(`
`);
  }
  function _() {
    return window.currentSessionId ?? null;
  }
  async function b(n, s = {}) {
    const r = se(), m = {
      "Content-Type": "application/json",
      ...r ? { Authorization: `Bearer ${r}` } : {},
      ...s.headers || {}
    }, a = await fetch(oe(n), { ...s, headers: m });
    if (!a.ok) {
      const w = await a.text();
      throw new Error(`${a.status}: ${w}`);
    }
    return a.json();
  }
  function Ie({ data: n }) {
    const s = F(n), r = V(n), m = s.includes("Connected to"), a = s.includes("Error") || s.includes("failed");
    return e.createElement(
      L,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${m ? "#52c41a" : a ? "#ff4d4f" : "#1890ff"}`
        }
      },
      e.createElement(
        g,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          g,
          null,
          e.createElement(he || "🔗"),
          e.createElement(E, { strong: !0 }, "Remote SSH Connect"),
          r.host ? e.createElement(
            U,
            { color: "blue" },
            `${r.username}@${r.host}:${r.port || 22}`
          ) : null
        ),
        e.createElement(
          E,
          {
            type: a ? "danger" : "success",
            style: { whiteSpace: "pre-wrap" }
          },
          s
        )
      )
    );
  }
  function ke({ data: n }) {
    const s = F(n), r = s.includes("Disconnected");
    return e.createElement(
      L,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${r ? "#52c41a" : "#faad14"}`
        }
      },
      e.createElement(
        g,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          g,
          null,
          e.createElement(ge || "🔌"),
          e.createElement(E, { strong: !0 }, "Remote SSH Disconnect")
        ),
        e.createElement(
          E,
          { style: { whiteSpace: "pre-wrap" } },
          s
        )
      )
    );
  }
  function Pe({ data: n }) {
    const s = F(n), r = s.includes("Active SSH connection");
    return e.createElement(
      L,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${r ? "#52c41a" : "#d9d9d9"}`
        }
      },
      e.createElement(
        g,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          g,
          null,
          e.createElement(K || "☁"),
          e.createElement(E, { strong: !0 }, "Remote SSH Status"),
          r ? e.createElement(B, {
            status: "success",
            text: "Connected"
          }) : e.createElement(B, {
            status: "default",
            text: "Not Connected"
          })
        ),
        e.createElement(
          E,
          { style: { whiteSpace: "pre-wrap" } },
          s
        )
      )
    );
  }
  function Re({ data: n }) {
    const s = F(n), r = V(n), m = s.includes("[remote:"), a = s.includes("failed with exit code");
    return e.createElement(
      L,
      {
        size: "small",
        style: {
          marginTop: 8,
          borderLeft: `3px solid ${a ? "#ff4d4f" : m ? "#722ed1" : "#d9d9d9"}`
        }
      },
      e.createElement(
        g,
        { direction: "vertical", style: { width: "100%" } },
        e.createElement(
          g,
          null,
          e.createElement(Ee || ">_"),
          e.createElement(E, { strong: !0 }, "Remote Command"),
          r.command ? e.createElement(
            E,
            { code: !0, ellipsis: !0, style: { maxWidth: 400 } },
            r.command
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
  function Te() {
    const [n, s] = $([]), [r, m] = $(""), [a, w] = $(!1), [c, x] = $(!1), [y, u] = $(null), [P, v] = $(!1), [I, k] = $(null), [i] = R.useForm(), S = J(async () => {
      w(!0);
      try {
        const t = _() || "", l = await b(
          `/remote/profiles?session_id=${encodeURIComponent(t)}`
        );
        s(l.profiles || []), m(l.active_profile_id || "");
      } catch (t) {
        console.error("[Remote] Failed to fetch profiles:", t);
      } finally {
        w(!1);
      }
    }, []);
    Q(() => {
      S();
      const t = setInterval(S, 1e4);
      return () => clearInterval(t);
    }, [S]);
    const O = async (t) => {
      v(!0);
      try {
        await b(
          y ? `/remote/profiles/${y.id}` : "/remote/profiles",
          {
            method: y ? "PUT" : "POST",
            body: JSON.stringify(t)
          }
        ), f.success(
          y ? "Connection profile updated" : "Connection profile saved"
        ), x(!1), u(null), i.resetFields(), S();
      } catch (l) {
        f.error(`Save failed: ${l.message}`);
      } finally {
        v(!1);
      }
    }, A = () => {
      u(null), i.resetFields(), x(!0);
    }, H = (t) => {
      u(t), i.setFieldsValue({
        name: t.name,
        host: t.host,
        port: t.port,
        username: t.username,
        password: "",
        key_path: t.key_path,
        passphrase: ""
      }), x(!0);
    }, d = async (t) => {
      const l = _();
      if (!l) {
        f.error("No active session. Open a chat first.");
        return;
      }
      if (t.id === r)
        try {
          await b(`/remote/connections/${l}`, {
            method: "DELETE"
          }), f.success("Disconnected"), S();
        } catch (T) {
          f.error(`Disconnect failed: ${T.message}`);
        }
      else {
        k(t.id);
        try {
          await b(`/remote/profiles/${t.id}/connect`, {
            method: "POST",
            body: JSON.stringify({ session_id: l })
          }), f.success(`Connected to ${t.name}`), S();
        } catch (T) {
          f.error(`Connection failed: ${T.message}`);
        } finally {
          k(null);
        }
      }
    }, o = async (t) => {
      try {
        await b(`/remote/profiles/${t}`, {
          method: "DELETE"
        }), f.success("Profile deleted"), S();
      } catch (l) {
        f.error(`Delete failed: ${l.message}`);
      }
    }, p = (t) => t === r;
    return e.createElement(
      "div",
      { style: { padding: 24, maxWidth: 900, margin: "0 auto" } },
      // Header
      e.createElement(
        g,
        {
          style: {
            marginBottom: 16,
            width: "100%",
            justifyContent: "space-between"
          }
        },
        e.createElement(
          ye,
          { level: 4, style: { margin: 0 } },
          "Remote SSH"
        ),
        e.createElement(
          g,
          null,
          e.createElement(
            N,
            { icon: e.createElement(we), onClick: S },
            "Refresh"
          ),
          e.createElement(
            N,
            {
              type: "primary",
              icon: e.createElement(Se),
              onClick: A
            },
            "New Connection"
          )
        )
      ),
      // Info alert
      e.createElement(ie, {
        type: "info",
        showIcon: !0,
        style: { marginBottom: 16 },
        message: "Save connection profiles here. Toggle the switch to connect/disconnect. Only one connection can be active at a time. When connected, all shell commands in the current chat execute on the remote machine."
      }),
      // Profile list
      a ? e.createElement(ce, {
        style: { display: "block", margin: "40px auto" }
      }) : n.length === 0 ? e.createElement(
        L,
        null,
        e.createElement(
          ue,
          {
            description: e.createElement(
              fe,
              { type: "secondary" },
              "No saved connections. Click 'New Connection' to add one."
            )
          }
        )
      ) : e.createElement(
        de,
        {
          dataSource: n,
          renderItem: (t) => {
            const l = p(t.id), h = I === t.id;
            return e.createElement(
              L,
              {
                size: "small",
                style: {
                  marginBottom: 8,
                  borderColor: l ? "#52c41a" : void 0
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
                    g,
                    { align: "center" },
                    e.createElement(
                      E,
                      { strong: !0, style: { fontSize: 14 } },
                      t.name || `${t.username}@${t.host}`
                    ),
                    l ? e.createElement(
                      U,
                      { color: "success" },
                      "Connected"
                    ) : null
                  ),
                  e.createElement(
                    "div",
                    { style: { marginTop: 4 } },
                    e.createElement(
                      E,
                      { type: "secondary", style: { fontSize: 12 } },
                      `${t.username}@${t.host}:${t.port}`,
                      t.key_path ? `  |  Key: ${t.key_path}` : ""
                    )
                  )
                ),
                // Right: actions
                e.createElement(
                  g,
                  null,
                  h ? e.createElement(ve, {
                    style: { fontSize: 18 }
                  }) : e.createElement(
                    M,
                    {
                      title: l ? "Disconnect" : "Connect to this device"
                    },
                    e.createElement(ae, {
                      checked: l,
                      onChange: () => d(t),
                      checkedChildren: "ON",
                      unCheckedChildren: "OFF"
                    })
                  ),
                  e.createElement(
                    M,
                    { title: "Edit this connection profile" },
                    e.createElement(N, {
                      type: "text",
                      size: "small",
                      icon: e.createElement(be),
                      onClick: () => H(t)
                    })
                  ),
                  e.createElement(
                    me,
                    {
                      title: "Delete this connection profile?",
                      onConfirm: () => o(t.id),
                      okText: "Delete",
                      cancelText: "Cancel",
                      okButtonProps: { danger: !0 }
                    },
                    e.createElement(N, {
                      type: "text",
                      danger: !0,
                      size: "small",
                      icon: e.createElement(xe)
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
        le,
        {
          title: y ? "Edit SSH Connection" : "New SSH Connection",
          open: c,
          onCancel: () => {
            x(!1), u(null), i.resetFields();
          },
          footer: null
        },
        e.createElement(
          R,
          { form: i, layout: "vertical", onFinish: O },
          e.createElement(
            R.Item,
            { name: "name", label: "Display Name" },
            e.createElement(D, {
              placeholder: "My Server (optional, auto-generated if empty)"
            })
          ),
          e.createElement(
            R.Item,
            {
              name: "host",
              label: "Host",
              rules: [{ required: !0, message: "Please enter the host" }]
            },
            e.createElement(D, {
              placeholder: "192.168.1.100 or example.com"
            })
          ),
          e.createElement(
            g,
            { style: { width: "100%" } },
            e.createElement(
              R.Item,
              {
                name: "port",
                label: "Port",
                initialValue: 22,
                style: { width: 120 }
              },
              e.createElement(D, { type: "number" })
            ),
            e.createElement(
              R.Item,
              {
                name: "username",
                label: "Username",
                initialValue: "root",
                style: { flex: 1 }
              },
              e.createElement(D)
            )
          ),
          e.createElement(
            R.Item,
            { name: "password", label: "Password" },
            e.createElement(D.Password, {
              placeholder: y ? "Leave empty to keep the saved password" : "Leave empty if using key auth"
            })
          ),
          e.createElement(
            R.Item,
            { name: "key_path", label: "SSH Key Path" },
            e.createElement(D, {
              placeholder: "/home/user/.ssh/id_rsa (optional)"
            })
          ),
          e.createElement(
            R.Item,
            { name: "passphrase", label: "Key Passphrase" },
            e.createElement(D.Password, {
              placeholder: y ? "Leave empty to keep the saved passphrase" : "If key is encrypted"
            })
          ),
          e.createElement(
            R.Item,
            null,
            e.createElement(
              N,
              {
                type: "primary",
                htmlType: "submit",
                loading: P,
                style: { width: "100%" }
              },
              y ? "Update Profile" : "Save Profile"
            )
          )
        )
      )
    );
  }
  function Oe() {
    const [n, s] = $(null), [r, m] = $([]), [a, w] = $(""), [c, x] = $(null), [y, u] = $(!1), [P, v] = $(""), I = J(async () => {
      try {
        u(!0), v("");
        const d = _() || "", o = encodeURIComponent(d), [p, t] = await Promise.all([
          b(`/remote/connections?session_id=${o}`),
          b(`/remote/profiles?session_id=${o}`)
        ]), l = p.connections || [];
        s(l.length > 0 ? l[0] : null), m(t.profiles || []), w(t.active_profile_id || "");
      } catch (d) {
        v(d.message), s(null);
      } finally {
        u(!1);
      }
    }, []);
    Q(() => {
      I();
      const d = setInterval(I, 5e3);
      return () => clearInterval(d);
    }, [I]);
    const k = async (d) => {
      const o = _();
      if (!o) {
        f.error("No active session. Open a chat first.");
        return;
      }
      const p = d.id === a;
      x(d.id);
      try {
        p ? (await b(`/remote/connections/${o}`, {
          method: "DELETE"
        }), f.success("Disconnected")) : (await b(`/remote/profiles/${d.id}/connect`, {
          method: "POST",
          body: JSON.stringify({ session_id: o })
        }), f.success(`Connected to ${d.name}`)), I();
      } catch (t) {
        f.error(
          `${p ? "Disconnect" : "Connection"} failed: ${t.message}`
        );
      } finally {
        x(null);
      }
    }, i = n !== null, S = (n == null ? void 0 : n.uptime_seconds) || 0;
    let O = "";
    i && (S < 60 ? O = `${S.toFixed(0)}s` : S < 3600 ? O = `${(S / 60).toFixed(0)}m` : O = `${(S / 3600).toFixed(1)}h`);
    const A = e.createElement(
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
          border: `1px solid ${i ? "#b7eb8f" : "#d9d9d9"}`,
          borderRadius: 6,
          background: i ? "#f6ffed" : "#fff",
          color: i ? "#237804" : "#595959",
          font: "inherit",
          cursor: "pointer",
          whiteSpace: "nowrap",
          overflow: "hidden"
        },
        "aria-label": i ? `SSH connected to ${n.username}@${n.host}` : "SSH disconnected"
      },
      e.createElement(B, {
        status: i ? "success" : P ? "error" : "default"
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
        i ? `${n.username}@${n.host}` : y ? "SSH Checking" : "SSH Offline"
      )
    ), H = e.createElement(
      "div",
      { style: { width: 320 } },
      e.createElement(
        g,
        { direction: "vertical", size: 10, style: { width: "100%" } },
        i ? e.createElement(
          g,
          { direction: "vertical", size: 6, style: { width: "100%" } },
          e.createElement(
            g,
            { align: "center" },
            e.createElement(Ce || K || "span"),
            e.createElement(E, { strong: !0 }, "SSH Connected")
          ),
          e.createElement(
            E,
            { code: !0, ellipsis: !0, style: { maxWidth: 296 } },
            `${n.username}@${n.host}:${n.port}`
          ),
          e.createElement(
            g,
            { size: 6 },
            e.createElement($e || "span"),
            e.createElement(E, { type: "secondary" }, O)
          )
        ) : e.createElement(
          E,
          { type: P ? "danger" : "secondary", style: { fontSize: 12 } },
          P || "No active SSH connection for this chat."
        ),
        e.createElement(
          "div",
          { style: { borderTop: "1px solid #f0f0f0", paddingTop: 8 } },
          e.createElement(E, { strong: !0 }, "Saved Devices")
        ),
        r.length === 0 ? e.createElement(
          E,
          { type: "secondary", style: { fontSize: 12 } },
          "No saved devices. Add one from Remote SSH."
        ) : e.createElement(
          g,
          { direction: "vertical", size: 6, style: { width: "100%" } },
          ...r.map((d) => {
            const o = d.id === a;
            return e.createElement(
              "div",
              {
                key: d.id,
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8
                }
              },
              e.createElement(
                "div",
                { style: { minWidth: 0 } },
                e.createElement(
                  E,
                  { strong: o, ellipsis: !0, style: { maxWidth: 190 } },
                  d.name || `${d.username}@${d.host}`
                ),
                e.createElement(
                  "div",
                  null,
                  e.createElement(
                    E,
                    {
                      type: "secondary",
                      ellipsis: !0,
                      style: { maxWidth: 190, fontSize: 12 }
                    },
                    `${d.username}@${d.host}:${d.port}`
                  )
                )
              ),
              e.createElement(
                N,
                {
                  size: "small",
                  type: o ? "default" : "primary",
                  danger: o,
                  loading: c === d.id,
                  onClick: () => k(d)
                },
                o ? "Disconnect" : "Connect"
              )
            );
          })
        )
      )
    );
    return e.createElement(
      pe,
      {
        content: H,
        trigger: "click",
        placement: "bottom"
      },
      e.createElement(M, {
        title: i ? `${n.username}@${n.host}:${n.port}` : "No active SSH connection"
      }, A)
    );
  }
  function He() {
    const n = window.QwenPaw, s = {
      id: "remote-ssh-status",
      key: "remote-ssh-status",
      pluginId: "remote",
      label: "Remote SSH",
      component: Oe,
      priority: 15,
      placement: "left"
    }, r = [
      ["registerHeaderWidget", [s]],
      ["registerTopBarItem", [s]],
      ["registerNavWidget", [s]],
      ["registerNavbarItem", [s]],
      ["registerToolbarItem", [s]],
      ["registerStatusWidget", [s]],
      ["registerSlot", ["header:left", s]],
      ["registerSlot", ["topbar:left", s]]
    ];
    for (const [m, a] of r) {
      const w = n == null ? void 0 : n[m];
      if (typeof w == "function")
        try {
          return w.apply(n, a), !0;
        } catch (c) {
          console.warn(`[Remote] ${m} failed:`, c);
        }
    }
    return console.warn(
      "[Remote] No QwenPaw header extension API found; SSH status indicator was not registered."
    ), !1;
  }
  function G() {
    if (document.getElementById("remote-ssh-header-status")) return !0;
    const s = Array.from(
      document.querySelectorAll(
        "button,a,[role='button'],span,div"
      )
    ).filter((o) => {
      const p = (o.textContent || "").trim(), t = o.getBoundingClientRect();
      return t.top >= 0 && t.top < 96 && t.width > 0 && t.width < 320 && t.height > 0 && (p.includes("文档资料") || p.includes("GitHub") || p.includes("代码"));
    }), m = Array.from(
      new Set(
        s.map(
          (o) => o.closest("button,a,[role='button']") || o
        )
      )
    ).sort((o, p) => {
      const t = (l) => {
        const h = (l.textContent || "").trim(), T = l.getBoundingClientRect();
        return (h === "文档资料" || h === "GitHub" || h === "代码" ? 0 : 1e4) + T.width * T.height;
      };
      return t(o) - t(p);
    })[0], a = m == null ? void 0 : m.parentElement;
    if (!m || !a)
      return console.warn("[Remote] Header DOM mount point not found."), !1;
    const w = document.createElement("div");
    w.id = "remote-ssh-header-status", w.style.display = "inline-flex", w.style.alignItems = "center", w.style.margin = "0 8px";
    const c = document.createElement("button");
    c.type = "button", c.style.height = "38px", c.style.minWidth = "156px", c.style.maxWidth = "220px", c.style.padding = "0 12px", c.style.display = "inline-flex", c.style.alignItems = "center", c.style.justifyContent = "center", c.style.gap = "8px", c.style.border = "1px solid #d9d9d9", c.style.borderRadius = "6px", c.style.background = "#fff", c.style.color = "#595959", c.style.font = "inherit", c.style.cursor = "pointer", c.style.whiteSpace = "nowrap";
    const x = document.createElement("span");
    x.style.width = "8px", x.style.height = "8px", x.style.borderRadius = "50%", x.style.background = "#bfbfbf", x.style.flex = "0 0 auto";
    const y = document.createElement("span");
    y.textContent = "SSH Offline", y.style.minWidth = "0", y.style.overflow = "hidden", y.style.textOverflow = "ellipsis", y.style.fontSize = "14px", y.style.fontWeight = "600";
    const u = document.createElement("div");
    u.style.position = "fixed", u.style.zIndex = "10000", u.style.width = "320px", u.style.padding = "12px", u.style.border = "1px solid #d9d9d9", u.style.borderRadius = "8px", u.style.background = "#fff", u.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)", u.style.display = "none";
    const P = document.createElement("div");
    P.style.fontWeight = "600", P.style.marginBottom = "8px";
    const v = document.createElement("div");
    v.style.fontSize = "12px", v.style.color = "#595959", v.style.wordBreak = "break-all";
    const I = document.createElement("div");
    I.textContent = "Saved Devices", I.style.marginTop = "10px", I.style.paddingTop = "10px", I.style.borderTop = "1px solid #f0f0f0", I.style.fontWeight = "600";
    const k = document.createElement("div");
    k.style.display = "flex", k.style.flexDirection = "column", k.style.gap = "6px", k.style.marginTop = "8px";
    const i = document.createElement("button");
    i.type = "button", i.textContent = "Disconnect", i.style.marginTop = "10px", i.style.height = "28px", i.style.padding = "0 10px", i.style.border = "1px solid #ffccc7", i.style.borderRadius = "4px", i.style.background = "#fff", i.style.color = "#cf1322", i.style.cursor = "pointer", i.style.display = "none", u.append(P, v, i, I, k), c.append(x, y), w.append(c, u), a.insertBefore(w, m);
    let S = null;
    const O = (o, p) => {
      if (k.replaceChildren(), o.length === 0) {
        const t = document.createElement("div");
        t.textContent = "No saved devices. Add one from Remote SSH.", t.style.color = "#8c8c8c", t.style.fontSize = "12px", k.append(t);
        return;
      }
      for (const t of o) {
        const l = t.id === p, h = document.createElement("div");
        h.style.display = "flex", h.style.alignItems = "center", h.style.justifyContent = "space-between", h.style.gap = "8px";
        const T = document.createElement("div");
        T.style.minWidth = "0";
        const z = document.createElement("div");
        z.textContent = t.name || `${t.username}@${t.host}`, z.style.fontWeight = l ? "600" : "400", z.style.overflow = "hidden", z.style.textOverflow = "ellipsis", z.style.whiteSpace = "nowrap";
        const W = document.createElement("div");
        W.textContent = `${t.username}@${t.host}:${t.port}`, W.style.color = "#8c8c8c", W.style.fontSize = "12px", W.style.overflow = "hidden", W.style.textOverflow = "ellipsis", W.style.whiteSpace = "nowrap";
        const C = document.createElement("button");
        C.type = "button", C.textContent = l ? "Disconnect" : "Connect", C.style.height = "28px", C.style.padding = "0 10px", C.style.border = l ? "1px solid #ffccc7" : "1px solid #1677ff", C.style.borderRadius = "4px", C.style.background = l ? "#fff" : "#1677ff", C.style.color = l ? "#cf1322" : "#fff", C.style.cursor = "pointer", C.addEventListener("click", async () => {
          const j = _();
          if (!j) {
            f.error("No active session. Open a chat first.");
            return;
          }
          C.disabled = !0, C.textContent = l ? "Disconnecting" : "Connecting";
          try {
            l ? (await b(`/remote/connections/${j}`, {
              method: "DELETE"
            }), f.success("Disconnected")) : (await b(`/remote/profiles/${t.id}/connect`, {
              method: "POST",
              body: JSON.stringify({ session_id: j })
            }), f.success(`Connected to ${t.name}`)), await H();
          } catch (_e) {
            f.error(
              `${l ? "Disconnect" : "Connection"} failed: ${_e.message}`
            );
          } finally {
            C.disabled = !1;
          }
        }), T.append(z, W), h.append(T, C), k.append(h);
      }
    }, A = (o, p = [], t = "", l = "") => {
      if (S = o, o) {
        const h = `${o.username}@${o.host}:${o.port}`;
        c.style.borderColor = "#b7eb8f", c.style.background = "#f6ffed", c.style.color = "#237804", x.style.background = "#52c41a", y.textContent = `${o.username}@${o.host}`, c.title = h, P.textContent = "SSH Connected", v.textContent = `${h}
Uptime: ${Math.round(
          o.uptime_seconds || 0
        )}s
Work Dir: ${o.default_cwd || "/"}`, v.style.whiteSpace = "pre-line", i.style.display = "";
      } else
        c.style.borderColor = l ? "#ffccc7" : "#d9d9d9", c.style.background = "#fff", c.style.color = l ? "#cf1322" : "#595959", x.style.background = l ? "#ff4d4f" : "#bfbfbf", y.textContent = l ? "SSH Error" : "SSH Offline", c.title = l || "No active SSH connection", P.textContent = l ? "SSH Status Error" : "SSH Offline", v.textContent = l || "No active SSH connection for this chat.", v.style.whiteSpace = "normal", i.style.display = "none";
      O(p, t);
    }, H = async () => {
      try {
        const o = _() || "", p = encodeURIComponent(o), [t, l] = await Promise.all([
          b(`/remote/connections?session_id=${p}`),
          b(`/remote/profiles?session_id=${p}`)
        ]), h = t.connections || [];
        A(
          h.length > 0 ? h[0] : null,
          l.profiles || [],
          l.active_profile_id || ""
        );
      } catch (o) {
        A(null, [], "", o.message || "Failed to load SSH status.");
      }
    }, d = () => {
      const o = c.getBoundingClientRect();
      u.style.top = `${o.bottom + 8}px`, u.style.left = `${Math.min(
        o.left,
        window.innerWidth - 340
      )}px`;
    };
    return c.addEventListener("click", () => {
      d(), u.style.display = u.style.display === "none" ? "block" : "none";
    }), document.addEventListener("click", (o) => {
      w.contains(o.target) || (u.style.display = "none");
    }), i.addEventListener("click", async () => {
      const o = _();
      if (!(!o || !S))
        try {
          await b(`/remote/connections/${o}`, {
            method: "DELETE"
          }), f.success("Disconnected"), await H();
        } catch (p) {
          f.error(`Disconnect failed: ${p.message}`);
        }
    }), H(), window.setInterval(H, 5e3), !0;
  }
  function De() {
    if (G()) return;
    let n = 0;
    const s = 40;
    let r = null;
    const m = () => {
      if (n += 1, G()) {
        r == null || r.disconnect(), window.clearInterval(a);
        return;
      }
      n >= s && (r == null || r.disconnect(), window.clearInterval(a));
    }, a = window.setInterval(m, 250);
    r = new MutationObserver(m), r.observe(document.body, { childList: !0, subtree: !0 });
  }
  (X = (q = window.QwenPaw).registerToolRender) == null || X.call(q, "remote", {
    remote_connect: Ie,
    remote_disconnect: ke,
    remote_list: Pe,
    remote_exec: Re
  }), (Z = (Y = window.QwenPaw).registerRoutes) == null || Z.call(Y, "remote", [
    {
      path: "/remote",
      component: Te,
      label: "Remote SSH",
      icon: "🔗",
      priority: 20
    }
  ]), He() || De();
}
var ee;
(ee = window.QwenPaw) != null && ee.host ? ze() : console.warn("[Remote] QwenPaw.host not available, plugin not loaded");
