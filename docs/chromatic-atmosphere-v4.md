# MYZJX Chromatic Atmosphere v4 — 视觉与性能验收

## 参考研究与取舍（2026-11-14）

- [Osmo Supply / Lapa Ninja](https://www.lapa.ninja/post/osmo-supply/)：大面积橘红辉光从文字和物体后方扩散，空间不是“边缘投影”。
- [Unseen Studio](https://unseen.co/)：带方向感的光场、柔和反射与空间深度。
- [Apple WWDC25 · Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)：邻近彩色内容的光应折射/散射到侧栏、表面、阴影；材质之间要有清晰层次。
- [Apple HIG · Materials](https://developer.apple.com/design/human-interface-guidelines/materials)：侧栏使用玻璃功能层；内容层不要无限套玻璃，避免文字可读性下降。
- [Apple WWDC25 · Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/)：内容延伸到侧栏背后，层次要统一而非被不透明边界切断。

## 原版问题的工程定位

原先 2 个全屏渐变最大值分别仅 0.21 和 0.12 左右，局部卡片光晕仅约 0.22 并常态 opacity 0.64；左侧距主光源较远，经过磨砂后很难分辨变化。鼠标进入卡片只切换主色，局部亮斑不会随着指针微移，也没有不同形状的光学效果。

## 新的美术方向

1. **近场溢光**：卡片外 64–80px 的两色柔光，从 .27 静态上升到 .93，向外膨胀 1.11 倍，仍保留柔和衰减，**不是霓虹描边**。
2. **定向折射**：单独的 conic-gradient + radial mask 在 hover/focus 时扩张和缓转，形成不规则空气中的光束，不添加素材。
3. **全页环境**：两张旧有 viewport 交叉淡变层改为多点定向光场，主核从 .21 升至 .55，偏移另一朵光，同时把 0% 左边缘设为环境反射区域，使侧栏透出同源颜色。主图颜色来自本地图像 36×36 像素、视频 24×14 像素取色，不上传素材。
4. **轻量镜面反射**：只给当前 hover 卡片更新指针局部变量，不逐帧刷新全屏 canvas/WebGL；截图真实像素不变。
5. **一致性**：同心圆角几何、主题菜单修复、视频加载策略、旧私有应用均保留。即使页面无图片，环境默认存在轻量光色，减少路由跳转断层。

## 验收标准

- [ ] 1440px 桌面 WebKit：同一个卡片光晕 opacity > 0.78，折射形态 > 0.4；截图可见卡片框外的颜色变化。
- [ ] 鼠标不同位置移动时 `--sheen-x` 确实改变；不同卡片 hover 更新 `data-ambient-source`。
- [ ] 侧栏透明磨砂、页面光场 full width，且主题选择弹层完整可见。
- [ ] 390px、320px、768px 无横向溢出；低动效模式、深色模式和强对比模式不破坏导航。
- [ ] GitHub Verify PR（check、unit、Astro build、media budget）与 Safari WebKit Smoke 全部成功。
- [ ] 下载浏览器产出的真实截图并检查明暗、海报文字和卡片周围的散射。
- [ ] Vercel 预览成功，合并后生产 Vercel/Cloudflare Worker/D1 版本一致。
- [ ] 不使用额外动画依赖；只复用两张全屏交叉层；移动端关闭远场折射，减少大面积重绘。

仅 GitHub 新分支完成所有改动后**一次性提交**，验收不过先定位问题，不把失败版本推到 main。
