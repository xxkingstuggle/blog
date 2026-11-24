---
title: 自己用 Swift 6 写了个 Mac 下载器，才发现暂停归零和跨域带 Cookie 有多坑
pubDate: 2026-11-15
updatedDate: 2026-11-24
description: 写一个能发 Range 请求的下载 Demo 很容易，但天天拿它接管浏览器下载时，我接连撞上了进度归零、单流临时文件被误删、15151 端口自己抢自己和 302 重定向泄露 Cookie 四个真坑。
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

写一个只会发 HTTP `Range` 请求拉文件的下载器 Demo，其实一点都不难。

周末花半天时间，切几个并发分片往磁盘里写，进度条跑起来还挺有成就感。

但当我决定用 Swift 6 和 SwiftUI 认真做一个叫 [**zjx-download (v2.0.4)**](/software/zjx-download/) 的 macOS 原生多线程下载器，配上 Chrome Manifest V3 浏览器扩展、Native Messaging Host 和命令行 CLI，天天拿它接管我自己电脑上的所有浏览器下载时，现实很快就给我上了一课。

头几天用的时候，诡异的事情接二连三冒出来。

一个几 GB 的镜像下了一半，我点了一下「暂停」再点「继续」，进度条当场跳回 `0%`。

有些后台动态生成的报表附件，下载途中退了一下 App 重开，之前下好的临时文件直接人间蒸发了。

更离谱的是，刚开机启动 App 的时候，偶尔还会弹窗报错说 `localhost:15151` 端口已经被占用了，明明我电脑上根本没装别的用 `15151` 端口的软件。

从早期版本一路打磨到 `v2.0.4`，我基本就是在跟这些平时写 Demo 根本遇不到的真坑死磕。

<figure class="case-study-figure">
  <img src="/media/zjx-download/main-window.webp" alt="zjx-download v2.0.4 macOS 原生主窗口" width="1600" height="1197" loading="lazy" decoding="async" />
  <figcaption>图 1 · zjx-download v2.0.4 macOS 原生主窗口，集中管理并发分片队列、分类过滤与完成校验。</figcaption>
</figure>

最先让我坐不住的，就是那个点一下暂停再继续、进度条瞬间归零的问题。

正常的多线程下载逻辑很直白，先发个 `HEAD` 或者 `Range: bytes=0-0` 试探请求拿到文件总大小，然后切成好几个分片并发去拉。

那为什么暂停恢复之后进度会归零呢？

我顺着核心引擎 `ZJXDownloadCore` 往里查，一下子揪出了两处漏洞。

第一处漏洞出在「执行代（Generation）」的基线计算上。为了防止旧任务的异步回调污染新状态，任务每次暂停再恢复，引擎内部都会开启一个新的 Generation。

结果早期写新 Generation 启动逻辑的时候，我随手把当前代的进度起点设成了 0，完全忘了应该先去 `StateStore` 里，把各个分片之前已经落盘校验过的 `verifiedCheckpoint` 字节数加起来作为基线。底层文件其实没丢，是从断点接着往下写的，但 UI 进度条却傻乎乎地从 0 开始重新算。修完这个 Bug，我马上补了一条叫 `testProgressBaselineResetsToVerifiedCheckpointOnNewGeneration` 的单测，专门死盯这个基线数值。

但有些任务的临时文件是真的丢了，这就引出了第二处更坑的漏洞。

网上的下载链接并不都那么规矩。有些动态生成的附件接口既不响应 `HEAD`，也不返回 `Content-Length` 总长度。遇到这种链接，我的下载引擎会自动退化成单连接流式写入（Unprobed Single Connection），边收数据边往临时文件里写。

坑就坑在启动时的恢复函数 `recoverInterruptedTasks` 上。以前这个函数只认得已经建好分片表的任务，它一扫描临时目录，看到那些因为没有 `Content-Length` 而没建分片表的单流临时文件，直接把人家当成崩溃留下的孤儿垃圾给清理掉了。

难怪重启之后得从头再下。

到了 `v2.0.4`，我把单流临时文件的实际落盘字节对账逻辑完完整整补了上去。只要用户没有明确点击「取消任务」，任何已经落盘的检查点和数据都绝不擅自删除，并且用 `testRecoverInterruptedTasksReconcilesCommittedSegmentsAndUnpersistedSingleConnection` 这条长长的单测把混合分片与单流恢复的场景彻底锁死。

