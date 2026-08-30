# Git 同步操作手册

## 已配置位置

- 本机：`/Users/finewood/Desktop/projects/centaurAI`
- 远端 `johny`：`~/projects/centaurAI`
- 私有仓库：`finewood2008/centaurAI`
- 远端地址：`git@github-centaurai:finewood2008/centaurAI.git`

远端使用仓库专属的 GitHub 部署密钥，不需要复制或共享个人 GitHub 凭证。

## 本机获取远程修改

```bash
cd /Users/finewood/Desktop/projects/centaurAI
git pull --ff-only
```

根据项目类型安装依赖并启动本地测试，例如：

```bash
npm install
npm run dev
```

## 远程 Claude 工作流

让远程 Claude 在每次修改前运行：

```bash
cd ~/projects/centaurAI
git pull --rebase
```

修改和验证完成后运行：

```bash
git add -A
git commit -m "简要说明本次修改"
git push
```

## 本机也要提交修改时

```bash
git add -A
git commit -m "简要说明本次修改"
git pull --rebase
git push
```

不要把 `.env`、API 密钥、SSH 私钥、密码或大型依赖目录提交到仓库。
