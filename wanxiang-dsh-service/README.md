# 万象 DSH Service

这个 Node 服务把万象的前置需求界面连接到真实 DeepSeek Harness。需求访谈使用 `headless` Profile；需求与数据边界确认后，服务启动本机修改版 DSH Web，加载万象 Bundle，并把认证启动地址返回给前端。

## 启动

```bash
pnpm install
pnpm start
```

默认地址是 `http://127.0.0.1:4317`。服务优先使用本项目固定的 `@deepseek-ai/dsh@0.1.1-rc.2`；开发 DSH 本身时，也可以显式指定已经构建的 CLI：

```bash
DSH_CLI_PATH=/absolute/path/to/deepseek-harness/apps/cli/lib/bin.js pnpm start
```

DSH Web 默认使用 `/Users/finewood/deepseek-harness` 的源码与已构建前端，并监听 `127.0.0.1:3081`。可通过 `DEEPSEEK_HARNESS_REPO`、`WANXIANG_DSH_WEB_PORT` 和 `WANXIANG_DSH_BUNDLE_PATCH` 覆盖。

DSH 从自身的凭证系统或 `DEEPSEEK_API_KEY` 获取模型凭证。服务不会读取、返回或记录密钥。遇到额度或限流错误时，默认等待 60 秒并自动重试；可通过 `.env.example` 中的环境变量调整。

## API

- `GET /api/dsh/health`：验证真实 DSH CLI 并返回版本。
- `POST /api/dsh/run`：执行 `discover`、`build`、`evaluate` 或 `run`。`discover` 会带上当前对话和需求草稿，由真实 DSH Session 每轮只追问一个需求主题。
- `POST /api/dsh/web/launch`：写入已确认的工作简报与示例数据契约，启动修改后的 DSH Web，并返回带启动令牌的本地认证 URL。

每个项目只能写入 `WANXIANG_WORKSPACE_ROOT/<projectId>`。成功运行保留 DSH Session，并在项目目录的 `.wanxiang` 下生成可审查产物。

默认工作区位于仓库根目录的 `wanxiang-workspaces/`，属于本地运行数据，已从 Git 中忽略。
