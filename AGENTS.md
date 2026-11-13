# MYZJX

Astro 静态个人作品与文章站，独立 Cloudflare Worker 提供后台与 API。项目结构和部署入口见 [README.md](README.md)。`CLAUDE.md` 软链到本文件，只编辑本文件。

- 使用 `package-lock.json` 与 `npm ci`，Node.js >=22.12.0；检查命令为 `npm run check`、`npm test`、`npm run build`。
- 产品资料与版本边界以 `src/lib/software.ts` 为准，文章 schema 见 `src/content.config.ts`；不将开发截图当公开版或设备验收证据。
- 新增私人应用按 [docs/digital-space.md](docs/digital-space.md) 的接口、权限和迁移约束。`/admin-shell/*` 静态文件本身可被拿到，因此不能包含私人数据或凭据； `/api/admin/apps/*` 先 `requireAdmin` 再读取 D1。严禁在管理员同源环境直接运行不受信任的 HTML。
- CSS 动效必须有 `prefers-reduced-motion` 回退；触摸目标与 iPhone Safari 16px 输入框需验证。网页导航不可依赖单个浏览器的跨页 View Transition。
- 保留既有 `.agent-work/` 和本地验收材料；`PROGRESS.md` / `BLOCKED.md` 是历史记录，恢复任务时重新核对 Git 和运行态。
- 推送 `main` 会触发网站部署，远端发布须有对应授权；Vercel 与 Worker 的发布 SHA 要分别验证。

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
