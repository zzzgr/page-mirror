# Page Mirror

一个 Cloudflare Worker 应用，用于将网页中选定的部分保存为干净、可分享的快照。

## 快速部署

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/zzzgr/page_mirror)

点击按钮会自动 fork 仓库到你的 GitHub，在你的 Cloudflare 账号下创建 Worker、D1 数据库并完成首次构建部署。部署完成后还需要做三件事：

1. **跑远程 D1 迁移**（在你 fork 后的仓库本地执行）

   ```bash
   npm install
   npx wrangler login
   npm run db:migrate:remote
   ```

2. **设置 `COOKIE_ENCRYPTION_KEY` secret**（用于加密站点级 Header / Cookie）

   ```bash
   # 任选一个 32+ 字符的随机串
   openssl rand -base64 32 | npx wrangler secret put COOKIE_ENCRYPTION_KEY
   ```

   也可以在 Cloudflare 控制台 → 你的 Worker → Settings → Variables and Secrets 里添加。

3. 浏览器打开部署得到的 `*.workers.dev` 地址，默认管理员密码 `admin`，**首次登录后请立即在"设置"页改掉**。

> 仅支持 Cloudflare：项目重度依赖 Workers + D1 + 静态资源 binding，Vercel / Netlify 等平台无法直接运行。

## 技术栈

- Cloudflare Workers + D1
- React 19 + Vite 7
- Tailwind CSS 4
- TypeScript

## 本地开发

```bash
npm install
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，设置 COOKIE_ENCRYPTION_KEY
npm run db:migrate:local
npm run dev
```

访问 `http://localhost:8787`，默认管理员密码为 `admin`。

## 手动部署

如果你已经在本地配好 `wrangler login` 和 D1，可以直接命令行部署：

```bash
npm run db:migrate:remote
npm run deploy
```

## 常用命令

```bash
npm run dev               # 本地开发
npm run build             # 构建前端并类型检查 Worker
npm run deploy            # 构建并部署
npm run db:migrate:local  # 本地 D1 迁移
npm run db:migrate:remote # 远程 D1 迁移
```
