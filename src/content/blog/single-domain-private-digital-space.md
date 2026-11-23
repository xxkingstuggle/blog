---
title: "单域名里的双空间：用 Astro 静态站与 Cloudflare Worker 搭一座私人应用中心"
pubDate: 2026-11-18
description: "同一个 myzjx.com 域名下，公开页面保持 Astro 纯静态，/admin/* 交给 Cloudflare Worker 鉴权并读写 D1。记录静态壳隔离、CAS 版本冲突拦截与私人应用的工程边界。"
kicker: "ARCHITECTURE · DIGITAL SPACE"
draft: false
listed: true
kind: project
presentation: article
tags:
  - Cloudflare Workers
  - D1
  - Astro
  - 架构设计
  - 安全边界
---

随手记一段带项目上下文的便笺、查一下自己的个人迭代阶段，或者改一篇尚未发布的文章草稿，这些事我不想分散到几个第三方 SaaS 里，也不想为此单独维护一台常驻 Linux 服务器。

理想的状态很直接：打开自己的域名 `https://myzjx.com`，访客看到的是零运行时负担的静态作品与文章；而我登录 `/admin/apps/` 之后，同一个域名下就是我自己的私人 Web 应用中心。

把公开内容与私人工具放进同一个域名，最怕两件事：一是动态后端拖慢公开页面的加载，二是权限边界画得含糊，让静态构建产物或未授权请求碰到了私有数据。本文记录这套「单域名双空间」架构在仓库里的真实实现与取舍。

## 一个域名，两条互不干扰的链路

公开页面不需要在每次请求时查数据库。首页、作品详情（`/software/*`）、文章页（`/posts/*`）全部由 Astro 按 `output: static` 构建成纯静态文件，托管在 Vercel 上。

私人空间与动态接口则通过根目录的 `vercel.json` 划出明确的路径边界：凡是命中 `/api/*`、`/auth/*`、`/admin/*` 与 `/media/*` 的请求，全部在同源下重写转发给独立的 Cloudflare Worker（`blog-production`）。

<figure class="case-study-figure">
  <img src="/media/digital-space/architecture-boundary.svg" alt="myzjx.com 单域名下的 Vercel 静态公开层、Worker 鉴权网关与 D1 版本化文档存储边界" width="1200" height="675" loading="lazy" decoding="async" />
  <figcaption>图 1 · 单域名双空间的路由转发与权限边界结构示意，非生产流量监控截图。</figcaption>
</figure>

这样做有两个直接好处：

1. **公开访问依然是纯静态速度**：普通读者浏览文章和作品页时，请求直接由静态边缘节点返回，不经过 Worker 鉴权逻辑或 D1 查询。
2. **后台拥有完整的同源 Cookie 与安全上下文**：`/admin/*` 与 `/api/admin/*` 共享 `myzjx.com` 同源，不需要配置跨站 Cookie 或放宽 CORS 白名单。

## 静态壳公开可抓：为什么 `/admin-shell/*` 绝不内嵌私人数据

在这个仓库里，后台界面（`/admin/` 内容工作台、`/admin/iteration/` 个人迭代系统、`/admin/apps/studio-notes/` 云端便笺）同样是用 Astro 编写的，源码位于 `src/pages/admin-shell/`。

这里有一条在设计之初就钉死的红线：**`/admin-shell/*` 构建出的 HTML、CSS 和客户端脚本，在安全模型上律视为公开可抓取的静态壳，绝不能包含任何私人数据、草稿正文或凭据。**

当浏览器请求 `/admin/apps/studio-notes/` 时，真实发生的流程是：

1. 请求命中 Worker 的 `/admin/*` 入口，`worker/index.ts` 先校验管理员会话（基于 GitHub OAuth 白名单 `ADMIN_GITHUB_LOGINS` 与签名的 HttpOnly Cookie）。
2. 未登录或不在白名单内的请求直接跳转登录或返回拒绝；只有鉴权通过后，Worker 才在内部拉取 `/admin-shell/apps/studio-notes/index.html` 静态壳返回给浏览器。
3. 页面在浏览器启动后，先请求 `/api/admin/session` 获取当前会话与 `csrfToken`，再携带 `X-CSRF-Token` 与同源 Cookie 调用 `/api/admin/apps/*` 读写数据。所有写请求在 Worker 侧还会再次核对 `Origin` 与 CSRF 令牌。

