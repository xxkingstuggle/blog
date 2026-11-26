---
title: 嫌深色模式下亮色壁纸太晃眼，我用 200 行 Swift 在壁纸和桌面图标之间塞了一层黑纱
pubDate: 2026-11-11
updatedDate: 2026-11-26
description: 从桌面壁纸与图标之间的 CGWindowLevel 黑纱，到类 HazeOver 后台专注遮罩与菜单栏/Dock 零重叠分条压暗：零权限、零硬件 Gamma 改动构建轻量 macOS 原生菜单栏工具 DimWallpaper。
kicker: MACOS APPKIT · COREGRAPHICS WINDOW LEVEL
kind: project
presentation: article
tags:
  - macOS
  - Swift
  - AppKit
  - CoreGraphics
  - 开源软件
cover: ../../assets/projects/dim-wallpaper-cover.png
---

我平时特别喜欢拿明亮的风景照或者浅色插画当 Mac 的桌面壁纸。

大白天阳光好的时候，看着确实心情舒畅。但一到晚上，系统自动切进深色模式，麻烦就来了。只要我切回桌面找个文件，或者余光扫到旁边空着的副屏，那张大亮色的壁纸就像一盏聚光灯一样直晃眼睛。

我去网上找了一圈现成的方案，看来看去无非就两种路子。

一种是让你自己去找日夜两张图，打包成 macOS 的 HEIC 动态壁纸；另一种是装个软件，把你原来的壁纸图片直接涂暗、另存为一张新图片，再去暴力修改系统的壁纸路径。

说真的，这两种路子我都觉得特别别扭。遇到我喜欢的单张插画或者第三方视频动态壁纸，哪来的夜间版配对图？而去改写原图再覆盖系统壁纸的做法就更蠢了，我只是想随手把亮度调暗一点点，难道每次拖动滑块都要重新生成一张几 MB 的图片再去换一次壁纸吗？

我就想，明明只要在壁纸上面盖一层半透明的黑色薄纱就能解决的事，干嘛要搞得那么重？

于是我打开编辑器，用大约 200 行 Swift 和 AppKit 代码写了个叫 [**DimWallpaper (v1.0.0)**](/software/dim-wallpaper/) 的菜单栏小工具。编译出来整个二进制可执行文件只有 68 KB，安静地待在屏幕右上角。

<figure class="case-study-figure">
  <img src="/media/dim-wallpaper/menubar-overlay-split.webp" alt="DimWallpaper v1.0.0 深色模式下的 macOS 菜单栏状态面板与 40% 壁纸调暗效果" width="1600" height="1000" loading="lazy" decoding="async" />
  <figcaption>图 1 · DimWallpaper v1.0.0 深色模式运行界面：菜单栏下拉面板调节 40% 调暗强度，底层壁纸被柔和压暗，而桌面 Finder 文件夹图标与文字依然保持 100% 原始亮度。</figcaption>
</figure>

听起来就是在屏幕上盖一个全屏的黑色半透明窗口对吧？

但如果真的只是随便新建一个普通的全屏黑窗口，放上去的那一刻你就会发现不对劲，它把桌面上摆放的文件夹图标和底下的白色文件名也一起给蒙灰了，整块屏幕看着就像脏了一层煤灰。

那怎么才能只压暗壁纸，却让桌面上的文件夹图标保持原本清清楚楚的亮度呢？

秘诀全藏在 macOS 底层的 CoreGraphics 窗口层级（`CGWindowLevel`）定义里。

很多人不知道，在 macOS 的图形合成器里，「桌面壁纸背景」和「Finder 桌面文件图标」根本不是画在同一层上的。我当时去翻了 `CGWindowLevel` 的枚举表，把它们的层级关系排了一下。

| 图层位置 | CoreGraphics Key | 实际渲染内容 |
|---|---|---|
| 壁纸层 | `CGWindowLevelForKey(.desktopWindow)` | 系统壁纸或第三方视频壁纸 |
| DimWallpaper 遮罩层 | `CGWindowLevelForKey(.desktopWindow) + 1` | 只盖住壁纸，位于图标正下方 |
| 桌面图标层 | `CGWindowLevelForKey(.desktopIconWindow)` | Finder 桌面文件夹、文件图标与文字标签 |
| 普通窗口层 | `CGWindowLevelForKey(.normalWindow)` | 正常打开的 App 窗口 |

看到这张表里的夹缝了吗？壁纸层和桌面图标层之间，刚好留着可以插队的位置。

