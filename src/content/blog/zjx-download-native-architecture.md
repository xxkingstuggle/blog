---
title: zjx-download 架构复盘：用 Swift 重写 macOS 原生多线程下载器与 Chrome Native Messaging 交接
pubDate: 2026-11-15
updatedDate: 2026-11-23
description: 深入解析 zjx-download v2.0.4 的工程实现：HTTP Range 多连接分片断点续传持久化、未知长度流回退、Loopback 15151 双重绑定修复以及 Chrome MV3 Native Messaging 双通道交接。
kicker: MACOS NATIVE · SWIFT 6 & CHROME MV3
kind: project
presentation: article
tags:
  - macOS
  - Swift
  - SwiftUI
  - Chrome MV3
  - 网络编程
cover: ../../assets/projects/zjx-download-cover.png
---

[**zjx-download (v2.0.4)**](/software/zjx-download/) 是我用 Swift 6 与 SwiftUI 构建的 macOS 原生多线程下载管理器，配套 Chrome Manifest V3 扩展、Native Messaging Host 与无头 CLI。

在桌面下载器领域，写出一个“能发起 HTTP 请求保存文件”的 Demo 只需要几百行代码；但要让它在**跨会话崩溃恢复、未返回 `Content-Length` 的动态流、浏览器带鉴权交接、以及 IPv4/IPv6 本地端口监听**上都稳定可靠，则需要解决一系列扎实的状态机与系统级问题。本文复盘 `zjx-download` 演进到 `v2.0.4` 的四个核心工程设计。

<figure class="case-study-figure">
  <img src="/media/zjx-download/main-window.webp" alt="zjx-download v2.0.4 macOS 原生主窗口" width="1600" height="1197" loading="lazy" decoding="async" />
  <figcaption>图 1 · zjx-download v2.0.4 macOS 原生主窗口：集中管理并发分片队列、分类过滤与完成校验。</figcaption>
</figure>

## 一、分片断点续传持久化与“未知长度流”回退机制

多线程下载器的核心加速原理是：先通过 `HEAD`（或带 `Range: bytes=0-0` 的探测请求）获取文件总大小与 `Accept-Ranges: bytes` 支持情况，再将文件切分为 $N$ 个字节区间并发拉取。

但在早期版本中，我发现了一个严重的边界缺陷：**当用户在下载中途暂停或重启应用时，部分任务恢复后进度条会直接跳回 `0%` 重新下载。**

排查定位出两处根因，并在 `v2.0.4` 的 `ZJXDownloadCore` 中完成了根治：

1. **跨代（Generation）检查点基线对齐**：当任务暂停再恢复时，下载引擎会开启一个新的执行代（Generation）。如果新 Generation 启动时将基线归零而未先从 `StateStore` 聚合各分片已刷盘的 `verifiedCheckpoint`，UI 和调度器就会误以为从零开始。我们在 `ZJXDownloadCore` 中固化了 `testProgressBaselineResetsToVerifiedCheckpointOnNewGeneration` 单测，确保每次恢复都精确锚定在已落盘字节偏移量上。
2. **未完成 `HEAD` 探测或无 `Content-Length` 的单流保护**：某些动态附件接口不响应 `HEAD` 或不返回总字节数，引擎会以单连接（Unprobed Single Connection）流式写入临时文件。过去在恢复中断任务时，`recoverInterruptedTasks` 仅恢复了已提交分片表的任务，却把未完成分片探测的单流临时文件当成垃圾清理掉了。`v2.0.4` 专门为单流临时文件增加了实际落盘字节对账，并在取消任务时才彻底清理检查点（由 `testRecoverInterruptedTasksReconcilesCommittedSegmentsAndUnpersistedSingleConnection` 与 `testCancelRemovesCrossSessionSegmentedCheckpoint` 守护）。

<figure class="case-study-figure">
  <img src="/media/zjx-download/task-complete.webp" alt="zjx-download 任务完成与文件校验界面" width="1600" height="889" loading="lazy" decoding="async" />
  <figcaption>图 2 · 下载完成后的原生面板：支持摘要校验、直接打开文件或在 Finder 中定位。</figcaption>
</figure>

## 二、修复 `localhost:15151` IPv4 / IPv6 双重绑定与队列自启动

为了接收来自浏览器扩展或本地工具的任务投递，`zjx-download` 在本机回环地址监听 `15151` 端口。

在 `v2.0.2` 的实机测试中，应用启动时偶发报错 `Port 15151 is already in use`，甚至导致排队中的任务一直停留在 `Queued` 状态不开始下载。

- **双重绑定根因**：在 macOS 上解析 `localhost` 会同时返回 `127.0.0.1`（IPv4）和 `::1`（IPv6）。当底层 Socket 监听器未开启独立的 `IPV6_V6ONLY` 或在循环中对同一端口发起两次未隔离绑定时，第二次绑定就会与第一次自身持有的端口冲突，进而中断后续的 `processQueue()` 启动链路。
- **工程修复**：收敛本地 Loopback 监听器为确定性的单栈回环绑定，并在 `AppCoordinator` 初始化完成后显式触发 `processQueue()`，保证无论是冷启动还是被 Native Host 唤醒，挂起队列都能立即按并发配额拉起。

## 三、Chrome MV3 + Native Messaging 的安全交接与跨域凭据剥离

Chrome Manifest V3 取消了常驻 Background Page，改用随时会休眠的 Service Worker。为了让浏览器捕获的下载请求百分百可靠地交给 macOS 客户端，我设计了**“Native Messaging 唤醒 + 本地 Loopback 投递”**的协作机制：

- 当 Chrome 拦截到下载请求时，Service Worker 通过 `chrome.runtime.sendNativeMessage` 调用打包在 `zjx-download.app/Contents/Helpers/zjx-download-native-host` 中的原生辅助进程。
- 如果主应用尚未运行，Native Host 负责拉起主应用并完成握手，随后将下载 URL、文件名建议、Referer 与必要的认证 Header 移交过去。
- **跨域重定向凭据剥离（Security Boundary）**：浏览器交接的任务常带有源站点的 `Cookie` 或 `Authorization` Header。当下载链接发生跨源重定向（例如从私有站点 302 跳转到公共对象存储 CDN）时，如果继续携带原始 Header 会导致严重的凭据泄露。我在 `NetworkConfiguration` 中实现了严格的同源校验，一旦检测到重定向目标 Origin 变更，立即自动剥离敏感 Header（由 `testNetworkConfigurationStripsCrossOriginCredentials` 单测验证）。

## 四、Universal 双架构打包与 11 项 XCTest 门禁

目前 [**zjx-download v2.0.4**](https://github.com/xxkingstuggle/zjx-download/releases/tag/v2.0.4) 已在 GitHub 公开源码与发行包：

- `zjx-download.app`、`ZJXDownloadCore.framework`、`zjx-download-native-host` 与无头命令行工具 `zjx-download-cli` 全部编译为 **macOS Universal (`arm64` + `x86_64`)** 双架构二进制，并通过 `codesign --verify --deep --strict` 严格签名校验。
- 仓库内 11 项核心 XCTest 单元测试在 0.08 秒内全量跑通，覆盖了分片恢复、并发队列限制、定时调度器、cURL 导入编解码、文件名防冲突与 SHA-256 校验服务。
