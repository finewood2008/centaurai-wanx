window.__ModuleLoader__.load({
  id: "@wanxiang/dsh-builder",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    const listeners = new Set();
    let drawerOpen = false;
    const setDrawerOpen = (next) => {
      drawerOpen = next;
      for (const listener of listeners) listener();
    };
    const subscribe = (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };

    function Mark({ size = 24, className }) {
      return React.createElement("span", {
        className,
        style: {
          width: size,
          height: size,
          display: "inline-grid",
          placeItems: "center",
          borderRadius: Math.max(7, Math.round(size * 0.32)),
          background: "#356b5b",
          color: "#fffaf0",
          fontSize: Math.max(10, Math.round(size * 0.42)),
          fontWeight: 700,
          fontFamily: "ui-sans-serif, system-ui",
        },
      }, "万");
    }

    function Name() {
      return React.createElement("span", {
        style: {
          color: "var(--dsw-color-text-primary, currentColor)",
          fontFamily: "ui-serif, Georgia, serif",
          fontSize: 18,
          fontWeight: 650,
          letterSpacing: "0.04em",
        },
      }, "万象");
    }

    function CommunityButton({ wide }) {
      return React.createElement("button", {
        type: "button",
        title: "社群支持",
        "aria-label": "打开万象社群支持",
        onClick: () => setDrawerOpen(true),
        style: {
          width: "100%",
          minHeight: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: wide ? "flex-start" : "center",
          gap: 10,
          padding: wide ? "8px 10px" : "8px",
          border: 0,
          borderRadius: 10,
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
          font: "inherit",
        },
      },
      React.createElement("span", { style: { fontSize: 17, lineHeight: 1 } }, "◌"),
      wide ? React.createElement("span", { style: { fontSize: 13 } }, "社群支持") : null);
    }

    function DiscoveryButton({ wide }) {
      const returnToDiscovery = () => {
        const target = new URL(window.location.href);
        target.port = "3000";
        target.pathname = "/";
        target.search = "";
        target.hash = "";
        window.location.assign(target.href);
      };
      return React.createElement("button", {
        type: "button",
        title: "返回万象需求发现",
        "aria-label": "返回万象需求发现",
        onClick: returnToDiscovery,
        style: {
          width: "100%",
          minHeight: 38,
          display: "flex",
          alignItems: "center",
          justifyContent: wide ? "flex-start" : "center",
          gap: 10,
          padding: wide ? "8px 10px" : "8px",
          border: 0,
          borderRadius: 10,
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
          font: "inherit",
        },
      },
      React.createElement("span", { style: { fontSize: 17, lineHeight: 1 } }, "←"),
      wide ? React.createElement("span", { style: { fontSize: 13 } }, "需求发现") : null);
    }

    function CommunityDrawer() {
      const open = React.useSyncExternalStore(subscribe, () => drawerOpen, () => false);
      const [mode, setMode] = React.useState("咨询");
      const [draft, setDraft] = React.useState("");
      const [sent, setSent] = React.useState(false);
      if (!open) return null;
      const close = () => setDrawerOpen(false);
      const send = () => {
        if (!draft.trim()) return;
        setDraft("");
        setSent(true);
      };
      return React.createElement(React.Fragment, null,
        React.createElement("button", {
          type: "button",
          "aria-label": "关闭社群支持",
          onClick: close,
          style: {
            pointerEvents: "auto",
            position: "fixed",
            inset: 0,
            border: 0,
            background: "rgba(20, 25, 24, 0.34)",
          },
        }),
        React.createElement("aside", {
          role: "dialog",
          "aria-modal": "true",
          "aria-label": "万象社群支持",
          style: {
            pointerEvents: "auto",
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(420px, 92vw)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            background: "var(--dsw-color-bg-primary, #fbfaf6)",
            color: "var(--dsw-color-text-primary, #17201e)",
            boxShadow: "-18px 0 48px rgba(20, 25, 24, 0.18)",
            borderLeft: "1px solid var(--dsw-color-border, rgba(40,55,50,.14))",
            fontFamily: "ui-sans-serif, system-ui",
          },
        },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
          React.createElement(Mark, { size: 34 }),
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 17, fontWeight: 700 } }, "万象社群"),
            React.createElement("div", { style: { marginTop: 3, fontSize: 12, opacity: 0.62 } }, "外部咨询与反馈服务")),
          React.createElement("button", {
            type: "button",
            onClick: close,
            style: { marginLeft: "auto", border: 0, background: "transparent", color: "inherit", fontSize: 24, cursor: "pointer" },
          }, "×")),
        React.createElement("div", {
          style: { padding: 14, borderRadius: 12, background: "rgba(53,107,91,.09)", fontSize: 13, lineHeight: 1.65 },
        }, "你可以在这里咨询构建问题或反馈产品体验。社群不会进入 Agent 流程，也不会替你确认需求或验收结果。"),
        React.createElement("div", { style: { display: "flex", gap: 8 } },
          ["咨询", "反馈"].map((item) => React.createElement("button", {
            key: item,
            type: "button",
            onClick: () => setMode(item),
            style: {
              border: "1px solid rgba(53,107,91,.25)",
              borderRadius: 999,
              padding: "7px 13px",
              background: mode === item ? "#356b5b" : "transparent",
              color: mode === item ? "white" : "inherit",
              cursor: "pointer",
            },
          }, item))),
        sent ? React.createElement("div", { style: { fontSize: 12, color: "#356b5b" } }, "已记录。正式版接入社群服务后会同步回复。") : null,
        React.createElement("textarea", {
          value: draft,
          onChange: (event) => { setDraft(event.target.value); setSent(false); },
          placeholder: mode === "咨询" ? "描述你卡住的地方…" : "告诉我们哪里需要改进…",
          style: {
            minHeight: 150,
            resize: "vertical",
            padding: 14,
            border: "1px solid rgba(53,107,91,.22)",
            borderRadius: 12,
            background: "transparent",
            color: "inherit",
            font: "inherit",
            lineHeight: 1.6,
          },
        }),
        React.createElement("button", {
          type: "button",
          disabled: !draft.trim(),
          onClick: send,
          style: {
            marginTop: "auto",
            minHeight: 42,
            border: 0,
            borderRadius: 11,
            background: "#356b5b",
            color: "white",
            fontWeight: 650,
            opacity: draft.trim() ? 1 : 0.45,
            cursor: draft.trim() ? "pointer" : "default",
          },
        }, `提交${mode}`)));
    }

    const inject = ["slots"];
    function apply(ctx) {
      ctx.slots.inject("sidebar.brand.mark", () =>
        ctx.slots.inject("sidebar.brand.name", () =>
          ctx.slots.inject("conversation.hero.brand.mark", () =>
            ctx.slots.inject("sidebar.footer.action", () =>
              ctx.slots.inject("shell.overlay", function* () {
                yield ctx.slots.register({ name: "sidebar.brand.mark" }, Mark);
                yield ctx.slots.register({ name: "sidebar.brand.name" }, Name);
                yield ctx.slots.register({ name: "conversation.hero.brand.mark" }, Mark);
                yield ctx.slots.register({ name: "sidebar.footer.action", id: "wanxiang-discovery", order: 4 }, DiscoveryButton);
                yield ctx.slots.register({ name: "sidebar.footer.action", id: "wanxiang-community", order: 5 }, CommunityButton);
                yield ctx.slots.register({ name: "shell.overlay", id: "wanxiang-community-drawer", order: 5 }, CommunityDrawer);
              })))));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
