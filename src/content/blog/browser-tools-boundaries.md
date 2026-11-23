---
title: 三个小工具的演进：从私有原型到 Tintpane 与 zjx-download 公开发版
description: 记录 Tintpane（原 Colorful）的默认关闭与域名继承、Linux.do 标题检索的限流停止边界，以及下载器演进到 v2.0.4 公开发版的完整历程。
pubDate: 2026-10-23
updatedDate: 2026-11-23
tags: [浏览器工具, 工程实践, 产品取舍]
kicker: 工作台演进 · FROM PROTOTYPE TO RELEASE
kind: project
presentation: article
draft: false
---

本文最初写于 2026-10-23，当时这三个项目都还处于私有原型阶段；到了 2026 年 11 月，其中的 **Colorful（现已更名为 [Tintpane v2.4.0](/software/tintpane/)）** 和 **[zjx-download v2.0.4](/software/zjx-download/)** 均已完成架构收敛、自动化单测与合规整理，正式在 GitHub 公开源码并发布了 Release。保留这篇演进记录，是为了对比它们从最初的“边界定义”到“正式交付”走过的路径。

## Colorful

Chromium 把网站作为 PWA 打开后，我希望窗口主题能跟随网站的配色。项目围绕这个问题实现了主题色动态注入和按站点保存设置。

在演进到 [**Tintpane v2.4.0**](/software/tintpane/) 后，最核心的取舍依然得以保留并强化——**默认关闭与按需动态注册脚本**：只有用户明确启用且处于 `standalone` 独立窗口的 PWA 才参与处理，再通过域名树层级继承与双向别名组同步减少重复设置。详见后续的专项复盘《[Tintpane 2.4：Chromium PWA 窗口动态主题色注入、域名树继承与双向别名同步](/posts/tintpane-chromium-pwa-theme-engine/)》。

## Linux.do

这个用户脚本尝试把公开主题的**标题**保存在本地，供后续快速检索。它不建立正文镜像，也不意味着能读取站点未授权的内容。

当前开发源码标记为 5.0.0，仍有未提交修改。实现里的一个边界比“抓得更多”更重要：遇到 HTTP 429、挑战页或权限条件不满足时停止。脚本不能把用户已有的访问权限扩展成另一套通行证。

缓存是否完整、增量更新是否符合预期，仍需要结合真实站点行为验证。这里展示的是本地索引与停止条件的设计，不提供私有仓库入口，也不宣称获得站点官方支持。

## zjx-download

下载器把两个容易分开的环节接在一起：浏览器发现任务，Mac 应用接手分片并发保存。在 10 月下旬的 `2.0.2` 阶段，它还面临 `localhost:15151` 端口双重绑定报错和未探测流断点续传丢失的问题；而在随后的 `v2.0.4` 迭代中，我们逐一攻克了分片级检查点落盘、单连接未知长度流恢复、Loopback 绑定收敛与 CLI 无头退出信号，11 项 XCTest 核心单测全绿，并正式在 GitHub 发布了 [**zjx-download v2.0.4 公开发行版**](/software/zjx-download/)（完整技术复盘见《[zjx-download 架构复盘](/posts/zjx-download-native-architecture/)》）。

当前浏览器扩展按项目记录为 clean-room 重写，早期集成项目的作者 AmirHossein Abdolmotallebi 及其 [ab-download-manager-browser-integration](https://github.com/amir1376/ab-download-manager-browser-integration/tree/1871203ce9665ea6802e8d1328f8b70c7dc9d948) 仍在 README 与许可中保留署名。这层来源关系，不等于当前实现直接依赖旧业务代码。我主要关心任务交接、桌面体验与错误处理，也保留来源与许可边界。在问题收敛和分发条件确认前，这个项目保持开发案例状态。

## 这些尝试放在一起说明什么

我愿意从一个小问题做起，但也希望知道它什么时候该停下来。默认关闭、限流停止、明确保留失败项，都是产品行为的一部分。代码能跑是开始，能说明自己覆盖了哪些场景，才适合让别人决定是否使用。

这份记录核对于 2026-10-23。后续若有可公开验证的版本，会在[作品页](/software/)更新。
