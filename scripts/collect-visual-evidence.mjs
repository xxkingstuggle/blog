/**
 * MYZJX visual evidence collector.
 *
 * Run AFTER npm run build, when Playwright WebKit is installed:
 *   node scripts/collect-visual-evidence.mjs
 * Or inspect an existing preview without starting a local server:
 *   VISUAL_REVIEW_URL=https://example-preview.vercel.app node scripts/collect-visual-evidence.mjs
 *
 * This tool collects evidence, NOT an automatic aesthetic approval.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { webkit } from 'playwright';

const output = 'artifacts/visual-review';
const origin = (process.env.VISUAL_REVIEW_URL || 'http://127.0.0.1:4375').replace(/\/$/, '');
const ownsServer = !process.env.VISUAL_REVIEW_URL;
const cases = [
  { name: 'home-desktop-light', path: '/', width: 1440, height: 900, theme: 'light' },
  { name: 'home-desktop-dark', path: '/', width: 1440, height: 900, theme: 'dark' },
  { name: 'home-mobile-390-light', path: '/', width: 390, height: 844, mobile: true, theme: 'light' },
  { name: 'home-mobile-390-dark', path: '/', width: 390, height: 844, mobile: true, theme: 'dark' },
  { name: 'home-mobile-320-light', path: '/', width: 320, height: 740, mobile: true, theme: 'light' },
  { name: 'software-index-desktop', path: '/software/', width: 1440, height: 900, theme: 'light' },
  { name: 'software-detail-desktop', path: '/software/usblinkmic/', width: 1440, height: 900, theme: 'light' },
  { name: 'article-desktop', path: '/posts/thought-navigator-v3/', width: 1440, height: 900, theme: 'light' },
  { name: 'about-mobile', path: '/about/', width: 390, height: 844, mobile: true, theme: 'light' }
];

let server;
let browser;

async function waitForPreview() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server && server.exitCode !== null) throw new Error('Preview terminated unexpectedly');
    try {
      const response = await fetch(origin + '/');
      if (response.ok) return;
    } catch { /* startup or network delay */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Preview unavailable at ' + origin);
}

async function warmLazyContent(page, viewportHeight) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += Math.max(400, viewportHeight - 100)) {
    await page.evaluate(position => window.scrollTo(0, position), y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
}

async function capture(testCase) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    isMobile: Boolean(testCase.mobile),
    hasTouch: Boolean(testCase.mobile),
    reducedMotion: 'reduce',
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let result;
  try {
    const response = await page.goto(origin + testCase.path, { waitUntil: 'domcontentloaded' });
    if (!response?.ok()) throw new Error(testCase.path + ' HTTP ' + (response?.status() ?? 'no response'));
    await page.evaluate(theme => {
      document.documentElement.dataset.colorMode = theme;
    }, testCase.theme);
    await page.evaluate(() => document.fonts?.ready);
    await warmLazyContent(page, testCase.height);
    const geometry = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      brokenImages: [...document.images]
        .filter(image => image.complete && image.naturalWidth === 0)
        .map(image => image.currentSrc || image.src).slice(0, 12)
    }));
    await page.screenshot({
      path: output + '/' + testCase.name + '.png',
      fullPage: true,
      animations: 'disabled'
    });
    result = { ...testCase, ...geometry, overflow: geometry.documentWidth > geometry.viewportWidth + 4, errors };
  } finally {
    await context.close();
  }
  return result;
}

async function captureMotion() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: output, size: { width: 1440, height: 900 } }
  });
  const page = await context.newPage();
  const video = page.video();
  let failure;
  try {
    const response = await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
    if (!response?.ok()) throw new Error('Motion homepage HTTP failure');
    const card = page.locator('.gallery-card--image').first();
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    if (!box) throw new Error('Cannot locate gallery card');
    await page.mouse.move(2, 2);
    await page.waitForTimeout(180);
    await card.screenshot({ path: output + '/hover-before.png' });
    for (const fraction of [0.2, 0.4, 0.6, 0.8, 0.5]) {
      await page.mouse.move(box.x + box.width * fraction, box.y + box.height * 0.5, { steps: 6 });
      await page.waitForTimeout(130);
    }
    await card.screenshot({ path: output + '/hover-pressed.png' });
    await page.mouse.move(2, 2, { steps: 8 });
    await page.waitForTimeout(500);
    await card.screenshot({ path: output + '/hover-released.png' });
  } catch (error) {
    failure = error;
  } finally {
    await page.close();
    if (video) await video.saveAs(output + '/hover-motion.webm');
    await context.close();
  }
  if (failure) throw failure;
}

function report(results) {
  const rows = results.map(item => {
    const warnings = [
      item.overflow ? '横向溢出' : '',
      item.brokenImages.length ? '坏图 ' + item.brokenImages.length : '',
      item.errors.length ? 'JS 异常 ' + item.errors.length : ''
    ].filter(Boolean).join('；') || '未发现这三类问题';
    return '| ' + item.name + ' | ' + item.width + '×' + item.height +
      ' / ' + item.theme + ' | [截图](' + item.name + '.png) | ' + warnings + ' |';
  });
  const lines = [
    '# MYZJX 视觉验收证据（待人工审查）',
    '',
    '此报告由真实 WebKit 渲染生成；截图与视频不是设计合格证明。无需重启 Vercel 或修改线上站。',
    '',
    '| 场景 | 视口/主题 | 证据 | 自动发现 |',
    '|---|---|---|---|',
    ...rows,
    '',
    '## 鼠标交互',
    '',
    '[静止](hover-before.png) · [按压](hover-pressed.png) · [离开](hover-released.png) · [完整录像](hover-motion.webm)',
    '',
    '## 人工视觉验收（必须填写，不能由 Agent 自称通过）',
    '',
    '- [ ] 首页首屏：30 秒内能看出主要作品与作者能力，内容不重复。',
    '- [ ] 布局：横竖图比例自然，只有两层可见圆角，没有多余装饰。',
    '- [ ] 动效：指针跟随局部、按下像布面凹陷，离开正常回弹，无全局黑影或多层光效。',
    '- [ ] 节奏：标题、留白、卡片密度协调，桌面与手机都不拥挤。',
    '- [ ] 主题：亮暗模式、真实文章与软件详情页都保持清晰。',
    '- [ ] 参考对照：附选定参考图的 URL、要学的机制、实际差异与最终取舍。',
    '',
    '结论：**PENDING / 待人工审查**。自动测试绿灯不代表视觉通过。',
    '',
    '## 异常原始记录',
    '',
    '参见 [checks.json](checks.json)，其中有横向溢出、坏图和脚本异常记录。'
  ];
  writeFileSync(output + '/REVIEW.md', lines.join('\n') + '\n');
  writeFileSync(output + '/checks.json', JSON.stringify({ source: origin, cases: results }, null, 2) + '\n');
}

async function main() {
  mkdirSync(output, { recursive: true });
  if (ownsServer) {
    server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4375'], {
      stdio: 'ignore', detached: true
    });
  }
  try {
    await waitForPreview();
    browser = await webkit.launch({ headless: true });
    const results = [];
    for (const testCase of cases) results.push(await capture(testCase));
    await captureMotion();
    report(results);
    console.log('Visual evidence collected: ' + output + '/REVIEW.md');
    const warnings = results.filter(item => item.overflow || item.brokenImages.length || item.errors.length);
    if (warnings.length) console.warn(warnings.length + ' scenes have possible issues; inspect checks.json');
  } finally {
    await browser?.close();
    if (server?.pid) {
      try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
