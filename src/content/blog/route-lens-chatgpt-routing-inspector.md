---
title: 总怀疑网页版 ChatGPT 偷偷给我降级模型，我干脆写了个扩展盯住它的返回流
pubDate: 2026-11-03
updatedDate: 2026-11-24
description: 每次觉得 ChatGPT 变笨都要按 F12 翻半天 SSE 数据流太蠢了。我写了 Route Lens v1.3.1，在页面右侧挂一条隔离窄栏，把发出去的模型和实际回传的字段摊开来对账。
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

常在网页端用 ChatGPT 审代码或者推演复杂逻辑的人，肯定都产生过一种疑神疑鬼的幻觉。

明明我在左上角手动选了高阶推理模型，或者开了 Auto 自动路由让它处理一段挺难的代码，怎么它这一轮给我的回复这么水？是不是后台偷偷给我路由到轻量小模型上去了？

以前每次犯嘀咕，我就得按下 F12 打开浏览器的 DevTools，切到 Network 面板，在密密麻麻几十条请求里找到那条叫 `conversation` 的请求，点开 EventStream 或原始响应，再瞪大眼睛一行行翻里面流式吐出来的 JSON，去找里面的 `model_slug` 字段。

一天翻个三五回，心态就崩了。

我就想，能不能在 ChatGPT 页面右手边直接挂一条干净的窄栏，我每发一轮对话，它就实时把「我请求里发的模型参数」和「服务端 SSE 流里实际回传的模型字段」并排摆在桌面上让我一眼看清？

这就是我写 [**Route Lens (v1.3.1)**](/software/route-lens/) 这个 Chrome 扩展的起因。

<figure class="case-study-figure">
  <img src="/media/route-lens/rail-system-dark.webp" alt="Route Lens v1.3.1 深色模式右侧窄栏界面" width="1280" height="900" loading="lazy" decoding="async" />
  <figcaption>图 1 · Route Lens v1.3.1 深色模式右侧窄栏，通过 Shadow DOM 隔离注入，实时对照请求模型与响应流报告的模型路由字段。</figcaption>
</figure>

听起来好像只是抓个 `fetch` 响应，但真在 Chrome Manifest V3 的架构下动手写起来，第一个拦路虎就挺有意思。

在 MV3 里，能读取 `chrome.storage` 扩展配置项的普通 Content Script 是跑在隔离环境（Isolated World）里的，它根本摸不到页面自己的 `window.fetch`。反过来，跑在页面主环境（Main World）里的脚本虽然可以包装 `window.fetch` 去读 SSE 数据流，但它又没有权限去读扩展的开关配置。

我看了不少同类油猴脚本和扩展，大家图省事的做法都差不多。只要主环境脚本一注入进去，不管用户当前有没有把扩展功能关掉，先在后台无脑把所有 `fetch` 响应全截下来存进内存里再说，大不了关掉的时候只把 UI 藏起来。

坦率的讲，我特别讨厌这种「表面关了、后台还在偷偷抓数据」的做法。

所以在设计 `Route Lens` 的时候，我定了一条死规矩，必须先握手，后采集。

主环境的钩子脚本加载之后，在没有收到隔离环境桥接脚本 `bridge.js` 发过来的配置确认消息之前，必须保持完全静默，既不解析包，也不往内存里写任何东西。

而一旦握手消息过来，确认用户当前把采集开关关掉了，主环境钩子会立刻停掉实时流采集和页面重载后的 DOM 兜底扫描，顺手把内存里已经存下的会话数据清理得干干净净。为了防止以后改代码破坏这个规矩，我专门在仓库里写了两项单测，分别验证「握手前绝不采集」和「确认关闭后彻底停机」。

而且当你在 ChatGPT 左侧边栏切换不同聊天窗口，或者点开新对话的时候，扩展也会自动清空上一场对话的 ID 和轮次计数，绝不让旧对话的模型标签串台到新对话里。

<figure class="case-study-figure">
  <img src="/media/route-lens/rail-default-light.webp" alt="Route Lens v1.3.1 浅色模式右侧窄栏界面" width="1280" height="900" loading="lazy" decoding="async" />
  <figcaption>图 2 · 浅色模式下的右侧观测栏，清晰展示请求模型、服务端报告字段一致性及 PoW 时间戳。</figcaption>
</figure>

握手解决了，接下来就是最核心的问题，拿到数据流之后怎么展示才不忽悠人？

如果你仔细扒过 ChatGPT 的 SSE 响应流，就会发现里面经常同时带着好几个跟模型有关的字段。除了你发请求时带的 `model`，响应消息的元数据里还有 `message.metadata.model_slug`、`default_model_slug` 等等。

有时候这几个字段长得一模一样，有时候它们自己就会打架。

这时候，一个观测工具最不该干的事，就是自作聪明地在代码里写死优先级，随便挑一个字段拍胸脯告诉用户「这就是真实模型」。

`Route Lens` 的解析器只做老老实实的对账员。我把比对结果拆成了四种明明白白的状态。

第一种是一致，也就是你请求里选的模型和服务端回传的所有模型字段严丝合缝。

第二种是显式路由转换。比如你发出去的是顶层的自动路由别名，服务端在处理时给你转到了某个具体的推理子模型或快速子模型，窄栏就会把「请求值」和「回传值」并排摊开，让你清楚看到它是在哪一步发生转换的。

第三种更有意思，叫服务端字段冲突。如果响应流内部的两个元数据字段自己就对不上了，窄栏会直接挂上「字段冲突」的标记，把打架的原始字段全列出来给你看，绝不替服务端掩盖不一致。

第四种则是缺少底层字段、无法确认。比如你直接刷新了一个历史旧对话页面，当时生成回复的那条实时 SSE 流早就过去了，页面上只剩下一段静态的 DOM 文字。这时候扩展会诚实地标上「无法确认」，不会拿网页表面上的 UI 文字去冒充底层数据包证据。

为了让这条右侧窄栏在 ChatGPT 频繁改版的 Tailwind 样式里稳如泰山，我把整个面板都封进了独立的 `ShadowRoot` 里，自带深浅色主题切换和独立滚动条。你在扩展的 Popup 弹窗里还可以随时拖动滑块，调整窄栏的宽度、高度和停靠位置。哪怕手滑调乱了，点一下「恢复默认外观」，它也只会重置尺寸和主题，绝不会动你已经配好的捕获开关。

整个仓库配齐了 18 项 `node:test` 单元测试和 `scripts/check.mjs` 静态校验脚本。如果你平时用 ChatGPT 也总爱琢磨它到底给没给你用对模型，可以直接去 [Route Lens 作品页](/software/route-lens/) 或者 [GitHub Release v1.3.1](https://github.com/xxkingstuggle/route-lens/releases/tag/v1.3.1) 装上看看，眼见为实。
