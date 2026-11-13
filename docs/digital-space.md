# MYZJX · 个人数字空间

状态：2026-11-13 改造分支中的第一版架构说明。此文描述**已实现的代码**和**尚未通过验收的工作**，不把 PR 当成已上线。

## 1. 一个域名，两个空间

- 公开网站：\`/\`、\`/software/\`、\`/posts/\`、\`/about/\` 等。Astro 构建为静态页面，Vercel 公开访问。
- 私人应用中心：\`/admin/apps/\`。Cloudflare Worker 在 \`/admin/*\` 入口验证管理员身份，成功后转发 \`/admin-shell/*\` 构建页面。**Shell 是静态的，不包含私有数据。**
- 私人现有工作台：\`/admin/\`（内容与发布）、\`/admin/iteration/\`（独立 GitHub 私有迭代资料）、\`/admin/apps/studio-notes/\`（D1 云端便笺）。
- 服务器：Cloudflare Workers 负责 API；D1 存放草稿、评论、友链和个人应用状态。源代码和部分文档由 GitHub 管理。
- 现有 GitHub OAuth、管理员白名单、HttpOnly Cookie、CSRF、Origin、Fetch-Metadata 校验全部保留。

## 2. 视觉和交互

主要参考 [Godly](https://godly.design/sites/) 的编辑式作品网格、分类导航、卡片浏览和独立详情页。项目保留自己的文案与软件素材。

- \`src/components/GalleryCard.astro\`：独立可导航卡片；\`GalleryHero.astro\`：详情页视觉阶段。
- \`src/styles/godly.css\`：公开站点的响应式侧栏、移动端 Dock、网格卡片、分享元素过渡和底栏。
- \`src/styles/admin-studio.css\`：私人平台与后台组件。
- \`src/styles/iteration-gallery.css\`：个人迭代界面接入统一视觉，但保留四阶段圆盘的功能和真实阶段。
- 浏览器支持跨文档 View Transitions 时使用共享的 \`view-transition-name\`；不支持时自动回退到普通导航。尊重 \`prefers-reduced-motion\`。
- 移动端优先检查 390px Safari；便笺输入字号至少 16px 以避免系统焦点放大。

## 3. 通用应用数据 API

在 \`migrations/0004_private_app_documents.sql\` 创建两张表；没有修改原来的业务表。

- \`app_documents\`：\`(owner, app_id, doc_key)\` 唯一，每份文档一个 JSON 状态与整数修订版本。
- \`app_document_history\`：每次接受写入就记录一个不可变版本，按文档单独查询。
- \`worker/app-state.ts\`：最大 128 KiB 文档、JSON object、严格 slug；由 \`worker/index.ts\` 先调用 \`requireAdmin\` 后路由到处理器，**不要直接暴露为公共 API**。
- \`GET /api/admin/apps/{app}/documents/{key}\`：当前内容、修订版本、修改时间；不存在返回 \`revision: 0\`。
- \`PUT /api/admin/apps/{app}/documents/{key}\`：\`{"content": {...}, "expectedRevision": 0}\`。使用数据库 CAS 防止不同设备的旧版本直接覆盖新版本。发生冲突返回 HTTP 409。
- \`GET .../{key}/history\`：最近 50 条历史（完整历史仍保留数据库，不做自动删除）。
- \`POST .../{key}/restore\`：\`{"content":{"targetRevision":1}, "expectedRevision":2}\`。恢复时创建新版本，不删旧版本。
- \`GET .../{key}/export\`：单个文档 JSON 备份。便笺 UI 另外提供直接导出当前编辑文本，保护未成功上传的修改。
- 所有 API 返回 \`Cache-Control: no-store\`。

这是单文档状态服务，适合轻量 Web 应用；**不是**多租户权限管理系统、二进制文件存储、大型全文检索，也不提供任意代码上传执行。

## 4. 新增私人 Web 应用的标准路径

1. 在 \`src/pages/admin-shell/apps/<app-id>/index.astro\` 建立 Astro/HTML/JS 应用页面；可将样式单独放在 \`src/styles/\`。界面需支持窄屏和键盘。
2. 在 \`src/pages/admin-shell/apps/index.astro\` 的应用目录登记入口；每个目录都是真实可打开的页面，不能仅是装饰性卡片。
3. 启动时调用 \`/api/admin/session\` 获取当前合法的管理员会话与 \`csrfToken\`；写请求必须发送 \`X-CSRF-Token\`，浏览器自动附带同站 Cookie。
4. 调用 \`/api/admin/apps/<app-id>/documents/<key>\` 读写结构化 JSON。每次写入携带已读取的 \`expectedRevision\`，409 时**保留本地编辑**并提示用户检查云端版本。
5. 对批量数据、二进制附件、长任务单独扩展数据库模型与 API，不能将其全部塞进 128 KiB 文档。
6. 必须新增测试，并至少检查登录隔离、CSRF、跨设备冲突、恢复、刷新保留、Safari 的点击和输入体验。

**禁止**让未经审查的上传 HTML 在已登录的相同来源下直接运行，否则会继承管理员页面的数据访问能力。每个新 Web 应用应先由 AI 在 GitHub 分支实现和审查后部署。

## 5. 发布、测试与备份

- \`main\` 推送会触发 Vercel 和 Cloudflare Worker 发布。此改造必须先走草稿 PR，不直接推 main。
- GitHub PR CI：\`npm ci\`、\`npm run check\`、\`npm test\`、\`npm run build\`。
- WebKit 工作流：公开网格、页面跳转、详情页、iPhone 导航、私人便笺假 API 自动保存、个人迭代交互的桌面和移动快照。**假 API 测试不能替代生产真实 OAuth 和 D1 验证。**
- staging 先执行 \`npx wrangler d1 migrations apply blog-staging --remote --env staging\`，用真实登录验证读写、冲突、历史和回滚。线上部署须先核对 Vercel/Worker 构建 SHA。
- D1 文档历史是可恢复版本，但**不是异地备份**。应继续运行已有 D1 导出脚本并保存离站快照；当前没有为本应用新增自动异地备份或定时恢复演练。
- 迭代系统资料仍存 GitHub 私有仓库，D1 版文档存储不改变其“阶段来自 MD”的真相来源。

## 6. AI 开发持续迭代

以 GitHub PR 为最小可审查单元，保持公开页面、后台和数据层的功能边界。开发次序为：需求与数据模型 → 交互与页面 → 权限及版本处理 → 自动检查 → staging 真机验收 → 合并发布。

AI 能在用户发起任务时通过仓库连接器执行开发，但这不等于网站会自己不间断编程；持续自动监控需要额外明确配置。每次改造都必须在 PR 中记录变动、验证结果和回滚方法。

## 7. 目前未完成的验收

- Godly 参考站点的逐帧视觉对照与像素级偏差测量；当前属于依据已检索页面结构实现的设计语言版本，**不应宣称完全 1:1**。
- 真实 iOS Safari / macOS Safari / Android Chrome 上的人手触摸与物理键盘检验。
- staging 的真实 D1 迁移和管理员私有应用数据读写、跨设备同步与恢复测试。
- 跨设备离线队列、端到端加密、自动异地备份、应用目录的版本管理。
