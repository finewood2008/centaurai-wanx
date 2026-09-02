# 开发流程

- 主分支 `main`；功能在 `redesign/*` 分支上做，合并前跑 `pnpm test`。
- 旧仓库 `centaur-WANX` 的完整历史在分支 `archive/centaur-wanx`，只读。
- 远端使用仓库专属的部署密钥，不要复制或共享个人 GitHub 凭证。
- 不要把 `.env`、API 密钥、SSH 私钥、`node_modules/`、`.wanxiang-runtime/` 提交进仓库。

```bash
git pull --rebase
pnpm install:all
pnpm test
git add -A && git commit -m "简要说明本次修改" && git push
```