<figure class="case-study-figure">
  <img src="/media/dim-wallpaper/menubar-light-mode.webp" alt="DimWallpaper v1.0.0 浅色模式下的 macOS 菜单栏控制面板与全天候手动调暗视图" width="1600" height="1000" loading="lazy" decoding="async" />
  <figcaption>图 2 · DimWallpaper v1.0.0 浅色外观运行界面：关闭「仅在深色模式下生效」后，可在日间浅色模式下按需柔和调暗高对比壁纸。</figcaption>
</figure>

我只需要在代码里把遮罩窗口的 `level` 精确设成壁纸层加 1。

```swift
let levelRaw = Int(CGWindowLevelForKey(.desktopWindow)) + 1
window.level = NSWindow.Level(rawValue: levelRaw)
```

就这么短短两行代码跑起来之后，画面一下子就通透了。底下的刺眼壁纸顺从地暗了下去，而压在它上面的桌面文件夹图标、白色的文字标签，还有平时打开的各种应用窗口，依然保持着百分百的原生亮度，一丝发灰的感觉都没有。

当然，光卡对图层位置还不够。如果这层看不见的窗户会挡住你的鼠标点击，或者在你按快捷键切窗口的时候跑出来捣乱，那还是没法用。

所以我在 `Sources/main.swift` 的 `OverlayWindow` 里把它的存在感彻底抹掉了。先把 `ignoresMouseEvents` 设为 `true`，让系统在分发鼠标事件时直接穿透这层遮罩，你在桌面上拉框选文件、双击打开文件夹或者右键调出 Finder 菜单，手感跟没装这个工具一模一样。接着把 `canBecomeKey` 和 `canBecomeMain` 全关掉，保证它永远不会抢走当前活动软件的键盘输入焦点。

最后再给它的 `collectionBehavior` 配上 `[.canJoinAllSpaces, .stationary, .ignoresCycle, .fullScreenAuxiliary]` 这组标记。这样不管你划到哪个虚拟桌面（Spaces），不管你用触控板四指推开窗口显示桌面，还是唤出调度中心（Mission Control），这层遮罩都会像钉在壁纸上一样稳稳当当，而且绝对不会出现在 `Cmd + ~` 的窗口切换列表里烦你。

在日常使用体验上，我默认给它打开了「跟随深色模式」。`AppController` 会通过 KVO 盯着系统的 `NSApp.effectiveAppearance`。每当傍晚系统切进深色模式，遮罩就用 `0.18s` 的柔和过渡动画淡入到你设好的压暗比例（比如 35% 或 50%）；到了第二天早上切回浅色模式，它又会自动把遮罩窗口彻底隐藏掉，白天连一点点合成器渲染开销都不占。

至于外接显示器插拔、改分辨率或者笔记本合盖休眠再唤醒的场景，程序也会实时监听 `didChangeScreenParametersNotification` 和 `didWakeNotification`，按照每块屏幕的 `CGDirectDisplayID` 自动重算并铺满遮罩尺寸，绝不会在副屏上留下一截尴尬的白边。

## 后续演进：从壁纸压暗到专注遮罩（Focus Mode）

用了一段时间后我发现，只压暗壁纸解决了一半问题：真正多窗口、双屏干活时，桌面经常早就被铺满了，真正抢走视线的是旁边亮晃晃的聊天窗口、浏览器和副屏应用。但市面上不少同类专注工具要么收费重，要么依赖辅助功能权限或全局整屏覆盖，一不小心就把顶部下拉菜单、Dock 甚至屏幕色温一锅端了。

于是我沿着同一条设计底线——**零第三方依赖、零录屏权限、零辅助功能权限、绝不调用硬件 Gamma/色表修改 API**——把 DimWallpaper 升级成了「壁纸调暗 + 后台专注遮罩（类 HazeOver）」双层原生架构，两者可以各自开关，也可以叠加进入「双重沉浸」模式。

### 1. 只读窗口栈 + 精确 Z 序锚定

专注遮罩的核心难点是把半透明黑纱精准插到**当前前台窗口的正下方**，而不是粗暴盖在最顶层。

我通过只读的 `CGWindowListCopyWindowInfo` 读取当前在屏窗口列表，过滤掉自进程窗口、非标准层和微小辅助窗，并按主显示器高度把 CoreGraphics 的左上角坐标系翻回 AppKit 的左下角坐标系；随后再借助 `NSWindow.order(.below, relativeTo:)` 把每块屏幕的主专注遮罩精准锚定到目标窗口下方：

