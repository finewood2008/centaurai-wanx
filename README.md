# 万象（Wanxiang）

万象是一个以 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 为底座、由社群陪跑的工作 Agent Builder。

它不承诺让普通人“一句话生成应用”，而是帮助社群成员把自己的真实工作流程，逐步构建成可连接真实数据、可验证、可审计、可持续改进的 Agent 应用。

## 当前阶段

项目处于 **产品基线 / Draft 0.1**：先验证“社群成员 + Builder Agent”能否稳定交付有用的工作应用，再扩大自助能力。社群作为独立外部服务提供咨询与反馈，不进入 Builder 流程。

- [产品基线](./docs/product/PRODUCT.md)
- [DSH 技术架构](./docs/architecture/DSH_FOUNDATION.md)
- [单页产品规格](./index.html)
- [万象 MVP](./wanxiang-mvp)
- [DSH 本地服务](./wanxiang-dsh-service)
- [视觉系统](./DESIGN.md)
- [Git 同步说明](./SYNC.md)

## 北极星

> 用户不是在万象里“做出一个应用”，而是在万象和社群的帮助下，让一项真实工作第一次被可靠地完成，并能在此后重复运行。

## 本地运行

万象 MVP 由两个本地进程组成。先启动万象 DSH 服务；它会在需求定义完成后启动本机修改版 DSH Web，并加载 `@wanxiang/dsh-builder` Bundle：

```bash
cd wanxiang-dsh-service
pnpm install
pnpm start
```

再启动 Web 界面：

```bash
cd wanxiang-mvp
npm install
npm run dev
```

打开 `http://localhost:3000`。前置界面只完成需求发现和数据边界定义；确认后会进入 `http://127.0.0.1:3081` 上经过认证的 DSH 原生界面。万象 Bundle 负责 Builder 策略、品牌位和社群抽屉。当前 Data Agent 仍是示例契约，不会读取真实客户数据。
