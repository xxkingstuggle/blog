# MYZJX 光学界面 v3 · 20 份官网设计研究

研究时间：2026-11-14。来源为 Awwwards、CSS Design Awards、CSS Winner 与真实获奖站点索引；部分案例是目录/项目截屏而非当场逐页录像，不将二手案例评价冒充实机测量。只借鉴布局方法，**不复制别人的商标、素材、动效或源代码**。

| # | 官网 / 获奖案例 | 案例链接 | 提取的设计手法 | 对 MYZJX 的取舍 |
|---|---|---|---|---|
| 01 | Milledollars | https://teasertrack.cc/websites | 视频工作室的导演感视觉 | 只做一个短循环、避免整站视频背景 |
| 02 | Jesper Landberg | https://teasertrack.cc/websites | 动态开发者作品集 | 滚动/焦点驱动，不用永久帧循环 |
| 03 | Butter | https://teasertrack.cc/websites | 多媒体时间轴视觉 | 作品内容先于装饰 |
| 04 | Meer Mohsin | https://teasertrack.cc/websites | 电影化叙事和节奏 | 图片切换驱动环境光，不做过场阻塞 |
| 05 | Gil Huybrecht | https://teasertrack.cc/websites | 精简项目导航和工作展示 | 卡片保持真正链接和文案 |
| 06 | Warm & Fuzzy | https://teasertrack.cc/websites | 强调氛围与色彩的品牌调性 | 染色要连续跨过内容/导航交界 |
| 07 | Why Zero | https://teasertrack.cc/websites | 沉浸式技术教育叙事 | 只提取分层背景，不引入 WebGL |
| 08 | Gionatan Nese '26 | https://teasertrack.cc/websites | 动态创作者档案 | 控制同时活动的媒体数量 |
| 09 | Trevor Noah | https://teasertrack.cc/websites | 不同内容类别共存的个人首页 | 软件/文章/实验使用各自构图 |
| 10 | L.I.S.A. by Locomotive | https://teasertrack.cc/websites | 高交互品牌内容组织 | 视觉变化不能影响键盘导航 |
| 11 | Bruno Simon Portfolio | https://dappasol.com/guides/award-winning-websites/ | 3D 可探索作品集 | 只参考交互乐趣，不采用 3D 引擎 |
| 12 | Shopify Renaissance Edition | https://dappasol.com/guides/award-winning-websites/ | 产品叙事与动效组合 | 动态素材当作内容，加载时仍可读 |
| 13 | Floema | https://dappasol.com/guides/award-winning-websites/ | 色彩与节奏 | 视频只控制有限采样率的光场 |
| 14 | Siena Film Foundation | https://dappasol.com/guides/award-winning-websites/ | 电影画面和标题重叠 | 给有图的文章保留文字海报形式 |
| 15 | Studio K95 | https://me.muz.li/danilodemarco/studio-k95 | 深蓝大背景和分层作品卡 | 玻璃可透光，但不挡内容可读性 |
| 16 | Stefano Bartoletti Portfolio | https://www.awwwards.com/inspiration/projects-list-stefano-bartoletti-portfolio | 项目列表与悬浮预览融合 | 参考轻量 hover，避免加载整套 3D |
| 17 | Huy Phan Vol.2 | https://www.linkedin.com/posts/cssda_website-of-the-day-10-september-2026-huy-activity-7503722877410521090-wjUa | 视频预览嵌在留白版式中 | 首页视频卡用轻封面、视频按需载入 |
| 18 | Francesco Michelini / Folio23 | https://www.awwwards.com/sites/francesco-michelini-folio23 | 低饱和主色 + 小尺寸视频窗口 | 舍弃全屏视频，聚焦媒体舞台 |
| 19 | Gabriel Veres | https://www.awwwards.com/sites/gabriel-veres | 前后叠层与空间构图 | 图片、光场、侧栏为共享光源的不同材质 |
| 20 | Gen-02 SMSY | https://www.awwwards.com/sites/gen-02-smsy-portfolio | 强霓虹反射和动态色彩 | 只在实验卡保留浓色，正文使用低对比色 |

附加参考入口：
- https://www.cssdesignawards.com/ — 2026 年 11 月优秀站点，适合检查内容/动画比例
- https://www.csswinner.com/ — 获奖站点展示，适合比对文字与多媒体平衡
- https://esirop.github.io/awwwards-sotd-index/ — 全量 SOTD 可筛选索引

## 截图故障的准确归因

1. 左栏主题菜单位于固定、高度为 100dvh 的侧栏中；该侧栏设有 \`overflow-y:auto\`，使绝对定位的菜单即使 \`z-index\` 很高也被容器切掉。**修正**：弹出菜单运行时移动到 \`body\` 下的视窗定位浮层，定位计算会在每一侧留 10px 的安全距离，关闭后返回原 DOM。
2. 背景光原本只有主内容区有视觉上的染色；左栏设置 \`background:var(--surface)\`，几乎不透明。**修正**：同一个页面光源在栏后经过，左栏是 \`backdrop-filter:blur(27px) saturate(153%)\` + 0.54 alpha 的独立玻璃，右侧以更轻的渐变延展；背景层不随页面内容滚动而被切断。
3. 早期实现有双层全屏 \`filter:blur\`，在普通笔记本/移动端会造成额外离屏合成成本。**修正**：用多层渐变自身的透明衰减代替整屏 blur，移动端降低梯度强度，减轻 GPU 消耗。
4. 视频素材只用独立、原创的 4 秒 H.264 测试片，文件约 3.2KB；封面 SVG 不失真。动态卡仅进入可视区、非省流量且非 reduced-motion 时播放；只有一个活动视频；页面隐藏/出视野时暂停。每 1.4 秒只读一次 24×14 像素，避免逐帧 readback。
5. 正文视频组件默认 \`preload="none"\`；iframe \`loading="lazy"\`。视频卡可以以后复用于文章 frontmatter 的 \`video\`/\`videoPoster\`。

## 交付验收

- [ ] \`npm run check\`、\`npm test\`、\`npm run build\` 全部通过
- [ ] 桌面 1440px：主题菜单可完整显示在可视范围，点选日/夜/跟随系统正常
- [ ] 手机 390px 和 320px：主题菜单不超屏、内容不横向溢出
- [ ] 左栏实际使用半透明背景和 backdrop-filter，光场覆盖全视窗，不出现不透明垂直墙
- [ ] 首屏视频只有海报/本地链接，不自动在 HTML 中放 \`src\` 和第三方播放器
- [ ] 原创 MP4 使用 H.264、4 秒，有实测的资源预算和解码测试
- [ ] 优先级：降低动作（reduced-motion）、省流量（saveData）、内存较低的设备不自动播放
- [ ] 不破坏已有产品、文章、私人应用中心
- [ ] 获取 WebKit 完整截图，检查桌面、手机、主题菜单、视频卡和实验详情
- [ ] Vercel 一次预览构建，完成后统一合并 main，生产 Worker 与 Vercel 同一 SHA

**解释**：这里的“折射”是基于 CSS 背景透视、模糊和色彩饱和度实现的轻量光学效果，非物理精确光线追踪，不冒称真实的光学折射。