- **当前前台应用模式**：锚定该应用最前一组连续窗口的底部，切分屏或多文档编辑时同一应用的关联窗口保持同步高亮，同时避免被夹在中间的第三方后台窗口误亮。
- **仅最前单窗模式**：锚定最前单张标准窗口正下方，只留眼前这一扇窗原亮。
- **非 `.regular` 瞬态进程免疫与自进程保活**：macOS 的系统通知框（`UserNotificationCenter`）或菜单栏辅助工具偶尔会短暂成为前台进程却没有 `layer=0` 标准窗，锚定逻辑会自动穿透回退到顶层标准应用窗；点开 DimWallpaper 自己的控制中心或 Spotlight 调参时，也会维持上一外部前台应用高亮，方便一边拖滑杆一边实时看效果。

### 2. 菜单栏与 Dock 的零重叠分条压暗

默认情况下，专注遮罩保留顶部菜单栏和程序坞（Dock）原色；但如果深夜写作想要彻底沉浸，也可以独立开启「压暗顶部菜单栏」或「压暗程序坞 Dock」。

这里最容易踩的坑是直接拉高一整张遮罩的窗口层级——一旦和主遮罩发生垂直重叠，交界处立刻出现一道刺眼的双重压暗黑带，而且还会把点击菜单栏弹出的下拉菜单一起盖暗。为此我按每块显示器的 `screen.frame` 与 `visibleFrame` 做**无重叠几何分条分割**：

| 遮罩分区 | CoreGraphics 层级 | 覆盖区域与避让规则 |
|---|---|---|
| 桌面壁纸遮罩 | `CGWindowLevelForKey(.desktopWindow) + 1` | 全屏压暗壁纸，严格低于桌面图标 |
| 专注主遮罩 | `layer = 0`（`order(.below, relativeTo:)`） | 仅覆盖扣除菜单栏与 Dock 后的 `visibleFrame` 内容区 |
| 顶部菜单栏遮罩条 | `max(.statusWindow, .mainMenuWindow) + 1` | 仅覆盖实际可见顶部菜单栏带，严格低于 `.popUpMenuWindow`，下拉菜单保持原亮 |
| 程序坞 Dock 遮罩条 | `CGWindowLevelForKey(.dock) + 1` | 自动适配底/左/右 Dock 方位，低于 `.mainMenu`，并自动扣减伸入 Dock 区的前台窗轮廓 |

在 `1920×1080` 外接屏 + `1470×956` 内建视网膜屏的双显示器 WindowServer 动态实测中，同时开启壁纸压暗、专注遮罩、双屏菜单栏条与主屏底部 Dock 条时，全部专注遮罩窗口在系统合成器中的两两交集面积精确为 `0`，彻底消除接缝重叠与黑带。

### 3. 顶边余弦平滑羽化、3 套过渡曲线与零空转收口

在 `v2.1.0` 中，针对开启「保留菜单栏」时主遮罩顶边紧贴系统菜单栏下沿容易显得生硬的问题，我将专注遮罩升级为零 CPU 开销的 `CAGradientLayer` 硬件合成渲染，采用 6 点余弦平滑曲线（Cosine Smoothstep）消除硬切黑线与马赫带折痕，提供**柔和晕影（38pt，默认）**、**细腻羽化（18pt）**与**清晰硬边（0pt）**三档调节；同时修复了台前调度与切桌面时的 `0ms` 瞬切和动画打断，内置**柔化呼吸（0.52s / 0.40s）**、**缓慢线性（0.80s / 0.62s）**与**轻快流畅（0.24s / 0.18s）**三套过渡曲线。交互上左键弹出三标签页毛玻璃 `NSPopover` 控制中心实时同步预览，右键保留极速菜单并接入 Carbon 双热键（`⌃⌥⌘D` / `⌃⌥⌘F`），完整适配系统「降低透明度」与「减弱动态效果」。

资源开销上，无论是壁纸调暗暂停、浅色待命，还是专注遮罩关闭、命中豁免应用，淡出结束后都会立即停止轮询并调用 `orderOut` 卸载遮罩窗口，不留无意义的 WindowServer 离屏合成缓冲。工程通过全部 `DimWallpaperCoreTests` 核心单测与双屏 WindowServer 动态验收，常驻实测空闲 CPU `0.0%`。

目前 v2.1.0 公开包已携顶边余弦平滑羽化、3 套过渡动画预设、专注遮罩（Focus Mode）、全屏视频自动豁免、三档多屏策略与菜单栏/Dock 零重叠压暗正式发布在 [DimWallpaper 作品页](/software/dim-wallpaper/) 与 [DimWallpaper v2.1.0 Release](https://github.com/xxkingstuggle/dim-wallpaper/releases/tag/v2.1.0) 上。如果你既舍不得换掉心爱的亮色壁纸，又希望夜里写代码时周围的窗口安静下来，这层轻巧的黑纱刚好够用。
