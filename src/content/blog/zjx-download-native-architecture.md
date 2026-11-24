---
title: zjx-download v2.0.4 开发复盘：修掉暂停归零、15151 端口双绑与跨域带 Cookie 几个真坑
pubDate: 2026-11-15
updatedDate: 2026-11-23
description: 用 Swift 6 写 macOS 多线程下载器和 Chrome MV3 扩展交接时，我修掉了分片暂停后进度跳回 0%、无 Content-Length 单流临时文件被误删、localhost 双栈端口冲突以及重定向泄露 Cookie 这四个具体问题。
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

[**zjx-download (v2.0.4)**](/software/zjx-download/) 是我用 Swift 6 和 SwiftUI 写的 macOS 原生多线程下载器，配了 Chrome Manifest V3 浏览器扩展、Native Messaging Host 和命令行 CLI。

写一个只会发 HTTP `Range` 请求拉文件的 Demo 很容易，但在真机上每天拿它接管浏览器下载时，很快就会撞上各种边界问题：暂停一下怎么进度跳回 `0%` 了？为什么有些不返 `Content-Length` 的附件重启后临时文件没了？为什么 `localhost:15151` 偶尔报端口已被占用？

这篇文章就记一下演进到 `v2.0.4` 过程中修掉的这四个具体问题。

<figure class="case-study-figure">
  <img src="/media/zjx-download/main-window.webp" alt="zjx-download v2.0.4 macOS 原生主窗口" width="1600" height="1197" loading="lazy" decoding="async" />
  <figcaption>图 1 · zjx-download v2.0.4 macOS 原生主窗口：集中管理并发分片队列、分类过滤与完成校验。</figcaption>
</figure>

## 为什么暂停再继续，进度条会跳回 `0%`？

多线程下载的做法是先发 `HEAD`（或 `Range: bytes=0-0`）拿到文件总大小，切成 $N$ 个分片并发拉取。但在早期版本里，下到一半点“暂停”再点“继续”，或者退掉 App 重开，进度条经常会瞬间跳回 `0%`。

顺着 `ZJXDownloadCore` 查下去，揪出了两处原因：

1. **新一轮恢复时没先把已落盘的 `verifiedCheckpoint` 算进基线**：任务每次暂停再恢复，引擎内部会开启一个新的执行代（Generation）。以前新 Generation 启动时把当前代进度基线直接设成了 0，没先去 `StateStore` 把各个分片已经刷进磁盘的字节数加起来作为起点。修好后我加了 `testProgressBaselineResetsToVerifiedCheckpointOnNewGeneration` 单测专门盯着这个数值。
2. **没返回 `Content-Length` 的单流临时文件被启动清理误删了**：有些动态生成的附件接口不响应 `HEAD` 也不给总长度，引擎会自动退化成单连接（Unprobed Single Connection）往临时文件里流式写。结果以前的启动恢复函数 `recoverInterruptedTasks` 只认得已经建好分片表的任务，看到还没建分片表的单流临时文件，直接当成孤儿垃圾给删了。`v2.0.4` 把单流临时文件的实际落盘字节对账补上了，只有用户明确点“取消任务”时才删检查点（由 `testRecoverInterruptedTasksReconcilesCommittedSegmentsAndUnpersistedSingleConnection` 单测覆盖）。

<figure class="case-study-figure">
  <img src="/media/zjx-download/task-complete.webp" alt="zjx-download 任务完成与文件校验界面" width="1600" height="889" loading="lazy" decoding="async" />
  <figcaption>图 2 · 下载完成后的原生面板：支持摘要校验、直接打开文件或在 Finder 中定位。</figcaption>
</figure>

## `localhost:15151` 自己跟自己抢端口，导致队列卡在 `Queued`

为了接收浏览器扩展和 CLI 投递过来的下载任务，主程序在本地监听 `15151` 端口。但在 `v2.0.2` 测试时，刚启动 App 偶尔会报 `Port 15151 is already in use`，而且一旦报了这个错，列表里排队中的任务就一直停在 `Queued` 状态不动了。

查下来是因为在 macOS 上解析 `localhost` 会同时拿到 `127.0.0.1`（IPv4）和 `::1`（IPv6）。如果底层 Socket 监听没区分双栈或者在初始化链路里重复绑了一次，自己第二次绑定就会撞上自己第一次绑好的端口，抛异常打断了后面的 `processQueue()`。
把本地回环监听改成确定的单次绑定、并在 `AppCoordinator` 启动结尾显式调一次 `processQueue()` 后，不管冷启动还是被浏览器唤醒，挂起队列都能立刻拉起来。

## Chrome MV3 交接与跨域名重定向剥掉 Cookie

Chrome 扩展在拦截到下载请求后，会通过 `chrome.runtime.sendNativeMessage` 拉起打包在 `zjx-download.app/Contents/Helpers/zjx-download-native-host` 里的原生辅助进程；哪怕主 App 没开，辅助进程也能先把主 App 唤醒，再把下载链接、文件名、Referer 和认证 Header 传过去。

这里有一个很容易漏掉的安全细节：**跨源 302 重定向时不能把原网站的 `Cookie` 和 `Authorization` 带过去。**
很多私有站点的下载链接点下去之后，会先在站内鉴权，然后 `302` 重定向到第三方对象存储（比如公有云 OSS / S3 CDN）。如果下载器跟着重定向走的时候还傻傻地带着原站点的 `Cookie` 或 `Authorization` Header，用户的登录凭据就会直接发给第三方 CDN。
所以我在 `NetworkConfiguration` 的重定向拦截里加了严格的同源比对：只要重定向后的目标 Origin 变了，立刻自动剥掉敏感认证头（对应单测 `testNetworkConfigurationStripsCrossOriginCredentials`）。

## Universal 双架构打包与 11 项 XCTest 单测

目前 [**zjx-download v2.0.4**](https://github.com/xxkingstuggle/zjx-download/releases/tag/v2.0.4) 已经把源码和打好的安装包发在 GitHub Release 上。主应用、`ZJXDownloadCore.framework`、`zjx-download-native-host` 和命令行 `zjx-download-cli` 全部编译成了 **macOS Universal (`arm64` + `x86_64`)** 双架构二进制；仓库里的 11 项 XCTest 单元测试在 0.08 秒内跑完，覆盖了分片断点恢复、并发队列控制、cURL 导入解析、同名文件防覆盖和 SHA-256 校验。
