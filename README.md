# myzjx.com

Xin 的个人网站：作品、文章与技术实践。正式域名为 https://myzjx.com。

## 界面

首页采用作品网格，集中展示 USBLinkMic、HabitBloom、工程文章与工作台项目；`/software/` 展示作品状态，`/software/<slug>/` 展示功能、素材来源、下载与限制。文章索引支持本地搜索与分类筛选，全站支持日间/夜间主题、移动端 Dock 和兼容的浏览器上的页面转场。

产品资料以 `src/lib/software.ts` 为准；公开下载版本、开发版截图和未完成设备验收分别说明。首页与作品索引目前按前两项产品组织，增加或调整产品顺序时须同时检查这两个页面，不能只追加数据。

## 私人 Web 应用

私人应用中心位于 `/admin/apps/`，包含原有内容工作台、个人迭代系统入口和可自动保存到 D1 的云端便笺。每份私人应用文档支持修订版本、冲突拦截、历史恢复和 JSON 备份。安全边界、应用接入 API、尚未完成的生产验收见 [个人数字空间架构](docs/digital-space.md)。

该项目的前台与后台共享一个域名；Worker 校验 `/admin/*` 与 `/api/admin/*`，前端静态 shell 不包含私有数据。独立 app 可在 GitHub 仓库扩展，不允许在管理员同源环境里直接执行未经审查的上传脚本。

## 结构

- `src/pages/index.astro`：首页与代表作品。
- `src/pages/software/`：作品索引与详情；资料来自 `src/lib/software.ts`。
- `src/pages/posts/`：文章索引与文章路由。
- `src/content/blog/`：Markdown / MDX 原文。
- `src/components/article/`：正文、目录、留言、媒体和下一篇。
- `src/styles/global.css`：公共样式入口；`godly.css` 为网格及导航，`admin-studio.css` 为私人空间，`iteration-gallery.css` 为迭代应用统一风格。
- `src/components/GalleryCard.astro` / `GalleryHero.astro`：首页卡片与详情封面的共享元素。
- `src/pages/admin-shell/apps/`：受 Worker 认证保护的私人应用静态 shell。
- `worker/app-state.ts` / `migrations/0004_private_app_documents.sql`：跨设备文档和版本历史。
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
