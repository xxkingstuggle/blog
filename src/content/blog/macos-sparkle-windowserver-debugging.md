---
title: 排查 Mac 50GB 磁盘莫名蒸发与 WindowServer 内存飙高：双开应用改签名引发的 Sparkle 更新死循环
pubDate: 2026-11-07
updatedDate: 2026-11-23
description: 记录一次真实的 macOS 系统故障排查：为什么重签名后的双开微信副本会在后台每分钟下载解压更新包，一天吃掉 50GB 磁盘并拖垮 WindowServer。
kicker: MACOS SYSTEM DEBUGGING · ROOT CAUSE ANALYSIS
kind: thought
presentation: article
tags:
  - macOS
  - 系统排障
  - Sparkle
  - WindowServer
  - 性能优化
---

前阵子我的 Mac (M4, 16GB 内存) 突然弹出磁盘空间不足的警告——早上还剩 **50 多 GB** 的可用空间，到下午几乎被吃光了。打开活动监视器一看，系统图形合成进程 **`WindowServer` 的内存占用竟然也飙到了接近 50GB**，Swap 被打满，切个窗口都掉帧。

重启电脑当然能暂时把内存和部分临时文件清掉，但如果不搞清楚是谁在后台疯狂写盘、又是谁在往 `WindowServer` 塞图形句柄，过半天它还是会爆。于是我趁着现场还在，顺着磁盘和进程一路查了下去。

## 第一步：查出那 50GB 写到了哪个目录

自己的下载目录和项目目录都没变大，大头肯定藏在 `~/Library/Caches` 或者系统的每用户临时目录 `/private/var/folders` 里。我先跑了一条 `du` 排序，同时用 `fs_usage` 看谁在持续写文件：

```bash
du -sh ~/Library/Caches/* /private/var/folders/*/*/* 2>/dev/null | sort -hr | head -n 20
```

结果一眼就看到了罪魁祸首：在本机双开应用（`WeChat2.app`）对应的 Sparkle 自动更新缓存和临时解压沙箱里，堆了上百个已经解压出来的 `.app` 更新副本，加起来正好占了将近 **50GB**。

### 为什么 Sparkle 会一遍遍重复解压同一个更新包？

顺着进程树（`ps aux`）和系统日志往下查，整个死循环的触发链条非常清楚：

1. **双开副本改过 Bundle ID 和本地重签名**：为了在一台 Mac 上同时登两个账号，`/Applications/WeChat2.app` 是复制原版应用后改了 `Info.plist` 并用本地 Ad-hoc 重新签名（`codesign --force --deep -s -`）做出来的。
2. **解压后校验 Team ID 失败**：当官方推送了新版本（`4.2.0`）时，`WeChat2.app` 里内置的 Sparkle 更新器在后台静默把几百 MB 的更新包下载下来，解压到临时目录准备替换。但到了替换前的最后一步——**比对新旧 App 的代码签名与开发者 Team ID** 时，因为正在跑的 `WeChat2.app` 是本地 Ad-hoc 签名，跟官方更新包的 Developer ID 签名对不上，Sparkle 判定校验失败，直接报错退出本次替换。
3. **没删临时解压目录，且下个周期继续重试**：最坑的地方在于，校验失败后它既没有把临时目录里已经解压出来的几百 MB `.app` 删掉，也没有停止自动更新，而是过一会儿又重新触发一轮“解压 → 签名比对失败 → 留下一份几百 MB 的尸体”。跑了一整天，直接把 50GB 磁盘塞爆。

## 第二步：为什么 `WindowServer` 也会跟着飙到 50GB？

`WindowServer` 是 macOS 负责合成所有窗口图层的系统进程。它自己没有业务逻辑，**每当 `WindowServer` 内存暴涨，基本都是某个客户端进程在高频创建窗口或离屏图层（`IOSurface` / `CGXWindow`）却没释放。**

用 `lsof` 和窗口句柄检查对比后发现，这两件事其实是同一个源头：`WeChat2.app` 的更新器每次在后台拉起准备替换、失败退出的循环里，它的辅助进程都在反复向 `WindowServer` 申请新的图层上下文，失败异常退出时连接又没干净回收，导致 `WindowServer` 里的图层引用一直攒着不放。

## 怎么修干净的

查清原因后，修复只花了十分钟：

1. 先杀掉卡在死循环里的 `WeChat2` 和它的后台 Updater 进程——杀完的一瞬间，根本不用重启电脑，`WindowServer` 占着的几十 GB 内存就被系统立刻回收，降回了正常的几百 MB。
2. 把 `/private/var/folders` 和 `~/Library/Caches` 里堆积的几十 GB 残留解压目录全部移进废纸篓清空。
3. 直接基于新版 `4.2.0` (`270390`) 重新制作了 `WeChat2.app`，在重签名所有内部 Helper 的同时，把双开副本里的 Sparkle 自动更新检查彻底关掉（双开副本只走手动同步升级）。

改完之后观察了半个月，磁盘临时目录和 `WindowServer` 内存再也没有出现过异常增长。也是因为踩了这个坑，后来我自己写 [**FrameLit**](/software/framelit/) 和 [**zjx-download**](/software/zjx-download/) 时，凡是涉及后台日志落盘或失败重试的地方，全部加上了硬性的体积上限（比如 `2 × 5 MiB` 轮转）和最大重试次数。
