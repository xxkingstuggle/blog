---
title: 同一个域名下，前面是秒开的静态博客，后面是我自己的私人云端工作台
pubDate: 2026-11-18
updatedDate: 2026-11-24
description: 我不想把随手记的项目便笺和迭代计划分散到一堆第三方 SaaS 里，也不想单独养一台 Linux 服务器。于是我在 myzjx.com 同一个域名下，用 Astro 纯静态层和 Cloudflare Worker 搭了一座带 CAS 防覆盖的私人应用中心。
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

平时写代码的时候，我经常需要随手记一段带着项目上下文的临时便笺，核对一下自己当月的个人迭代计划，或者在手机上改两句还没写完的博客草稿。

以前这些零碎的小需求，要么得分散塞进三四个不同的第三方笔记 SaaS 里，要么就得自己去租一台常驻的 Linux 云服务器，天天操心系统补丁和数据库进程。

我就想，我自己明明已经有一个天天在用的主域名 `https://myzjx.com` 了，能不能让这一个域名同时干成两件事？

当普通访客打开 `myzjx.com` 的时候，他看到的是零运行时负担、秒开的纯静态软件作品集与技术文章；而当我用自己的 GitHub 账号登录进 `/admin/apps/` 之后，同一个域名底下，立刻变成我专属的私人 Web 应用中心。

把公开内容和私人后台塞进同一个域名，听起来很诱人，但工程上最怕踩两个大雷。第一个雷是动态后端拖慢了公开页面的加载速度；第二个雷更致命，万一权限边界画得稍微有一点含糊，让静态构建产物或者未授权请求摸到了我的私人数据，那就成了自己给自己挖坑。

为了把这两件事兼顾好，我在这个仓库里搭了一套「单域名双空间」的架构。

你可以把 `myzjx.com` 想象成一栋有前后两个院子的房子。前院的首页、软件发布页（`/software/*`）还有博客文章（`/posts/*`），根本不需要在每次有人访问时去查数据库。它们全部由 Astro 按照 `output: static` 模式预编译成纯静态 HTML，直接托管在 Vercel 的边缘节点上。

而后院的私人空间和动态接口，则通过仓库根目录的 `vercel.json` 画了一条泾渭分明的分界线。凡是访问路径命中 `/api/*`、`/auth/*`、`/admin/*` 和 `/media/*` 的请求，全部在同源之下重写转发给独立的 Cloudflare Worker（`blog-production`）去处理。

<figure class="case-study-figure">
  <img src="/media/digital-space/architecture-boundary.svg" alt="myzjx.com 单域名下的 Vercel 静态公开层、Worker 鉴权网关与 D1 版本化文档存储边界" width="1200" height="675" loading="lazy" decoding="async" />
  <figcaption>图 1 · 单域名双空间的路由转发与权限边界，包含 Vercel 纯静态公开层、Cloudflare Worker 鉴权网关与 D1 版本化文档存储。</figcaption>
</figure>

这么一切，两边的好处一下子全占齐了。普通读者看文章时，请求直接从静态 CDN 返回，一丁点都不沾 Worker 鉴权和 D1 数据库的耗时；而我自己进 `/admin/*` 后台调 `/api/admin/*` 接口时，因为完完全全共享 `myzjx.com` 同一个 Origin，天然就能用最严格的同源 HttpOnly Cookie，根本不需要去搞容易出安全漏洞的跨域 CORS 白名单或者跨站第三方 Cookie。

说到用 Astro 写后台界面，这里有一条我从第一天起就焊死在架构里的安全红线，静态壳与私人数据彻底物理隔离。

在这个仓库里，后台的三个应用界面，包括 `/admin/` 内容工作台、`/admin/iteration/` 个人迭代系统，以及 `/admin/apps/studio-notes/` 云端便笺，它们的 UI 页面同样是用 Astro 写的，源码放在 `src/pages/admin-shell/` 目录下。

既然它们会跟着 Astro 一起构建成静态文件，那在我的安全模型里，就必须做一个最坏的假设，`/admin-shell/*` 编译出来的 HTML、CSS 和前端 JS 脚本，全都是公开可抓取的空壳子。

因此，构建期严禁往这些静态壳里塞入哪怕一个字节的私人数据、未发布草稿正文或者密钥凭据。

那当我真正打开浏览器访问 `/admin/apps/studio-notes/` 的时候，底下发生了什么？

第一步，请求先撞上 Cloudflare Worker 的 `/admin/*` 守门员。`worker/index.ts` 会先核对我的管理员会话，检查经过签名防篡改的 HttpOnly Cookie，并核对当前登录的 GitHub 账号在不在 `ADMIN_GITHUB_LOGINS` 管理员白名单里。没登录或者不在白名单里的请求，当场就被拦下跳去登录或返回拒绝。

第二步，只有验明正身是管理员本尊之后，Worker 才会在内部回源拉取 `/admin-shell/apps/studio-notes/index.html` 这个空静态壳吐给浏览器。

