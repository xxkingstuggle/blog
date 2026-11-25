---
title: 我给 AI 装了 25 个思考方法，最后却花最大力气教它「别乱用」
pubDate: 2026-11-17
updatedDate: 2026-11-24
description: 攒了一堆第一性原理和苏格拉底提问之后，我发现选方法比解决问题还累。于是我做了思路导航 v3.0.1，让 AI 先判断普通回答够不够，够用就别硬套框架。
tags:
  - AI Agent
  - Skill
  - Codex
  - AI 协作开发
kicker: AI WORKFLOW · THOUGHT NAVIGATOR
draft: false
listed: true
featured: true
kind: project
presentation: article
cover: ../../assets/projects/thought-navigator-shot.png
---

有段时间，我特别痴迷收集各种思考方法。

什么第一性原理、双向钢人、苏格拉底式提问、逆向排雷，看到好的提示词框架我就往本地文件夹里存，觉得自己像攒了一整套武林秘籍，随时都能召唤 AI 帮我把难题拆个底朝天。

结果真到了工作中遇到棘手问题的时候，我对着那个塞得满满当当的文件夹，突然卡住了。

我到底该选哪一种方法？

<figure class="case-study-figure">
  <img src="/media/thought-navigator-v3/codex-routing-live.webp" alt="思路导航 v3.0.1 在 Codex 中的三层按需路由与 25 个思考方法目录" width="1600" height="1040" loading="lazy" decoding="async" />
  <figcaption>图 1 · 思路导航 v3.0.1 在 Codex 中的按需路由工作台：只描述真实卡点，由路由层按需加载 1 个主方法与可选 1 个辅助方法。</figcaption>
</figure>

<figure class="case-study-figure">
  <img src="/media/thought-navigator-v3/01-method-overload.svg" alt="第一性原理、双向钢人等方法不断增加，用户反而卡在该选哪个方法" width="1280" height="720" loading="lazy" decoding="async" />
  <figcaption>图 2 · 有很多方法，不代表能更快解决问题。选方法本身也有成本。</figcaption>
</figure>

方法越攒越多，挑方法本身反而成了一件最耗心神的事。我明明是想找 AI 帮我把眼前的活儿干完，最后却变成了我得先花二十分钟研究今天该翻哪本秘籍的牌子。

后来我盯着屏幕想，这事为什么不能反过来？

我只负责用大白话说清楚自己遇到了什么问题。至于要不要动用思考方法、该调哪一种、分析到哪一步就该打住，让 AI 自己去判断。

这就是我动手做 [**思路导航（Thought Navigator）**](/software/thought-navigator/) 的起点。

说真的，刚开始动手写第一版路由规则的时候，我差一点就走偏了。

那时候我犯了典型的工程师强迫症，试图给所有方法画一张精密的分类流程图。遇到 A 类问题优先调一号方法，聊完两轮再自动接力给二号方法。纸面上画出来井井有条，像一条自动化流水线。

但拿真实问题一试，瞬间就露馅了。

现实生活里的难题，哪会乖乖按你的表格分类？

你想想看，一个求职选择，往往既要澄清自己到底图什么，又要摆出两个 Offer 做残酷对比；一个软件线上故障，第一步明明是先去抓日志找证据，根本还轮不到坐在那儿搞什么「哲学级深度思考」。把死板的优先级和接力顺序焊死在规则里，最后只会让工具牵着鼻子走，为了跑完流程而硬凑字数。

想通这一点之后，我把那套死板的流程图全删了，换成了现在这套清爽的路由思路。

路由器只负责提供方法目录、调用入口和停止边界。具体选不选、怎么组合，交给模型结合眼前的任务现场决定。

而在它去翻任何方法目录之前，必须先回答灵魂深处的第一个问题，普通回答够不够解决当前问题？

如果普通回答已经够用了，那就直接说人话回答，一个方法都别调。只有当普通回答真的兜不住、确实需要某种思维脚手架去破局时，它才按需去能力目录里检索并挂载对应的 Skill 正文。

<figure class="case-study-figure">
  <img src="/media/thought-navigator-v3/02-routing-decision.svg" alt="用户提出问题后先判断普通回答是否足够，足够就直接回答，否则才查目录并读取 Skill 解决当前问题" width="1280" height="720" loading="lazy" decoding="async" />
  <figcaption>图 2 · 思路导航路由决策链路，先判断普通回答是否充分，再按需检索并挂载 Skill 正文。</figcaption>
</figure>

越往后用我越发现，这个「允许它什么都不调用」的出口，比那二十多个方法本身还要重要。

