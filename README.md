# myzjx.com

Xin 的个人网站：作品、文章与技术实践。正式域名为 https://myzjx.com。

## 界面

首页用简短个人介绍、带真实项目图片的作品卡片和文章列表组织内容，同一项内容只展示一次。文章索引支持本地搜索与分类筛选；关于页介绍正在做的项目。全站共用纸色/陶土色视觉、日间/夜间主题和响应式导航。

2026-10-22 已替换旧全屏 Canvas 首页，删除仅供旧首页使用的五个组件、旧首页样式和旧项目数据。文章、图片、MDX 演示、评论与后台功能保留。

## 结构

- `src/pages/index.astro`：首页与作品展示。
- `src/pages/posts/`：文章索引与文章路由。
- `src/content/blog/`：Markdown / MDX 原文。
- `src/components/article/`：正文、目录、留言、媒体和下一篇。
- `src/styles/journal.css`：新版首页样式。
- `src/styles/tokens.css` / `components.css`：全站视觉与组件。
- `worker/index.ts`：GitHub OAuth、草稿、发布、评论和友链 API。
- `migrations/`：D1 数据库迁移。

## 开发与验证

使用 package-lock.json 和项目本地 npm 依赖。按 AGENTS.md，开发服务器使用后台模式：

```sh
npm ci
npm exec astro dev -- --background
npm exec astro dev -- status
npm exec astro dev -- stop
npm run check
npm test
npm run build
```

## 部署

Vercel 自动部署 `main` 的静态页面，通过 `vercel.json` 将 API、登录、后台与媒体请求代理到独立的 production Worker。Worker 由 GitHub Actions 部署；需要让静态页面与 Worker 构建版本一致时手动运行 production 工作流。测试环境 `cms-staging` 使用独立资源。

文章保留 `thought` / `project` / `update` 分类和 `article` / `feature` 模板，隐藏文章不进入公开索引。旧域名仅作跳转，不作为网站副本。域名、邮箱记录、回滚与资源隔离见 [部署文档](docs/deployment.md)；上线验收见 [验收清单](docs/acceptance.md)。
