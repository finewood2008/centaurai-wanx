# 万象基于 DSH 的技术架构 · Draft 0.1

## 架构决定

万象不 fork DeepSeek Harness，也不在 DSH 外另造一套 Agent Runtime。万象通过 DSH 官方的 **Profile、Bundle、Plugin、Agent Preset、Tool、Workflow 和 Session Event** 扩展机制形成自己的产品发行版。

依据：

- DSH 采用 everything-is-a-plugin 架构，模型、工具、会话、沙箱、存储、循环与 UI 均可从配置替换。
- Profile 是一次运行的命名组合，Bundle 提供可叠加、可覆盖的配置与插件集合。
- Session 使用追加式事件日志；模型看到的内容、工具调用和运行结果可以回放与派生。
- 工具执行、Agent 请求与回合停止均提供拦截点，适合加入权限、审核和质量门槛。

官方参考：[DSH 仓库](https://github.com/deepseek-ai/deepseek-harness) · [架构说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)

> 风险说明：DSH 当前仍是 Developer Preview，并明确提示会有破坏性变更。万象必须固定已验证版本，通过适配层升级，不能直接跟随最新版进入生产。

## 逻辑架构

```text
成员工作台 ──────────────── 导师控制台
     │                         │
     └────── 万象 Builder Agent ──────┐
                     │                 │
             Wanxiang DSH Profile     │ 评审 / 批准 / 教学
                     │                 │
        ┌────────────┼────────────┐    │
        │            │            │    │
   工作流与目标   评测与门槛   Session 证据 ─┘
        │            │            │
        └──── Data Agent Bridge ──┘
                     │
        授权数据源 / 业务动作 / 结果来源
```

## DSH 组合

### Profile：`wanxiang`

以官方 `dsh-base` 为底层，叠加万象 Bundle。开发阶段优先使用 Web Profile；自动评测使用 Headless Profile。所有生产版本固定 DSH 版本和万象 Bundle 版本。

### Bundle：`@wanxiang/dsh-builder`

Bundle 只通过公开扩展点组合能力：

- Builder Agent Preset。
- Data Agent Bridge Provider 与模型可见 Tools。
- 项目生命周期 Workflow。
- 验收、审批、发布和回滚策略。
- 万象的 Web Client 节点与导师视图。
- Session Projection：从事件日志派生进度、证据和质量状态。

### Builder Agent

第一版使用一个具备清晰阶段的 Builder Agent，避免过早拆成互相传话的多 Agent 系统。只有可独立验证、需要隔离上下文或长时间运行的任务，才交给 DSH Subagent 或 Job 能力。

Builder Agent 的阶段：

1. `discover`：从真实案例提取工作契约。
2. `model`：定义步骤、数据、权限、异常和完成标准。
3. `build`：组合 Skills、Tools、Goals 与 Workflow。
4. `verify`：执行案例评测和影子运行。
5. `release`：生成版本、操作说明与回滚点。
6. `improve`：根据真实运行反馈提出最小改动并回归测试。

## Data Agent Bridge

万象不让 Builder Agent 直接持有各业务系统凭证。Data Agent Bridge 将现有 Data Agent 暴露为 DSH 的受控能力面。

建议的最小接口：

```ts
interface DataAgentBridge {
  listCapabilities(scope: ProjectScope): Promise<Capability[]>;
  describeCapability(id: string): Promise<DataContract>;
  preview(request: DataRequest): Promise<PreviewResult>;
  execute(request: ApprovedDataRequest): Promise<ExecutionResult>;
  provenance(runId: string): Promise<ProvenanceRecord[]>;
}
```

约束：

- 模型只看到能力描述和经过裁剪的数据，不看到凭证。
- 读取与写入分开授权；写入、发送、删除等动作默认需要批准。
- 每次结果包含来源、时间、查询或动作摘要与可追踪 ID。
- 数据返回需要大小限制、敏感字段策略和确定性错误码。
- Data Agent 的可用能力按项目和成员身份动态裁剪。

## 项目工作区契约

每个万象应用都以可版本化工作区存在：

```text
wanxiang-project/
├── wanxiang.yaml          # 项目、责任人、风险级别与发布状态
├── AGENTS.md              # 对 Builder/Runtime 生效的项目约束
├── work-brief.md          # 真实工作、边界、完成标准
├── data-contracts/        # Data Agent 能力与字段契约
├── workflows/             # 可执行工作流
├── skills/                # 领域方法与操作说明
├── evals/
│   ├── cases/             # 代表性与边界案例
│   └── rubric.yaml        # 验收规则
├── approvals/             # 高风险动作策略
└── releases/              # 版本说明与回滚信息
```

工作区是可读、可审查、可迁移的产品资产；万象 UI 是它的协作界面，而不是唯一入口。

## 产品面与运行面

### 产品面

- 成员工作台：当前阶段、需要回答的问题、运行结果、批准和下一步。
- 导师控制台：项目风险、阻塞、评测覆盖、待评审差异和 Cohort 进度。
- 运营配置：模板、课程、策略、兼容版本和 Data Agent 能力目录。

### 运行面

- DSH Agent 与 Tool Runtime。
- Workspace、Sandbox、Permission 和 Session Persistence。
- Data Agent Bridge。
- Headless Eval Runner。
- 发布版本与回滚。

## 安全与可运营性

- MVP 默认使用 `workspace-write` 或更严格权限，不使用 `danger-full-access`。
- 正式运行关闭非必要遥测；Session 可能含业务数据，导出与共享前必须脱敏。
- 外部 MCP Server 和插件视为受信代码，必须进入批准清单并固定版本。
- 所有高风险动作采用 preview → human approval → execute → verify 四段式。
- 每次发布记录 DSH、Bundle、模型、Tool 和数据契约版本。
- DSH 升级必须通过兼容测试集和至少一个完整 Cohort 项目回放。

## 第一条垂直切片

第一条端到端能力不从“应用首页”开始，而从一个真实工作案例开始：

1. 成员提交最近一次任务的输入与理想输出。
2. Builder Agent 生成 Work Brief，导师确认范围。
3. Data Agent Bridge 提供一个只读能力。
4. Builder Agent 创建单步或少步骤 Workflow。
5. 使用 5 个案例评测并展示差异。
6. 在真实数据上影子运行 3 次。
7. 达标后发布只读或审批式版本。

这条切片通过后，再扩展 UI 编辑、更多数据源或更复杂工作流。
