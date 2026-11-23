---
title: "AI 写完界面之后：为什么我用 WebKit 几何断言代替「看起来差不多」"
pubDate: 2026-11-15
description: "和 AI 协作改界面时，肉眼抽查很容易漏掉暗色对比度退化、圆角不同心、弹层裁切和 iPhone Safari 输入框放大。把视觉契约写成 WebKit 计算样式与几何断言，才能守住改动边界。"
kicker: "ENGINEERING QA · WEBKIT ASSERTIONS"
draft: false
listed: true
kind: thought
presentation: article
tags:
  - WebKit
  - 自动化测试
  - AI 协作开发
  - 前端工程
  - 验收
---

用 AI 写前端代码有一个很隐蔽的陷阱：它改完一轮样式，跑通了 `tsc` 和 `astro build`，甚至给你截了一张缩略图，报告说「视觉升级已完成」。

但只要你打开 Safari 切到暗色模式，或者把视口缩到 `390px` 的 iPhone 宽度点一下输入框，问题就会立刻冒出来——暗色按钮变成了白底浅灰字、磨砂侧栏里的弹出菜单被 `overflow` 切掉了一半、卡片外框和内图的圆角拧成了三层、手机点一下搜索框整个页面突然被系统放大。

在反复修过几次这类「AI 觉得改好了、实际一碰就碎」的界面问题后，我不再靠肉眼抽查或口头叮嘱来验收，而是把容易退化的审美与交互要求，逐条写进了 `scripts/verify-studio-webkit.mjs` 和 `scripts/verify-iteration-webkit.mjs` 的 Playwright WebKit 断言里。

## 踩过真坑，才知道哪些地方不能靠「目测」

打开 `scripts/verify-studio-webkit.mjs`，里面的每一条 `assert` 几乎都对应过一次真实的回归事故：

### 1. 暗色模式不是加一层 `filter: brightness(...)`，更不能退化成白块或黑底深蓝字

有一次调整卡片与关于页按钮样式后，亮色模式下一切正常，切到暗色模式却出现了两处刺眼的问题：一处是侧栏与卡片背景回退成了不透明的浅白块（`rgb(255, 255, 255)`），另一处是正文链接继承了深海军蓝（`rgb(23, 32, 57)`），压在深色背景上几乎没法读。

现在脚本会在 WebKit 里分别切换 `light`、`dark` 和 `system` 模式，直接读取 `getComputedStyle` 计算后的真实 RGB 通道，按 WCAG 相对亮度公式算出对比度：

```js
const contrastRatio = ({ fg, bg }) => {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
assert.ok(lightRatio >= 4.5, '亮色主按钮对比度必须 >= 4.5:1');
assert.ok(darkRatio >= 4.5, '暗色主按钮对比度必须 >= 4.5:1');
```

同时断言暗色文字卡片必须重新绘制深色渐变（`filter === 'none'`），侧栏必须保持 `rgba(...)` 半透明。任何把暗色模式偷懒改成全局滤镜或写死浅色底的改动，都会在构建验收时直接报错。

### 2. 双层同心圆角：差值不能超过 `0.75px`

作品卡片由外层容器（`.gallery-card`）、内层视觉舞台（`.gallery-card-visual`）和最里面的图片或视频组成。如果三层各自设一个差不多的 `border-radius` 和 `padding`，拐角处就会出现肉眼看着别扭的「厚薄不均」或第三层白边。

正确的几何关系只有一条：**外层圆角减去内边距，必须等于内层舞台圆角（$R_{\text{outer}} - P_{\text{inset}} = R_{\text{inner}}$），且最里面的 `<img>` 本身不能再加第三道圆角或内边距。**

这句设计规则现在直接是一段几何断言：

```js
assert.ok(
  Math.abs(media.outer - media.inset - media.inner) < 0.75,
  '外框与内层舞台必须保持同心圆角'
);
assert.ok(
  media.imageRadius < 0.2 && media.imagePadding < 0.2,
  '图片自身不能引入第三层圆角或内边距'
);
```

### 3. 磨砂容器里的弹出层：必须逃出 `backdrop-filter` 裁剪框

在 WebKit 中，带有 `backdrop-filter`、固定宽度和滚动/裁剪属性的侧栏容器，会把里面的子弹出层限制在侧栏宽度内。如果主题切换菜单直接挂在侧栏 DOM 树下，展开时右侧就会被齐根切断。

为了守住这一点，脚本在桌面端和 `390px` 移动端都会真实点击主题按钮，断言弹层必须作为 `body > .theme-menu-popover[data-theme-floating]` 挂载到根节点，且它的 `getBoundingClientRect()` 四条边都完整落在当前视口安全边距（`>= 5px`）之内。

### 4. iPhone Safari 的 `16px` 输入框红线与底栏避让

桌面浏览器里把输入框字号设成 `13.5px` 看起来很精致，但在 iPhone Safari 上，只要聚焦字号小于 `16px` 的 `<input>` 或 `<textarea>`，系统就会强制放大整个页面，且失焦后不会自动缩回。

此外，移动端底部有固定悬浮的导航 Dock（`.studio-mobile-dock`）。如果页脚没有预留足够的 `padding-bottom`，页面最底部的巨型 `MYZJX.` 字标就会被 Dock 挡住半截。这两项同样被写成了移动端 WebKit 的硬断言：窄屏下所有可聚焦输入框计算字号必须 `>= 16px`，所有导航触控目标高度必须 `>= 44px`，页脚底部留白必须大于 `dockHeight + dockBottom + 16`。

## 自动化断言能守住下限，但替代不了真机手感

把这些视觉、几何与状态流（包括用 Mock 路由在浏览器里模拟第二台设备抢先写入 D1 触发 `HTTP 409`、以及 `localStorage` 未同步草稿在刷新后自动恢复）写进测试脚本后，我和 AI 协作改代码的效率反而变快了——因为不再需要每次改完都人工把几十个检查点重走一遍。

但也必须把边界说清楚：**Playwright WebKit 跑通，不等于生产环境验收完成。**

- 自动化脚本里的假 API 路由能证明前端状态机和 `tests/worker/security.test.ts` 的契约一致，但不能替代线上真实 GitHub OAuth 登录与 Cloudflare D1 远端迁移；
- 脚本能算出 `Math.abs(dividerY - footerY) < 1.5` 和对比度数值，但替代不了真实 iPhone 上的手指滑动阻尼、软键盘弹起时的视口挤压，以及人眼对排版节奏的最终判断。

让机器去守住那些「绝对不能退化」的几何与安全下限，把人的注意力留给真正的取舍与真机体验，这才是我目前觉得最省心的协作方式。
