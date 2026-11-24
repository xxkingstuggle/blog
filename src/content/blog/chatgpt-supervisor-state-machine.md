---
title: chatgpt-supervisor-prototype：给 ChatGPT 与本地 Codex 之间加一层文件状态机
pubDate: 2026-11-19
updatedDate: 2026-11-23
description: 用 ChatGPT Web 做方案决策、本地 Codex CLI 写代码时，为了解决复制粘贴丢上下文和并发改坏文件的问题，我用 Python 标准库写了一个带乐观锁和 SHA-256 校验的状态机 CLI。
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

做跨模块重构或耗时几个小时的长任务时，我经常用一种双端配合的做法：**在网页端 ChatGPT 里讨论架构和下一步怎么改，在本地终端用 Codex CLI 实际改代码、跑测试。**

一开始我全靠手工在两个窗口之间复制粘贴，但跑过几次长任务后就踩了三个坑：

1. **上下文错位**：本地代码已经改到第 4 轮了，发给网页端看的还是第 2 轮的报错，拿回来的指令完全对不上当前代码。
2. **多终端踩踏**：有时候忘了上一个终端里的 Agent 还在跑长测试，又开了一个窗口发指令，两边同时改同一批文件。
3. **报喜不报忧**：本地 Agent 执行完只总结一句“已修复”，把关键的命令退出码和没跑通的测试漏掉了，导致下一步决策建立在错误前提上。

为了解决这三个问题，我用 Python 标准库写了 [**chatgpt-supervisor-prototype (v0.1.0)**](https://github.com/xxkingstuggle/chatgpt-supervisor-prototype)，把两边交互的过程管起来。

## 用六个状态卡住执行顺序

`supervisor.py` 的核心逻辑很简单：在本地任务目录里维护一个状态机，所有操作必须按顺序走完下面这几个阶段，不能跳步：

```text
[draft] ──► [awaiting_chatgpt] ──► [instruction_ready] ──► [executing]
                  ▲                                             │
                  └─────────── (提交执行报告，进入下一轮) ─────────┤
                                                                ▼
                                                [paused / completed / failed]
```

- 当状态停在 `awaiting_chatgpt` 时，说明现场报告已经打包好了，正在等高层指令；这时候本地 Codex 不能擅自改代码。
- 只有把高层回复的指令写进文件、校验通过并把状态推进到 `instruction_ready` 后，本地执行器才能领锁开始干活。
- 处于 `executing` 阶段时，不接受新指令插队，必须等当前这轮跑完、交了完整的执行报告并释放锁，才能进入下一轮。

## 乐观锁、互斥锁与文件哈希校验

为了防止多个进程或不同会话把状态搞乱，我在 CLI 里加了三项检查：

**1. `state_version` 版本号比对**
每次修改状态 JSON 时，调用方必须带上自己读到的 `expected_state_version`。比如当前是版本 `3`，CLI 核对一致后才会升到 `4` 并通过临时文件原子替换落盘。如果另一个过期窗口还拿着版本 `2` 来写，CLI 会直接报错拒绝。

**2. 执行期独占锁（`lock_token`）**
本地 Codex 开始干活前，要先调 `acquire-lock` 拿到一个随机生成的 `lock_token`。在它交报告释放锁之前，其他进程拿不到锁。
这里我特意**没做“超时自动抢锁”**——因为跑一次完整的编译或 WebKit 测试可能要好几分钟，如果设个简单的超时自动失效，第二个进程闯进来反而会破坏正在跑的构建。真遇到进程崩溃留下死锁，必须人工确认进程不在了，再显式跑 `recover-lock`。

**3. 交接文档绑定 SHA-256**
每一轮发给 ChatGPT 的现场报告（Request Packet）和 ChatGPT 给回来的指令（Instruction Packet），都会存成单独的 Markdown 文件，并把文件的 SHA-256 记进 `state.json`。
而且发给 ChatGPT 的报告模板强制要求附上真实的 `git status`、改动文件列表、实际跑过的命令和退出码，不允许只写一句“已经修好了”。

## 零第三方依赖，自带 10 项单测

为了让这个小工具拷到哪台机器都能直接跑，`supervisor.py` 没引任何第三方 pip 包，纯靠 Python 3 标准库实现。仓库里的 `tests/test_supervisor.py` 测了正常流转、非法跨阶段报错、版本号冲突、锁争用和文件哈希校验篡改这 10 种情况。源码与打包好的 Skill 放在 [chatgpt-supervisor-prototype v0.1.0 Release](https://github.com/xxkingstuggle/chatgpt-supervisor-prototype/releases/tag/v0.1.0)。
