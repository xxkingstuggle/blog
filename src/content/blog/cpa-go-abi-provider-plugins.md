---
title: 用 Go c-shared 动态库给 CLIProxyAPI 写渠道插件（WorkBuddy / QoderWork）
pubDate: 2026-11-22
updatedDate: 2026-11-23
description: 为避免每次上游网关升级都产生代码冲突，我用 Go c-shared 与 C ABI 把 WorkBuddy 和 QoderWork 两个私有渠道抽成了独立加载的动态库插件。
kicker: GO · CGO · API GATEWAY PLUGIN
kind: project
presentation: article
tags:
  - Go
  - CGO
  - 插件架构
  - OAuth
  - CLIProxyAPI
---

我在本地用 `CLIProxyAPI` 做多模型网关时，想把腾讯的 **WorkBuddy (CodeBuddy CN)** 和阿里的 **QoderWork** 也接进来，统一暴露成标准 OpenAI / Anthropic 接口给本地工具调。

最初的办法是直接 fork 上游网关，在主仓库里硬改。但这种做法维护起来很痛苦：这两个渠道有自己私有的 OAuth 登录流、心跳续期和 SSE 响应格式，代码量不小；每次上游 `CLIProxyAPI` 发新版本，我合并代码都要解一堆冲突。

后来我干脆把这两个渠道剥离出来，建了独立的 [**cpa-plugin**](https://github.com/xxkingstuggle/cpa-plugin) 仓库，编译成 `.so` / `.dylib` 动态库挂载到网关上。

## 为什么不用 Go 原生 `plugin`，而走 C ABI？

Go 标准库自带了一个 `plugin` 包，但实际用过就知道它的限制极死：主程序和插件必须用完全相同的 Go 小版本编译，连 `go.mod` 里的公共依赖版本甚至 `GOPATH` 路径有一点不一致，加载时就会直接报 `plugin was built with a different version of package`。

为了不跟上游网关的编译环境绑死，我改用了 `go build -buildmode=c-shared`，通过 **C ABI** 暴露一套固定的 C 函数导出表：

- 宿主和插件之间只传 UTF-8 JSON 字符串指针和长度，不传任何 Go 内部结构体；
- 插件内部分配的返回字符串，由插件显式导出的 `FreeString` 函数负责释放，避免跨 CGO 边界的内存泄漏；
- 只要这套 C 函数签名不变，上游网关怎么升 Go 版本、怎么改内部依赖，我编译好的插件动态库都能直接加载。

## 插件里具体解决了哪三件事

在 `workbuddy/` 和 `qoderwork/` 两个模块里，主要处理了三块脏活：

**1. 登录态续期与并发锁**
这两个渠道都用 OAuth 登录（同时也支持在服务器环境直接传 PAT Token）。Access Token 过期很快，如果本地 Codex 并发开了几个子任务同时调接口，很容易拿着同一个即将过期的 Token 去刷新，导致后面的请求全部报 401。
所以在插件的 Token 管理层加了互斥锁：发现 Token 快过期时，只放一个协程去调刷新接口并写盘，其他并发请求等刷新完成后直接拿新 Token。

**2. 动态拉取可用模型列表**
这类助手渠道里能用哪些模型，经常随账号等级或服务端灰度变化。写死静态列表的话，上游新上了模型用不了，下线了旧模型又一直报错。插件在启动和定期刷新时，会直接调上游的枚举接口拉取当前账号真实可用的模型元数据，再映射成统一的模型 ID 暴露给网关的 `/v1/models`。

**3. 流式工具调用（SSE）格式转换**
Codex CLI 和 Claude Code 对流式返回里的 `tool_calls` 块顺序检查很严。上游渠道返回的私有流式片段里，经常把思考过程（Reasoning）、普通文本和工具调用参数混在自定义字段里。插件内部做了一个带状态的流式解析器，一边读上游分块，一边按标准 OpenAI / Anthropic SSE 规范补齐事件头和索引号，再实时刷回给网关。

## 跨平台编译

我平时在 Mac (`darwin-arm64`) 上开发，而本地网关跑在 OrbStack 的 Linux 容器里。为了让两边都能直接加载，仓库里配好了交叉编译工作流（`.github/workflows/build.yml`），每个插件独立维护 `go.mod`，每次构建同时产出 macOS 和 Linux 的动态库，本地测试生成的 Token 文件也通过 `.gitignore` 严格隔离。
