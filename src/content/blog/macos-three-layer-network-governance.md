---
title: macOS 三层网络治理：结合 /etc/hosts、Little Snitch 与 FlClash 脚本实现可校验的域名分流
pubDate: 2026-10-27
updatedDate: 2026-11-23
description: 为什么单改 /etc/hosts 在开启 TUN / 系统代理的 macOS 上常常失效？详解我日常使用的 three-layer-site-block 技能：如何联动 hosts、Little Snitch 与 FlClash 扩展脚本并做 Dry-run 校验。
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

在 macOS 开发机上，我们经常有两类确定性的本机网络治理需求：

1. **专注力封禁或限时熔断**：在深度编码时段，把容易分散注意力的娱乐/资讯域名彻底阻断，或者只允许临时解锁 15 分钟、到点自动回封。
2. **特定域名强制顶层直连（Direct）**：将本地开发关联的国内镜像、测试接口或延迟敏感域名置顶写入直连白名单，绕开代理规则集的误捕获。

很多教程只会教你一句“去改 `/etc/hosts` 把域名指向 `127.0.0.1`”。但在真实配置了代理客户端（如 FlClash / Clash Meta 内核）或浏览器 DoH（DNS over HTTPS）的 macOS 环境中，**单改 `/etc/hosts` 往往会彻底失效**。

为了确保网络规则在任何流量路径下都 100% 生效且可审计，我构建了 **`three-layer-site-block`** 技能与配套的 `siteblock.py` 自动化脚本，在 macOS 上实现了 **`/etc/hosts` + Little Snitch + FlClash 扩展脚本**的三层纵深治理。

## 一、为什么单层封禁在现代 macOS 网络栈中会漏流？

当浏览器或终端应用在 macOS 上发起对某个域名的访问时，流量可能走以下三条完全不同的解析与转发路径：

| 流量路径 | 单改 `/etc/hosts` 是否生效？ | 漏流原因剖析 |
|---|---|---|
| 常规系统 DNS 直连请求 | 生效（需同时覆盖 IPv4 与 IPv6） | 若只写 `127.0.0.1` 漏写 `::1`，支持 IPv6 的客户端仍会通过 AAAA 记录直连成功 |
| 经过 FlClash 系统代理 / TUN 虚拟网卡的请求 | **常失效** | 代理内核（Fake-IP 或远端 DNS 嗅探）直接接管了域名连接，根本不走本机 `/etc/hosts` 解析结果 |
| 开启了私有 DoH 或硬编码远端解析的应用 | **常失效** | 应用绕过了系统 `mDNSResponder`，必须在系统防火墙出站层直接按主机名拦截 |

## 二、三层协同架构：让每一条流量路径都有确定性守门员

`siteblock.py` 将目标域名集合作为唯一数据源，在一次执行中同步对齐三层配置：

```text
                      ┌──► [Layer 1: /etc/hosts]          ──► 同时写入 127.0.0.1 与 ::1 精确匹配块
[目标域名唯一清单] ────┼──► [Layer 2: Little Snitch]       ──► 全局出站 Deny 规则（应用层防火墙兜底）
                      └──► [Layer 3: FlClash 扩展脚本]     ──► 在所有 Profile 生成顶层 DOMAIN-SUFFIX,域名,REJECT / DIRECT
```

### 1. 第一层：`/etc/hosts` 受控标记块（IPv4 + IPv6 双栈）

脚本绝不粗暴覆盖整个 `/etc/hosts`，而是只维护带有 `# BEGIN SITEBLOCK` 与 `# END SITEBLOCK` 定界符的受控区块，为每个域名成对生成 `127.0.0.1` 与 `::1` 记录，并在写盘后自动刷新 `dscacheutil -flushcache` 与 `mDNSResponder`。

### 2. 第二层：Little Snitch 全局出站防火墙规则

针对可能绕过本地 DNS 或未走系统代理的后台进程，在 Little Snitch 规则层配置全局出站拒绝（Outbound Deny）。无论进程使用何种 DNS 解析方式，在发起连接握手的瞬间即被内核网络扩展（Network Extension）拦截。

### 3. 第三层：FlClash 扩展脚本顶层规则注入

当 FlClash 处于运行态时，代理层是实际流量的第一入口。脚本会自动扫描 FlClash 的配置文件，在每份配置的扩展脚本（Override Script）顶部注入最高优先级的 `DOMAIN-SUFFIX,<domain>,REJECT`（用于封禁）或维护 `directSuffixes` 数组生成顶层 `DOMAIN-SUFFIX,<domain>,DIRECT`（用于强制直连），确保在进入任何复杂 GeoSite 规则集之前先行命中。

## 三、`--dry-run` 预检与状态核验门禁

涉及系统网络栈与 `/etc/hosts` 的改动，最忌讳“盲改后断网”。因此我在 `siteblock.py` 中贯彻了两条执行铁律：

1. **先 `--dry-run`，再实盘写入**：任何封禁、限时解封或新增直连操作，第一步必须运行 `python3 -B siteblock.py block --dry-run`，在终端清晰打印出三层即将发生的差异范围与同域冲突检查结果。
2. **内核重载与逐层核验**：当 FlClash 正在运行时，修改扩展脚本后必须触发内核状态重启以加载最新生成的规则，随后从三层分别读取实际生效状态——只有当 hosts 区块、防火墙规则与 FlClash 运行时规则表三方全部对齐时，才宣告本次网络治理操作完成。
