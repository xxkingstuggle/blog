# xingx.cc.cd

个人发布站。把想法，做成可以被看见的东西。

- **首页体验**：全屏原生 Canvas 2D 生成式光场 Hero、重点发布展台、分类发布索引、精选项目与关于区域。
- **发布体系**：统一索引分类（`thought` 思考、`project` 项目、`update` 近况），支持双模板渲染外壳：
  - `article`：通用长文模板（TOC Rail、阅读进度条、标准正文排版）
  - `feature`：独立发布页外壳（沉浸式 Hero、大幅媒体破框、专属交互组件）
- **视觉系统**：墨黑（`#111310`）、暖白纸感（`#F2F0E9`）与荧光绿（`#B6FF3B`）；Hero 恒深色（`#080A08`），正文自动适配系统浅色/深色主题。
- **交互组件**：重点发布《允许不舒服存在，然后去做真正重要的事》包含“Noise → Signal”相变场交互模拟（`FrictionField`）。

---

## 🛠 技术架构

- **框架**：[Astro 7](https://astro.build/) (静态生成 `output: "static"`)
- **富媒体内容**：`@astrojs/mdx` 官方集成（支持标准 Markdown 与交互式 MDX 组件）
- **类型安全**：TypeScript + Astro Content Layer Schema
- **首屏动效**：原生 Canvas 2D（响应光标与滚动速度；设备像素比限制；移出视口休眠；移动端粒子降级；`prefers-reduced-motion` 静态降级）
- **样式方案**：CSS 变量设计令牌（Tokens）、模块化原生 CSS 架构

---

## 📁 核心目录结构

```text
src/
├── assets/
│   └── demo/                 # 电影感抽象材质图 (液体玻璃、张力微距、信号晶格)
├── components/
│   ├── ArticleRow.astro      # 横向发布行 (编号、分类徽标、标题、摘要、元数据)
│   ├── SiteHeader.astro      # 动态毛玻璃透明顶栏 (自适应深色 Hero)
│   ├── SiteFooter.astro      # 极简页脚与次级导航 (归档、标签、RSS)
│   ├── article/
│   │   ├── ArticleMedia.astro    # 多档宽度媒体组件 (content / wide / full)
│   │   ├── ArticleRail.astro     # 粘性章节目录 (TOC) 与视口高亮
│   │   ├── ArticleTemplate.astro # 通用长文页面模板
│   │   ├── FeatureTemplate.astro # 独立产品式发布页模板
│   │   ├── NextArticle.astro     # 下一篇阅读导引卡片
│   │   ├── PullQuote.astro       # 衬线杂志拉引语
│   │   └── VideoEmbed.astro      # 响应式视频与演示容器
│   ├── demo/
│   │   └── FrictionField.astro   # "Noise → Signal" 交互式相变演示器
│   └── home/
│       ├── EditorialIndex.astro  # 首页最新发布专栏
│       ├── FeaturedStory.astro   # 首页重点发布展台
│       ├── HomeAbout.astro       # 个人简介与理念
│       ├── HomeHero.astro        # Canvas 2D 交互光场 Hero
│       └── HomeProjects.astro    # 项目精选展台
├── content/
│   └── blog/
│       ├── allow-discomfort.mdx  # 重点发布 (kind: thought, presentation: feature)
│       └── hello-world.md        # 近况记录 (kind: update, presentation: article)
├── data/
│   └── projects.ts           # 个人项目数据源
├── layouts/
│   └── BaseLayout.astro      # 基础骨架 (支持社交分享卡片与语义化 Meta)
├── lib/
│   └── posts.ts              # 内容查询与分类工具函数
└── styles/
    ├── tokens.css            # 色彩、字体、度量与响应式令牌
    ├── base.css              # 重置、基础字级排版与容器防溢出
    ├── components.css        # 顶栏、页脚、发布行样式
    ├── home.css              # 首页各模块版式与响应式栅格
    ├── article.css           # 文章内文、媒体溢出与阅读进度条
    ├── motion.css            # 动效与减弱动态可访问性
    └── global.css            # 样式总入口
```

---

## 🚀 本地开发与构建

根据 `AGENTS.md` 规范，启动开发服务器时请使用后台模式：

```bash
# 启动开发服务器 (后台模式)
astro dev --background

# 查看状态与日志
astro dev status
astro dev logs

# 停止服务器
astro dev stop
```

静态检查与构建：

```bash
# 类型检查
npx astro check

# 静态生产构建 (输出至 dist/)
npm run build

# 本地静态预览
npm run preview
```
