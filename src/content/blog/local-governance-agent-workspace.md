---
title: Local Governance Skill：管住本机十几个仓库的目录落位与跨会话交接
pubDate: 2026-11-21
updatedDate: 2026-11-23
description: 长期用 Codex 和 Claude Code 维护本地十几个仓库时，为了解决目录乱放、误删文件和跨会话丢进度的问题，我把自己的工作区规约整理成了 local-governance-skill。
kicker: AGENT ENGINEERING · WORKSPACE GOVERNANCE
kind: thought
presentation: article
tags:
  - Agent Skills
  - 工程治理
  - Codex
  - 工作区架构
  - 开源项目
cover: ../../assets/projects/agent-governance-cover.png
---

在电脑上同时维护十几个项目、每天高频用 Codex 和 Claude Code 写代码之后，我遇到过几次非常让人抓狂的现场：

- Agent 为了存构建产物或交接文档，随手在外层目录新建 `releases/`、`handoff/`、`test-final-2/`，过两周根本分不清哪个目录还能删；
- 拉了别人的开源仓库下来本地打补丁，结果 Agent 顺手执行 git push，差点推到我自己的 GitHub 名下；
- 上一个会话刚修完一半的 Bug 还没提交，新开一个会话进来看到工作区有 diff，以为是残留垃圾，直接给我 `git checkout -- .` 还原了；
- Agent 跑过一次 `tsc` 编译就敢跟我汇报“功能全部完成”，结果我点开页面一看，按钮连事件都没绑上。

吃过这几次亏之后，我把本机的目录规约、Git 红线和跨会话交接方式写成了硬规则，并打包成 [**local-governance-skill (v1.0.0)**](https://github.com/xxkingstuggle/local-governance-skill) 放在 GitHub 上。

## 一看路径就知道是谁的仓库、能不能推

以前我的项目全堆在同一个文件夹下，Agent 很难从路径上看出一份代码到底是我的正式开源项目、别人的仓库，还是随手写的测试脚本。现在我把 `~/Developer` 按用途切成了三块：

- **我自己的正式仓库**：统一放在 `~/Developer/repos/github.com/xxkingstuggle/<repo>`，日常开发只准读写当前项目根目录，禁止跨目录乱写外层文件。
- **别人的开源仓库**：按原作者路径放在 `~/Developer/repos/github.com/<owner>/<repo>`。只要路径里的 `<owner>` 不是我，就绝不允许往我自己的远端推。
- **纯本地项目与临时脚本**：不打算上传的本地项目放 `~/Developer/repos/local/<name>`；一次性的数据处理或实验脚本放 `~/Developer/scratch/<name>`。
- **构建产物与发版**：本地打包产物只准留在项目内被 `.gitignore` 忽略的 `dist/` 或 `build/`；正式发版一律用 `gh release create` 挂到 GitHub Releases，不再建外层 `releases/` 目录。

## 两条不准商量的安全红线

在 `AGENTS.md` 和这个 Skill 里，有两条命令是写死的：

1. **删除本地文件一律进废纸篓，严禁 `rm -rf`**：不管清理旧文章还是删临时构建目录，统一移进 macOS 的 `~/.Trash`（或调 `/usr/bin/trash`）。AI 误判文件用途时有发生，进废纸篓能随时捞回来，`rm -rf` 删错了神仙难救。
2. **提交前查敏感文件，严禁无脑 `git add .`**：每次 `commit` 或 `push` 前必须先核对 `.env`、密钥、本地 SQLite 数据库和大体积二进制文件有没有被 `.gitignore` 拦住。

## 跨会话接力：用三个 Markdown 文件记清“做到哪、卡在哪、为什么这么选”

为什么新开一个 Agent 窗口接手半截项目时总会瞎猜？因为 `git log` 里只有“已经写完提交的代码”，没有记录**“刚才试过哪条路走不通”**和**“现在卡在哪个外部条件上”**。

遇到需要跨多个会话才能干完的复杂重构时，`local-governance` 会在项目里维护三个简单的状态文件：

| 文件名 | 记什么内容 | 什么时候更新 |
|---|---|---|
| **`PROGRESS.md`** | 当前分支的目标、已经跑通并提交的步骤、紧接着下一步要干什么 | 每完成一个自测通过的小步骤并本地 commit 时顺手更新 |
| **`BLOCKED.md`** | Agent 自己搞不定的外部卡点（比如需要插安卓真机测 USB、缺某个环境变量、需要人工扫码登录） | 只有真遇到外部阻塞时才建；卡点解除后直接删掉 |
| **`DECISIONS.md`** | 关键的技术选型原因（比如为什么选了方案 B 而放弃了方案 A） | 做了重要架构取舍时记一笔，防止下一个会话进来又把废弃方案重新写一遍 |

## 不搞形式主义：小改动直接干，交活必须带实测输出

如果只是改一两个文件的简单任务，根本不需要建上面那三个文档，直接改完测通就行。只有新建项目、大重构、发版或者发现工作区有不明改动时，才走这套检查。而且不管任务大小，说“改完了”之前必须真跑过类型检查、Lint、单元测试（改了界面还要跑浏览器断言或截图验证）。整套 `SKILL.md` 和模板已整理在 [local-governance-skill v1.0.0 Release](https://github.com/xxkingstuggle/local-governance-skill/releases/tag/v1.0.0)。
