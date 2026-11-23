---
title: Tintpane 2.4：Chromium PWA 窗口动态主题色注入、域名树继承与双向别名同步
pubDate: 2026-10-30
updatedDate: 2026-11-23
description: 从早期私有原型 Colorful 到正式开源的 Tintpane v2.4.0：详解如何用 Chrome MV3 动态内容脚本注册、域名树前缀继承与焦点状态感知，打造零日常损耗的桌面 PWA 标题栏主题引擎。
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

把常用的 Web 应用（如文档工作台、AI 聊天界面、项目管理工具）通过 Chromium 的「安装应用」保存为桌面独立 **PWA（Progressive Web App）** 窗口后，很多开发者都会遇到一个破坏沉浸感的细节：**网页本身已经切到了深色模式，但顶部的原生系统标题栏却依然顶着刺眼的纯白或死板的默认灰。**

这是因为许多 Web 站点根本没有在 HTML `<head>` 中声明 `<meta name="theme-color">`，或者只写死了一个静态颜色。

为了解决这个问题，我最初做了一个内部代号叫 `Colorful` 的原型；在经历了完整的架构重写、补齐自动化测试与许可证清理后，项目正式定名为 [**Tintpane**](/software/tintpane/)，并在 GitHub 开源发布了 [**v2.4.0 Release**](https://github.com/xxkingstuggle/tintpane/releases/tag/v2.4.0)。本文复盘 Tintpane 2.4 的四项核心工程设计。

## 一、为什么放弃 `<all_urls>` 静态注入，改用按需动态脚本注册

最省事的写法是在 `manifest.json` 的 `content_scripts` 里写上 `matches: ["<all_urls>"]`，让脚本注入到用户打开的每一个网页里。但这种做法在工程上非常粗糙：

1. 用户真正在桌面当作独立 PWA 窗口使用的站点通常只有 5–15 个，为了这十几个站点去劫持日常成千上万个普通浏览器标签页，会带来完全不必要的内容脚本内存开销。
2. 全局注入一旦在某个复杂站点采样出错，会污染用户从未打算修改的网站外观。

**Tintpane 2.4 的“默认关闭 + 按需动态注册”架构**：

- **动态脚本按需挂载**：后台 Service Worker 利用 `chrome.scripting.registerContentScripts`，**仅对用户在配置列表中显式启用的域名模式**注册内容脚本；用户未启用的网站，连一行扩展代码都不会被注入。
- **`display-mode: standalone` 独立窗口识别**：即便在已启用的域名下，内容脚本也会先通过 `window.matchMedia('(display-mode: standalone)')`（及 `windowControlsOverlay` / `minimal-ui`）判断当前是否处于独立桌面应用窗口，避免对普通浏览器标签页造成干扰。

## 二、域名树层级继承（Domain Tree Inheritance）与双向别名同步

在实际使用 SaaS 产品时，一个应用往往横跨多个子域名甚至多个主域名（例如从 `app.example.com` 跳转到 `docs.example.com`，或者一个产品同时拥有新旧两个主域名）。

如果配置系统只能做死板的“精确主机名（Hostname）匹配”，用户每跳到一个子域名就会看到标题栏突然闪回刺眼的白色。为此，Tintpane 2.4 在配置存储层实现了两套拓扑机制：

### 1. 域名树最长后缀匹配与子域继承

配置解析器将域名按标签逆序组织为域名树（例如 `com -> example -> docs`）。当用户为 `example.com` 开启了子域继承规则后：

- 访问 `a.b.example.com` 时，解析器沿域名树逐级向上回溯，自动继承距离最近的祖先节点配置；
- 若某个子域名（如 `admin.example.com`）需要单独的警示色，只需为该子节点添加显式规则，即可按最长匹配优先级精准覆写父级设置。

### 2. 双向别名组（Bidirectional Alias Groups）

针对跨主域名的同一产品（如早期产品迁移期的双域名并存），Tintpane 支持将两个或多个域名绑定为**双向别名组**。当用户在其中一个域名的 Popup 中调整了主题色或焦点策略时，状态存储会自动通过事务级同步更新别名组内的所有关联域名，实现一处调色、全域同步。

## 三、顶栏色彩采样、焦点双态感知与无损恢复

在具体的颜色注入层，Tintpane 2.4 兼顾了“全自动无感跟随”与“精细手调”：

- **智能顶栏与背景采样**：自动模式下，脚本优先探测页面顶部固定导航栏（Fixed / Sticky Header）或主容器的计算背景色（`getComputedStyle`），并在页面通过 `MutationObserver` 切换亮暗主题类名时毫秒级重算。
- **窗口激活（Focus）与失焦（Blur）双态配色**：在多显示器办公时，同时打开多个深色 PWA 窗口很容易分不清当前键盘焦点在哪个窗口。Tintpane 支持为 `blur` 状态配置柔和的降饱和/降对比过渡色，窗口一激活立即点亮主色。
- **随时可逆的无损还原**：在首次改写页面 `<meta name="theme-color">` 之前，脚本会先快照保存站点原有的全部 `theme-color` 节点及 `media` 属性；一旦用户关闭该站点的开关，立即原样恢复原始 DOM 节点，无需刷新页面即可彻底还原。

你可以前往 [**Tintpane 作品页**](/software/tintpane/) 或 [**GitHub Release v2.4.0**](https://github.com/xxkingstuggle/tintpane/releases/tag/v2.4.0) 获取扩展安装包与源码。
