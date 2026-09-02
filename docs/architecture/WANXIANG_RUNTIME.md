# 万象运行架构 · v0.4

## 架构决定

万象是「一人一容器 + 一个中央社群服务」：每个成员有一个独立的 DSH 实例，万象作为
cordis 插件跑在里面；登录、会话所有权、支持授权、应用分享全部在 DSH 之外的万象层。
DSH 是执行内核，不是产品；成员看不到 workspace / preset / session 这些概念。

```
成员浏览器 ──► 万象代理（登录 / 会话所有权 / 支持令牌 / 审计）
                 ├─► 成员容器 A：DSH（钉 alpha）+ @wanxiang/workbench + @wanxiang/core + 数据卷
                 ├─► 成员容器 B：…
                 └─► 中央社群服务：账号、实例编排、应用注册表、支持台、通知、课程
工作人员浏览器 ──► 支持台（中央）──(受限令牌)──► 成员容器
```

## 仓库与包

| 包 | 角色 | 运行在哪 |
|---|---|---|
| `packages/wanxiang-core` | TypeScript 核心库：说明书规格（AppSpec）、确定性编译器、版本账本、调教、定时、运行 / 参数 / 资料持久层、DSH 会话接线（建会话、跑一次、事件投影） | 成员容器内，被 workbench 引用 |
| `packages/wanxiang-workbench` | cordis 插件：宿主侧 policy（权限闸门、路由、系统提示）、项目状态机、浏览器注入（界面换皮、抽屉、制作卡） | 成员容器内的 DSH 进程 |
| `packages/wanxiang-runtime` | 启动器：拉起钉版 DSH，渲染组合配置，白名单环境变量，管理数据目录 | 成员容器的入口进程 |
| `services/community` | 中央社群服务（第 1 期） | 中央 |
| `apps/community-web` | 市集与支持台网页（第 1～2 期） | 中央 |

## 容器内的目录

- `.wanxiang-runtime/engine/`：DSH 自己的配置、凭据与会话索引（`DSH_HOME`）。
- `.wanxiang-runtime/projects/`：Agent 无法直接写入的权威项目状态（说明书、制作状态机、
  审批规则表）。
- `.wanxiang-runtime/workspaces/<app>/`：一个应用一个目录，也是它运行时的 cwd：
  `app.yml`（当前态权威）、`prd.md`、`workspace/.dsh/skills/<name>/SKILL.md`（工作手册）、
  `runs/<时间戳>/`（每次运行的输入、过程摘要、产出）、`revisions/NNNN.yml`（版本账本）、
  `schedule.yml`、`params.yml`。
- `.wanxiang-runtime/wanxiang.patch.yml`：启动时由产品模板渲染的组合配置。

## DSH 用什么、万象自建什么

**直接用 DSH 的**：会话事件溯源与持久化；`agents.create({setup: agentPresets.mount})`
建会话；权限三层（sandbox × approval × permission-presets）；plan-mode 的「计划 → 人审」；
subagent 的 `agentOptions` 分模型；`skill-filesystem` 发现工作手册；`settings` namespace；
`client-ui-deliverables`（一轮改过的文件 = 产出）；`session-log-export`（证据 ZIP）；
`mcp-client` 热生效。

**万象自建的**（DSH 官方 README 明确不做）：
- 用户与鉴权、会话所有权、支持令牌（代理层）。
- 独立评判器：审查员 agent + 验收案例执行 + 三轮闸门（制作状态机）。
- 持久的制作状态机与定时器（DSH workflow 无 resume，jobs 进程内，schedule 只是会话内闹钟）。
- 审批答复器：`tools/pre-execute` 旁路存参数，「以后都允许这类」规则表，无人值守时的
  「待你批准」卡。
- 应用包与注册表：社群只交换声明式应用包，安装时重新编译成 preset。
- 多人看同一会话：代理扇出审批与提问，给工作人员的消息打标签并写审计。

## 权限与安全

- 访谈阶段只读、不弹审批、**无 web 工具**；材料读取走 realpath 校验。
- 制作阶段当前应用目录可写，外部副作用一律先审批；制作与自测期间外部动作影子运行。
- 应用默认不带 shell，`capabilities` 决定工具白名单。
- 分享包不含原始资料路径，案例逐条勾选脱敏。
- 容器只绑回环，出口只有万象代理；模型 key 配在容器里，成员看不到。

## 版本策略

DSH 钉 `0.1.2-alpha.2`（`packages/wanxiang-runtime/package.json` 与两份
`pnpm-workspace.yaml` 的 overrides）。升级前跑三个包的全量测试与一次启动验证；
对 DSH 的依赖收在 `wanxiang-core/src/runtime` 与 `wanxiang-workbench/src/policy.mjs` 两处薄层。
