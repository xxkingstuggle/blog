---
title: Route Lens：在 Chrome MV3 中拦截并对照 ChatGPT 请求与响应的模型路由字段
pubDate: 2026-11-03
updatedDate: 2026-11-23
description: 深入解析 Chrome MV3 扩展 Route Lens v1.3.1 的实现原理：Main World 零残留握手钩子、SSE 流式模型字段比对状态机、Shadow DOM 可定制右侧窄栏与 18 项自动化测试门禁。
kicker: CHROME MV3 · AI ROUTING OBSERVABILITY
kind: project
presentation: article
tags:
  - Chrome MV3
  - JavaScript
  - Shadow DOM
  - ChatGPT
  - 前端工程
cover: ../../assets/projects/route-lens-cover.png
---

在使用 ChatGPT Web 端进行高强度推理或代码审查时，开发者经常会遇到一个疑问：**我在界面左上角选了某个高阶推理模型（或 Auto 路由），但当前这一轮回复到底是由哪个具体模型生成的？服务端返回的多个模型标识字段之间是否一致？**

如果每次都要打开 Chrome DevTools 的 Network 面板，在几十条请求里翻找 `conversation` 的 SSE（Server-Sent Events）事件流并人工肉眼比对 JSON 字段，效率实在太低。为此，我开发并开源了 [**Route Lens (v1.3.1)**](/software/route-lens/)——一款在页面右侧窄栏实时拦截并对照 ChatGPT 请求与响应路由字段的 Chrome Manifest V3 扩展。

<figure class="case-study-figure">
  <img src="/media/route-lens/rail-system-dark.webp" alt="Route Lens v1.3.1 深色模式右侧窄栏界面" width="1280" height="900" loading="lazy" decoding="async" />
  <figcaption>图 1 · Route Lens v1.3.1 深色模式右侧窄栏：通过 Shadow DOM 隔离注入，实时对照请求模型与响应流报告的模型路由字段。</figcaption>
</figure>

## 一、Main World 与 Isolated World 的“先握手、后采集”架构

在 Chrome Manifest V3 中，普通的 Content Script 运行在隔离世界（Isolated World），可以访问 DOM 并调用 `chrome.storage` / `chrome.runtime`，但无法直接拦截页面主线程发起的 `window.fetch`；而运行在主世界（Main World）的脚本虽然能包装 `fetch`，却不能直接读取扩展的 `chrome.storage` 配置。

很多同类扩展的做法是：不管用户有没有开启功能，Main World 脚本一注入就无脑劫持所有 `fetch` 并往 DOM 里塞数据。这不仅浪费内存，还违反了“默认最小侵入”原则。

在 `Route Lens` 中，我设计了一套严格的**双世界握手门禁（Control Handshake）**：

1. **首次握手前静默等待**：Main World 钩子加载后，在收到 Isolated World 桥接脚本（`bridge.js`）发来的首次配置确认握手前，**绝不采集或落盘任何会话载荷**。
2. **确认关闭时彻底停机**：一旦握手确认用户当前处于“关闭”状态（或用户在 Popup 中切换为关闭），Main World 钩子立即停止实时流采集与重载后的 DOM 兜底扫描，清理已挂载的会话上下文（由单测 `页面钩子在首次控制握手前不采集，启用设置到达后恢复实时采集` 与 `首次握手确认关闭时停止重载 DOM 兜底和实时采集` 严格验证）。
3. **会话切换零串台**：当用户在前端切换不同聊天会话或新建对话时，清空旧会话 ID 并重置轮次计数，防止上一场对话的残留路由元数据污染新会话。

<figure class="case-study-figure">
  <img src="/media/route-lens/rail-default-light.webp" alt="Route Lens v1.3.1 浅色模式右侧窄栏界面" width="1280" height="900" loading="lazy" decoding="async" />
  <figcaption>图 2 · 浅色模式下的右侧观测栏：清晰展示请求模型、服务端报告字段一致性及 PoW 时间戳。</figcaption>
</figure>

## 二、不猜测、不虚构：路由一致性判定的四态状态机

ChatGPT 的 SSE 响应流与消息元数据中可能同时存在多个与模型相关的字段（如 `message.metadata.model_slug`、`default_model_slug`、以及路由分类标记）。当这些字段出现差异时，工具最忌讳的就是“随便挑一个字段当成最终真相”。

`Route Lens` 的核心解析器实现了一个严谨的**路由分类与一致性状态机**：

- **字段一致（Consistent）**：请求指定的模型与服务端所有报告字段均吻合，标记为确认一致。
- **显式路由转换（Explicit Routed）**：如请求端发送的是自动路由或顶层别名，服务端显式路由到了具体的子模型（保留各自语义并同时展示请求值与落地值）。
- **服务端字段冲突（Conflict）**：当响应内部的多个报告字段彼此矛盾时，**绝不强行任选其一**，而是显式标记为“字段冲突”并将所有原始字段并列展示。
- **字段缺失 / 无法确认（Unconfirmed）**：当仅有页面 UI 标签但缺少底层请求记录或服务端报告字段时，诚实标记为无法确认。

## 三、Shadow DOM 几何可定制窄栏与 18 项自动化测试门禁

为了让右侧观测栏既能塞下丰富的路由元数据，又绝不干扰宿主页面的 Tailwind 样式或遮挡代码阅读：

- **Shadow DOM 样式隔离与条内独立滚动**：右侧窄栏挂载在独立的 `ShadowRoot` 中，拥有自己的深浅色自适应 CSS 变量体系与内部滚动容器。
- **中英双语对称 Popup 与几何滑块**：用户可以在扩展弹窗中实时调节窄栏的宽度、高度、垂直停靠位置（顶部/居中/底部）及可见字段；点击“恢复默认外观”时，**仅重置几何与视觉参数，绝不误删用户已保存的隐私与捕获模式设置**。
- **18 项 `node:test` 单测与静态检查**：仓库内置了 18 项单元测试与 `scripts/check.mjs` 静态审计，每次构建自动校验 9 个核心 JS 模块、12 个 JSON 配置、双语字典对称性以及零个人绝对路径残留。

你可以前往 [**Route Lens 作品页**](/software/route-lens/) 或 [**GitHub Release v1.3.1**](https://github.com/xxkingstuggle/route-lens/releases/tag/v1.3.1) 下载扩展包。
