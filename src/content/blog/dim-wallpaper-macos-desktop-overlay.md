---
title: 嫌深色模式下亮色壁纸太晃眼，我用 200 行 Swift 在壁纸和桌面图标之间塞了一层黑纱
pubDate: 2026-11-11
updatedDate: 2026-11-24
description: 白天好看的亮色风景壁纸一到夜里就刺眼，但我又不想把桌面文件夹图标也一起蒙灰。于是我利用 CoreGraphics 窗口层级夹缝，写了个只有 68KB 的菜单栏小工具 DimWallpaper。
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

整个项目的源码和打好的 `.app` 安装包都已经放在了 [DimWallpaper 作品页](/software/dim-wallpaper/) 和 [DimWallpaper v1.0.0 Release](https://github.com/xxkingstuggle/dim-wallpaper/releases/tag/v1.0.0) 上。如果你也有几张舍不得换掉的亮色壁纸，晚上不妨拿这层 68 KB 的黑纱救个急。
