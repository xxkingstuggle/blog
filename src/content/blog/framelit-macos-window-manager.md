---
title: 在 Mac 上跨屏幕挪个窗口，为什么非得按「位置、尺寸、位置」连写三次？
pubDate: 2026-11-13
updatedDate: 2026-11-24
description: 用 Swift 和 Accessibility API 写窗口布局工具 FrameLit 时，我被 macOS 跨显示器移动窗口的尺寸截断和坐标漂移折腾得够呛，最后用三步写入法和归一化网格彻底治好了它。
kicker: MACOS WINDOW MANAGER · SWIFT & ACCESSIBILITY
kind: project
presentation: article
tags:
  - macOS
  - Swift
  - AppKit
  - Accessibility
  - 架构设计
cover: ../../assets/projects/framelit-cover.png
---

没自己动手写过 macOS 窗口管理器之前，我一直以为调整另一个软件的窗口位置和大小，是天底下最直白的系统调用。

不就是通过 macOS 的辅助功能接口（Accessibility API 里的 `AXUIElement`），改一下目标窗口的 `kAXPositionAttribute` 坐标属性，再改一下 `kAXSizeAttribute` 尺寸属性吗？两行代码的事，还能翻出什么浪花来？

直到我开始用 Swift 动手写自己的本地窗口布局工具 [**FrameLit**](/software/framelit/)，并且把笔记本接上桌面的 4K 外接显示器试跑跨屏快捷键的那一刻，我才见识到 macOS 的 `WindowServer` 有多拧巴。

当时我按了一下快捷键，想把笔记本小内屏（$1440 \times 900$）上的一个浏览器窗口，直接扔到 4K 外接大屏（$3840 \times 2160$）上铺满。

结果窗口确实飞到了大屏幕上，但尺寸却死活卡在笔记本内屏那么大，右边空出一大半桌面。

我心想，是不是顺序写反了？于是我调了个头，改成先移动位置、再放大尺寸。

这下尺寸倒是拉大了，可窗口停下来的位置却莫名其妙往旁边歪了好几个像素，没能严丝合缝地贴齐屏幕边缘。

<figure class="case-study-figure">
  <img src="/media/framelit/commands-dark.webp" alt="FrameLit 深色模式下的窗口布局指令与自定义网格画布" width="1600" height="1164" loading="lazy" decoding="async" />
  <figcaption>图 1 · FrameLit 深色模式主界面，左侧管理分屏指令与全局快捷键，右侧在 Custom Layout Canvas 上拖拽定义任意网格比例。</figcaption>
</figure>

为啥先改尺寸不对，先改位置也不对呢？

我把每一步调用前后的窗口帧坐标打印出来对比，终于摸清了底层的脾气。

如果你先改尺寸、再改位置，当那个窗口还待在笔记本小屏幕上时，你发指令让它拉到 $3840$ 像素宽，macOS 的 WindowServer 一看当前屏幕总共才 $1440$ 宽，当场就会按小屏幕的上限把你请求的尺寸强行截断。等你下一步再把窗口挪去 4K 大屏幕时，那个被截断的尺寸已经定型了。

反过来，如果你先改位置、再改尺寸，当一个窗口刚被挪到新屏幕边缘，紧接着宽高发生剧烈变化的那一瞬间，很多基于 AppKit 或者 Electron 写出来的窗口，会根据自身的标题栏约束或最小边距自动微调一下自己的原点坐标 `Position`，结果就是最终落点偏了几像素。

更别提有些软件窗口自己写死了硬性的最小宽度限制，你让它缩到三分之一屏宽，它根本缩不下去，右边直接戳出屏幕外头。

把这几个脾气摸透之后，我在 FrameLit 里定死了一套雷打不动的「位置、尺寸、位置」三步写入法。

```text
1. 先写一次 kAXPositionAttribute，把窗口左上角挪进目标显示器的可视范围内；
2. 在目标显示器的尺寸上限下写 kAXSizeAttribute，把宽高拉到位；
3. 读回窗口实际生效的宽高（防止有些窗口有硬性的最小宽度限制），重新算一次不越界的原点，再写一次 kAXPositionAttribute 校准落点。
```

而且在算目标区域的时候，第一步会先用 `NSScreen.visibleFrame` 把顶部菜单栏、MacBook 刘海区以及常驻 Dock 栏占掉的高度扣干净。万一第三步读回来发现某个倔脾气的窗口缩不到那么窄，算法就会自动把它的原点往屏幕内侧收，保证窗口右边缘绝不戳出屏幕边界。

