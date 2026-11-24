---
title: DimWallpaper：用 200 行 Swift 在 macOS 壁纸与桌面图标之间垫一层压暗遮罩
pubDate: 2026-11-11
updatedDate: 2026-11-23
description: 夜间切深色模式时亮色壁纸太刺眼，我用 CGWindowLevelForKey(.desktopWindow) + 1 写了一个 68KB 的 macOS 菜单栏小工具，只压暗壁纸，不遮挡桌面图标。
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

我平时喜欢用亮色的风景或插画做 Mac 壁纸。白天看着很舒服，但到了晚上系统自动切到深色模式后，只要切桌面或者看副屏，亮色壁纸就会非常晃眼。

现成的解决办法主要有两种：要么自己做包含日夜两张图的 HEIC 动态壁纸，要么让软件把原图调暗另存一张再设为系统壁纸。这两种我都觉得别扭——前者遇到喜欢的单张图或第三方动态壁纸就没辙，后者会改系统壁纸设置，想调一下明暗还得重新生成图片。

其实只要在桌面上盖一层半透明黑底就能解决。我用 Swift 和 AppKit 写了 [**DimWallpaper (v1.0.0)**](/software/dim-wallpaper/)，编译出来只有一个 **68 KB** 的二进制文件，常驻在菜单栏里。

## 把遮罩窗口卡在壁纸和桌面图标中间

如果只是新建一个普通的全屏黑色半透明窗口，它会把桌面上的文件夹图标也一起蒙灰，看着像屏幕脏了一块。

去查 CoreGraphics 的窗口层级（`CGWindowLevel`）定义就能发现，macOS 的“桌面背景”和“桌面图标”并不是画在同一个层上的：

| 图层位置 | CoreGraphics Key | 实际渲染内容 |
|---|---|---|
| 壁纸层 | `CGWindowLevelForKey(.desktopWindow)` | 系统壁纸或第三方视频壁纸 |
| **DimWallpaper 遮罩层** | **`CGWindowLevelForKey(.desktopWindow) + 1`** | **只盖住壁纸，位于图标下方** |
| 桌面图标层 | `CGWindowLevelForKey(.desktopIconWindow)` | Finder 桌面文件夹、文件图标与文字标签 |
| 普通窗口层 | `CGWindowLevelForKey(.normalWindow)` | 正常打开的 App 窗口 |

把遮罩窗口的 `level` 设成壁纸层加 1：

```swift
let levelRaw = Int(CGWindowLevelForKey(.desktopWindow)) + 1
window.level = NSWindow.Level(rawValue: levelRaw)
```

这样出来的效果非常干净：**只有底下的壁纸变暗了，桌面上放的文件图标、白色文字标签和打开的应用窗口依然是原本的亮度，一点也不会发灰。**

## 鼠标穿透与虚拟桌面处理

为了让这层遮罩铺在桌面上之后完全无感，我在 `Sources/main.swift` 的 `OverlayWindow` 里配了几个必要的 AppKit 属性：

- **`ignoresMouseEvents = true`**：让系统在分发鼠标点击时直接跳过这个窗口。平时在桌面上拖框选文件、双击打开文件夹或者右键弹 Finder 菜单，跟没装这个工具一样。
- **`canBecomeKey = false` 和 `canBecomeMain = false`**：绝不抢当前活动应用的键盘输入焦点。
- **`collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle, .fullScreenAuxiliary]`**：所有虚拟桌面（Spaces）同步显示；触发调度中心（Mission Control）或四指显示桌面时固定在原地不动；不出现在 `Cmd + ~` 的窗口切换列表里。

## 跟随深色模式与外接显示器插拔

在菜单栏里勾选默认的「跟随深色模式」后，`AppController` 会通过 KVO 监听 `NSApp.effectiveAppearance`。系统切到深色模式时，遮罩用 `0.18s` 的动画淡入到设定的透明度（比如 35% 或 50%）；白天切回浅色模式就自动隐藏窗口，不占渲染开销。

另外，插拔外接显示器、改分辨率或者合盖休眠唤醒时，程序会监听 `didChangeScreenParametersNotification` 和 `didWakeNotification`，按每块屏幕的 `CGDirectDisplayID` 自动更新遮罩尺寸，不会留半截黑边。源码和打好的 `.app` 包都在 [DimWallpaper v1.0.0 Release](https://github.com/xxkingstuggle/dim-wallpaper/releases/tag/v1.0.0)。
