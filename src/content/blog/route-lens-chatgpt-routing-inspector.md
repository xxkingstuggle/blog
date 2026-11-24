---
title: Route Lens：在 ChatGPT 页面右侧实时核对请求与返回模型字段的 Chrome 扩展
pubDate: 2026-11-03
updatedDate: 2026-11-23
description: 怀疑 ChatGPT Web 端实际回复的模型跟选的不一致时，老开 DevTools 翻 SSE 太麻烦。我写了 Route Lens v1.3.1，在右侧 Shadow DOM 窄栏里直接列出请求参数和服务端返回的模型字段。
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

在网页端用 ChatGPT 审代码或推理时，我经常想确认一件事：**我在左上角选了某个推理模型（或者走了 Auto 自动路由），这一轮到底发了什么模型参数出去？服务端 SSE 流里实际回传的 `model_slug` 又是哪个？**

每次都按 F12 打开 Network 面板、在几十条请求里找 `conversation` 的事件流再肉眼翻 JSON，实在太麻烦了。所以我写了 [**Route Lens (v1.3.1)**](/software/route-lens/) 这个 Chrome 扩展，在页面右侧挂一条窄栏，直接把每一轮抓到的路由字段摊开对照。

<figure class="case-study-figure">
  <img src="/media/route-lens/rail-system-dark.webp" alt="Route Lens v1.3.1 深色模式右侧窄栏界面" width="1280" height="900" loading="lazy" decoding="async" />
  <figcaption>图 1 · Route Lens v1.3.1 深色模式右侧窄栏：通过 Shadow DOM 隔离注入，实时对照请求模型与响应流报告的模型路由字段。</figcaption>
</figure>

## 为什么主世界钩子要先等握手、确认开启后才抓数据？

在 Chrome Manifest V3 里，能读 `chrome.storage` 配置的普通 Content Script 跑在隔离环境（Isolated World），拦不到页面自己的 `window.fetch`；而跑在主环境（Main World）的脚本虽然能包装 `fetch`，却拿不到扩展的开关配置。

很多同类脚本偷懒的做法是：只要注入了主环境脚本，不管用户有没有把扩展关掉，先无脑把所有 `fetch` 响应存下来再说。

我在 `Route Lens` 里改成了**先握手、后采集**：

- 主环境钩子加载后，在没收到隔离环境桥接脚本（`bridge.js`）发来的配置确认消息前，处于静默等待状态，不抓包也不写内存；
- 一旦握手确认用户当前把开关关了，主环境钩子立刻停掉实时流采集和页面重载后的 DOM 兜底扫描，并清掉已存的会话数据（仓库里有两条单测专门测“握手前不采集”和“确认关闭后彻底停机”）；
- 在网页里切换不同聊天窗口或新开对话时，自动清空上一场对话的 ID 和轮次计数，防止旧对话的模型标签串到新对话里。

<figure class="case-study-figure">
  <img src="/media/route-lens/rail-default-light.webp" alt="Route Lens v1.3.1 浅色模式右侧窄栏界面" width="1280" height="900" loading="lazy" decoding="async" />
  <figcaption>图 2 · 浅色模式下的右侧观测栏：清晰展示请求模型、服务端报告字段一致性及 PoW 时间戳。</figcaption>
</figure>

## 字段对不上时直接列原始值，绝不瞎猜

ChatGPT 的 SSE 响应流里经常同时带好几个跟模型有关的字段（比如请求体里的 `model`、响应消息里的 `message.metadata.model_slug`、`default_model_slug` 等）。如果这几个字段不一样，工具最不该干的事就是自己随便挑一个显示成“真实模型”。

`Route Lens` 的解析逻辑只做老实的字段比对，分四种情况原样展示：

- **一致**：请求里选的模型和服务端回传的所有模型字段完全吻合；
- **显式路由转换**：比如请求发的是顶层自动路由别名，服务端转到了具体的子模型，窄栏会把“请求值”和“回传值”并排都列出来；
- **服务端字段冲突**：如果响应流内部的两个字段自己就对不上，直接标为“字段冲突”，把冲突的原始字段全列出来给用户看；
- **缺少底层字段 / 无法确认**：比如刷新了历史旧页面、没抓到当时的实时 SSE 流，只有页面上的 UI 字样时，明确标为“无法确认”。

## Shadow DOM 样式隔离与 18 项单测

为了不让右侧窄栏被 ChatGPT 页面频繁改动的 Tailwind 样式弄乱，整个窄栏都挂在独立的 `ShadowRoot` 里，自带深浅色切换和内部滚动条。在扩展 Popup 里可以拖动滑块调窄栏的宽高和停靠位置；点“恢复默认外观”时只重置尺寸和主题，不会动用户已经配好的捕获开关。仓库里配了 18 项 `node:test` 单元测试和 `scripts/check.mjs` 检查脚本，安装包和源码都在 [Route Lens 作品页](/software/route-lens/) 与 [GitHub Release v1.3.1](https://github.com/xxkingstuggle/route-lens/releases/tag/v1.3.1)。
