# 待对 DSH alpha 验证的搬运件

这里是从 `centaur-WANX` 搬来的、直接依赖 DSH 内核 API 的四个文件与三份测试
（`agent-session` 建会话、`run-agent` 跑一次、`chat-events` / `tool-view` 事件投影）。
它们写在 DSH rc.8 时代，主仓库钉的是 `0.1.2-alpha.2`，接口可能已漂。
装好 `packages/wanxiang-runtime` 的依赖后逐个对照 alpha 的 d.ts 迁进 `src/runtime/`，
迁一个跑一个测试；没验证前不进 `tsconfig` 的编译范围。
