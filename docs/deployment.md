# Cloudflare 部署与故障切换

本地 Astro 仍是 `output: static`。`wrangler.jsonc` 只增加 Worker runtime：静态文件由 `ASSETS` 提供，`/api/*`、`/auth/*`、`/admin/*`、`/media/*`、构建清单与健康检查由 Worker 先处理。Wrangler 的 `run_worker_first` 可以按路径选择 Worker 优先，其余路径保持资产优先（[官方配置说明](https://developers.cloudflare.com/workers/static-assets/binding/)）。

## 1. 先建 staging

```bash
npm ci
npm run build
npx wrangler d1 create blog-staging
npx wrangler d1 migrations apply blog-staging --remote --env staging
npx wrangler deploy --env staging
```

仅首次创建环境时执行 `d1 create`；已有环境不要重复创建。把 `d1 create` 输出的 D1 UUID 填入 `wrangler.jsonc` 的 staging `database_id`，再执行迁移和部署。production 的 D1 已有配置，不重复创建。媒体上传需要另建 R2 并配置 `MEDIA` 绑定；仅开通计费不会自动启用上传。staging 的 Access、D1、R2 不复用生产资源。

## 2. Secret 与管理员登录

production 使用顶层配置（命令不加 `--env production`），只有 staging 定义了命名环境。两个环境均使用 GitHub OAuth，允许名单是 `ADMIN_GITHUB_LOGINS=xxkingstuggle`。登录成功后 Worker 只保存签名的 `HttpOnly` 会话 Cookie，并立即撤销本次 GitHub 用户令牌；后台写操作同时验证会话、CSRF、`Origin`、`Sec-Fetch-Site`、方法和 Content-Type。Cloudflare Access 仍可作为生产环境的可选第二层防护，但不是 staging 的运行前提。

```bash
npx wrangler secret put CSRF_SECRET --env staging
npx wrangler secret put SESSION_SECRET --env staging
npx wrangler secret put GITHUB_CLIENT_SECRET --env staging
npx wrangler secret put GITHUB_PRIVATE_KEY --env staging
npx wrangler secret put HEALTH_TOKEN --env staging
npx wrangler secret put CSRF_SECRET
npx wrangler secret put SESSION_SECRET
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put HEALTH_TOKEN
npx wrangler secret put GITHUB_PRIVATE_KEY
```

`GITHUB_APP_ID`、`GITHUB_INSTALLATION_ID`、`GITHUB_CLIENT_ID`、`ADMIN_GITHUB_LOGINS`、仓库和分支位于 `wrangler.jsonc`。GitHub App 只安装到 `xxkingstuggle/blog`，发布时生成最长 1 小时的 installation token（[官方说明](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)）。staging 回调地址固定为 `https://blog-staging.guozhongeba.workers.dev/auth/github/callback`。

GitHub Actions 仓库 Secrets 只需要：

- `CLOUDFLARE_API_TOKEN`：单一 Cloudflare 账户范围，仅 `D1:编辑` 和 `Workers 脚本:编辑`。
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账户 ID。

推送到 `cms-staging` 后自动执行检查、测试、构建、D1 migration、部署和 commit SHA 验证。生产公开页面由 Vercel 自动部署 `main`；`/api/*`、`/auth/*`、`/admin/*` 和 `/media/*` 通过 `vercel.json` 代理到 production Worker。仓库文章清单在构建前生成到忽略目录 `worker/.generated/` 并编入 Worker，`dist/` 不包含完整文章或草稿正文；`/__content.json` 在 Worker 上明确返回 404。后台静态界面壳构建在 `/admin-shell/`；`/admin/` 必须保持没有同路径静态文件，让 Vercel 将入口请求交给 Worker 完成 session 校验，再由 Worker读取该界面壳。界面壳不含后台数据，所有数据和写操作仍由 Worker API 鉴权。`src/`、`public/`、`scripts/`、`astro.config.mjs`、`vercel.json` 和 Worker 配置变更会触发 production 工作流重新构建并部署 Worker 资产。工作流分别等待 Worker 与 Vercel 的 manifest 匹配本次 commit SHA；前端总览也会显示线上页面与后台版本的实际对照。

## 3. 大陆访客备用境外加速线路

`infra/cloudflare/cn-edge-redirect.json` 是 Cloudflare Single Redirect 的配置模板。规则必须在 Worker/静态资产之前执行；Cloudflare 官方示例支持按国家保留路径和 query string 跳转（[按国家跳域名](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-all-country/)）。

`CF_RULE_API_URL` 填写该规则的 PATCH 地址：`https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/rulesets/<RULESET_ID>/rules/<RULE_ID>`，Token 只授予 Dynamic URL Redirects Write。Rulesets API 的单规则更新使用 `PATCH`（[官方 API](https://developers.cloudflare.com/ruleset-engine/rulesets-api/update-rule/)）。

以下是尚待配置及验收的备用线路方案，并非已上线状态。仓库模板仍匹配旧域 `xingx.cc.cd`，迁移后不能直接启用，须先按正式主域审查规则。

目标 `cn.xingx.cc.cd` 计划使用 EdgeOne 全球区域（无备案时不能把中国大陆加入 EdgeOne 加速区域），并将源站设为 `origin.xingx.cc.cd`。EdgeOne 仅放行大陆区域；`/admin/*`、`/api/admin/*` 在 cn 与 origin 都拒绝。主域和 `origin` 的 DNS/TLS/Access 验证完成后，再把规则从 `enabled:false` 改为启用。

`/__health` 要求 `X-Health-Token` 且返回 `__build.json` 中的 commit SHA。定时 Worker 连续三次失败后只关闭 `cn-edge-redirect`，不自动恢复；恢复前用电信、联通、移动各测一次。第一次请求仍先到 Cloudflare，302 只改善跳转后的资源访问。

## 4. 发布与回滚

发布状态为 `draft → publishing → deploying → published`。GitHub Contents 更新已有文件必须带当前 blob SHA；发生冲突返回 409，不覆盖仓库版。当前发布协调器检查 `ORIGIN_BUILD_URL` 的 clean manifest：SHA 相同即可确认；若线上是后续提交，则核对祖先关系与文章 blob，区分 `published` 和 `published_superseded`。超过 10 分钟仍未确认会标 `publish_failed`，超时任务继续参与后续协调。cn 监控是独立故障关闭机制，当前不参与文章发布确认；未来启用前须另验收 cn 版本一致性。

生产迁移前保留 Vercel 现有项目至少 7 天；复制 DNS 时只添加必要记录，保留 MX、TXT、SPF、DKIM、DMARC。启用 R2 后媒体使用 `/media/<sha256>.<ext>` 永久不变 key；已被任何发布 commit 使用过的对象不自动删除。使用 `scripts/backup-r2.sh` 与 `scripts/export-d1.sh` 做独立备份。R2 脚本需要 rclone，使用 `sync` 镜像目标目录，源端删除会同步到目标，不能把这一份镜像视为历史版本备份；执行前核对专用目标目录并另存需要保留的快照。D1 导出脚本需要项目 Wrangler，输出带 UTC 时间戳的 SQL；Time Travel 的可用窗口以账户实际方案为准，长期恢复仍依赖独立导出文件（[官方说明](https://developers.cloudflare.com/d1/reference/time-travel/)）。

## 5. 仓库配置边界

- staging 与 production 配置不同的 D1 ID；仓库均未声明 `MEDIA` R2 绑定，未绑定时媒体上传返回 `media_storage_unavailable`。这不证明账户未开通 R2 或没有其他费用。
- production Access audience 与线路 API URL 仍是占位值；仓库不能证明控制台已配置 Access/EdgeOne。保护与故障切换验收完成前，大陆备用线路不得启用。
- 大陆分流规则保持 `enabled:false`，直到备用线路、origin 保护和三网故障切换验收全部通过。

## 主域名迁移记录（2026-10-21，历史证据）

正式站主域名为 `https://myzjx.com`，继续由 Vercel 提供页面、production Worker 提供后台和评论。Vercel 绑定根域及 `www.myzjx.com`，后者永久跳转到根域；旧域 `xingx.cc.cd` 及其 www 在新域功能验证通过后永久跳转，保留路径和查询参数。

Squarespace 仅替换网站默认解析，保留 Google Workspace 的 MX、SPF、DKIM 和其他邮箱/验证记录。DNS 目标值以 Vercel 项目 Domains 页面为准。GitHub App 需要保留 staging 回调并添加 `https://myzjx.com/auth/github/callback`；Worker 的 `PUBLIC_ORIGIN` 和 `ORIGIN_BUILD_URL` 跟随新域名。

旧 `cn` / `origin` 和 staging 配置不在此次迁移中启用；大陆分流仍关闭。验证首页、文章、RSS、sitemap、后台登录、评论和发布状态后再设置旧域跳转。

迁移配置已部署：根域 A 为 `216.198.79.1`，www CNAME 为 `624a4273777affa2.vercel-dns-017.com`，旧域及两个 www 均 308 到 `myzjx.com`。Google 公共 DNS 和 Vercel 均确认解析；MX/SPF/DKIM 保留。直接验证 Vercel 源站的页面、RSS、sitemap、robots、评论读取与来源校验，以及 GitHub OAuth 发起回调均通过。真实浏览器登录后的编辑/发布尚待验收；部分客户端仍缓存原 Squarespace 停放页。

## 当前只读核对（2026-11-01）

核对时本地和远端 main 均指向 `b527a5523e9747725974d125b496c4c7c26763c6`。正式域名 `/__build.json` 返回同一 SHA 且 `dirty:false`，首页 HTTP 200，`/__content.json` HTTP 404。此次只验证公开 HTTP 响应，未重做浏览器交互及登录后发布验收。本段记录的是本次检查时点；后续文档提交不触发生产部署工作流。

当前网络下 production Worker 直连出现 TLS 超时/403，staging 返回 403；正式域 `/admin/` 同样返回 403。因此不能确认后台入口可正常显示登录页，也不能确认 Worker 与 Vercel 的当前 SHA 一致。须从可访问的线路重新核对，不把 403 当作应用鉴权验收通过。未改线上配置、数据库或 DNS。

本地使用 Node 26.8.2、npm 11.19.1，按锁文件完成 `npm ci`；`npm run check` 为 59 files / 0 diagnostics，`npm test` 为 32/32，`npm run build` 为 42 pages，文档本地链接与 `git diff --check` 通过。npm 提示 fsevents、workerd 的安装脚本未获 allowScripts 授权；本轮未扩大安装脚本权限，未验证 Wrangler 本地运行态。本地 manifest 为 dirty，来自本轮文档修改及既有未跟踪材料，不作为部署凭证。
