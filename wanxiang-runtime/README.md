# 万象本地工作台运行时

这个包负责启动完整的万象工作台。它使用项目固定安装的开放框架内核、万象自己的产品 Bundle 和独立数据目录，不依赖电脑上的源码仓库，也不会继承个人安装的插件。

## 启动

```bash
pnpm install
pnpm start
```

工作台默认监听 `http://localhost:3000`。启动日志会打印带本地认证令牌的地址。

默认数据目录是仓库根目录的 `.wanxiang-runtime/`：

- `engine/`：万象独立的运行时配置与会话状态。
- `workspaces/`：用户项目和可审查产物。
- `wanxiang.patch.yml`：启动时由产品模板生成的组合配置。

可通过 `WANXIANG_DATA_ROOT` 把整个目录迁移到桌面应用的用户数据目录。`WANXIANG_PORT`、`WANXIANG_PROJECT_ID` 和 `WANXIANG_PROJECT_NAME` 可覆盖默认启动参数。

模型凭证只由工作台自身的凭证系统管理；启动器不会读取、返回或记录密钥。
