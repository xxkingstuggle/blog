---
title: DimWallpaper：不改系统壁纸文件，用 CGWindowLevel 桌面图层实现深色模式壁纸压暗
pubDate: 2026-11-11
updatedDate: 2026-11-23
description: 解析开源菜单栏工具 DimWallpaper v1.0.0：如何利用 CGWindowLevelForKey(.desktopWindow) + 1 在 macOS 壁纸与桌面图标之间嵌入全穿透遮罩，实现深色模式联动与多屏热插拔同步。
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

在 macOS 上使用高亮度风景或插画壁纸时，白天在浅色模式下观感很好；可一旦到了夜晚切入系统**深色模式（Dark Mode）**，当所有窗口退到后台或切换到副屏时，高对比度的亮色壁纸依然会非常刺眼。

市面上的常见做法是“准备两张图片合成动态 HEIC 壁纸”或“直接修改原壁纸图片的像素亮度后重设为系统壁纸”。但这两种方案都有明显痛点：前者对用户自己收藏的任意单张壁纸或第三方动态壁纸无效，后者则会破坏原图文件且无法实时无级调节浓度。

为此，我用纯 Swift + AppKit 编写并开源了 [**DimWallpaper (v1.0.0)**](/software/dim-wallpaper/)——一个编译后仅 **68 KB**、零第三方依赖、完全不触碰原始壁纸文件的 macOS 菜单栏壁纸压暗工具。

## 一、核心原理：卡在 `.desktopWindow` 与 `.desktopIconWindow` 之间的那一层

很多人以为“桌面”在 macOS WindowServer 里是一个不可拆分的整体。实际上，CoreGraphics 将桌面背景和桌面上的文件图标分别放在两个相邻但独立的窗口层级（`CGWindowLevel`）上：

| 图层位置 | CoreGraphics Key | 说明 |
|---|---|---|
| 底层：系统壁纸层 | `CGWindowLevelForKey(.desktopWindow)` | 渲染静态壁纸、动态壁纸或第三方视频壁纸的宿主层 |
| **中间：DimWallpaper 遮罩层** | **`CGWindowLevelForKey(.desktopWindow) + 1`** | **高于壁纸层 1 级，低于桌面图标层** |
| 上层：Finder 桌面图标层 | `CGWindowLevelForKey(.desktopIconWindow)` | 渲染桌面文件夹、文件图标与文字标签 |
| 顶层：常规应用窗口层 | `CGWindowLevelForKey(.normalWindow)` | 所有普通 App 窗口所在层级 |

通过把无边框遮罩窗口（`NSWindow`）的 `level` 精确设为：

```swift
let levelRaw = Int(CGWindowLevelForKey(.desktopWindow)) + 1
window.level = NSWindow.Level(rawValue: levelRaw)
```

我们得到了一个极佳的视觉效果：**只有底部的壁纸被柔和地压暗了，而放在桌面上的文件夹图标、文字标签以及所有打开的应用窗口都保持原有的清晰度与对比度，丝毫不会被遮罩蒙灰。**

## 二、零交互穿透与全空间（Spaces）驻留

把一个全屏窗口铺在桌面上，最怕的是拦截鼠标点击、抢夺键盘焦点，或者在切换虚拟桌面（Spaces）和触发调度中心（Mission Control）时露馅。

在 `Sources/main.swift` 的 `OverlayWindow` 实现中，我配置了四项关键的 AppKit 窗口属性：

1. **`ignoresMouseEvents = true`**：让 WindowServer 在命中测试（Hit-Testing）阶段直接跳过该窗口。用户在桌面上左键拖拽框选图标、双击打开文件或右键呼出 Finder 菜单时，事件 100% 穿透到底层 Finder。
2. **`canBecomeKey = false` & `canBecomeMain = false`**：重写窗口焦点属性，确保遮罩层在任何情况下都不会抢走当前活动应用的输入焦点。
3. **`collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle, .fullScreenAuxiliary]`**：
   - `.canJoinAllSpaces`：在所有虚拟桌面空间同步生效；
   - `.stationary`：触发 Mission Control 或四指分开显示桌面时，遮罩固定在原地不动，不会被当成普通窗口飞走；
   - `.ignoresCycle`：不参与 `Cmd + ~` 窗口循环切换；
   - `.fullScreenAuxiliary`：允许与全屏应用空间共存。

## 三、深色模式 KVO 联动与多显示器拓扑自愈

为了让工具装好后即可“彻底忘掉它的存在”，`AppController` 监听了三类系统事件：

- **系统外观切换（KVO on `NSApp.effectiveAppearance`）**：在默认的「跟随深色模式」下，一旦系统切入 `darkAqua`，遮罩窗口立即通过 `NSAnimationContext` 以 `0.18s` 平滑淡入到设定浓度（如 35% 或 50%）；切回浅色模式则平滑淡出并隐藏窗口，零 GPU 空转开销。
- **多显示器热插拔（`NSApplication.didChangeScreenParametersNotification`）**：外接 4K 显示器插拔、分辨率切换或主副屏旋转时，自动遍历 `NSScreen.screens`，按 `CGDirectDisplayID` 复用或重建对应屏幕的遮罩帧。
- **休眠唤醒同步（`NSWorkspace.didWakeNotification`）**：合盖休眠再唤醒后自动复核一次外观与屏幕几何尺寸，杜绝黑边错位。

目前 [**DimWallpaper v1.0.0**](https://github.com/xxkingstuggle/dim-wallpaper/releases/tag/v1.0.0) 已在 GitHub 开源并提供打包好的 macOS 应用下载。
