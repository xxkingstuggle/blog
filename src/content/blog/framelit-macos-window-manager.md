---
title: FrameLit：macOS 原生窗口管理器的坐标网格编辑器与无阻塞诊断日志设计
pubDate: 2026-11-13
updatedDate: 2026-11-23
description: 详解 macOS 原生窗口管理器 FrameLit 的三大核心工程模块：AXUIElement 三步跨屏几何补偿、6×3 至 48×24 自定义归一化网格画布，以及 10MiB 自动轮转的异步脱敏诊断日志。
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

[**FrameLit**](/software/framelit/) 是我使用纯 Swift 与 AppKit / macOS Accessibility API（`AXUIElement`）构建的原生窗口布局管理器。它不仅支持半屏、三分屏、四分屏、中心聚焦与跨显示器投送等高频指令，还内置了支持 **`6×3` 至 `48×24` 精度的可视化坐标网格编辑器（Custom Layout Canvas）** 与一套**零主线程阻塞的异步脱敏诊断日志系统**。

本文深入拆解 FrameLit 在窗口几何计算、自定义网格映射、异步诊断日志以及知识产权合规边界上的四个工程细节。

<figure class="case-study-figure">
  <img src="/media/framelit/commands-dark.png" alt="FrameLit 深色模式下的窗口布局指令与自定义网格画布" width="1600" height="1236" loading="lazy" decoding="async" />
  <figcaption>图 1 · FrameLit 深色模式主界面：左侧管理分屏指令与全局快捷键，右侧在 Custom Layout Canvas 上拖拽定义任意网格比例。</figcaption>
</figure>

## 一、为什么用 `AXUIElement` 移动窗口需要“位置 → 尺寸 → 位置”写三次

在 macOS 上通过 Accessibility API 调整其他应用的窗口几何位置，最直观的写法是依次设置 `kAXPositionAttribute` 和 `kAXSizeAttribute`。但在多显示器（尤其是笔记本内屏 + 4K 外接屏的异构分辨率组合）下，只写一次位置和尺寸会频繁出现窗口对不齐或被截断的问题：

1. **旧屏幕边界截断（Screen Clamping）**：假设要把一个窗口从 $1440 \times 900$ 的内屏移到 $3840 \times 2160$ 的外接屏并铺满。如果**先改尺寸再改位置**，窗口在还在小屏幕时就被请求放大到 $3840$ 宽，macOS WindowServer 会立即将其宽度截断为小屏幕上限。
2. **应用内最小尺寸与锚点重算**：反过来，如果**先改位置再改尺寸**，当窗口从一个大尺寸缩小或跨屏跨越 DPI 边界时，部分 AppKit / Electron 窗口会在 `kAXSizeAttribute` 生效瞬间根据自身标题栏锚点微调 `Position`，导致最终落点偏移几个像素。

**FrameLit 的三步几何补偿算法**：

```text
Step 1: AXUIElementSetAttributeValue(window, kAXPositionAttribute, targetOrigin)  // 先把窗口锚点迁入目标显示器可视区
Step 2: AXUIElementSetAttributeValue(window, kAXSizeAttribute, targetSize)        // 在目标显示器配额下设置目标宽高
Step 3: AXUIElementSetAttributeValue(window, kAXPositionAttribute, clampedOrigin) // 读取实际生效的 Size 后二次校准原点
```

同时，所有坐标转换都会预先扣除目标 `NSScreen.visibleFrame` 与 `frame` 之间的 Menu Bar、常驻 Dock 与刘海安全区，并在目标窗口存在硬性最小宽高（`minSize`）限制无法缩小时，自动向屏幕可视区内侧做边界回退（Clamping），防止窗口右边缘溢出屏幕。

## 二、`6×3` 至 `48×24` 自定义归一化坐标网格编辑器

传统的二分屏、三分屏在 16:9 屏幕上够用，但在 21:9 或 32:9 的超宽屏上，用户往往需要“中间占 50% 放 IDE、左边 25% 放文档、右边上下各 25% 放终端和预览”这类非对称布局。

我在 FrameLit 中设计了 **Custom Layout Canvas**：

- **四档可变网格分辨率**：支持在 `6×3`、`12×6`、`24×12` 与 `48×24` 四档网格密度间实时切换。
- **归一化浮点矩形（Normalized Rect）存储**：用户在画布上按下鼠标拖拽选定网格区域 $(c_1, r_1) \to (c_2, r_2)$ 后，引擎并不保存写死的像素值，而是将其持久化为与分辨率无关的归一化比例：
  $$x = \frac{c_1}{W_{\text{grid}}}, \quad y = \frac{r_1}{H_{\text{grid}}}, \quad w = \frac{c_2 - c_1 + 1}{W_{\text{grid}}}, \quad h = \frac{r_2 - r_1 + 1}{H_{\text{grid}}}$$
- 无论用户后续是在 13 寸 MacBook 内屏还是 34 寸带鱼屏上按下该自定义指令的快捷键，归一化矩形都会实时乘上当前活动显示器的 `visibleFrame`，实现跨屏幕的一键比例复用。

<figure class="case-study-figure">
  <img src="/media/framelit/prefs-dark.png" alt="FrameLit 偏好设置与排除应用规则面板" width="1600" height="1236" loading="lazy" decoding="async" />
  <figcaption>图 2 · FrameLit 偏好设置面板：管理边缘拖拽触发区、多屏投送策略、排除应用列表与异步诊断日志。</figcaption>
</figure>

## 三、零主线程阻塞的 10MiB 自动轮转与脱敏诊断日志

窗口管理器挂载了全局热键与鼠标拖拽事件监听（Event Tap）。如果在这条热路径上同步执行磁盘文件 I/O，哪怕只有几毫秒延迟，用户拖拽窗口时也会感觉到明显的掉帧卡顿。

为此，我为 FrameLit 设计了独立的**异步轮转脱敏日志器（Diagnostic Logger）**：

1. **后台串行队列异步落盘**：主线程仅构造轻量级结构体并投递到 `DispatchQueue(label: "com.framelit.diagnostics", qos: .utility)`，UI 线程零磁盘等待。
2. **`2 × 5 MiB` 定额双文件轮转**：当前日志文件达到 `5 MiB` 时自动原子重命名为 `.1.log` 并新建主日志，总磁盘占用严格封顶在 **10 MiB** 以内，绝不无限膨胀。
3. **写入前隐私脱敏（Privacy Redaction）**：日志只记录应用 `bundleIdentifier`、屏幕索引、归一化网格参数与 `AX` 写入前后的坐标矩形；任何包含用户主目录的路径自动替换为 `~`，且绝不采集窗口的具体文档标题或键盘普通输入。

## 四、视觉资产重绘管线与开源合规边界（Provenance）

在工程合规上，FrameLit 最初是通过研究本地已安装窗口管理软件的交互行为起步的。为了确保视觉资产与代码实现的独立性：

- 我编写了 `tools/prepare_artwork.swift` 自动化打包管线，将全部 **77 个界面命令图标（1x/2x template PNG）与 `AppIcon.icns`** 替换为使用图像生成模型全新绘制的原创图稿，并在 `docs/artwork-prompts.json` 中完整留存了生成提示词。
- 同时，我在仓库 `docs/PROVENANCE.md` 中严格界定了发布边界：尽管 Swift 源码为独立编写且视觉图稿已完成 100% 替换，但在将历史遗留的非图像资源（如部分命令布局 plist 与多语言词条表）彻底完成 clean-room 替换前，坚持不将其打包为公开商业/开源二进制分发。把知识产权边界一五一十地写清楚，本身就是工程严谨性的一部分。