第三步，空壳页面在浏览器里启动后，先调 `/api/admin/session` 拿到当前会话和专属的 `csrfToken`，接着带上 `X-CSRF-Token` 请求头和同源 Cookie 去调 `/api/admin/apps/*` 拉取真正的私人数据。而且所有的写操作在 Worker 一侧，除了过 `requireAdmin` 之外，还会再次严查请求的 `Origin` 和 CSRF 令牌。

换句话讲，就算有人不走正门，直接去抓了 `/admin-shell/*` 的静态 HTML，他拿到的也只是一具空荡荡的表单骨架；真正有价值的血肉全锁在 Cloudflare D1 和 GitHub 私有仓库里，没过 Worker 鉴权大门的请求连一丁点数据都摸不到。

大门守住了，接下来在写「云端便笺」这类私人小工具的时候，我又给自己解了一个日常特别容易踩的坑，跨设备编辑把自己的字给静默覆盖了。

这种事大家肯定都遇到过。早上出门在手机上打开便笺写了一半，没关页面；晚上回到家打开电脑，在旧版本的基础上又改了一通点了保存；结果手机页面一唤醒自动触发一次保存，直接把你电脑上刚写完的一大段话给无声无息地抹掉了。

为了不给以后每一个私人小工具都重复建一堆表，同时从根上掐死静默覆盖，我在 `migrations/0004_private_app_documents.sql` 里只建了两张极其通用的表。一张是 `app_documents` 主表，用 `(owner, app_id, doc_key)` 当复合主键，存当前的 JSON 文档 `content_json` 和递增整数版本号 `revision`；另一张是 `app_document_history` 历史表，每次主表更新成功时，都在同一个 `D1.batch` 原子事务里往历史表追加一条不可变的历史快照。

而在负责读写状态的 `worker/app-state.ts` 里，我强制上了基于 `expectedRevision` 的 CAS（Compare-And-Swap）乐观锁更新。

```sql
UPDATE app_documents
SET content_json = ?, revision = ?, updated_at = ?
WHERE owner = ? AND app_id = ? AND doc_key = ? AND revision = ?
```

你看这条 SQL 的最后一句 `AND revision = ?`。前端每次点保存，都必须老老实实交代自己当前是在哪个版本号的基础上改的。如果另一台设备已经捷足先登，把云端文档推到了更高的版本号，这条 `UPDATE` 语句就不会命中任何行，`worker/app-state.ts` 当场就会返回 `HTTP 409 (revision_conflict)` 冲突状态码，同时把云端最新的那版内容附在响应体里带回来。

前端一收到 `409`，绝对不会自作主张丢掉你正在敲的文字，而是立刻把未同步的本地草稿安全存进浏览器的 `localStorage`（比如 `myzjx:studio-notes:unsynced:v1`），同时在界面上弹出「导出当前本地文本」和「查看或加载云端版本与历史记录」的按钮，把怎么合并的决定权完完整整交回给我自己。

做私人基础设施，知道「做什么」很重要，但写死「绝不做什么」往往更能保命。在这套私人应用中心里，我给自己划了三条绝对不跨过去的边界。

第一条边界，绝不在管理员同源环境里直接渲染未经代码审查的上传 HTML。你想想看，所有挂在 `/admin/apps/*` 底下的页面，都共享着管理员的最高权限 Cookie 和所有 `/api/admin/*` 接口的访问权。如果我图一时痛快，做一个「随便上传一个外部 HTML 文件就能在后台直接打开运行」的功能，那只要上传的脚本里藏着一行恶意读取，整个后台的所有私人数据就等于大门敞开。所以任何新加的私人小工具，都必须老老实实在 GitHub 分支里写成正式组件，过完代码审查和安全单测再部署上线。

第二条边界，绝不拿这个通用文档接口去硬塞二进制大附件。`worker/app-state.ts` 在流式读取请求体和序列化入库之前，都会严格卡死字节长度，单份 JSON 文档的体积上限死死焊在 `128 KiB`，而且只认合法的 JSON Object 和合规的命名标识（`/^[a-z][a-z0-9-]{0,63}$/`）。真要存大图片或者海量流水表，那就正儿八经另开对象存储或专用表，绝不把轻量状态机撑爆。

第三条边界，绝不把 D1 里的 `app_document_history` 历史表当成异地灾备。历史表解决的只是「我刚才手滑删掉了一段话，想一键找回五分钟前那一版」的后悔药需求，它跟主表依然住在同一个 D1 数据库实例里。真正的离站灾备，依然老老实实靠我的导出脚本 `scripts/export-d1.sh` 和随手可点的 JSON 快照导出落到本地硬盘上。

现在打开 `/admin/apps/`，我的内容工作台、个人迭代系统（底层阶段定义依然以私有 GitHub 仓库的 Markdown 文件为唯一真相源）还有云端便笺都已经稳稳当当地跑在这套双空间架构上了。用做正式产品的安全标准来伺候好自己每天要用的私人小工具，这种心里踏实的感觉，比买任何现成的 SaaS 会员都爽。
