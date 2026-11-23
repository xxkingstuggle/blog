---
title: Local Governance：我们为什么需要一套管理 AI Agent 本地工作区的不变式协议
pubDate: 2026-11-21
updatedDate: 2026-11-23
description: 当 Codex 与 Claude Code 拥有完整本地文件系统权限时，如何防止目录污染、跨会话失忆与未验证交接？复盘开源项目 Local Governance Skill v1.0.0 的架构设计。
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

当你在本机同时维护十几个开源仓库、长期用 Codex 和 Claude Code 编写代码时，很快会发现一个比“模型写错一行代码”破坏力大得多的问题：**工作区熵增与跨会话漂移**。

如果没有一套硬性约束，AI Agent 在连续几个会话之后就会把你的电脑变成这样：

- 在桌面或外层目录随手新建 `releases/`、`handoff/`、`test-backup-final/` 等散落文件夹；
- 把别人的开源仓库 fork 改写后不小心推到你自己的名下；
- 上一个会话刚修完一半的 Bug，下一个会话进来看到工作区有未提交改动，因为不知道背景而直接 `git checkout -- .` 或重头写一套冲突实现；
- 模型只跑过了编译就向你宣布“全部完成”，等你真正打开界面才发现端口冲突或点击无响应。

为了根治这些问题，我设计并开源了 [**Local Governance Skill (v1.0.0)**](https://github.com/xxkingstuggle/local-governance-skill)——一套面向本地多项目工作区的 Agent 治理协议。

## 一、用“不变式（Invariants）”替代模糊的提示词建议

很多人在写 `AGENTS.md` 或 `CLAUDE.md` 时习惯写长篇的温和建议，但在长上下文窗口中，软性建议极易被模型忽略。`local-governance` 的核心设计思想是把规则收敛为**可机械核验的不变式（Invariants）**：

### 1. 路径落位与所有权隔离不变式

本机所有代码与实验按所有权与生命周期严格落入三个物理隔离的命名空间：

- **个人正式仓库**：`~/Developer/repos/github.com/<owner>/<repo>`，日常读写严格限制在当前项目根目录内，绝不跨目录读写外层路径。
- **第三方开源仓库**：按原作者路径存放在 `~/Developer/repos/github.com/<upstream-owner>/<repo>`，从目录拓扑上杜绝误推到个人名下。
- **纯本地项目与临时实验**：纯本地项目入 `~/Developer/repos/local/<name>`，一次性脚本与概念验证入 `~/Developer/scratch/<name>`。
- **构建产物与发版收敛**：本地构建产物只准留在项目内 gitignored 的 `dist/` 或 `build/`；正式发版一律通过 `gh release create` 托管至 GitHub Releases。

### 2. 安全与破坏性操作门禁不变式

- **严禁 `rm -rf`**：任何本地文件清理必须移入 macOS 废纸篓（`~/.Trash`），确保误删百分之百可逆。
- **提交前敏感信息核验**：严禁无脑 `git add .`；每次 Commit 或 Push 前必须核对 `.env`、密钥、Token、本地数据库及大文件。

## 二、三层生命周期状态账本：消除跨会话失忆

为什么新的 Agent 会话接手项目时总会“猜错进度”？因为 Git Commit 只记录了“已经成功写进历史的代码”，却没有记录**“当前做到哪一步、卡在什么外部条件、为什么放弃了方案 A”**。

`local-governance` 在复杂或跨会话项目中引入了三个轻量级状态文件，作为人类与所有 Agent 共享的唯一真相源（Single Source of Truth）：

| 状态文件 | 核心职责 | 写入与更新时机 |
|---|---|---|
| **`PROGRESS.md`** | 记录当前里程碑、已完成并附带验证证据的步骤、以及紧接着的下一步动作 | 每完成一个通过自测的小步骤并本地 Commit 时同步更新 |
| **`BLOCKED.md`** | 记录当前无法由 Agent 独立突破的外部阻塞（如缺真机连接、缺 Apple 公证证书、第三方接口限流）及恢复条件 | 仅在遇到真实外部阻塞时创建；阻塞解除后立即归档或移除 |
| **`DECISIONS.md`** | 记录关键架构取舍（ADR）：当时面临什么备选方案、为什么选了当前路径、放弃了什么 | 发生重大技术选型或架构重构时记录，防止后续会话反复翻案 |

## 三、按需介入与证据驱动验收

一套好的治理工具绝不能变成繁琐的官僚流程。因此我在 `local-governance` 中设计了明确的**触发与旁路边界**：

- 当只是做一次性的单文件小修改且上下文一目了然时，直接执行，不强加冗余文档。
- 当用户主动点名治理、新建项目、重构目录、准备发版，或 Agent 检测到工作区存在未说明的脏状态、文档与真实代码冲突时，才按需启动治理流程。
- **证据门禁**：任何“已完成”的结论，必须绑定真实跑通的类型检查、Lint（0 报错 0 警告）、自动化测试输出，涉及 UI 的改动必须附带真实渲染截图或验证日志。

目前 [**local-governance-skill v1.0.0**](https://github.com/xxkingstuggle/local-governance-skill/releases/tag/v1.0.0) 已按 MIT 许可在 GitHub 开源，包含完整的 `SKILL.md`、参考规范（`references/`）以及开箱即用的项目治理模板（`assets/`）。
