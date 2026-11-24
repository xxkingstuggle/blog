---
title: BossHunter：用 YAML 规则与本地 SQLite 过滤招聘岗位的求职脚本
pubDate: 2026-11-16
updatedDate: 2026-11-23
description: 同时投递 AI 产品和 AI 应用开发两类岗位时，我用 Python、Playwright 和 SQLite 写了一套本地岗位筛选与投递记录工具。
kicker: AI AGENT APPLICATION · WORKFLOW AUTOMATION
kind: project
presentation: article
tags:
  - Agent 应用
  - Python
  - Playwright
  - 规则引擎
  - SQLite
---

今年秋季找工作时，我同时在看两类机会：一类是 **AI 产品经理 / 产品助理**，另一类是 **AI 应用 / Agent 开发**。

每天在招聘网站刷岗位，最费时间的不是聊，而是筛。搜索词稍微宽一点，列表里就会混进大量挂着产品名义的电话销售、驻场外包，或者要求五年以上团队管理经验的资深岗；遇到合适的岗位，还得判断它更偏业务原型还是偏代码实现，再手动切换对应的招呼语和作品集链接。

为了把这部分重复筛选省下来，我用 Python 和 Playwright 写了 [**BossHunter**](https://github.com/xxkingstuggle/BossHunter)。

## 先按岗位方向打分，再决定用哪套话术

脚本不会对搜索出来的岗位无脑点“立即沟通”。我在 `config/jobs.yaml` 里把两类目标岗位拆成了两套规则，每套规则包含加分项、排除词和对应的招呼语模板：

- **AI 应用 / Agent 开发方向**：JD 里出现 `Agent`、`MCP`、`Skill`、`Prompt`、`RAG`、`TypeScript`、`Python`、`Swift` 等关键词时累加权重；匹配通过后，招呼语直接附上 GitHub 和 `myzjx.com/software/` 上的开源工具链接。
- **产品经理 / 产品助理方向**：重点匹配 `需求分析`、`原型设计`、`Figma`、`B 端后台`、`教育`、`SaaS`、`跨团队协同` 等词；匹配通过后，发送偏产品实践与原型的介绍。
- **一票否决词**：只要标题或正文命中 `电销`、`外呼`、`驻场运维`、`催收` 或年限要求远超应届/初级范围，直接跳过。

## 用本地 SQLite 记账，避免重复打招呼

不同搜索词扫出来的岗位列表经常有重合。为了避免对同一个岗位重复点开或重复发消息，脚本在本地维护了一个 SQLite 数据库：

- 每次扫到新卡片，先用平台岗位 ID（拿不到 ID 时退化为 `公司名 + 岗位名 + 城市`）查表，处理过的直接跳过。
- 每一个扫过的岗位都会落盘一条记录：得分多少、命中了哪几个词、因为什么词被拒、发了哪版招呼语、具体时间戳。跑完一轮之后，直接查表就能看出哪些关键词捞出来的噪音多，方便随时改 `jobs.yaml`。

## 频率控制与验证码停机边界

招聘平台对高频点击非常敏感。用 Playwright 驱动本地浏览器时，我加了两道硬限制：

一是每次翻页、点开详情和发送招呼之间，都会插入随机等待间隔，并限制单次运行和每日的最大沟通上限，保持和真人浏览相近的节奏。

二是遇到验证码或风控弹窗立刻停机。脚本内置了页面状态检查，一旦检测到安全验证弹窗、滑块或异常跳转，**绝不尝试绕过或破解验证码**，而是立刻把当前进度写回 SQLite、退出自动化循环并提醒人工接手。源码放在 [xxkingstuggle/BossHunter](https://github.com/xxkingstuggle/BossHunter)。