<figure class="case-study-figure">
  <img src="/media/zjx-download/task-complete.webp" alt="zjx-download 任务完成与文件校验界面" width="1600" height="889" loading="lazy" decoding="async" />
  <figcaption>图 2 · 下载完成后的原生面板，支持摘要校验、直接打开文件或在 Finder 中定位。</figcaption>
</figure>

修完了断点恢复，紧接着就是那个让人摸不着头脑的 `Port 15151 is already in use` 报错。

为了接收浏览器扩展和 CLI 投递过来的下载任务，主程序需要在本地监听 `15151` 端口。但在 `v2.0.2` 测试那会儿，刚启动 App 偶尔就会弹这个端口占用错误。更要命的是，一旦报了这个错，列表里正在排队的任务就永远卡在 `Queued` 状态一动不动了。

我一开始还去终端里敲 `lsof -i :15151`，想看看是哪个流氓软件抢了我的端口。

结果查出来占用 `15151` 端口的不是别人，正是 `zjx-download` 自己。

自己跟自己抢端口，这事是怎么发生的？

查到底层网络初始化代码才恍然大悟。在 macOS 上解析 `localhost`，系统会同时返回 IPv4 的 `127.0.0.1` 和 IPv6 的 `::1`。如果底层 Socket 监听没有严格区分双栈，或者在启动初始化链路里不小心重复触发了一次绑定，自己的第二次绑定就会直接撞上几十毫秒前刚绑好的端口。

这一撞，抛出的异常直接打断了初始化后半截的 `processQueue()` 调用，导致队列再也没机会启动。把本地回环监听改成确定的单次绑定，并在 `AppCoordinator` 启动收尾时显式兜底调一次 `processQueue()` 之后，不管是冷启动还是被浏览器半路唤醒，挂起的队列都能稳稳当当地拉起来。

说到被浏览器唤醒，这里还藏着第四个坑，而且是个很容易被忽视的安全漏洞。

当你在 Chrome 里点了一个下载链接，扩展拦截下来之后，会通过 `chrome.runtime.sendNativeMessage` 拉起打包在 `zjx-download.app/Contents/Helpers/zjx-download-native-host` 里的原生辅助进程。哪怕主 App 当时没开，辅助进程也能先把主 App 唤醒，再把下载链接、文件名、Referer 以及当前站点的认证 Header 一并传过去。

问题就出在这个认证 Header 上。

很多私有站点或者内部系统的下载链接，你点下去的那一刻，它是先在主站域名下做一次鉴权，然后立刻给你返回一个 `302` 重定向，跳到第三方的公有云对象存储（比如 OSS 或者 S3 CDN）去拉真正的文件。

你想想看，如果下载器跟着 `302` 重定向跳去第三方 CDN 的时候，还傻乎乎地把原网站的 `Cookie` 和 `Authorization` 头原封不动带过去，那用户的主站登录凭据不就直接泄露给第三方服务器了吗？

意识到这一点之后，我立刻在 `NetworkConfiguration` 的重定向拦截器里加了一道铁闸。每次发生重定向，先做严格的同源比对。只要发现跳转后的目标 Origin 变了，当场自动剥掉 `Cookie` 和 `Authorization` 等所有敏感认证头，并用 `testNetworkConfigurationStripsCrossOriginCredentials` 单测把这个行为焊死。

现在这套 [**zjx-download v2.0.4**](https://github.com/xxkingstuggle/zjx-download/releases/tag/v2.0.4) 已经成了我每天主力使用的下载工具。主应用、`ZJXDownloadCore.framework`、`zjx-download-native-host` 还有命令行 `zjx-download-cli` 全部编译成了 macOS Universal（`arm64` 加 `x86_64`）双架构二进制，仓库里的 11 项 XCTest 单元测试在 0.08 秒内就能跑完，把断点恢复、并发队列、cURL 导入解析、同名文件防覆盖和 SHA-256 校验全看住了。安装包和源码都在 [zjx-download 作品页](/software/zjx-download/) 里，在 Mac 上缺个干净原生下载器的朋友可以拿去试试。