现在公开的仓库里一共放了 25 个方法入口，准确来说是 24 种不同的思考方法，外加一个为了兼容旧 ID 保留的转发入口，以及顶层那个负责分发的「思路导航」主入口。它们有的擅长给方案挑刺，有的擅长在迷茫时帮人厘清真问题，有的专门做故障诊断，还有的能把模糊的想法拆成 Agent 可以直接执行的任务书。

把这 25 个文件塞进文件夹里一点都不难，真正难的是管住 AI 那颗总想炫技的心。

为此我给它立下了几条铁律。平时普通聊天的时候，它绝对不能主动跳出来指手画脚；只有当我显式呼唤 `@思路导航` 或者明确点名时，它才开始为当前任务挑工具。就算被唤醒了，它也可以决定不用任何 Skill，绝不把一个本来两句话就能答完的简单问题强行升级成十轮苏格拉底式盘问。

在这整个迭代过程里，我自己最满意的一次修改，其实跟代码逻辑一点关系都没有。

那是有一天我看着 AI 用一套方法论给我输出了洋洋洒洒三千字的分析，排版精美、无懈可击，但我合上电脑之后发现，我眼前的现实问题连半步都没有往前推进。

那一刻我突然警醒，我又快掉进方法论的陷阱里了。

当天晚上，我把一句核心准则写进了路由器的最顶层，思考方法是工具，解决现实问题才是目的。

加了这句准则之后，模型在挑方法时就不只是看「哪个框架能套上去」，而是要先看「用了它能不能补上当前真正缺的那块拼图」。

举个我自己的真实例子。前阵子准备作品集的时候，我纠结过一个问题，要不要把手里每个个人软件都打磨到无懈可击的完全体，才敢拿出去投简历？

如果换作以前没调教过的工具，它大概率会给我套上五种决策模型，列出二十条优劣势对比表。但在现在的思路导航里，它会先帮我按住真正的现实约束，时间有限、下午还要继续推进投递、手头已有几个可运行的核心项目只是部分边角还没做完。接着它直接帮我筛出哪两项关键证据今天值得补齐，哪些锦上添花的尾巴现在根本不用管。

聊完了赶紧去干活，不制造新的焦虑，也不凭空生出一堆新任务，这才是工具该有的分寸。

<figure class="case-study-figure">
  <img src="/media/thought-navigator-v3/03-plugin-structure.svg" alt="思路导航的 Codex 插件结构，包含路由入口、能力目录、方法正文与来源记录" width="1280" height="720" loading="lazy" decoding="async" />
  <figcaption>图 3 · 思路导航 Codex 插件工程结构，包含路由入口、能力目录、方法正文与来源授权记录。</figcaption>
</figure>

回到工程实现上，思路导航是一个面向 Codex 插件机制的 Skill 路由工程，我做的工作集中在路由入口设计、按需加载的能力目录、提示词边界约束，以及处理重复入口、误触发和方法冲突上。

有一点必须坦诚交代，里面收录的这些底层思考方法并不是我原创的。整个项目是基于 [LearnPrompt/laoyeye](https://github.com/LearnPrompt/laoyeye) 开源收录的内容做的非官方 Codex 插件适配，我在仓库里完整保留了原作者的来源与授权许可说明，我的心思全都花在了怎么把它们组织成一个懂克制、知进退的路由器上。

目前项目已经打包发布了 [Thought Navigator v3.0.1 Release](https://github.com/xxkingstuggle/thought-navigator-v3/releases/tag/v3.0.1)，在 [思路导航作品页](/software/thought-navigator/) 和 [GitHub 仓库](https://github.com/xxkingstuggle/thought-navigator-v3) 里都能直接拿到完整的插件清单，也可以直接翻看里面的 [路由技能入口](https://github.com/xxkingstuggle/thought-navigator-v3/blob/main/plugin/thought-navigator/skills/thought-navigator/SKILL.md)、[能力目录](https://github.com/xxkingstuggle/thought-navigator-v3/blob/main/plugin/thought-navigator/skills/thought-navigator/references/catalog.md) 以及 [来源及许可说明](https://github.com/xxkingstuggle/thought-navigator-v3/blob/main/plugin/thought-navigator/NOTICE)。

以前我总觉得，让 AI 变强就是不停地喂给它更多工具、更多规则、更多长篇大论的上下文。做完思路导航之后，我反而越来越相信另一件事。

给 AI 划定一条清晰的任务边界，并且给它留出「判断什么时候该闭嘴停止」的余地，往往比塞给它一百个工具管用得多。
