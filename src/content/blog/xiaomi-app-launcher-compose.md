---
title: 极简 Android 启动器实践：用 Jetpack Compose 做毫秒级本地应用检索与纯函数单测
pubDate: 2026-11-05
updatedDate: 2026-11-23
description: 复盘开源 Android 项目 xiaomi-app-launcher v1.0.0：为什么把检索、拼音/包名匹配与置顶排序从 Android Framework 中彻底剥离，实现 100% 本地 JVM 单测覆盖与零延迟启动体验。
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

在国产 Android ROM（如 MIUI / HyperOS）上，系统默认桌面往往捆绑了负一屏资讯流、全局搜索广告推荐与复杂的文件夹层级。有时我只想干脆利落地做一件事：**按下桌面键，输入两三个字母，1 秒内拉起我想要的本机应用。**

为此，我用 Kotlin 与 Jetpack Compose 开发并开源了 [**xiaomi-app-launcher (v1.0.0)**](https://github.com/xxkingstuggle/xiaomi-app-launcher)——一个零联网权限、零广告、专注毫秒级本机应用检索与常用置顶的极简 Android 启动器。

## 一、架构核心：将纯检索与排序逻辑从 Android Framework 彻底剥离

很多 Android 开发者在写应用列表与搜索功能时，习惯把过滤、排序和状态判断直接塞进依赖 `Context`、`PackageManager` 或 `SharedPreferences` 的 `ViewModel` 甚至 Composable 函数里。这样做的恶果是：**每次想测试一个搜索边界条件，都必须启动缓慢的 Android 模拟器或连接真机跑 Instrumentation Test。**

在 `xiaomi-app-launcher` 中，我严格贯彻了**“纯逻辑（Pure Logic）与平台 I/O（UI / PackageManager）物理隔离”**的原则：

```text
[PackageManager / SharedPreferences] ──(只读映射为不可变 Data Class)──► [LauncherLogic 纯函数层] ──► [Jetpack Compose 声明式 UI]
```

### 1. 不可变领域模型与纯函数检索

在 `LauncherLogic.kt` 中，所有应用条目被抽象为与 Android SDK 无关的纯 Kotlin 数据类：

- **多维度无大小写匹配**：同时支持按应用显示名称（Label）与完整包名（Package Name）子串检索，自动忽略首尾空白与大小写差异。对于开发者而言，直接输入 `termux`、`adb` 或包名片段即可瞬间定位目标工具。
- **确定性的复合排序规则**：
  1. **收藏置顶优先（Favorites First）**：用户标记为常用的应用始终固定在顶部快捷区；
  2. **使用频次加权（Launch Count / Recency）**：高频启动的应用自动前移；
  3. **字典序稳定兜底**：同权重应用按名称确定性排序，避免列表位置随机跳动破坏肌肉记忆。

### 2. 秒级运行的本地 JVM 单元测试（`LauncherLogicTest`）

正因为 `LauncherLogic` 不导入任何 `android.*` 命名空间，仓库中的 `LauncherLogicTest` 可以直接在本地 JVM 上以毫秒级速度运行，全面验证空查询、大小写混排、包名命中、置顶切换与频次排序的不变式。

## 二、Jetpack Compose 单屏响应式交互与包变更监听

在 UI 与系统集成层，启动器追求极致的轻量与跟手度：

- **单屏聚合声明式布局**：顶部为即时响应的搜索栏，中部为高优置顶网格，下方为虚拟化的 `LazyColumn` 全量应用列表。键盘弹出或输入字符时，仅重组的过滤列表切片发生局部更新，帧率稳定满帧。
- **系统应用安装/卸载广播同步**：动态监听系统包增删事件，新安装或卸载应用后自动刷新内存索引，无需手动下拉重载。
- **零隐私负担**：`AndroidManifest.xml` 中不申请 `INTERNET` 权限，所有置顶偏好与启动计数仅保存在本机沙箱内。

项目源码与 [**v1.0.0 Release**](https://github.com/xxkingstuggle/xiaomi-app-launcher/releases/tag/v1.0.0) 已在 GitHub 公开（MIT License）。
