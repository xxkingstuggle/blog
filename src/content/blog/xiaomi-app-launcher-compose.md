---
title: xiaomi-app-launcher：给测试机写一个不联网、按包名秒搜应用的 Compose 启动器
pubDate: 2026-11-05
updatedDate: 2026-11-23
description: 测试机自带桌面广告多、找调试包太慢，我用 Kotlin 和 Jetpack Compose 写了一个不申请联网权限的极简启动器，并把搜索和排序逻辑拆成纯函数跑本地 JVM 单测。
kicker: ANDROID NATIVE · KOTLIN & JETPACK COMPOSE
kind: project
presentation: article
tags:
  - Android
  - Kotlin
  - Jetpack Compose
  - 单元测试
  - 架构设计
---

开发 [**USBLinkMic**](/software/usblinkmic/) 的时候，我桌上手头常备着一台小米测试机。系统自带桌面绑定了负一屏资讯流和在线搜索推荐，每次刚用 `adb install` 装了一个调试包上去，想在桌面上翻出来点开，都得滑好几屏或者在带广告的全局搜索里等半天。

我想要的其实就是一个干净的本地列表：**按下 Home 键，敲两三个字母（不管敲的是应用名还是包名片段），一秒内把应用拉起来。**

于是我用 Kotlin 和 Jetpack Compose 写了 [**xiaomi-app-launcher (v1.0.0)**](https://github.com/xxkingstuggle/xiaomi-app-launcher)。

## 把搜索和排序从 Android SDK 里剥出来，直接用本地 JVM 跑单测

写 Android 应用列表时，很容易顺手把过滤、排序和置顶判断直接写进依赖 `Context`、`PackageManager` 或 `SharedPreferences` 的代码里。但那样写有个很大的麻烦：只要引了 `android.*` 的类，每次改完排序规则想跑个测试，都得连真机或者起笨重的模拟器跑 Instrumentation Test。

为了能在 Mac 本地几百毫秒跑完所有单测，我在代码结构上把 **`LauncherLogic.kt`** 彻底跟 Android SDK 隔开了：

- 外层调 `PackageManager` 读出本机已安装应用后，先转成不引任何 `android.*` 包的纯 Kotlin 数据类；
- **同时搜应用名和包名**：`LauncherLogic` 里的过滤函数会忽略首尾空格和大小写，同时匹配应用的显示名称（Label）和完整包名（Package Name）。平时找自己刚装上去的测试包或者常用工具，直接敲 `usblink`、`termux` 就能秒出结果；
- **固定排序规则**：用户手动加星置顶（Favorites）的排最前；同样置顶或未置顶的，按历史启动次数从高到低排；启动次数相同的再按名称字典序兜底，保证列表位置不会乱跳。

因为 `LauncherLogic.kt` 是纯粹的 Kotlin 函数，仓库里的 `LauncherLogicTest` 直接在本地 JVM 上就能跑完空输入、大小写混输、按包名命中、置顶切换和频次排序的全部测试。

## 单屏 Compose 界面与零联网权限

界面层用 Jetpack Compose 写得很克制：

- 一屏到底：最上面是搜索框，中间是置顶常用网格，底下是 `LazyColumn` 全量列表；
- 监听系统的应用安装与卸载广播，用 `adb install` 刚装上新包或者卸载了旧包，列表自动刷新，不用手动重载；
- `AndroidManifest.xml` 里连 `INTERNET` 联网权限都没申请，所有置顶和启动计数只存在手机本地。源码与发行说明在 [xiaomi-app-launcher v1.0.0 Release](https://github.com/xxkingstuggle/xiaomi-app-launcher/releases/tag/v1.0.0)。