即便有人绕过入口直接拿到了 `/admin-shell/*` 的静态 HTML，里面也只有空的表单骨架和前端脚本；真正的数据存储在 Cloudflare D1 和 GitHub 私有仓库里，没有通过 `requireAdmin` 的请求读不到任何内容。

## 用两张 D1 表做轻量状态服务，并拦住跨设备覆盖

写云端便笺这类私人小工具时，最容易踩的坑是：手机上改了一半没刷新，回到电脑上又改了一版，后保存的直接把先保存的静默覆盖掉。

为了不给每个小工具都重新设计一套数据库表，`migrations/0004_private_app_documents.sql` 只建了两张通用表：

- `app_documents`：以 `(owner, app_id, doc_key)` 为复合主键，保存当前 JSON 文档内容 `content_json` 与整数版本号 `revision`。
- `app_document_history`：每次写入成功时，在同一个 `D1.batch` 事务里追加一条不可变的历史版本记录。

对应的状态处理器 `worker/app-state.ts` 强制执行了基于 `expectedRevision` 的 CAS（Compare-And-Swap）更新：

```sql
UPDATE app_documents
SET content_json = ?, revision = ?, updated_at = ?
WHERE owner = ? AND app_id = ? AND doc_key = ? AND revision = ?
```

前端每次保存都必须带上自己当前基于哪个 `expectedRevision` 修改。如果另一台设备已经先把云端版本推到了更高的 `revision`，数据库的 `WHERE revision = ?` 就不会命中，`worker/app-state.ts` 立即返回 `HTTP 409 (revision_conflict)`，并在响应体里附带云端最新版本。

前端收到 `409` 后**绝不丢弃本地正在编辑的文字**，而是把未同步内容暂存在浏览器 `localStorage`（如 `myzjx:studio-notes:unsynced:v1`），同时提供「导出当前本地文本」和「查看/加载云端版本或历史记录」的入口，把合并决定权交还给人。

## 明确不越过的三条边界

这套私人应用中心只解决「个人轻量 Web 工具的统一鉴权与跨设备 JSON 状态同步」，代码里同样写死了它不做什么：

1. **不在管理员同源下运行未经审查的上传 HTML**：所有位于 `/admin/apps/*` 的页面都共享管理员 Cookie 和 `/api/admin/*` 的访问权。如果允许直接上传一段外部 HTML 或未审查脚本在同源下渲染，就等于敞开了读取全部私人数据的后门。因此新应用必须在 GitHub 分支里写成正式组件，经过代码审查与测试后再部署。
2. **不拿 128 KiB 文档接口塞二进制附件或大表**：`worker/app-state.ts` 在流式读取请求体和序列化入库前都会校验字节长度，单份文档上限严格卡在 `128 KiB`，且只接受合法的 JSON Object 与受限 slug（`/^[a-z][a-z0-9-]{0,63}$/`）。遇到批量记录或媒体附件，必须单独设计表结构或对象存储。
3. **不把 D1 历史表当成异地灾备**：`app_document_history` 解决的是「误删一段话想找回五分钟前的版本」，它和主表仍在同一个 D1 实例里。真正的离站备份依然依赖导出脚本（`scripts/export-d1.sh`）和定期导出的 JSON 快照。

目前 `/admin/apps/` 已经接入内容工作台、个人迭代系统（阶段定义仍以私有 GitHub 仓库的 Markdown 为真相源）和云端便笺。本地与 WebKit 自动化测试已覆盖未授权拦截、CSRF 校验、跨设备 `409` 冲突、离线草稿恢复与 JSON 导入导出；面向生产环境的自动异地备份与多应用目录扩展，还留待后续按需迭代。
