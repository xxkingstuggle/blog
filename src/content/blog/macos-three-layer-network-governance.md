---
title: 为什么在 Mac 上光改 /etc/hosts 拦不住网站？联动 hosts、Little Snitch 与 FlClash 的三层脚本
pubDate: 2026-10-27
updatedDate: 2026-11-23
description: 在开了 FlClash 代理或浏览器 DoH 的 macOS 上，只改 /etc/hosts 经常失效。我写了一个 Python 脚本同时同步 hosts、Little Snitch 和 FlClash 顶层规则。
kicker: MACOS NETWORKING · THREE-LAYER GOVERNANCE
kind: thought
presentation: article
tags:
  - macOS
  - 网络工程
  - FlClash
  - Little Snitch
  - Python
---

在 Mac 上写代码时，我经常有两个很实在的网络控制需求：

1. **干活时把容易分心的网站彻底掐断**（或者只临时解封 15 分钟，到点自动封回去）；
2. **把特定的国内 CDN 或低延迟域名强制置顶直连（`DIRECT`）**，别让代理软件的通用规则集误抓过去绕远路。

网上绝大多数教程只会教一句“去 `/etc/hosts` 里加一行 `127.0.0.1 域名`”。但在实际装了代理客户端（比如 FlClash）的 Mac 上试过就知道，**光改 `/etc/hosts` 十有八九根本拦不住**。

## 为什么单改 `/etc/hosts` 会失效？

在现在的 macOS 网络环境里，一个请求发出去可能走三条完全不同的路：

| 请求走的路径 | 单改 `/etc/hosts` 管用吗？ | 为什么会漏过去 |
|---|---|---|
| 走系统默认 DNS 的普通直连 | 写全 IPv4 + IPv6 才管用 | 很多人只写了 `127.0.0.1` 忘了写 `::1`，支持 IPv6 的浏览器拿到 AAAA 记录照样能连上 |
| 走 FlClash 系统代理或 TUN 虚拟网卡 | **基本失效** | 代理内核（Fake-IP 或远端 DNS 解析）直接把域名接管了，根本不看本机的 `/etc/hosts` |
| 开了浏览器私有 DoH 或应用自带解析 | **失效** | 绕过了系统 `mDNSResponder`，必须在应用防火墙出站层按域名拦 |

也就是说，想让一条封禁规则不管开不开代理、用什么浏览器都 100% 生效，必须把 **`/etc/hosts`**、**`Little Snitch`** 和 **`FlClash 扩展脚本`** 三处同时改齐。每次手动改三个地方太麻烦，所以我写了一个 Python 脚本 `siteblock.py`（配成了本地的 `three-layer-site-block` 技能）来统一改。

## `siteblock.py` 一次执行改哪三处

给脚本传一组域名后，它会按同一份清单自动同步三层配置：

**1. `/etc/hosts` 标记块（同时写 `127.0.0.1` 和 `::1`）**
脚本不会动 `/etc/hosts` 原有的系统配置，只更新 `# BEGIN SITEBLOCK` 和 `# END SITEBLOCK` 之间的区块。每个域名和它的 `www.` 子域都会成对写上 `127.0.0.1` 和 `::1`，写完自动执行 `dscacheutil -flushcache` 和 `killall -HUP mDNSResponder` 刷掉系统 DNS 缓存。

**2. Little Snitch 出站拦截规则**
针对可能不走系统代理、也不读本机 DNS 的后台进程，在 Little Snitch 里配上对应域名的全局出站拒绝（Outbound Deny）规则。只要进程尝试向目标域名发起连接，在网络扩展层就会被直接掐断。当清空封禁列表时，脚本还会自动把空的 Little Snitch 规则禁用掉，避免触发空规则弹窗。

**3. FlClash 扩展脚本（Override Script）置顶注入**
当 FlClash 开着的时候，所有流量先过 Clash 内核。脚本会扫描 `~/Library/Application Support/com.follow.clash/profiles/` 下的配置脚本，在规则数组最顶部插入 `DOMAIN-SUFFIX,<domain>,REJECT`（如果是加直连白名单，则写进 `directSuffixes` 生成顶层的 `DOMAIN-SUFFIX,<domain>,DIRECT`），保证在进各种几万条的 GeoSite 规则集之前就被第一优先级命中。

## 先 `--dry-run` 再写盘，改完逐层验活

动系统网络配置最怕改错参数导致断网，或者同一个域名一边配了 `REJECT` 一边又在 `DIRECT` 白名单里打架。所以脚本默认支持 `--dry-run` 预检：每次改之前先跑一遍 `python3 -B siteblock.py block --dry-run`，确认三层即将改动的条目和冲突检查无误后再实盘写入；如果检测到 FlClash 正在运行，写完还会自动触发内核重载，并从三层分别读回实际生效的规则列表做一次比对。
