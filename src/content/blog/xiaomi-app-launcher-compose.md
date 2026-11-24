---
title: 受够了测试机桌面滑半天还带广告，我写了个不联网、敲包名秒开的启动器
pubDate: 2026-11-05
updatedDate: 2026-11-24
description: 开发 Android 工具时，系统自带桌面找刚装上去的调试包太费劲。我用 Kotlin 和 Jetpack Compose 写了个零联网权限的极简启动器，还把搜索排序抽成纯函数在本地 JVM 毫秒级跑单测。
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

之前开发 [**USBLinkMic**](/software/usblinkmic/) 的时候，我书桌上常年插着一台小米测试机。

做过 Android 真机调试的人应该都懂那种烦躁。每次在电脑上改完代码，敲一行 `adb install` 把热乎的调试包推到手机上，想伸手在手机桌面上把它点开测一下，体验简直是一场灾难。

系统自带的默认桌面绑定了花里胡哨的负一屏资讯流，翻页找图标得左滑右滑好几屏；你要是嫌翻页慢，下拉呼出系统自带的全局搜索吧，敲两个字母进去，它先给你转圈圈联网拉一堆热门词条和买量广告推荐，等本地那几个应用刷出来，黄花菜都凉了。

我就想，这可是一台专门用来写代码调试的测试机啊。我需要的明明只是一个干干净净的本地列表，按下 Home 键，随手敲两三个字母，不管我敲的是应用显示的名字，还是代码里的包名片段（`packageName`），一秒钟之内让我把应用点开就行。

既然系统桌面不肯老老实实干这件事，我就自己用 Kotlin 和 Jetpack Compose 写了一个极简桌面启动器，叫 [**xiaomi-app-launcher (v1.0.0)**](https://github.com/xxkingstuggle/xiaomi-app-launcher)。

动手写这个启动器的时候，我给自己立了一个小目标，绝对不让核心搜索和排序逻辑沾上哪怕一行 Android SDK 的依赖。

为啥要这么较真呢？

平时写 Android 应用列表，最顺手的偷懒写法就是把搜索过滤、加星置顶和启动频次排序，直接跟 `Context`、`PackageManager` 或者 `SharedPreferences` 揉在同一个类里写。

那样写虽然快，但只要你的代码文件头部 import 了任何一个 `android.*` 下面的类，你每次改了一点点排序规则想跑个单元测试验证一下，都得连上真机或者拉起好几个 G 的 Android 模拟器去跑慢吞吞的 Instrumentation Test。

为了能在我自己的 Mac 上用本地 JVM 几百毫秒跑完所有单元测试，我在架构上拿刀把 `LauncherLogic.kt` 和 Android 系统层切得干干净净。

外层壳子调用系统的 `PackageManager` 读出本机安装的应用列表之后，第一时间先把它们转换成不引用任何 `android.*` 包的纯 Kotlin 数据类，然后再喂给 `LauncherLogic`。

在 `LauncherLogic` 里面，我只做两件纯粹而爽快的事。

第一件事是「应用名与包名双通道秒搜」。过滤函数会自动削掉首尾多余的空格并忽略大小写，同时去比对应用的桌面显示名称（Label）和底层的完整包名（Package Name）。这功能对开发者太好使了，平时找我自己刚装上去的测试包或者终端工具，根本不用切中文输入法打汉字，直接敲 `usblink`、`termux` 或者包名里的任何一段单词，列表当场秒出结果。

第二件事是「确定性的三级排序」。列表怎么排，规矩写得明明白白，我手动点了加星置顶（Favorites）的常用应用永远排在最前头；同样是置顶或者同样没置顶的应用，按我历史点开的启动次数从高到低排；万一启动次数也一样，最后按名字的字典序兜底。这样不管应用列表怎么刷，每个图标的位置都稳稳当当，绝不会每次打开乱跳。

正因为 `LauncherLogic.kt` 是一尘不染的纯 Kotlin 函数，仓库里的 `LauncherLogicTest` 根本不需要启动模拟器，直接在本地 JVM 上眨眼间就能把空输入、大小写混输、按包名命中、置顶状态切换和频次排序的全部边界测个底朝天。

到了外层的 Jetpack Compose 界面上，我也把克制贯彻到底。

整个桌面只有一屏到底，最顶上是随时待命的搜索框，中间是一块置顶常用网格，底下直接接 `LazyColumn` 全量应用列表。后台挂着系统应用安装与卸载的广播监听，只要我从电脑上 `adb install` 推进去一个新包，或者刚卸掉一个旧包，桌面列表瞬间自动刷新，连手动下拉重载都省了。

最让我自己安心的是，打开这个项目的 `AndroidManifest.xml`，里面连一行 `android.permission.INTERNET` 联网权限都没有申请。所有的加星置顶和启动次数统计全存在手机本地，既不弹窗要权限，也永远不可能在后台偷偷联网刷出半条广告。源码和发行说明我都放在了 [xiaomi-app-launcher v1.0.0 Release](https://github.com/xxkingstuggle/xiaomi-app-launcher/releases/tag/v1.0.0) 上，手里有 Android 测试机的朋友可以装上爽一下。