解决了跨屏准星之后，我又顺着自己的使用习惯往深处做了一步。

平时只用笔记本屏幕的时候，普通的左右二分屏或者四分屏完全够使了。但一旦接上桌面那块大显示器，二分屏显得太宽，三分屏又太死板。我写代码时最舒服的姿势是，正中间留出 60% 的宽度放主编辑器，左边留 20% 挂着参考文档，右边留 20% 盯终端输出。

每次手拖三个窗口去对这个 `20% / 60% / 20%` 的比例太蠢了。于是我在 FrameLit 主界面右手边专门做了一个叫 Custom Layout Canvas 的自定义网格画布。

这个画布可以在 `6×3`、`12×6`、`24×12` 和 `48×24` 四档网格密度之间自由切换。你只需要拿鼠标在网格上像画框一样拖拽圈出一块区域 $(c_1, r_1) \to (c_2, r_2)$，再给它绑个顺手的快捷键就行。

这里头有个很关键的设计，我存进配置文件里的并不是死板的像素坐标，而是 0 到 1 之间的归一化比例。

$$x = \frac{c_1}{W_{\text{grid}}}, \quad y = \frac{r_1}{H_{\text{grid}}}, \quad w = \frac{c_2 - c_1 + 1}{W_{\text{grid}}}, \quad h = \frac{r_2 - r_1 + 1}{H_{\text{grid}}}$$

这样做的好处是，不管我当前窗口是在 13 寸的笔记本内屏，还是在 27 寸的 4K 外接大屏上，按下同一个快捷键的瞬间，引擎直接拿这套归一化比例乘上当前屏幕的 `visibleFrame`，就能在任何分辨率的显示器上分毫不差地复刻出同一套版式。

<figure class="case-study-figure">
  <img src="/media/framelit/prefs-dark.webp" alt="FrameLit 偏好设置与安全区边界控制面板" width="1600" height="1164" loading="lazy" decoding="async" />
  <figcaption>图 2 · FrameLit 偏好设置面板，管理边缘拖拽触发区、多屏投送策略、排除应用列表与异步诊断日志。</figcaption>
</figure>

做窗口管理器还有一个必须小心的性能红线，那就是日志千万不能卡主线程，也不能在后台偷偷把用户的硬盘塞满。

因为窗口管理器平时一直挂着全局快捷键和鼠标拖拽监听（Event Tap）。如果在鼠标拖拽窗口的回调路径上同步写磁盘日志，只要磁盘 I/O 稍微顿一下，你拖窗口的时候就会明显感觉到鼠标发涩、掉帧。

为此我专门写了一个异步轮转的后台诊断日志模块。主线程在触发窗口动作时，只负责把事件组装成一个极轻量的内存结构体，随手丢进后台的串行队列 `DispatchQueue(label: "com.framelit.diagnostics", qos: .utility)` 里就立刻返回，UI 线程连半毫秒的落盘都不等。

而且我给日志文件设了硬性的体积铁索。单个日志文件只要写满 `5 MiB`，立刻自动重命名为 `.1.log` 并新建主日志，磁盘上最多只保留两份文件，把日志能占用的最大空间死死焊在 10 MiB 以内。写盘之前还会自动脱敏，只记录目标应用的 `bundleIdentifier`、屏幕编号和 `AX` 写入前后的坐标数值，把用户主目录路径统一替换成 `~`，绝不记录任何窗口标题文字或键盘输入。

最后也坦诚交代一下为什么你在 [FrameLit 作品页](/software/framelit/) 里看到它目前只做本地构建，还没有对外放出公开的 `.dmg` 安装包。

FrameLit 最早是我在研究本机窗口管理交互时动手写的实验项目。虽然后面全部 Swift 核心代码都是我自己写的，而且我还专门写了 `tools/prepare_artwork.swift` 自动化脚本，把界面上用到的 77 个命令图标（含 1x 和 2x template PNG）以及 `AppIcon.icns` 全部替换成了重新绘制的原创图标（绘制提示词都归档在 `docs/artwork-prompts.json` 里），但目前工程里还留着一部分早期参考用过的命令布局 plist 和多语言词条表没做完彻底重写。

在我把这部分非图像配置资源也百分百替换干净之前，我选择严守合规边界，在仓库的 `docs/PROVENANCE.md` 里把每一项资产的来源清单列得明明白白，只留在本地编译自用，绝不带着半点含糊的资产对外分发二进制安装包。
