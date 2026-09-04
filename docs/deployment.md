# Cloudflare 部署与故障切换

本地 Astro 仍是 `output: static`。`wrangler.jsonc` 只增加 Worker runtime：静态文件由 `ASSETS` 提供，`/api/*`、`/admin/*`、`/media/*` 和健康检查由 Worker 先处理。Wrangler 的 `run_worker_first` 可以按路径选择 Worker 优先，其余路径保持资产优先（[官方配置说明](https://developers.cloudflare.com/workers/static-assets/binding/)）。

## 1. 先建 staging

```bash
npx wrangler d1 create blog-staging
npx wrangler d1 migrations apply blog-staging --remote --env staging
npx wrangler deploy --env staging
```

把第一条命令输出的 D1 UUID 填入 `wrangler.jsonc` 的 staging `database_id`。R2 需要单独开通计费订阅；未开通时 staging 仍可运行评论、草稿和发布接口，媒体上传返回 `media_storage_unavailable`。生产环境确认计费后再创建 `blog-production` 和 `blog-media-production`，不要把 `workers.dev`、staging Access、D1 或 R2 绑定到生产资源。

## 2. Secret 与管理员登录

当前 staging 使用 GitHub OAuth，允许名单是 `ADMIN_GITHUB_LOGINS=xxkingstuggle`。登录成功后 Worker 只保存签名的 `HttpOnly` 会话 Cookie，并立即撤销本次 GitHub 用户令牌；后台写操作同时验证会话、CSRF、`Origin`、`Sec-Fetch-Site`、方法和 Content-Type。Cloudflare Access 仍可作为生产环境的可选第二层防护，但不是 staging 的运行前提。

```bash
npx wrangler secret put CSRF_SECRET --env staging
npx wrangler secret put SESSION_SECRET --env staging
npx wrangler secret put GITHUB_CLIENT_SECRET --env staging
npx wrangler secret put GITHUB_PRIVATE_KEY --env staging
npx wrangler secret put HEALTH_TOKEN --env staging
npx wrangler secret put CSRF_SECRET --env production
npx wrangler secret put SESSION_SECRET --env production
npx wrangler secret put GITHUB_CLIENT_SECRET --env production
npx wrangler secret put HEALTH_TOKEN --env production
npx wrangler secret put GITHUB_PRIVATE_KEY --env production
```

`GITHUB_APP_ID`、`GITHUB_INSTALLATION_ID`、`GITHUB_CLIENT_ID`、`ADMIN_GITHUB_LOGINS`、仓库和分支位于 `wrangler.jsonc`。GitHub App 只安装到 `xxkingstuggle/blog`，发布时生成最长 1 小时的 installation token（[官方说明](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)）。staging 回调地址固定为 `https://blog-staging.guozhongeba.workers.dev/auth/github/callback`。

GitHub Actions 仓库 Secrets 只需要：

- `CLOUDFLARE_API_TOKEN`：单一 Cloudflare 账户范围，仅 `D1:编辑` 和 `Workers 脚本:编辑`。
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账户 ID。

推送到 `cms-staging` 后自动执行检查、测试、构建、D1 migration、部署和 commit SHA 验证。生产工作流只能手动触发，并且在 production D1 UUID、域名和全部生产 Secrets 配好前不得运行。

## 3. 大陆访客备用境外加速线路

`infra/cloudflare/cn-edge-redirect.json` 是 Cloudflare Single Redirect 的配置模板。规则必须在 Worker/静态资产之前执行；Cloudflare 官方示例支持按国家保留路径和 query string 跳转（[按国家跳域名](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-all-country/)）。

`CF_RULE_API_URL` 填写该规则的 PATCH 地址：`https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/rulesets/<RULESET_ID>/rules/<RULE_ID>`，Token 只授予 Dynamic URL Redirects Write。Rulesets API 的单规则更新使用 `PATCH`（[官方 API](https://developers.cloudflare.com/ruleset-engine/rulesets-api/update-rule/)）。

目标 `cn.xingx.cc.cd` 使用 EdgeOne 全球区域（无备案时不能把中国大陆加入 EdgeOne 加速区域），并将源站设为 `origin.xingx.cc.cd`。EdgeOne 仅放行大陆区域；`/admin/*`、`/api/admin/*` 在 cn 与 origin 都拒绝。主域和 `origin` 的 DNS/TLS/Access 验证完成后，再把规则从 `enabled:false` 改为启用。

`/__health` 要求 `X-Health-Token` 且返回 `__build.json` 中的 commit SHA。定时 Worker 连续三次失败后只关闭 `cn-edge-redirect`，不自动恢复；恢复前用电信、联通、移动各测一次。第一次请求仍先到 Cloudflare，302 只改善跳转后的资源访问。

## 4. 发布与回滚

发布状态为 `draft → publishing → deploying → published`。GitHub Contents 更新已有文件必须带当前 blob SHA；发生冲突返回 409，不覆盖仓库版。只有主源站 `__build.json.commitSha` 与 commit SHA 一致（启用 cn 时 cn 也一致）才进入 `published`。

生产迁移前保留 Vercel 现有项目至少 7 天；复制 DNS 时只添加必要记录，保留 MX、TXT、SPF、DKIM、DMARC。启用 R2 后媒体使用 `/media/<sha256>.<ext>` 永久不变 key；已被任何发布 commit 使用过的对象不自动删除。使用 `scripts/backup-r2.sh` 与 `scripts/export-d1.sh` 做独立备份；D1 Time Travel 当前保留最近 30 天，长期恢复仍依赖独立导出文件（[官方说明](https://developers.cloudflare.com/d1/reference/time-travel/)）。

## 5. 当前边界

- staging 已建立独立 D1；R2 未开通，因此媒体上传会明确返回 `media_storage_unavailable`，不会产生费用。
- production 的 D1 UUID、Access/域名和线路规则仍是占位值；不得部署生产环境。
- 大陆分流规则保持 `enabled:false`，直到备用线路、origin 保护和三网故障切换验收全部通过。
