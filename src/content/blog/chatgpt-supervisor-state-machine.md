---
title: ChatGPT Supervisor：用乐观锁状态机与不可变请求包监督长链路编码任务
pubDate: 2026-11-19
updatedDate: 2026-11-23
description: 针对多 Agent 协作中“高层规划与底层执行脱节、并发执行踩踏工作区”的难题，解析开源项目 chatgpt-supervisor-prototype 的状态机、state_version 乐观锁与 SHA-256 证据校验设计。
kicker: MULTI-AGENT ORCHESTRATION · STATE MACHINE
kind: project
presentation: article
tags:
  - Agent 架构
  - 状态机
  - 乐观锁
  - Python
  - Codex
---

在处理跨越数小时甚至数天的复杂软件工程任务时，我经常采用**“高层架构师（ChatGPT Web / 深度推理模型）+ 本地执行器（Codex CLI）”**的双角色协同模式：前者负责全局架构取舍、审查边界与决定下一步指令；后者负责在本地工作区读写代码、跑测试与采集证据。

然而，靠人工在两个窗口之间复制粘贴提示词，很快就会暴露出三个致命缺陷：

1. **状态失步（Stale State）**：本地已经执行到了第 4 步，但发给高层模型的上下文还停留在第 2 步，导致给出的指令建立在过期代码之上。
2. **并发执行踩踏**：两个终端执行器同时操作同一个任务状态，互相覆盖未提交改动。
3. **口头汇报失真**：执行器省略了报错退出码或未验证项，高层模型在缺乏真实 Git diff 与命令输出的情况下做出错误判断。

为了把这套协作机制从“手工传话”升级为严密的工程协议，我开发并开源了 [**chatgpt-supervisor-prototype (v0.1.0)**](https://github.com/xxkingstuggle/chatgpt-supervisor-prototype)——一个基于纯 Python 标准库与严格状态机实现的长任务监督 CLI 与 Agent Skill。

## 一、六阶段有限状态机（FSM）：拒绝非法阶段跳变

`supervisor.py` 的核心是一个持久化在本地磁盘上的任务状态机。任何一个受监督的长任务，在其生命周期内只能沿着预定义的有向边迁移：

```text
[draft] ──► [awaiting_chatgpt] ──► [instruction_ready] ──► [executing]
                  ▲                                             │
                  └─────────── (提交执行报告，进入下一轮) ─────────┤
                                                                ▼
                                                [paused / completed / failed]
```

CLI 在每一次状态变更时都会执行严格的合法性校验：

- 处于 `awaiting_chatgpt` 阶段时，本地执行器被禁止擅自启动代码修改；必须先登记并通过 SHA-256 校验的高层指令文件，将状态推进到 `instruction_ready`。
- 处于 `executing` 阶段时，不接受新的指令覆盖，直到当前指令产出了完整的执行报告（Continuation Report）并显式归还执行锁。

## 二、三大并发与数据完整性不变量

为了让状态机在多进程、跨会话环境下绝对可靠，`chatgpt-supervisor-prototype` 实现了三项底层保护机制：

### 1. `state_version` 乐观并发控制（Optimistic Concurrency Control）

每次对任务状态 JSON 的修改，调用方必须传入当前已知的 `expected_state_version`。CLI 仅在版本号精确匹配时才递增 `state_version` 并通过临时文件原子替换（Atomic Rename）落盘；一旦发现版本号落后，立即拒绝写入并抛出冲突错误，彻底杜绝过期上下文覆写最新进度。

### 2. 单执行器互斥锁（Token-Guarded Executor Lock）

当本地 Codex 准备执行一条就绪指令时，必须先调用 `acquire-lock` 获取一个随机生成的独占 `lock_token`。

- **无自动超时抢占**：长编译或长测试可能耗时数十分钟，因此互斥锁刻意不设简单的“超时自动失效”，防止第二个 Agent 在第一个 Agent 仍在跑长测试时强行闯入。
- **所有权校验**：只有持有匹配 `lock_token` 的执行器才能提交执行结果或正常释放锁；若发生进程意外崩溃导致孤儿锁，必须由操作员在核对现场进程与 Git 状态后执行显式恢复指令。

### 3. 不可变 Markdown 证据包与 SHA-256 指纹绑定

每一次向高层模型发起的决策请求（Request Packet）与高层返回的指令（Instruction Packet），都被保存为不可变的 UTF-8 Markdown 文件，并在状态账本中记录其精确的 **SHA-256 哈希值**。

- 请求包强制包含：当前目标与修订号、完整 Git 状态与文件差异、实际执行的命令及退出码、失败堆栈、已验证项与未验证项、以及需要高层做出的**唯一明确决策**（同时自动剥离本地密钥与无关隐私路径）。
- 读取或回放历史轮次时，CLI 会重新计算文件 SHA-256 并与账本比对，一旦发现文件被事后篡改或缺失，立即中止流程。

## 三、零外部依赖与 10 项核心单元测试守护

整个监督器 CLI 仅使用 Python 3 标准库实现，无需安装任何第三方 pip 依赖即可在任意 macOS / Linux 开发机上运行。仓库内置了 `test_supervisor.py` 与 `test_skill_layout.py` 自动化测试套件，完整覆盖了合法状态流转、非法跳变拦截、`state_version` 并发冲突、互斥锁争用以及哈希篡改检测。

你可以直接在 GitHub 查看 [**chatgpt-supervisor-prototype v0.1.0 Release**](https://github.com/xxkingstuggle/chatgpt-supervisor-prototype/releases/tag/v0.1.0) 并下载对应的 Skill 安装包。
