# myzjx.com

Xin 的个人网站：作品、文章与技术实践。正式域名为 https://myzjx.com。

## 界面

首页展示作者介绍、USBLinkMic 代表作、HabitBloom 与工作台项目、工程文章和联系入口；`/software/` 展示作品状态，`/software/<slug>/` 展示功能、素材来源、下载与限制。文章索引支持本地搜索与分类筛选，全站支持日间/夜间主题和响应式导航。

产品资料以 `src/lib/software.ts` 为准；公开下载版本、开发版截图和未完成设备验收分别说明。首页与作品索引目前按前两项产品组织，增加或调整产品顺序时须同时检查这两个页面，不能只追加数据。

## 结构

- `src/pages/index.astro`：首页与代表作品。
- `src/pages/software/`：作品索引与详情；资料来自 `src/lib/software.ts`。
- `src/pages/posts/`：文章索引与文章路由。
- `src/content/blog/`：Markdown / MDX 原文。
- `src/components/article/`：正文、目录、留言、媒体和下一篇。
- `src/styles/global.css`：样式导入入口，含 `journal.css`、`brand.css` 和 `motion.css`。
- `src/styles/tokens.css` / `components.css`：全站视觉与组件。
- `worker/index.ts`：GitHub OAuth、草稿、发布、评论和友链 API。
- `migrations/`：D1 数据库迁移。

## 开发与验证

需要 Node.js >=22.12.0（CI 使用 Node 22），使用 package-lock.json 和项目本地 npm 依赖。按 AGENTS.md，开发服务器使用后台模式：

```sh
npm ci
npm exec astro dev -- --background
npm exec astro dev -- status
npm exec astro dev -- logs
npm exec astro dev -- stop
npm run check
npm test
npm run build
```

## 部署

Vercel 自动部署 `main` 的静态页面，通过 `vercel.json` 将 API、登录、后台与媒体请求代理到独立的 production Worker。影响页面或 Worker 的 `main` 提交会触发 production 工作流，构建并部署同一提交的 Worker 静态资源，并等待 Vercel 与 Worker 的构建 SHA 一致后通过。测试环境 `cms-staging` 使用独立资源。

文章保留 `thought` / `project` / `update` 分类和 `article` / `feature` 模板，隐藏文章不进入公开索引。旧域名仅作跳转，不作为网站副本。域名、邮箱记录、回滚与资源隔离见 [部署文档](docs/deployment.md)；上线验收见 [验收清单](docs/acceptance.md)。

## 接手与状态

日常入口是本 README；操作边界见 [AGENTS.md](AGENTS.md)，CLAUDE.md 软链到同一文件。发布成功须分别核对 Vercel 与 Worker 的 `/__build.json`，不能只看 Git 提交或本地构建。

本地 `PROGRESS.md`、`BLOCKED.md`、`output/` 是被忽略的历史工作记录与验收证据，不作为当前功能或工具可用性的权威来源；`.agent-work/` 是历史协作任务材料，不提交、不自动删除。本地构建 manifest 的 `dirty` 会包含未跟踪文件，不能为得到 clean 标记而清除这些材料。
