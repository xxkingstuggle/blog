# MYZJX｜视觉工程审计基线（2026-11-18）

## 这次要解决的真正问题

不是单独把鼠标按压卡片调好，而是：官网总体动效缺少统一语言，页面视觉层次弱，历史 CSS 层叠让 Agent 不断用补丁覆盖补丁。

本轮是**质量体系试点**，不是视觉重设计稿。现在不要用更多动画掩盖原有问题，也不要把参考网站的品牌和素材照搬到 MYZJX。

## 已核对的代码事实

- `src/styles/global.css` 同时引入 **15 份**全站 CSS，总约 **5,620 行**；整个 `src/styles/` 有 **23 份 CSS、约 9,494 行**。
- `src/styles/` 存在 **111 处** `!important`。
- 解析全局样式后，有约 **352 组相同选择器与 CSS 属性在不同文件重复出现**。这里未区分媒体查询和状态覆盖，因此只是**待人工审计的候选，不等于 352 个错误**。
- 例如 `.front-body .studio-side-rail` 的 `background` 在 `godly.css`、`godly-fidelity.css`、`optical-system.css`、`chromatic-atmosphere.css` 中均有定义。需要逐项识别生效条件和最终归属。
- `src/styles/cloth-media.css` 曾定义卡片 `::after` 渐变光斑，又在文件尾用 `content:none!important` / `display:none!important` 将其禁用。这一段可确定为无用的设计遗留，已在沙盒中移除约 40 行。

## 实际首屏审查（1440 × 900 截图）

MYZJX 的当前首页：
- 主标题较小、进入作品网格很快，读者难以在第一眼形成清楚的视觉主次；
- 各卡片具有相近的视觉权重，渐变装饰与实际软件截图混在一起，作品辨识度不够集中；
- 目前不能从静态截图判断「整站动效是否高级」，必须同时检查进入、滚动、筛选、悬停、离开、页面切换的时序。

参照样本（已在同样 1440 × 900 的 Chromium 浏览器截取首屏，只用于审查，不纳入生产素材）：
- [Linear](https://linear.app/)：重点借鉴主标题、真实产品画面和留白建立的信息层级，不复制深色背景或它的品牌；
- [Osmo](https://www.osmo.supply/)：重点研究动效围绕真实内容和可操作对象展开的机制，不是简单给元素增加阴影或缩放；
- [Godly](https://godly.design/sites/)：作为索引，逐个挑选**有具体交互行为可观察**的样本，不能从图库批量复制样式。

这里的观察是本轮**初步视觉诊断**，尚未得到用户对新设计方向的最终确认。

## 从 Lauren Tan 的五层信任到 MYZJX

1. **结构：先确定每种动效谁负责。** 导航反馈、作品卡片、滚动叙事、页面切换和画面氛围分别有单一实现入口；迁移完成后清理失效 CSS/JS，不能再叠加一层覆盖文件。
2. **硬检查：自动拦截已知坏味道。** `scripts/verify-visual-architecture.mjs` 在 CI 运行，阻止未审查的新全局 CSS 层、`!important` 继续增长、旧全局鼠标光斑重生、多处全局指针监听和减少动态效果回退被删。
3. **沙盒取证：** `myzjx-dev` 只作为临时工程环境，在本地构建基础上采集桌面/手机和暗/亮主题截图、鼠标录像、首页滚动/筛选/跨页面录像；不能把取证等于质量通过。沙盒 Ubuntu 26.04 不能原生匹配 Playwright WebKit，已采用 Chromium 兼容回退，WebKit 继续留给 GitHub Actions（Ubuntu 24.04）。
4. **样本找茬：** 参考图与实测图要对应同一视口和实际交互时序，评价具体差距：信息优先级、动画因果关系、速度/回弹、节制、使用真实性、性能。优先讨论问题，不急于改代码。
5. **集中验收：** 在沙盒中完成修改、构建、证据检查后一次性通过 GitHub 更新分支；Draft PR 的 CI 与视觉证据通过、用户批准审美后才考虑合并 `main`。不要逐文件 push 或反复生产构建。

## 仍未完成的关键步骤

- 逐层合并 `godly*`、`glass*`、`ambient*` 等历史设计，不可凭文件名删整包，必须每一批提供前后截图、运行行为及回归测试。
- 选定**一个整站动效方向**，形成 2–3 个实测设计版本并由用户选择，再让自动测试冻结选定方案。
- 视觉主观判断目前依然需要人，不能声称 AI 自动理解「高级感」。

## 检查和本次交付

```bash
node scripts/verify-visual-architecture.mjs
npm run check
npm test
npm run build
VISUAL_BROWSER=chromium PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 node scripts/collect-visual-evidence.mjs
```

参考证据保存在沙盒的 `artifacts/visual-review/`（临时，不提交）；提交 PR 后 WebKit CI 也会保存截图/录像供验收。

