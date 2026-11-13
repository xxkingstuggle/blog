# MYZJX 官网替换：上线核对记录

日期：2026-11-14（台北/厦门时区）

本 PR 是公开站界面和私人应用中心的整体改造。上线时要保证 Vercel 的静态站版本、Cloudflare Worker 版本与 D1 迁移一致，不能只因为本地 Astro 构建成功就合并。

## 发布前的自动门槛

- [x] `npm run check`、`npm test`、`npm run build`（PR 的 Verify pull request）。
- [x] Safari WebKit 桌面/移动端 UI 自动测试通过，具体见 `docs/glass-media-acceptance.md`。
- [x] 生产部署脚本执行顺序：检查→测试→构建→D1 migrations→Worker 部署→Worker 构建哈希检查→Vercel 官网同哈希检查。
- [ ] Vercel **最新开发分支提交**具有成功的部署状态（非旧提交 Ready）。
- [ ] 该提交在可访问的 Preview 中已能加载最新静态资源。
- [ ] 合并之后验证 `https://myzjx.com/__build.json` 与主分支的新 SHA 一致；若不一致，不能宣称上线完成。
- [ ] 验证登录状态与私人应用文档接口；真实 D1 数据操作仍需线上验收。

## 部署限制

Vercel 最近对该分支返回 `upgradeToPro=build-rate-limit`。生产 GitHub Actions 即使成功部署 Cloudflare Worker，也会因为静态站仍是旧版本而使哈希一致性验收失败。**因此限额未解除时不合并**，以防生产前端、后端版本不一致。

本文件的提交可用于触发一次新的、低风险的分支构建探测；其 Vercel 状态代表当前是否具备发布条件。确认解除限额后，再将草稿 PR 合并并检查生产部署。
