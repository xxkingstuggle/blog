---
title: 在 Mac 上光改 hosts 根本戒不掉摸鱼网站，我写了个脚本把三层网络通道全焊死了
pubDate: 2026-10-27
updatedDate: 2026-11-24
description: 装了 FlClash 代理或开了浏览器 DoH 之后，往 /etc/hosts 里写 127.0.0.1 十有八九是摆设。我写了个 Python 脚本，一条命令同时同步 hosts、Little Snitch 和 FlClash 顶层规则。
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

坐在 Mac 前面专心写代码的时候，我经常有两个特别实在的网络控制需求。

第一个需求是防自己手欠。干活干到烧脑的地方，手指头会不自觉地在浏览器里敲出那几个容易分心的社区或视频网站。我想在干活期间把它们彻底掐断，或者最多只允许临时解封 15 分钟，一到点就自动给我封回去。

第二个需求刚好反过来。遇到某些特定的国内 CDN 或者对延迟极其敏感的工作域名，我需要把它们强制置顶设成直连（`DIRECT`），千万别让代理软件里那几万条通用规则集给误抓过去绕远路。

你要是去网上搜「Mac 怎么屏蔽某个网站」，十篇教程里有九篇半都会轻描淡写地教你一句，打开终端，去 `/etc/hosts` 文件里加一行 `127.0.0.1 域名` 不就行了？

说真的，写这种教程的人八成平时电脑上既不开代理客户端，也不用现代浏览器的加密 DNS。

在我自己这台常年跑着 FlClash 的 Mac 上，往 `/etc/hosts` 里加一行 `127.0.0.1`，保存完切回浏览器一刷新，那个本该被屏蔽的网站照样秒开，跟无事发生一样。

为啥传承了几十年的 `/etc/hosts` 大法，在现在的 macOS 上突然不管用了呢？

因为在一台装了代理软件和现代浏览器的 Mac 上，一个网络请求从发出到落地，可能会走三条完全不同的暗道。我把这三条路摊开来对比一下，你就明白漏洞出在哪儿了。

| 请求走的路径 | 单改 `/etc/hosts` 管用吗？ | 为什么会漏过去 |
|---|---|---|
| 走系统默认 DNS 的普通直连 | 写全 IPv4 + IPv6 才管用 | 很多人只写了 `127.0.0.1` 忘了写 `::1`，支持 IPv6 的浏览器拿到 AAAA 记录照样能连上 |
| 走 FlClash 系统代理或 TUN 虚拟网卡 | 基本失效 | 代理内核（Fake-IP 或远端 DNS 解析）直接把域名接管了，根本不看本机的 `/etc/hosts` |
| 开了浏览器私有 DoH 或应用自带解析 | 完全失效 | 绕过了系统 `mDNSResponder`，必须在应用防火墙出站层按域名拦截 |

你看，只要你的电脑开着 FlClash 的系统代理或者 TUN 模式，代理内核直接用 Fake-IP 或者远端 DNS 把域名接管走了，根本不稀罕看你本机的 `/etc/hosts`。哪怕你把代理关了，只要浏览器自己开了 DoH（DNS over HTTPS），它也会绕过系统的 `mDNSResponder` 直接出去。

想明白这一点之后，结论就很清楚了。要想让一条封禁规则不管我当时开没开代理、用什么浏览器都百分百焊死，就必须把 `/etc/hosts`、应用防火墙 `Little Snitch` 和 `FlClash 扩展脚本` 这三道闸门同时落下。

但如果每次想封个网站或者加个直连域名，都要我手动去改系统文件、点开 Little Snitch 界面、再去改 Clash 的配置脚本，那还没等改完，我干活的兴致早就没了。

所以我干脆写了一个叫 `siteblock.py` 的 Python 脚本，并把它封装成了我自己电脑上的 `three-layer-site-block` 本地技能，一条命令同时接管这三层。

当你把一组域名丢给 `siteblock.py` 的时候，它会按同一份真实清单，一口气把三处配置全刷齐。

第一刀先落在本机的 `/etc/hosts` 上。脚本绝不会去乱动你原有的系统 hosts 配置，它只认 `# BEGIN SITEBLOCK` 和 `# END SITEBLOCK` 这两行注释标记之间的专属区块。列表里的每个域名以及对应的 `www.` 子域，都会成双成对地写上 IPv4 的 `127.0.0.1` 和 IPv6 的 `::1`，堵死 IPv6 偷跑的口子。写完文件的下一秒，自动调起 `dscacheutil -flushcache` 和 `killall -HUP mDNSResponder`，把系统残留的 DNS 缓存刷得干干净净。

第二刀紧接着落到 `Little Snitch` 的出站防火墙规则上。这一层专门用来收拾那些不走系统代理、也不读本机 DNS 的浏览器私有 DoH 和后台守护进程。脚本会在 Little Snitch 里给目标域名配上全局的出站拒绝（Outbound Deny）规则，只要任何进程敢往这个域名发包，在 macOS 网络扩展层就会被直接掐断。而且我还加了个贴心的细节，当哪天我把封禁列表清空时，脚本会自动把那条变空的 Little Snitch 规则禁用掉，免得防火墙因为空规则弹框出来烦人。

第三刀则直接插进 `FlClash` 的扩展覆写脚本（Override Script）最顶层。脚本会自动扫描 `~/Library/Application Support/com.follow.clash/profiles/` 目录下的配置脚本，把 `DOMAIN-SUFFIX,<domain>,REJECT` 强行插到规则数组的最头部；如果我这次执行的是加直连白名单，它就把域名写进 `directSuffixes`，在最顶层生成 `DOMAIN-SUFFIX,<domain>,DIRECT`。这样一来，流量还没来得及掉进底下那几万条复杂的 GeoSite 规则海里，在第一行就已经被精准命中了。

当然，动底层网络配置最怕一件事，就是手滑改错一个参数把整台电脑搞断网，或者同一个域名昨天刚塞进 `REJECT` 黑名单、今天又手误加进 `DIRECT` 白名单导致两边打架。

为了不给自己挖坑，我给 `siteblock.py` 加上了严格的 `--dry-run` 预检和跨层冲突校验。每次真正写盘之前，先跑一遍 `python3 -B siteblock.py block --dry-run`，脚本会把三层即将增删的条目和冲突检查结果清清楚楚列出来。确认无误正式写入后，如果它检测到 FlClash 正在后台运行，还会自动触发内核热重载，最后再从三层配置文件里把实际生效的规则重新读回来做一次三方对账。

自从把这套三层联动脚本跑顺之后，不管是想专注写代码时一键断掉干扰源，还是给常用开发服务开直连绿灯，敲一行命令就能在两秒钟之内彻底搞定，再也不用跟失效的 `/etc/hosts` 生闷气了。
