# 上线前验收清单

## Staging

- `npm run check`、`npm test`、`npm run build` 和 `git diff --check` 全部通过。
- 推送 `cms-staging` 后 GitHub Actions 成功；`/__build.json` 的 `commitSha` 等于该次提交 SHA，且 `dirty` 为 `false`。
- 未登录访问 `/admin/` 由 Worker 返回固定品牌登录页；登录按钮再发起 GitHub OAuth。只允许 `xxkingstuggle`，退出后旧会话失效。
- Astro 管理界面静态壳位于 `/admin-shell/`，不得恢复 `/admin/index.html`，否则 Vercel 文件优先级会绕过 `/admin/` Worker 重写；所有后台数据和操作仍由 Worker 会话/CSRF 校验。
- 草稿并发版本冲突返回 409；GitHub 源文件 SHA 冲突不覆盖内容；部署未确认时不显示 `published`。
- 评论拒绝超大 body、错误 Content-Type、错误 Origin、非法 slug 和超限请求；预览 HTML 经过清洗并放入 sandbox iframe。
- `listed:false` 的文章 URL 可访问，但不出现在首页、文章列表、归档、标签、Featured、下一篇、RSS 和 Sitemap。
- 首页内容不依赖 Canvas 或 IntersectionObserver；减少动态偏好停用非必要过渡；Chrome、Firefox、Safari、iOS/Android 微信 WebView 完成 best-effort 检查。

## Production 与线路切换

- production 使用独立 D1、Secrets、GitHub 分支和可选 R2，不复用 staging 数据。
- `origin.xingx.cc.cd` 已通过 Cloudflare Access Service Auth 保护；`cn` 与 `origin` 的 `/admin/*`、`/api/admin/*` 均拒绝访问。
- Cloudflare Redirect Rule 在 Worker 之前按中国大陆来源保留 path/query 跳转；备用线路故障时可一键关闭，默认不自动恢复。
- 启用分流前完成电信、联通、移动以及海外访问检查；Vercel 原部署至少保留 7 天。
- DNS 变更只添加必要记录，MX、TXT、SPF、DKIM、DMARC 原样保留。
- R2 对象 URL 永久不变；发布历史引用过的对象不自动删除，草稿孤儿至少软删除 30 天，并有独立备份。

## 2026-10-22 界面替换

- 首页同一篇内容仅出现一次；项目卡片从公开内容集合读取，草稿与隐藏文章不进入首页。
- 文章索引的分类、关键词搜索、空结果与恢复全部条目可用。
- 桌面和 390px 手机宽度无横向溢出，项目图片、文章正文与页脚可访问。
- 日间/夜间主题切换、刷新后的主题持久化可用。
- 原有文章和素材文件哈希不变，后台与数据库协议不变。
