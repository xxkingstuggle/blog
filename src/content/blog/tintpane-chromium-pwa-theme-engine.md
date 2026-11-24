---
title: Tintpane 2.4：解决桌面 Chromium PWA 窗口顶着一条刺眼白标题栏的问题
pubDate: 2026-10-30
updatedDate: 2026-11-23
description: 很多网页安装成桌面 PWA 独立窗口后，因为没写 meta theme-color，深色模式下顶部依然是一条白边。我写了 Tintpane v2.4.0，按需给启用的站点同步标题栏颜色。
kicker: CHROME MV3 · DESKTOP PWA THEME ENGINE
kind: project
presentation: article
tags:
  - Chrome MV3
  - PWA
  - JavaScript
  - 浏览器扩展
  - 开源软件
cover: ../../assets/projects/tintpane-cover.png
---

我习惯把常用的文档工作台、AI 聊天页和后台工具通过 Chrome 的「安装应用」存成桌面独立 **PWA** 窗口。但很多网站根本没在 `<head>` 里写 `<meta name="theme-color">`，导致网页明明已经切到了深色模式，窗口最上面却还顶着一条刺眼的白色系统标题栏。

为了消掉这条白边，我最早写过一个内部叫 `Colorful` 的小脚本；后来把全局注入改成按需动态注册、补齐了多子域继承和自动化测试，改名为 [**Tintpane**](/software/tintpane/)，并在 GitHub 发布了 [**v2.4.0 Release**](https://github.com/xxkingstuggle/tintpane/releases/tag/v2.4.0)。

## 为什么不在 `manifest.json` 里写 `<all_urls>` 全局注入？

早期原型图省事，直接在 `manifest.json` 的 `content_scripts` 里配了 `<all_urls>`。但实际用下来有两个明显毛病：

1. 我真正装成桌面 PWA 窗口来用的网站也就十来个，为了这十来个窗口，让脚本注入到平时顺手打开的几百个普通浏览器标签页里去跑颜色采样，纯属白费内存；
2. 万一在某个普通网站采样算错了颜色，还会干扰原本没想改的页面。

所以在 Tintpane 2.4 里，我改成了**默认不注入 + 按域名动态注册**：

- 后台 Service Worker 调 `chrome.scripting.registerContentScripts`，**只给用户在列表里勾选开启了的域名**注册内容脚本；没开启的网站连一行扩展代码都不会注入；
- 就算在已开启的域名下，脚本进页面也会先查 `window.matchMedia('(display-mode: standalone)')`，确认当前真的是独立桌面窗口才动手改标题栏，不动普通浏览器标签页。

## 解决跨子域和双域名跳转时的“闪白”

很多 Web 应用在登录、看文档和进控制台时会跨子域跳转（比如从 `app.example.com` 跳到 `docs.example.com`），有些产品还在迁移期同时用着新旧两个主域名。如果配置只能按死板的完整域名匹配，一跳过去标题栏就立刻闪回白色。

为此我在配置存储层做了两条规则：

**1. 子域自动继承与单独覆盖**
把域名按后缀建成一棵树（`com -> example -> docs`）。给父域名 `example.com` 开启子域继承后，底下所有 `*.example.com` 都会自动沿用它的标题栏配色；如果某个子域（比如线上管理后台 `admin.example.com`）想单独设成醒目的颜色，再给这个子域加一条显式规则，就会按最长匹配优先覆盖父域设置。

**2. 双向别名组**
如果同一个产品横跨两个完全不同的主域名，可以把它们绑成一个别名组。在任意一个域名的弹窗里改了颜色，存储层会自动把同组的另一个域名也同步改掉，不用两边重复调。

## 顶栏自动取色、焦点变色与关闭即还原

在具体改颜色时，除了手动选色，我也做了一套省心的自动逻辑：

- **自动吸取顶栏背景色**：自动模式下，脚本会去读页面顶部固定导航栏（Fixed / Sticky Header）或主容器的 `getComputedStyle` 背景色，并用 `MutationObserver` 盯着根节点的暗黑模式 class 变化，网页一切亮暗主题，标题栏立刻跟着变；
- **激活（Focus）与失焦（Blur）区分颜色**：外接显示器同时摆着好几个深色 PWA 窗口时，经常一眼看不出当前键盘焦点在哪个窗口上。Tintpane 支持给窗口失焦状态单独设一个稍微灰暗一点的颜色，点中哪个窗口，哪个窗口的标题栏就亮起来；
- **关掉开关立刻恢复原样**：脚本第一次改页面 `<meta name="theme-color">` 之前，会先把网页原有的全部 `theme-color` 节点和属性备份下来。只要在弹窗里关掉这个站点的开关，不用刷新网页，原本的 DOM 节点就会立刻原样塞回去。安装包和源码在 [Tintpane 作品页](/software/tintpane/) 与 [GitHub Release v2.4.0](https://github.com/xxkingstuggle/tintpane/releases/tag/v2.4.0)。
