# @wanxiang/dsh-builder

万象在 DeepSeek Harness 上的最小产品层。它不是另一套 Agent Runtime，也不复制 DSH 工作台。

- Host 插件向每个 DSH Session 注入万象 Builder 的工作原则。
- Client 插件复用原生 DSH 布局，替换品牌位并增加社群支持抽屉。
- 构建和验证属于同一个连续循环，不再作为两个产品阶段。

开发时由 `wanxiang-dsh-service` 使用 `dsh web --patch ./cordis.patch.yml` 启动。作为正式 Profile Bundle 安装时，可运行：

```bash
dsh plugin --profile web add /absolute/path/to/wanxiang-dsh-bundle
```
