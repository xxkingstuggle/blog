# 私有个人迭代工作台

本项目新增管理员入口 `/admin/iteration/`，用于可视化「问题 → 办法 → 行动 → 反馈」，并直接编辑私有 GitHub 仓库中的 Markdown。**不在此公开仓库存放任何个人记录**。

## 数据隔离

- 公开的 `xxkingstuggle/blog`：仅保存不含个人记录的页面模板、样式、后端逻辑和测试。
- 独立私有仓库：推荐 `xxkingstuggle/personal-iteration-system`，保存全部个人迭代 MD 与 Git 提交历史。
- 之前的 `xxkingstuggle/ai-personal-record-system` 是历史归档：不删除、不清空，也不作为新系统长期存储地点。
- 不把 Markdown 注入 Astro 静态构建；管理员登录后，由 Worker 实时读取。

## 必需配置

**已完成（2026-11-13）：**用户已创建 Private 仓库 `xxkingstuggle/personal-iteration-system`。V0.6 的正式规则、进度、方法历史、交接说明和原 HTML 画板均已迁到根目录，且通过 GitHub 读回核验；旧归档未改动。

已迁移的正式文档（**新仓库根目录**）：

- `START-HERE.md`
- `personal-iteration-system.md`
- `iteration-current.md`
- `iteration-methods.md`

`visual-board.html` 已保存作历史原型，不由 API 提供；站点的新可视化视图由 Astro 实现。旧归档保持不变。

下列 Cloudflare Worker 变量已经写入 `wrangler.jsonc` 的 production 和 staging 配置（不是秘密）：

```text
ITERATION_GITHUB_OWNER=xxkingstuggle
ITERATION_GITHUB_REPO=personal-iteration-system
ITERATION_GITHUB_BRANCH=main
# 若使用另一个 GitHub App 安装 ID，另设 Secret/环境变量：
# ITERATION_GITHUB_INSTALLATION_ID=<实际安装 ID>
```

Worker 现有 `GITHUB_APP_ID`、`GITHUB_PRIVATE_KEY` 必须能从对应安装拿到访问新私有仓库的 token。GitHub App 至少要有该仓库的 Contents 读写权限；若此 App 仅被授权访问博客仓库，需把新私有仓库加入它的安装授权范围。不要给网页 JS 传入 token，也不要把 token 写入代码或仓库。

## 问题金字塔与独立四步圆盘（2026-11-13）

- 管理页面从私有 `iteration-current.md` 的 `## 当前问题链` 章节读取 `text` 代码块中的树形关系，展示一个大问题及其多层子问题；节点文字和关系仅在管理员登录后动态获取，不写入公开代码。
- 私有 Markdown 中仍保留原五列 `当前各问题` 表格，分别作为每个节点真实的四步阶段、进度和下一次追问的数据来源；圆盘只读，点击阶段不改变事实。
- 每条问题链以独立分组显示，父子问题有连线、可收起/展开子层。当前最深的链节点作轻量强调；每个问题点开都有自己的阶段圆盘。
- 搜索或按阶段筛选子问题时，界面保留其上级问题作为上下文，但不会把父问题的阶段伪装成子问题阶段。
- 缺少合法树形定义的旧资料自动退回为独立问题；未在树中出现的问题归到「其他独立问题」，不猜测关系。添加新问题的父子关系时，应同时维护私有文件的树形章节与五列表格。
- 示例格式（仅是假数据，不是用户资料）：

~~~md
## 当前问题链（结构）
```text
示例问题类别
└─ P10 某个大问题
   ├─ P11 第一个子问题
   │  └─ P12 下一层问题
   └─ P13 并列子问题
```
~~~

当前版本不在网页直接改变父子关系；使用 Markdown 工作台编辑并成功保存后才会更新展示。每层解决后的实际反馈仍由用户/AI 根据现实情况写入私有文档。
## 权限和存储机制

- /admin/iteration/ 在 Worker `/admin/*` 路由下要求有效 GitHub 管理员会话或既有受信任的 Cloudflare Access 会话。
- GET `/api/admin/iteration/files` 返回四份文件的 Markdown、当前 blob SHA 与仓库名称；未登录返回 401，未配置返回 503。
- PUT `/api/admin/iteration/files/{filename}` 只能改四个白名单 MD，且需要管理员会话、同源请求、CSRF token、内容长度验证和文件旧 SHA。
- 保存成功会产生一条 Git 提交；如果其他客户端先行修改，返回 409，提醒先刷新。
- GitHub API 与仓库密钥只在 Worker 服务端调用，不会提供给浏览器。
- 目前每次从远端读取，不做本地浏览器长期缓存，也不自动扫描真实生活或自动更新记录。

## 验收

1. 使用未登录浏览器访问 `/admin/iteration/`，应被重定向登录，访问 API 返回 401。
2. 登录后页面能加载四份私有 MD，显示 P01–P06 的真实进度。
3. 修改一行并保存，应看到新 Git commit；刷新页面后内容一致。
4. 再用另一客户端改同一文件，旧 SHA 保存应提示冲突而非覆盖。
5. 用其他文件名请求写入应被拒绝，尤其是根目录的 `AI行为规则.md`。
6. 运行 `npm run check`、`npm test`、`npm run build`，验收 Worker 和 Vercel 构建 SHA 一致后才可宣布上线。

当前工作分支：`feature/private-iteration-workspace`。独立仓库和配置已经完成，**尚未确认网站现有 GitHub App 安装已授权访问新私有仓库**；未通过登录后读写验收前，不得声称已经在线保存成功。
