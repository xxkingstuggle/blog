---
title: FrameLit：做 macOS 窗口管理器时踩到的跨屏坐标、自定义网格与日志坑
pubDate: 2026-11-13
updatedDate: 2026-11-23
description: 复盘用 Swift 与 Accessibility API 开发 FrameLit 时的具体问题：为什么 AXUIElement 跨屏改窗口要写三次属性，自定义网格怎么跨屏幕复用，以及为什么暂不公开发布二进制包。
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

[**FrameLit**](/software/framelit/) 是我用 Swift 和 macOS Accessibility API（`AXUIElement`）写的本地窗口布局工具。除了日常高频用到的半屏、三分屏、四分屏和跨显示器移动，我还给它加了一个支持 **`6×3` 到 `48×24` 密度的自定义网格画布（Custom Layout Canvas）**。

这篇文章记录开发过程中解决的三个具体技术问题，以及它的版权合规边界。

<figure class="case-study-figure">
  <img src="/media/framelit/commands-dark.webp" alt="FrameLit 深色模式下的窗口布局指令与自定义网格画布" width="1600" height="1236" loading="lazy" decoding="async" />
  <figcaption>图 1 · FrameLit 深色模式主界面：左侧管理分屏指令与全局快捷键，右侧在 Custom Layout Canvas 上拖拽定义任意网格比例。</figcaption>
</figure>

## 为什么用 `AXUIElement` 跨屏移动窗口，要按“位置 → 尺寸 → 位置”写三次？

在 macOS 上用辅助功能 API 改其他应用的窗口大小和位置，看起来只需要改 `kAXPositionAttribute` 和 `kAXSizeAttribute` 两个属性。但只要你的 Mac 外接了一台分辨率不同的显示器（比如 $1440 \times 900$ 的笔记本内屏接 $3840 \times 2160$ 的 4K 屏），只写一次位置和尺寸就会频繁对不齐：

- **如果先改尺寸、再改位置**：当窗口还在小屏幕上时，你请求把它拉到 $3840$ 宽，macOS 的 WindowServer 会直接按小屏幕的最大尺寸把它截断；等你下一步把它移到大屏幕上，它还是只有小屏幕那么大。
- **如果先改位置、再改尺寸**：当一个大窗口刚被挪到新屏幕边缘，再去改它的宽高时，不少 AppKit 或 Electron 窗口会在 `Size` 变化瞬间根据标题栏约束自己微调一下 `Position`，导致最终停下来的位置偏了几像素。

解决办法是固定按**“位置 → 尺寸 → 位置”**写三次：

```text
1. 先写一次 kAXPositionAttribute，把窗口左上角挪进目标显示器的可视范围内；
2. 在目标显示器的尺寸上限下写 kAXSizeAttribute，把宽高拉到位；
3. 读回窗口实际生效的宽高（防止有些窗口有硬性的最小宽度限制），重新算一次不越界的原点，再写一次 kAXPositionAttribute 校准落点。
```

计算目标区域时，还要先用 `NSScreen.visibleFrame` 扣掉顶部菜单栏、刘海区和常驻 Dock 的高度；遇到不能缩小到目标宽度的窗口，在第三步会自动往屏幕内侧收，避免窗口右边戳出屏幕外。

## `6×3` 到 `48×24` 的自定义网格画布

普通的左右二分屏在笔记本屏幕上够用，但在外接大屏上，我经常需要“中间留 60% 写代码、左边 20% 看文档、右边 20% 放终端”这种非对称布局。

所以在主界面右侧做了一个 **Custom Layout Canvas**：

- 画布支持在 `6×3`、`12×6`、`24×12`、`48×24` 四档网格密度之间切换；
- 鼠标在网格上拖拽圈出一块区域 $(c_1, r_1) \to (c_2, r_2)$ 后，配置里存的不是写死的像素坐标，而是 0 到 1 之间的归一化比例：
  $$x = \frac{c_1}{W_{\text{grid}}}, \quad y = \frac{r_1}{H_{\text{grid}}}, \quad w = \frac{c_2 - c_1 + 1}{W_{\text{grid}}}, \quad h = \frac{r_2 - r_1 + 1}{H_{\text{grid}}}$$
- 绑定快捷键后，不管当前窗口是在 13 寸内屏还是 27 寸外接屏，触发时直接拿这套比例乘上当前屏幕的 `visibleFrame`，就能按同样的比例摆好。

<figure class="case-study-figure">
  <img src="/media/framelit/prefs-dark.webp" alt="FrameLit 偏好设置与排除应用规则面板" width="1600" height="1236" loading="lazy" decoding="async" />
  <figcaption>图 2 · FrameLit 偏好设置面板：管理边缘拖拽触发区、多屏投送策略、排除应用列表与异步诊断日志。</figcaption>
</figure>

## 不卡主线程的 10MiB 轮转诊断日志

窗口管理器挂着全局快捷键和鼠标拖拽监听（Event Tap）。如果在这条路径上同步写日志文件，稍微有一点磁盘 I/O 停顿，拖窗口时就会觉得掉帧。

我专门写了一个后台日志模块来处理这件事：

- 主线程只负责把事件组装成轻量结构体，丢进后台串行队列 `DispatchQueue(label: "com.framelit.diagnostics", qos: .utility)`，UI 线程不等待落盘；
- 单个日志文件写满 `5 MiB` 自动重命名为 `.1.log` 并新建主日志，最多只留两份，把日志占用的磁盘空间死死卡在 **10 MiB** 以内；
- 写盘前自动脱敏：只记目标应用的 `bundleIdentifier`、屏幕编号和 `AX` 写入前后的坐标，把用户主目录路径替换成 `~`，不记录具体窗口标题或任何键盘输入。

## 为什么目前只做本地构建、暂不公开分发安装包

FrameLit 最早是我在研究本机窗口管理软件的交互时动手写的实验项目。虽然全部 Swift 代码是我自己写的，并且我写了 `tools/prepare_artwork.swift` 脚本，把界面上的 **77 个命令图标（1x/2x template PNG）和 `AppIcon.icns`** 全部替换成了重新绘制的原创图标（提示词归档在 `docs/artwork-prompts.json`），但工程里还有一部分早期的命令布局 plist 与多语言词条表没做完重写。在把这部分非图像资源全部替换干净之前，我只在本地编译自用并在仓库 `docs/PROVENANCE.md` 里列清了来源清单，不对外发布二进制安装包。
