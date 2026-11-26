---
title: 受不了深色 PWA 窗口顶着一条刺眼白边，我写了个扩展把标题栏染过来了
pubDate: 2026-10-30
updatedDate: 2026-11-24
description: 很多网页装成桌面独立窗口后因为没写 theme-color，深色模式下最上面永远顶着一条白边。我把早期的染色脚本重做成 Tintpane v2.4.0，按需给指定站点同步标题栏颜色。
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

我平时有个习惯，喜欢把天天都要用的文档工作台、AI 聊天页还有监控后台，通过 Chrome 的「安装应用」存成桌面上的独立 PWA 窗口。

这样切窗口的时候不用去几十个浏览器标签页里大海捞针，用起来就跟原生桌面软件一样爽。

但这里头有一个极其破坏心情的视觉死角。

很多网站的前端开发根本没往 `<head>` 里写 `<meta name="theme-color">` 这个标签。到了晚上，网页正文明明已经切到了深邃的暗黑模式，结果窗口最脑门顶上，还顶着一条明晃晃、刺眼的纯白色系统标题栏。

盯着屏幕看久了，那条白边就像夜里没拉严实的窗帘缝一样扎眼。

为了消掉这条白边，我最早随手写过一个内部叫 `Colorful` 的小脚本。后来用着发现值得深挖的细节太多了，干脆把它推倒重做，改名为 [**Tintpane**](/software/tintpane/)，一路迭代到了现在的 [**v2.4.0 Release**](https://github.com/xxkingstuggle/tintpane/releases/tag/v2.4.0)。

<figure class="case-study-figure">
  <img src="/media/tintpane/pwa-popup-workspace.webp" alt="Tintpane v2.4.0 Chromium PWA 窗口动态标题栏与扩展 Popup 控制面板" width="1600" height="1000" loading="lazy" decoding="async" />
  <figcaption>图 1 · Tintpane v2.4.0 真实运行工作台：左侧独立 Chromium PWA 窗口顶栏自动同步深色背景，右侧 Popup 面板提供域名开关、焦点/失焦双态四路调色盘与预设规则。</figcaption>
</figure>

重做的时候，我先拿自己早期最偷懒的一处设计开了刀。

早期的 `Colorful` 原型为了省事，直接在 `manifest.json` 的 `content_scripts` 里写了个 `<all_urls>` 全局注入。

这写法写起来只要一行，但用起来简直是个内存黑洞。

你想想看，我真正装成桌面独立 PWA 窗口来用的网站，满打满算也就十来个。为了伺候这十来个独立窗口，却让扩展脚本注入到我平时随手打开的几百个普通浏览器网页里去跑颜色采样，这不是纯属白费内存吗？万一在哪个普通网站上算错了颜色，还会污染人家原本正常的页面。

所以在 Tintpane 2.4 里，我把 `<all_urls>` 彻底砍了，改成了「默认零注入、按域名动态注册」。

平时扩展在后台安安静静待着，只有当你在列表里给某个域名勾选开启之后，后台的 Service Worker 才会调用 `chrome.scripting.registerContentScripts`，精准地只给这一个域名注册内容脚本。至于你没开启的几百个其他网站，连一行扩展代码都不会塞进去。

而且就算进了已开启的域名，脚本动刀前还会先查一下 `window.matchMedia('(display-mode: standalone)')`。确认当前真的处于独立桌面窗口模式，它才会去改标题栏，你在普通浏览器标签页里打开同一个网站，它根本不会多管闲事。

把注入范围收紧之后，我很快又遇到了第二个实际痛点，跨子域和双域名跳转时的「闪白」。

现在的 Web 应用很少只待在一个死板的域名下。你从主工作台 `app.example.com` 点一下帮助文档，它就跳到了 `docs.example.com`；有些产品处于品牌迁移期，甚至同时混用着新旧两个完全不同的主域名。

如果扩展的配置只能按完整域名死板匹配，你在这边刚把深色标题栏调好，一点链接跳去子域，脑门顶上啪一下又闪回一条刺眼的白边。

为了治好这个闪白，我在配置存储层设计了两套机制。

第一套是基于域名后缀树的子域自动继承。我把域名按后缀倒过来存成一棵树，比如 `com -> example -> docs`。当你给父域名 `example.com` 开启子域继承后，它底下的所有 `*.example.com` 都会自动沿用同一套标题栏配色。

那万一我有十个子域都想用深灰，唯独线上的生产管理后台 `admin.example.com` 想单独设成警醒的暗红色，防自己手滑删库怎么办？

很简单，你直接给 `admin.example.com` 单独加一条显式规则就行。后缀树查找的时候会按最长匹配优先，子域的专门设置会自动覆盖父域的通用颜色。

第二套机制叫双向别名组。遇到那种横跨两个完全不同主域名的产品，你只需要把它们绑进同一个别名组里。以后你在任何一个域名的弹窗里改了颜色，存储层会在底下自动把同组另一个域名的配置也同步改掉，彻底省去了两边重复调色的麻烦。

解决了域名匹配，真正落到「给标题栏上什么颜色」这件事上，我也做了一轮升级。

除了手动挑颜色，我最常用的是自动取色模式。脚本会自动去读取页面顶部固定导航栏（Fixed 或 Sticky Header）或者主容器的 `getComputedStyle` 真实背景色，同时挂一个 `MutationObserver` 盯着根节点的暗黑模式 class 变化。当你在网页里点一下亮暗主题切换开关，顶上的系统标题栏瞬间就会跟着一起变色，过渡得严丝合缝。

这还没完。当我桌面上接了外接显示器，屏幕上一口气摆着三四个黑乎乎的深色 PWA 窗口时，我经常一眼看不出当前键盘焦点到底落在哪个窗口上，一敲快捷键才发现敲错窗口了。

于是我给 Tintpane 加上了「激活（Focus）与失焦（Blur）双态配色」。你可以给窗口失去焦点时单独设一个稍微灰暗一点的颜色。鼠标点中哪个窗口，哪个窗口的标题栏就亮起主题色，没点中的自动退回暗调，当前焦点在哪一目了然。

而且我给这套脚本留了一个特别干净的退场机制。脚本第一次修改页面的 `<meta name="theme-color">` 之前，会先把网页原有的全部 `theme-color` 节点和属性原样备份下来。只要你在弹窗里关掉这个站点的开关，连网页都不用刷新，原本的 DOM 节点就会立刻原封不动地塞回去。

如果你也是桌面 PWA 窗口的重度用户，受够了深色模式下那条刺眼的白标题栏，可以直接去 [Tintpane 作品页](/software/tintpane/) 或最新的 [GitHub Release v2.5.0](https://github.com/xxkingstuggle/tintpane/releases/tag/v2.5.0) 把它装上。
