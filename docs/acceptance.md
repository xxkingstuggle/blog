# 上线前验收清单

## Staging

- `npm run check`、`npm test`、`npm run build` 和 `git diff --check` 全部通过。
- 推送 `cms-staging` 后 GitHub Actions 成功；`/__build.json` 的 `commitSha` 等于该次提交 SHA，且 `dirty` 为 `false`。
- 未登录访问 `/admin/` 跳转 GitHub OAuth；只允许 `xxkingstuggle`，退出后旧会话失效。
- 草稿并发版本冲突返回 409；GitHub 源文件 SHA 冲突不覆盖内容；部署未确认时不显示 `published`。
- 评论拒绝超大 body、错误 Content-Type、错误 Origin、非法 slug 和超限请求；预览 HTML 经过清洗并放入 sandbox iframe。
- `listed:false` 的文章 URL 可访问，但不出现在首页、文章列表、归档、标签、Featured、下一篇、RSS 和 Sitemap。
- reduced motion 显示静态 Hero；无 IntersectionObserver 时内容直接可见；Chrome、Firefox、Safari、iOS/Android 微信 WebView 完成 best-effort 检查。

## Production 与线路切换

- production 使用独立 D1、Secrets、GitHub 分支和可选 R2，不复用 staging 数据。
- `origin.xingx.cc.cd` 已通过 Cloudflare Access Service Auth 保护；`cn` 与 `origin` 的 `/admin/*`、`/api/admin/*` 均拒绝访问。
- Cloudflare Redirect Rule 在 Worker 之前按中国大陆来源保留 path/query 跳转；备用线路故障时可一键关闭，默认不自动恢复。
- 启用分流前完成电信、联通、移动以及海外访问检查；Vercel 原部署至少保留 7 天。
- DNS 变更只添加必要记录，MX、TXT、SPF、DKIM、DMARC 原样保留。
- R2 对象 URL 永久不变；发布历史引用过的对象不自动删除，草稿孤儿至少软删除 30 天，并有独立备份。
