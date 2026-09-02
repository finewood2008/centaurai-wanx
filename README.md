# 万象（Wanxiang）

让 IT 能力很弱的社会精英，通过万象这个 agent 打造自己趁手的 AI 助理。
成员用一场引导式访谈长出说明书，DSH 造出来并自己验收，社群随时接手。

产品基线见 [`docs/product/PRODUCT.md`](./docs/product/PRODUCT.md)（v0.4，设计已批准）。

## 仓库结构

```
packages/
  wanxiang-core/       核心库（TypeScript）：说明书规格、确定性编译器、版本账本、
                       调教、定时、运行与资料持久层。从 centaur-WANX 搬入，283 个单测。
  wanxiang-workbench/  DSH 插件（宿主 policy + 状态机 + 浏览器注入）。
  wanxiang-runtime/    容器内启动器：拉起钉版的 DSH，渲染组合配置，管理数据目录。
services/community/    中央社群服务（账号、实例编排、应用注册表、支持台、通知）— 第 1 期
apps/community-web/    市集与支持台网页 — 第 1～2 期
docs/                  产品基线、架构、设计评审
```

旧仓库 `centaur-WANX` 的完整历史保留在分支 `archive/centaur-wanx`。

## 本地运行

```bash
pnpm install:all        # 核心库 + 运行时（运行时会拉取钉版的 DSH 与原生模块）
pnpm test               # 三个包的测试
pnpm start              # 启动工作台，按日志里的完整本地认证地址打开
```

需要 Node 24 与 pnpm 11.7（`corepack prepare pnpm@11.7.0 --activate`）。

本地会话、配置和受保护项目状态保存在 `.wanxiang-runtime/`，不进 Git。
第三方许可见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

## 相关文档

- [产品基线](./docs/product/PRODUCT.md)
- [一体化运行架构](./docs/architecture/WANXIANG_RUNTIME.md)
- [视觉系统](./DESIGN.md)
- [v0.3 五维设计评审](./docs/design/WANXIANG_V03_CRITIQUE.html)
