# 万象基于 DSH 的技术架构 · Draft 0.1

## 架构决定

万象不 fork DeepSeek Harness，也不在 DSH 外另造一套 Agent Runtime 或主工作台。万象本身是叠加在 DSH Web 上的 **Profile + Bundle + Plugin**：前置页面只完成需求发现与定义，后续构建、验证、运行和改进全部发生在修改后的 DSH 原生界面中。

依据：

- DSH 采用 everything-is-a-plugin 架构，模型、工具、会话、沙箱、存储、循环与 UI 均可从配置替换。
- Profile 是一次运行的命名组合，Bundle 提供可叠加、可覆盖的配置与插件集合。
- Session 使用追加式事件日志；模型看到的内容、工具调用和运行结果可以回放与派生。
- 工具执行、Agent 请求与回合停止均提供拦截点，适合加入权限、审核和质量门槛。

官方参考：[DSH 仓库](https://github.com/deepseek-ai/deepseek-harness) · [架构说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)

> 风险说明：DSH 当前仍是 Developer Preview，并明确提示会有破坏性变更。万象必须固定已验证版本，通过适配层升级，不能直接跟随最新版进入生产。

## 逻辑架构

```text
需求发现与定义 ──进入── 修改后的 DSH Web（万象主界面）
                              │
                  @wanxiang/dsh-builder Bundle
                    ┌─────────┼─────────┐
                    │         │         │
              Builder 策略  社群抽屉  Data Agent Bridge
                    │         │         │
                    └──── DSH Session ──┘
                              │
                  构建 ↔ 验证 ↔ 使用与改进
```

## DSH 组合

### Profile：`wanxiang`

以官方 `dsh-base` 为底层，叠加万象 Bundle。开发阶段优先使用 Web Profile；自动评测使用 Headless Profile。所有生产版本固定 DSH 版本和万象 Bundle 版本。

### Bundle：`@wanxiang/dsh-builder`

Bundle 只通过公开扩展点组合能力。MVP 已包含 Builder 系统提示插件、DSH 品牌位和社群抽屉；后续能力继续在同一 Bundle 内演进：

- Builder Agent Preset。
- Data Agent Bridge Provider 与模型可见 Tools。
- 项目生命周期 Workflow。
- 验收、审批、发布和回滚策略。
- 万象的 Web Client 节点与社群外部服务入口。
- Session Projection：从事件日志派生进度、证据和质量状态。

### Builder Agent

第一版使用一个具备清晰阶段的 Builder Agent，避免过早拆成互相传话的多 Agent 系统。只有可独立验证、需要隔离上下文或长时间运行的任务，才交给 DSH Subagent 或 Job 能力。

Builder Agent 的产品阶段：

1. `discover`：从真实案例提取工作契约。
2. `define`：定义步骤、数据、权限、异常和完成标准。
3. `build-verify`：在一个 DSH 工作会话中组合能力、立即运行案例、根据证据修正，直到可用。
4. `use-improve`：在 DSH 中持续运行、批准风险动作、回归验证并保留版本。

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

- 轻量前置页：只负责需求对话、工作简报确认与数据边界定义。
- 修改后的 DSH Web：万象唯一的主工作界面，承载会话、工具、文件、批准、构建验证和持续使用。
- 社群支持抽屉：由万象 Client Plugin 挂入 DSH 侧边栏；不读取项目审批状态，也不改变流程门槛。
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

1. 成员从最近一次真实任务开始，与 DSH Builder 进行多轮需求访谈。
2. 每轮回答实时进入 Work Brief；目标、输入、规则、输出、边界和验收方式齐备后由成员确认范围。
3. 确认数据边界后，前置页通过 DSH 的认证启动 URL 进入修改后的 DSH Web。
4. Builder Agent 在同一会话内创建 Workflow、运行至少 5 个案例并根据差异持续修正。
5. 在真实数据上影子运行 3 次，达标后转入可持续使用的只读或审批式版本。

这条切片通过后，再扩展 UI 编辑、更多数据源或更复杂工作流。
