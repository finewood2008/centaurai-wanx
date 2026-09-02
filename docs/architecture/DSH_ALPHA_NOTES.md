# DSH 0.1.2-alpha.2 勘察备忘（对万象设计的影响）

来源：`packages/wanxiang-runtime/node_modules` 里各包的 `README.zh.md` 与 `lib/types/*.d.ts`，
2026-09-02 读取。只记对我们有影响的结论，引号内是 README 原文。

## 1. 程序化驱动 DSH：不用 SDK，用自己的插件路由

- `dsh-sdk-*` 是「按换行分帧的 JSON-RPC 2.0，跑在 stdio 上」，只有 7 个方法
  （`initialize / session/prompt / shutdown` + 4 个事件），「无取消与会话关闭方法」，
  「server→client 请求是未使用的功能……为未来审批流程预留」。本依赖树里**没有** TS client 包。
- 不能与 Web UI 同进程：`dsh-web-app/lib/index.js:211` 用 `console.log` 打印启动行，会污染
  JSON-RPC 分帧；sdk-app README 也警告「用户插件可以破坏 stdout 纯净性」。
- **结论**：中央服务与容器之间的接口是万象插件自己的 `/api/wanxiang/*` 路由；容器内起
  会话、跑案例、收事件都在插件里用 `ctx.agents.create` / `session/event` 做（核心库
  `src/runtime` 已有）。SDK 不进架构。

## 2. 外部触发：`webhookRuntime.dispatch`，队列自己做

- `dsh-webhook`：「接口只包含 `register(rule)` 和 `dispatch(delivery)`；提供方身份验证
  属于适配器包」。内置动作 = 在 Workspace 里建根 Session 并 `followup(prompt)`，必填
  `workspacePath / title / prompt / agentPreset / permissionPreset`。
- 「仅限进程内 fire-and-forget——崩溃会丢失尚未接纳提示词的规则调用；不存在队列、重放
  或重试」「无内置去重」「无完成结果」。
- **结论**：万象插件自造 `VerifiedWebhookDelivery` 直接 `dispatch`；排队、去重、重试、
  完成回执都在万象的制作状态机与定时器里。`dsh-webhook-github` 只是 HMAC 入口范例。

## 3. 审批：seam 开放，规则与持久化自建

- `approval/request` 是 agent-scoped waterfall：「限定到 agent 的监听器只接收该 agent
  的请求」，返回结果即认领、`next()` 即委托；「同级监听器的顺序不是策略优先级机制」。
- 三条硬限制原文：「仅存在一次性授权……不含 `allow-always`、已记住的规则、撤销或授权
  存储」「请求不携带工具参数」「请求只在尚未结束的轮次内有效……持久化的轮次外审批工作流
  仍属延期工作」。
- 浏览器侧 `dsh-client-ui-approval` 提供 `PendingApproval.answer/delegate/abort` 与 slot
  `conversation.approval.detail`：「面板只提供临时决定」。
- **结论**：万象在宿主侧注册 agent-scoped 应答者，`tools/pre-execute` 旁路按 `callId`
  存参数，规则表实现「以后都允许这类」；无人值守撞审批时结束本轮、产出「待你批准」卡。
  卡片的详情用 `conversation.approval.detail` slot 渲染「它想给谁发什么」。

## 4. 文案覆盖：新建品牌语言

- `ctx.locale.addLanguage({ id, label, fallback })` 存在；「fallback 必须已经注册，且整条链
  必须终止于 `en`」。
- `register(ns, locale, dict)` 不能覆盖官方：「Duplicate (ns, locale) throws (single occupant)」。
- **结论**：注册 `zh-Hans-wx`（fallback `zh`），逐 ns 只写要改的键。要强制成员用品牌语言
  需压 `locale.preference` 并藏掉语言选择行。「Client 会刻意拒绝非 loopback 页面使用该
  settings scope」，托管场景下语言偏好不落盘，由万象自己持久化。注册时捕获的文案
  （如命令描述）不随切换刷新。

## 5. 鉴权：启动令牌是一次性入场券

- 「每个进程生成一个随机启动令牌……只在 `GET /` 接受该令牌，写入绑定 authority 的签名
  cookie，再重定向到干净的 `/`」；cookie 30 天、HttpOnly、SameSite=Strict、「刻意不设
  `Secure`」；「HTTP 载体不在根路径交换之外接受 query token，也不接受 Authorization header」；
  「没有 logout 操作」。
- `dsh-authorization` 是「通过询问人来获取配置无法提供的凭据」的 flow（取第三方 token），
  不是登录；`dsh-anonymous-user-id`「不要用它来识别用户」。
- **结论**：万象代理终止 TLS、做成员登录；代理自己对每个容器完成一次 `GET /?token=`
  换 cookie 并保存，之后代理向容器的每个请求注入该 cookie，浏览器只持有万象的会话。
  代理转发时 Host 固定为容器内 DSH 认可的 authority（如 `127.0.0.1:3000`）。
  注销 = 删容器里的 `client-connection/browser-session` 凭据并重启 DSH。

## 6. schedule / workflow：与 rc.8 相比没有新增恢复能力

- `dsh-schedule`：「仅限会话本地交付」「固定间隔……不能高于每 5 分钟一次；不包含日历
  表达式或 Cron」「面向 cold 会话的外部通知渠道明确不在范围内」。
- `dsh-workflow`：「没有日志化或恢复……进程重启后无法继续运行」「仅支持前台收集」。
- **结论**：定时器与制作状态机按计划自建（核心库 `schedule.ts` + workbench 状态机）。
