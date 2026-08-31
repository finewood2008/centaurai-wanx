window.__ModuleLoader__.load({
  id: "@wanxiang/workbench",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const h = React.createElement;

    const GLOBAL_STORAGE_KEY = "wanxiang-workbench-v1";
    const LEGACY_STORAGE_KEY = "wanxiang-prototype-v5";
    const WORKSPACE_PATH = typeof window.__WANXIANG_WORKSPACE__ === "string" ? window.__WANXIANG_WORKSPACE__ : "";
    const STORAGE_KEY = `${GLOBAL_STORAGE_KEY}:${WORKSPACE_PATH || "unscoped"}`;
    const MIGRATION_KEY = `${GLOBAL_STORAGE_KEY}:migration-workspace`;
    const MODULE_GENERATION = Symbol("wanxiang-workbench");
    window.__WANXIANG_WORKBENCH_GENERATION__ = MODULE_GENERATION;
    const steps = [
      {
        key: "goal",
        label: "真实任务",
        question: "你想让万象替你完成哪一件真实工作？",
        hint: "尽量说清现在是谁、在什么情况下、反复做什么。",
        placeholder: "例如：每周一从客户表和沟通记录里找出需要跟进的客户…",
      },
      {
        key: "inputs",
        label: "输入资料",
        question: "完成这件事时，你现在会查看哪些资料或系统？",
        hint: "先说你真实在用的，不需要考虑技术上怎么连接。",
        placeholder: "例如：飞书客户表、微信沟通记录、历史报价单…",
      },
      {
        key: "rules",
        label: "判断规则",
        question: "你通常根据什么信号做判断？",
        hint: "把脑子里的经验讲出来：什么情况优先、什么情况忽略。",
        placeholder: "例如：7 天没回复但过去有明确采购意向的客户优先…",
      },
      {
        key: "output",
        label: "交付结果",
        question: "最后希望万象交付什么结果，给谁使用？",
        hint: "结果应该能直接进入下一步工作，而不只是生成一段文字。",
        placeholder: "例如：一份按优先级排序的跟进清单，给销售负责人确认…",
      },
      {
        key: "boundaries",
        label: "边界风险",
        question: "哪些事不能自动做？什么时候必须由你确认？",
        hint: "消息发送、数据修改、付款和删除等动作应明确边界。",
        placeholder: "例如：可以生成建议，但不能自动给客户发消息…",
      },
      {
        key: "success",
        label: "验收标准",
        question: "怎样才算它真的有用，而不是一个演示玩具？",
        hint: "最好给出可以用案例检查的具体标准。",
        placeholder: "例如：连续四周没有漏掉高意向客户，清单人工修改率低于 20%…",
      },
    ];

    const listeners = new Set();
    let drawerOpen = false;
    let operationState = { busy: false, error: "" };
    let appState = loadState();
    let workspacePromise;
    let builderSessionId;
    let builderWorkspaceId;

    function loadState() {
      try {
        const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
        if (stored && stored.version === 1) return normalizeState(stored);
      } catch {}

      const migrationWorkspace = window.localStorage.getItem(MIGRATION_KEY);
      const adopt = (value) => {
        const migrated = normalizeState(value);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        window.localStorage.setItem(MIGRATION_KEY, WORKSPACE_PATH);
        return migrated;
      };
      if (WORKSPACE_PATH && (!migrationWorkspace || migrationWorkspace === WORKSPACE_PATH)) {
        try {
          const previous = JSON.parse(window.localStorage.getItem(GLOBAL_STORAGE_KEY) || "null");
          if (previous && previous.version === 1) {
            return adopt(previous);
          }
        } catch {}

        try {
          const legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) || "null");
          if (legacy && typeof legacy === "object") {
            const draft = legacy.discoveryDraft && typeof legacy.discoveryDraft === "object"
              ? legacy.discoveryDraft
              : {};
            return adopt({
              version: 1,
              surface: "discovery",
              projectName: legacy.projectName || "我的工作 Agent",
              answers: draft,
              confirmed: Boolean(legacy.briefConfirmed),
            });
          }
        } catch {}
      }

      return normalizeState({ version: 1, surface: "discovery", projectName: "我的工作 Agent", answers: {} });
    }

    function normalizeState(value) {
      const answers = {};
      for (const step of steps) {
        const raw = value?.answers?.[step.key];
        const text = Array.isArray(raw) ? raw.join("、") : String(raw || "").trim();
        if (text) answers[step.key] = text;
      }
      const firstMissing = steps.findIndex((step) => !answers[step.key]);
      const requestedStep = Number.isInteger(value?.activeStep) ? value.activeStep : firstMissing;
      const activeStep = requestedStep >= 0 && requestedStep < steps.length
        ? requestedStep
        : firstMissing === -1 ? steps.length : firstMissing;
      return {
        version: 1,
        surface: value?.surface === "builder" ? "builder" : "discovery",
        projectName: String(value?.projectName || "我的工作 Agent").trim() || "我的工作 Agent",
        answers,
        activeStep,
        confirmed: Boolean(value?.confirmed) && firstMissing === -1,
        briefRevision: Number.isInteger(value?.briefRevision) && value.briefRevision >= 0 ? value.briefRevision : 0,
        confirmedRevision: Number.isInteger(value?.confirmedRevision) && value.confirmedRevision >= 0 ? value.confirmedRevision : null,
      };
    }

    function saveState() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
        if (WORKSPACE_PATH) window.localStorage.setItem(MIGRATION_KEY, WORKSPACE_PATH);
      } catch {}
    }

    function emit() {
      for (const listener of listeners) listener();
    }

    function subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function updateState(patch) {
      const projectChanged = Object.hasOwn(patch, "projectName")
        && String(patch.projectName || "").trim() !== appState.projectName;
      const answersChanged = Object.hasOwn(patch, "answers")
        && steps.some((step) => String(patch.answers?.[step.key] || "").trim() !== String(appState.answers[step.key] || "").trim());
      appState = normalizeState({
        ...appState,
        ...patch,
        briefRevision: appState.briefRevision + (projectChanged || answersChanged ? 1 : 0),
      });
      saveState();
      emit();
    }

    function assertCurrentGeneration() {
      if (window.__WANXIANG_WORKBENCH_GENERATION__ !== MODULE_GENERATION) {
        throw new Error("万象工作台刚刚完成更新，请重试当前操作。");
      }
    }

    function setSurface(surface) {
      updateState({ surface });
    }

    function setDrawerOpen(next) {
      drawerOpen = next;
      emit();
    }

    function setOperationState(patch) {
      operationState = { ...operationState, ...patch };
      emit();
    }

    function useAppState() {
      return React.useSyncExternalStore(subscribe, () => appState, () => appState);
    }

    function useDrawerOpen() {
      return React.useSyncExternalStore(subscribe, () => drawerOpen, () => false);
    }

    function useOperationState() {
      return React.useSyncExternalStore(subscribe, () => operationState, () => operationState);
    }

    function Mark({ size = 24, className }) {
      return h("span", {
        className,
        "aria-hidden": "true",
        style: {
          width: size,
          height: size,
          display: "inline-grid",
          placeItems: "center",
          borderRadius: Math.max(7, Math.round(size * 0.3)),
          background: "#2f6656",
          color: "#fffaf0",
          fontSize: Math.max(10, Math.round(size * 0.42)),
          fontWeight: 720,
          fontFamily: "ui-sans-serif, system-ui",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12)",
        },
      }, "万");
    }

    function Name() {
      return h("span", { className: "wx-brand-name" }, "万象");
    }

    function SideAction({ wide, title, label, icon, active, onClick }) {
      return h("button", {
        type: "button",
        title,
        "aria-label": title,
        "aria-current": active ? "page" : undefined,
        className: `wx-side-action${active ? " is-active" : ""}`,
        onClick,
      },
      h("span", { className: "wx-side-icon", "aria-hidden": "true" }, icon),
      wide ? h("span", { className: "wx-side-label" }, label) : null);
    }

    function DiscoveryButton({ wide }) {
      const state = useAppState();
      return h(SideAction, {
        wide,
        title: "打开需求发现",
        label: "需求发现",
        icon: "◇",
        active: state.surface === "discovery",
        onClick: () => {
          setOperationState({ error: "" });
          setSurface("discovery");
        },
      });
    }

    function CommunityButton({ wide }) {
      return h(SideAction, {
        wide,
        title: "打开万象社群支持",
        label: "社群支持",
        icon: "◎",
        active: false,
        onClick: () => setDrawerOpen(true),
      });
    }

    function ProductStyles() {
      React.useEffect(() => {
        const title = document.querySelector("title");
        const applyTitle = () => {
          if (document.title !== "万象") document.title = "万象";
        };
        applyTitle();
        if (!title) return undefined;
        const observer = new MutationObserver(applyTitle);
        observer.observe(title, { childList: true, characterData: true, subtree: true });
        return () => observer.disconnect();
      }, []);
      return h("style", null, `
        .wx-brand-name{color:var(--dsw-alias-label-primary,currentColor);font-family:ui-serif,"Songti SC",Georgia,serif;font-size:19px;font-weight:650;letter-spacing:.08em}
        .wx-side-action{box-sizing:border-box;width:100%;min-height:38px;display:flex;align-items:center;justify-content:flex-start;gap:10px;padding:8px 10px;border:0;border-radius:10px;background:transparent;color:inherit;cursor:pointer;font:inherit;transition:background .16s ease,color .16s ease}
        .wx-side-action:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(47,102,86,.09))}
        .wx-side-action.is-active{background:rgba(47,102,86,.12);color:var(--dsw-alias-brand-primary,#2f6656)}
        .wx-side-icon{width:18px;flex:0 0 18px;text-align:center;font-size:18px;line-height:1}.wx-side-label{font-size:13px;white-space:nowrap}
        .wx-discovery{box-sizing:border-box;height:100%;min-width:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#f5f2ea);color:var(--dsw-alias-label-primary,#1d2623);font-family:var(--ds-font-family-text,ui-sans-serif,system-ui);overflow:hidden}
        .wx-topbar{height:58px;flex:0 0 58px;display:flex;align-items:center;gap:12px;padding:0 28px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(32,45,40,.12));background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#f5f2ea) 90%,transparent)}
        .wx-topbar-kicker{font-size:11px;font-weight:680;letter-spacing:.14em;color:var(--dsw-alias-brand-primary,#2f6656)}
        .wx-topbar-divider{width:1px;height:14px;background:var(--dsw-alias-border-l2,rgba(32,45,40,.14))}.wx-topbar-title{font-size:13px;color:var(--dsw-alias-label-secondary,#5c6662)}
        .wx-topbar-status{margin-left:auto;display:flex;align-items:center;gap:7px;font-size:11px;color:var(--dsw-alias-label-tertiary,#7b837f)}.wx-status-dot{width:6px;height:6px;border-radius:50%;background:#5d9b7e;box-shadow:0 0 0 3px rgba(93,155,126,.12)}
        .wx-surface-grid{min-height:0;flex:1;display:grid;grid-template-columns:minmax(0,1fr) 340px}
        .wx-dialogue{min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--dsw-alias-border-l2,rgba(32,45,40,.12));overflow:hidden}
        .wx-dialogue-scroll{min-height:0;flex:1;overflow:auto;padding:38px clamp(24px,5vw,72px) 28px;scrollbar-gutter:stable}
        .wx-dialogue-inner{width:min(760px,100%);margin:0 auto}
        .wx-eyebrow{display:flex;align-items:center;gap:8px;margin-bottom:18px;color:var(--dsw-alias-label-tertiary,#78807d);font-size:11px;letter-spacing:.08em}.wx-eyebrow-line{width:24px;height:1px;background:#bf8a4a}
        .wx-title{max-width:680px;margin:0;font-family:ui-serif,"Songti SC",Georgia,serif;font-size:clamp(32px,4vw,52px);font-weight:520;line-height:1.1;letter-spacing:-.025em}.wx-title em{color:#2f6656;font-style:normal}
        .wx-lede{max-width:610px;margin:16px 0 34px;color:var(--dsw-alias-label-secondary,#5c6662);font-size:14px;line-height:1.75}
        .wx-thread{display:flex;flex-direction:column;gap:18px}.wx-turn{display:flex;gap:11px;align-items:flex-start}.wx-turn.user{justify-content:flex-end}.wx-avatar{width:28px;height:28px;flex:0 0 28px;display:grid;place-items:center;border-radius:9px;background:#2f6656;color:white;font-size:11px;font-weight:700}.wx-avatar.user{order:2;background:var(--dsw-alias-bg-module-platform,#e6e2d9);color:var(--dsw-alias-label-secondary,#5c6662)}
        .wx-bubble{max-width:min(620px,82%);padding:13px 15px;border:1px solid var(--dsw-alias-border-l2,rgba(32,45,40,.12));border-radius:4px 16px 16px 16px;background:var(--dsw-alias-bg-layer-2,#fbfaf6);font-size:14px;line-height:1.7}.wx-turn.user .wx-bubble{border-radius:16px 4px 16px 16px;background:rgba(47,102,86,.1);border-color:rgba(47,102,86,.16)}
        .wx-question-card{margin-top:22px;padding:22px;border:1px solid rgba(47,102,86,.22);border-radius:18px;background:linear-gradient(135deg,rgba(47,102,86,.08),rgba(191,138,74,.045));box-shadow:0 18px 45px rgba(31,45,39,.06)}
        .wx-question-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.wx-question-step{color:#2f6656;font-size:11px;font-weight:700;letter-spacing:.1em}.wx-progress{display:flex;gap:4px}.wx-progress i{width:18px;height:3px;border-radius:2px;background:var(--dsw-alias-border-l2,rgba(32,45,40,.13))}.wx-progress i.done{background:#2f6656}
        .wx-question{margin:0;font-family:ui-serif,"Songti SC",Georgia,serif;font-size:22px;font-weight:560;line-height:1.4}.wx-hint{margin:8px 0 16px;color:var(--dsw-alias-label-tertiary,#78807d);font-size:12px;line-height:1.6}
        .wx-answer{box-sizing:border-box;width:100%;min-height:106px;resize:vertical;padding:13px 14px;border:1px solid var(--dsw-alias-border-l2,rgba(32,45,40,.17));border-radius:12px;background:var(--dsw-alias-bg-layer-1,#f5f2ea);color:inherit;font:inherit;font-size:14px;line-height:1.65;outline:none;transition:border-color .16s,box-shadow .16s}.wx-answer:focus{border-color:#2f6656;box-shadow:0 0 0 3px rgba(47,102,86,.1)}.wx-answer::placeholder{color:var(--dsw-alias-label-dimmed,#9b9f9d)}
        .wx-question-actions{display:flex;align-items:center;gap:10px;margin-top:12px}.wx-keyhint{color:var(--dsw-alias-label-tertiary,#858b88);font-size:11px}.wx-primary,.wx-secondary,.wx-text-button{font:inherit;cursor:pointer}.wx-primary{min-height:40px;margin-left:auto;padding:0 18px;border:0;border-radius:11px;background:#2f6656;color:white;font-size:13px;font-weight:680;box-shadow:0 8px 20px rgba(47,102,86,.16)}.wx-primary:hover{background:#28594b}.wx-primary:disabled{opacity:.42;cursor:default;box-shadow:none}
        .wx-secondary{min-height:38px;padding:0 15px;border:1px solid var(--dsw-alias-border-l2,rgba(32,45,40,.16));border-radius:10px;background:transparent;color:inherit;font-size:12px}.wx-secondary:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(47,102,86,.07))}.wx-text-button{padding:4px;border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#78807d);font-size:11px}.wx-text-button:hover{color:#2f6656}.wx-text-button:disabled,.wx-edit:disabled{opacity:.45;cursor:default}
        .wx-ready{margin-top:24px;padding:22px;border:1px solid rgba(47,102,86,.24);border-radius:18px;background:#2f6656;color:#fffaf0}.wx-ready-kicker{font-size:10px;font-weight:700;letter-spacing:.14em;opacity:.72}.wx-ready h3{margin:8px 0 7px;font-family:ui-serif,"Songti SC",Georgia,serif;font-size:24px;font-weight:560}.wx-ready p{margin:0;max-width:560px;font-size:13px;line-height:1.7;opacity:.78}.wx-ready-actions{display:flex;align-items:center;gap:12px;margin-top:18px}.wx-ready .wx-primary{background:#fffaf0;color:#234c40;margin-left:0;box-shadow:none}.wx-ready .wx-text-button{color:rgba(255,250,240,.68)}.wx-error{margin-top:12px;color:#b5473d;font-size:12px;line-height:1.5}
        .wx-brief{min-width:0;padding:28px 24px;background:#f1ede3;color:#1d2824;overflow:auto}.wx-brief-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}.wx-brief-title{color:#1d2824;font-family:ui-serif,"Songti SC",Georgia,serif;font-size:18px;font-weight:600}.wx-brief-count{font-family:ui-monospace,monospace;color:#7a817d;font-size:10px}
        .wx-name-label{display:block;margin-bottom:7px;color:#727a76;font-size:10px;letter-spacing:.08em}.wx-name-input{box-sizing:border-box;width:100%;height:40px;margin-bottom:20px;padding:0 11px;border:1px solid rgba(32,45,40,.16);border-radius:10px;background:#fbfaf6;color:#1d2824;font:inherit;font-size:13px;outline:none}.wx-name-input:focus{border-color:#2f6656}
        .wx-brief-list{display:flex;flex-direction:column}.wx-brief-row{position:relative;padding:14px 0;border-top:1px solid rgba(32,45,40,.12)}.wx-brief-row:last-child{border-bottom:1px solid rgba(32,45,40,.12)}.wx-brief-row-head{display:flex;align-items:center;gap:8px}.wx-brief-index{width:18px;height:18px;display:grid;place-items:center;border-radius:50%;background:#dedbd3;color:#68716d;font:9px ui-monospace,monospace}.wx-brief-row.complete .wx-brief-index{background:#2f6656;color:white}.wx-brief-label{color:#27312d;font-size:11px;font-weight:680}.wx-edit{margin-left:auto;border:0;background:transparent;color:#747d79;font-size:11px;cursor:pointer}.wx-edit:hover{color:#2f6656}.wx-brief-value{margin:8px 0 0 26px;color:#56615c;font-size:12px;line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.wx-brief-value.pending{color:#929894}
        .wx-brief-note{margin-top:18px;padding:12px;border-radius:10px;background:rgba(191,138,74,.09);color:#59635f;font-size:11px;line-height:1.65}.wx-brief-note strong{color:#9a6730;font-weight:680}
        .wx-drawer-backdrop{pointer-events:auto;position:fixed;inset:0;border:0;background:rgba(17,25,22,.34);backdrop-filter:blur(2px)}.wx-drawer{pointer-events:auto;box-sizing:border-box;position:fixed;top:0;right:0;bottom:0;width:min(420px,92vw);padding:24px;display:flex;flex-direction:column;gap:18px;background:var(--dsw-alias-bg-layer-1,#f5f2ea);color:var(--dsw-alias-label-primary,#1d2623);box-shadow:-18px 0 48px rgba(20,25,24,.18);border-left:1px solid var(--dsw-alias-border-l2,rgba(40,55,50,.14));font-family:var(--ds-font-family-text,ui-sans-serif,system-ui)}.wx-drawer-head{display:flex;align-items:center;gap:12px}.wx-drawer-title{font-size:17px;font-weight:700}.wx-drawer-subtitle{margin-top:3px;font-size:11px;color:var(--dsw-alias-label-tertiary,#78807d)}.wx-close{margin-left:auto;border:0;background:transparent;color:inherit;font-size:24px;cursor:pointer}.wx-drawer-copy{padding:14px;border-radius:12px;background:rgba(47,102,86,.08);font-size:12px;line-height:1.7}.wx-mode-row{display:flex;gap:8px}.wx-mode{border:1px solid rgba(47,102,86,.24);border-radius:999px;padding:7px 13px;background:transparent;color:inherit;cursor:pointer}.wx-mode.active{background:#2f6656;color:white}.wx-drawer textarea{box-sizing:border-box;width:100%;min-height:150px;resize:vertical;padding:14px;border:1px solid rgba(47,102,86,.22);border-radius:12px;background:transparent;color:inherit;font:inherit;line-height:1.6;outline:none}.wx-drawer textarea:focus{border-color:#2f6656}.wx-sent{font-size:12px;color:#2f6656}
        @media(max-width:980px){.wx-surface-grid{grid-template-columns:minmax(0,1fr)}.wx-brief{display:none}.wx-dialogue{border-right:0}.wx-dialogue-scroll{padding-left:24px;padding-right:24px}}
        @media(max-width:620px){.wx-topbar{padding:0 16px}.wx-topbar-title{display:none}.wx-dialogue-scroll{padding:26px 16px 20px}.wx-title{font-size:32px}.wx-bubble{max-width:88%}.wx-question-card{padding:17px}.wx-ready-actions{align-items:flex-start;flex-direction:column}.wx-keyhint{display:none}}
        @media(prefers-reduced-motion:reduce){.wx-side-action,.wx-answer{transition:none}}
      `);
    }

    function DialogueTurn({ role, children }) {
      const user = role === "user";
      return h("div", { className: `wx-turn${user ? " user" : ""}` },
        h("span", { className: `wx-avatar${user ? " user" : ""}`, "aria-hidden": "true" }, user ? "你" : "万"),
        h("div", { className: "wx-bubble" }, children));
    }

    function DiscoverySurface({ beginBuild, enterBuilder }) {
      const state = useAppState();
      const completeCount = steps.filter((step) => state.answers[step.key]).length;
      const completed = completeCount === steps.length;
      const editing = completed && state.activeStep < steps.length;
      const activeIndex = state.activeStep;
      const activeStep = steps[activeIndex] || steps[steps.length - 1];
      const [draft, setDraft] = React.useState(() => state.answers[activeStep.key] || "");
      const operation = useOperationState();
      const busy = operation.busy;
      const error = operation.error;
      const endRef = React.useRef(null);

      React.useEffect(() => {
        setDraft(state.answers[activeStep.key] || "");
      }, [activeStep.key]);

      React.useEffect(() => {
        endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, [completeCount, activeStep.key]);

      const submitAnswer = () => {
        const value = draft.trim();
        if (!value) return;
        setOperationState({ error: "" });
        const answers = { ...state.answers, [activeStep.key]: value };
        const firstMissing = steps.findIndex((step) => !answers[step.key]);
        updateState({ answers, activeStep: firstMissing === -1 ? steps.length : firstMissing, confirmed: false });
        setDraft("");
      };

      const editStep = (index) => {
        setOperationState({ error: "" });
        updateState({ activeStep: index, confirmed: false });
        setDraft(state.answers[steps[index].key] || "");
      };

      const startBuilding = async () => {
        if (!completed || busy) return;
        setOperationState({ busy: true, error: "" });
        try {
          await beginBuild({
            projectName: state.projectName,
            answers: state.answers,
            briefRevision: state.briefRevision,
            confirmedRevision: state.confirmedRevision,
          });
          setOperationState({ busy: false, error: "" });
        } catch (reason) {
          setOperationState({
            busy: false,
            error: reason instanceof Error ? reason.message : "工作台暂时无法开始构建，请稍后重试。",
          });
        }
      };

      const openFreeWorkspace = async () => {
        if (busy) return;
        setOperationState({ busy: true, error: "" });
        try {
          await enterBuilder();
          setOperationState({ busy: false, error: "" });
        } catch (reason) {
          setOperationState({
            busy: false,
            error: reason instanceof Error ? reason.message : "工作台暂时无法打开，请稍后重试。",
          });
        }
      };

      const activePanel = !completed || editing
        ? h("section", { className: "wx-question-card", ref: endRef },
            h("div", { className: "wx-question-meta" },
              h("span", { className: "wx-question-step" }, `${String(activeIndex + 1).padStart(2, "0")} · ${activeStep.label}`),
              h("span", { className: "wx-progress", "aria-label": `已完成 ${completeCount} / ${steps.length}` },
                steps.map((step, index) => h("i", { key: step.key, className: index < completeCount ? "done" : "" })))),
            h("h2", { className: "wx-question" }, activeStep.question),
            h("p", { className: "wx-hint" }, activeStep.hint),
            h("textarea", {
              className: "wx-answer",
              value: draft,
              autoFocus: true,
              placeholder: activeStep.placeholder,
              onChange: (event) => setDraft(event.target.value),
              onKeyDown: (event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submitAnswer();
              },
            }),
            h("div", { className: "wx-question-actions" },
              h("span", { className: "wx-keyhint" }, "⌘ Enter 提交"),
              state.answers[activeStep.key]
                ? h("button", { type: "button", className: "wx-text-button", onClick: () => setDraft(state.answers[activeStep.key]) }, "恢复原回答")
                : null,
              h("button", { type: "button", className: "wx-primary", disabled: !draft.trim(), onClick: submitAnswer }, state.answers[activeStep.key] ? "保存修改 →" : "继续 →")))
        : h("section", { className: "wx-ready", ref: endRef },
            h("div", { className: "wx-ready-kicker" }, "WORK BRIEF READY"),
            h("h3", null, "工作简报已经足够开始。"),
            h("p", null, "确认后，万象会在同一个工作台里进入构建与验证循环。过程中仍然可以随时回到这里修改需求。"),
            h("div", { className: "wx-ready-actions" },
              h("button", { type: "button", className: "wx-primary", disabled: busy, onClick: startBuilding }, busy ? "正在准备工作台…" : "确认简报，开始构建 →"),
              h("button", { type: "button", className: "wx-text-button", disabled: busy, onClick: openFreeWorkspace }, "先进入自由工作台")),
            error ? h("div", { className: "wx-error", role: "alert" }, error) : null);

      const dialogue = h("section", { className: "wx-dialogue" },
        h("div", { className: "wx-dialogue-scroll" },
          h("div", { className: "wx-dialogue-inner" },
            h("div", { className: "wx-eyebrow" }, h("span", { className: "wx-eyebrow-line" }), "从工作，而不是从功能开始"),
            h("h1", { className: "wx-title" }, "先把一件事，", h("em", null, "做成真的"), "。"),
            h("p", { className: "wx-lede" }, "我会用六个问题和你一起形成工作简报。它不是一次性提示词，而是后续构建、验证和迭代共同遵守的产品契约。"),
            h("div", { className: "wx-thread" },
              h(DialogueTurn, { role: "assistant" }, "先不急着选功能。我们从你反复遇到、又值得被可靠完成的真实工作开始。"),
              steps.map((step) => state.answers[step.key]
                ? h(React.Fragment, { key: step.key },
                    h(DialogueTurn, { role: "assistant" }, step.question),
                    h(DialogueTurn, { role: "user" }, state.answers[step.key]))
                : null)),
            activePanel)));

      const brief = h("aside", { className: "wx-brief", "aria-label": "实时工作简报" },
        h("div", { className: "wx-brief-head" },
          h("span", { className: "wx-brief-title" }, "实时工作简报"),
          h("span", { className: "wx-brief-count" }, `${completeCount} / ${steps.length}`)),
        h("label", { className: "wx-name-label", htmlFor: "wx-project-name" }, "AGENT 名称"),
        h("input", {
          id: "wx-project-name",
          className: "wx-name-input",
          value: state.projectName,
          disabled: busy,
          onChange: (event) => updateState({ projectName: event.target.value }),
        }),
        h("div", { className: "wx-brief-list" },
          steps.map((step, index) => h("div", { key: step.key, className: `wx-brief-row${state.answers[step.key] ? " complete" : ""}` },
            h("div", { className: "wx-brief-row-head" },
              h("span", { className: "wx-brief-index" }, state.answers[step.key] ? "✓" : String(index + 1)),
              h("span", { className: "wx-brief-label" }, step.label),
              state.answers[step.key]
                ? h("button", { type: "button", className: "wx-edit", title: `修改${step.label}`, disabled: busy, onClick: () => editStep(index) }, "修改")
                : null),
            h("p", { className: `wx-brief-value${state.answers[step.key] ? "" : " pending"}` }, state.answers[step.key] || "等待回答")))),
        h("div", { className: "wx-brief-note" }, h("strong", null, "边界提醒："), "当前 Data Agent 仍是示例契约。没有连接真实数据前，万象不会声称已读取你的业务资料。"));

      return h("main", { className: "wx-discovery", "aria-label": "万象需求发现" },
        h("header", { className: "wx-topbar" },
          h("span", { className: "wx-topbar-kicker" }, "需求发现"),
          h("span", { className: "wx-topbar-divider", "aria-hidden": "true" }),
          h("span", { className: "wx-topbar-title" }, "把真实工作说清楚，再开始构建"),
          h("span", { className: "wx-topbar-status" },
            h("i", { className: "wx-status-dot", "aria-hidden": "true" }),
            "仅保存在这台设备")),
        h("div", { className: "wx-surface-grid" }, dialogue, brief));
    }

    function CommunityDrawer() {
      const open = useDrawerOpen();
      const [mode, setMode] = React.useState("咨询");
      const [draft, setDraft] = React.useState("");
      const [sent, setSent] = React.useState(false);
      if (!open) return null;
      const send = () => {
        if (!draft.trim()) return;
        setDraft("");
        setSent(true);
      };
      return h(React.Fragment, null,
        h("button", { type: "button", className: "wx-drawer-backdrop", "aria-label": "关闭社群支持", onClick: () => setDrawerOpen(false) }),
        h("aside", { className: "wx-drawer", role: "dialog", "aria-modal": "true", "aria-label": "万象社群支持" },
          h("div", { className: "wx-drawer-head" },
            h(Mark, { size: 34 }),
            h("div", null, h("div", { className: "wx-drawer-title" }, "万象社群"), h("div", { className: "wx-drawer-subtitle" }, "外部咨询与反馈服务")),
            h("button", { type: "button", className: "wx-close", "aria-label": "关闭", onClick: () => setDrawerOpen(false) }, "×")),
          h("div", { className: "wx-drawer-copy" }, "你可以在这里咨询构建问题或反馈产品体验。社群不会进入 Agent 流程，也不会替你确认需求或验收结果。"),
          h("div", { className: "wx-mode-row" }, ["咨询", "反馈"].map((item) => h("button", { key: item, type: "button", className: `wx-mode${mode === item ? " active" : ""}`, onClick: () => setMode(item) }, item))),
          sent ? h("div", { className: "wx-sent" }, "已保存在本机。正式接入社群服务后会同步回复。") : null,
          h("textarea", { value: draft, onChange: (event) => { setDraft(event.target.value); setSent(false); }, placeholder: mode === "咨询" ? "描述你卡住的地方…" : "告诉我们哪里需要改进…" }),
          h("button", { type: "button", className: "wx-primary", disabled: !draft.trim(), onClick: send, style: { marginTop: "auto", marginLeft: 0 } }, `提交${mode}`)));
    }

    function NoWelcomeNotice({ complete }) {
      const finished = React.useRef(false);
      React.useEffect(() => {
        if (finished.current) return;
        finished.current = true;
        complete();
      }, [complete]);
      return null;
    }

    function briefPrompt(snapshot) {
      const rows = steps.map((step) => `## ${step.label}\n${snapshot.answers[step.key]}`).join("\n\n");
      return `我们已经在万象需求发现中确认了下面这份工作简报；同一份内容已经可靠写入 .wanxiang/work-brief.md。请把它当作当前产品契约。\n\n# ${snapshot.projectName}\n\n${rows}\n\n请和我一起在同一个连续循环中构建并验证：先做最小可用实现，立刻用代表性案例和边界案例检查，根据证据修正。不要把构建与验证拆成两个交接阶段。当前 Data Agent 只有示例契约；在真实数据源接入前，不要声称已读取真实业务数据，也不要执行外部写入。先复述你对任务、边界和首个可验证切片的理解，再开始行动。`;
    }

    async function persistBrief(snapshot) {
      const response = await fetch("/api/wanxiang/work-brief", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectName: snapshot.projectName, answers: snapshot.answers }),
      });
      if (response.ok) return;
      let message = "工作简报暂时无法保存，请稍后重试。";
      try {
        const body = await response.json();
        if (typeof body?.message === "string" && body.message) message = body.message;
      } catch {}
      throw new Error(message);
    }

    function waitForWorkspaceList(ctx) {
      const snapshot = ctx.workspaces.list.getSnapshot();
      if (snapshot.phase === "ready") return Promise.resolve(snapshot);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          dispose();
          reject(new Error("万象工作区仍在准备，请稍后再试。"));
        }, 10_000);
        const dispose = ctx.workspaces.list.subscribe(() => {
          const next = ctx.workspaces.list.getSnapshot();
          if (next.phase !== "ready") return;
          clearTimeout(timer);
          dispose();
          resolve(next);
        });
      });
    }

    function waitForSessionList(ctx) {
      const snapshot = ctx.sessions.list.getSnapshot();
      if (snapshot.phase === "ready") return Promise.resolve(snapshot);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          dispose();
          reject(new Error("万象会话仍在准备，请稍后再试。"));
        }, 10_000);
        const dispose = ctx.sessions.list.subscribe(() => {
          const next = ctx.sessions.list.getSnapshot();
          if (next.phase !== "ready") return;
          clearTimeout(timer);
          dispose();
          resolve(next);
        });
      });
    }

    function waitForWorkspace(ctx) {
      if (workspacePromise) return workspacePromise;
      workspacePromise = (async () => {
        const snapshot = await waitForWorkspaceList(ctx);
        assertCurrentGeneration();
        const path = WORKSPACE_PATH;
        const existing = snapshot.items.find((item) => item.path === path);
        if (existing) return existing;
        if (!path) throw new Error("万象工作区路径不可用，请重新启动工作台。");
        const created = await ctx.workspaces.create({ path });
        assertCurrentGeneration();
        try {
          return await ctx.workspaces.rename(created.workspaceId, appState.projectName);
        } catch {
          return created;
        }
      })().finally(() => {
        workspacePromise = undefined;
      });
      return workspacePromise;
    }

    async function ensureBuilderSession(ctx) {
      const [workspace, sessions] = await Promise.all([waitForWorkspace(ctx), waitForSessionList(ctx)]);
      assertCurrentGeneration();
      const belongsToWorkspace = (summary) => summary?.cwd === workspace.path;
      const cached = builderSessionId ? sessions.byId[builderSessionId] : undefined;
      if (cached && builderWorkspaceId === workspace.workspaceId && belongsToWorkspace(cached)) {
        builderWorkspaceId = workspace.workspaceId;
        ctx.sessions.open(builderSessionId);
        return builderSessionId;
      }

      const current = sessions.current ? sessions.byId[sessions.current] : undefined;
      const reusable = belongsToWorkspace(current)
        ? current
        : sessions.ids.map((id) => sessions.byId[id]).find(belongsToWorkspace);
      if (reusable) {
        builderSessionId = reusable.id;
        builderWorkspaceId = workspace.workspaceId;
        ctx.sessions.open(builderSessionId);
        return builderSessionId;
      }

      builderSessionId = await ctx.uiWorkspace.connectWorkspace(workspace.workspaceId);
      builderWorkspaceId = workspace.workspaceId;
      assertCurrentGeneration();
      ctx.sessions.open(builderSessionId);
      return builderSessionId;
    }

    async function enterBuilder(ctx) {
      await ensureBuilderSession(ctx);
      assertCurrentGeneration();
      updateState({ surface: "builder" });
    }

    async function beginBuild(ctx, snapshot) {
      assertCurrentGeneration();
      const workspace = await waitForWorkspace(ctx);
      assertCurrentGeneration();
      if (appState.briefRevision !== snapshot.briefRevision) {
        throw new Error("工作简报刚刚发生变化，请重新确认最新版本。");
      }
      const sessionId = await ensureBuilderSession(ctx);
      assertCurrentGeneration();
      const sessions = ctx.sessions.list.getSnapshot();
      const workspaceIsRunning = sessions.ids
        .map((id) => sessions.byId[id])
        .some((session) => session?.running && (
          session.cwd === workspace.path || workspace.sessionIds.includes(session.id)
        ));
      if (workspaceIsRunning) {
        throw new Error("当前工作台仍在执行任务。请先回到工作台等待完成或停止当前任务，再确认新简报。");
      }
      await persistBrief(snapshot);
      assertCurrentGeneration();
      try { await ctx.workspaces.rename(workspace.workspaceId, snapshot.projectName); } catch {}
      const agentContext = ctx.sessions.scope(sessionId);
      if (!agentContext) throw new Error("万象会话尚未就绪，请稍后再试。");
      try {
        await agentContext.conversation.send(briefPrompt(snapshot));
      } catch {
        throw new Error("暂时无法开始构建。请先在左侧设置中配置可用模型，然后重试。");
      }
      assertCurrentGeneration();
      if (appState.briefRevision !== snapshot.briefRevision) {
        throw new Error("工作简报在启动构建时发生了变化，请重新确认最新版本。");
      }
      updateState({
        surface: "builder",
        confirmed: true,
        confirmedRevision: snapshot.briefRevision,
      });
    }

    const inject = ["slots", "layout", "sessions", "workspaces", "uiWorkspace"];
    function apply(ctx) {
      void (async () => {
        await waitForWorkspace(ctx);
        if (appState.surface === "builder") await ensureBuilderSession(ctx);
      })().catch((error) => console.warn("万象工作区初始化失败", error));
      ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.register({ name: "sidebar.brand.mark" }, Mark));
      ctx.slots.inject("sidebar.brand.name", () => ctx.slots.register({ name: "sidebar.brand.name" }, Name));
      ctx.slots.inject("conversation.hero.brand.mark", () => ctx.slots.register({ name: "conversation.hero.brand.mark" }, Mark));
      ctx.slots.inject("sidebar.footer.action", function* () {
        yield ctx.slots.register({ name: "sidebar.footer.action", id: "wanxiang-discovery", order: 4 }, DiscoveryButton);
        yield ctx.slots.register({ name: "sidebar.footer.action", id: "wanxiang-community", order: 5 }, CommunityButton);
      });
      ctx.slots.inject("shell.overlay", function* () {
        yield ctx.slots.register({ name: "shell.overlay", id: "wanxiang-styles", order: -100 }, ProductStyles);
        yield ctx.slots.register({ name: "shell.overlay", id: "wanxiang-community-drawer", order: 10 }, CommunityDrawer);
      });
      ctx.slots.inject("settings.onboarding", () => ctx.slots.register({
        name: "settings.onboarding",
        id: "welcome-notice",
        priority: -10,
        order: -100,
      }, NoWelcomeNotice));
      ctx.slots.inject("conversation", () => {
        let disposeDiscovery;
        const reconcile = () => {
          const wantsDiscovery = appState.surface === "discovery";
          if (wantsDiscovery && !disposeDiscovery) {
            disposeDiscovery = ctx.slots.register({
              name: "conversation",
              priority: -10,
              inject: () => ({
                beginBuild: (snapshot) => beginBuild(ctx, snapshot),
                enterBuilder: () => enterBuilder(ctx),
              }),
            }, DiscoverySurface);
          } else if (!wantsDiscovery && disposeDiscovery) {
            const dispose = disposeDiscovery;
            disposeDiscovery = undefined;
            dispose();
          }
        };
        const unsubscribe = subscribe(reconcile);
        reconcile();
        return () => {
          unsubscribe();
          disposeDiscovery?.();
        };
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
