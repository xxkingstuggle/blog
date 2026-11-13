/**
 * Real WebKit smoke test for the protected iteration UI (using mocked API only).
 * Run after npm run build, with playwright installed in the CI job.
 * No access to the user's GitHub private data or live production login.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { webkit } from 'playwright';

const origin = 'http://127.0.0.1:4372';
const md = [
  '## 当前问题链（WebKit 测试）',
  '```text',
  '测试问题链',
  '└─ P01 示例主问题',
  '   └─ P01.1 示例执行障碍',
  '      └─ P01.1.1 示例底层障碍',
  '```',
  '## 当前各问题',
  '| 编号 | 要解决什么 | 当前阶段 | 当前真实进度 | 下次关注 |',
  '|---|---|---|---|---|',
  '| P01 | 示例：主问题 | 行动 | 已制定行动计划，尚未反馈 | 是否执行？ |',
  '| P02 | 示例：提醒 | 反馈 | 已设置提醒，效果尚未报告 | 提醒是否有帮助？ |',
  '| P01.1 | 示例：执行条件 | 办法 | 新方法尚未验证 | 是否完成第一步 |',
  '| P01.1.1 | 示例：具体卡点 | 问题 | 需要具体反馈的障碍 | 下一步怎么办 |',
  '## 问题关系（供画板读取）',
  '| 编号 | 父问题 | 问题链 | 焦点 |',
  '|---|---|---|---|',
  '| P01 | — | 测试问题链 | |',
  '| P01.1 | P01 | 测试问题链 | |',
  '| P01.1.1 | P01.1 | 测试问题链 | 当前 |',
  '| P02 | — | 独立实验 | |',
].join('\n');
const fakeSha = 'a'.repeat(40);
const files = Object.fromEntries(
  ['iteration-current.md', 'personal-iteration-system.md', 'iteration-methods.md', 'START-HERE.md']
    .map(name => [name, { content: name === 'iteration-current.md' ? md : '# 测试数据', sha: fakeSha }])
);

const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4372'], {
  stdio: ['ignore', 'pipe', 'pipe'], detached: true
});
let output = '';
server.stdout.on('data', data => { output += String(data).slice(0, 4000); });
server.stderr.on('data', data => { output += String(data).slice(0, 4000); });
let browser;
async function waitForServer() {
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw new Error('Astro preview exited: ' + output);
    try {
      const response = await fetch(origin + '/admin-shell/iteration/');
      if (response.ok) return;
    } catch { /* keep polling */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Astro preview did not start: ' + output);
}
async function prepare(page) {
  await page.route('**/api/admin/session', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'test-token' })
  }));
  await page.route('**/api/admin/iteration/files', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ repository: 'unit-test/private-only', branch: 'main', directory: '', files })
  }));
  await page.goto(origin + '/admin-shell/iteration/', { waitUntil: 'networkidle' });
  await page.locator('.iteration-issue-card').first().waitFor();
}
async function run() {
  await waitForServer();
  browser = await webkit.launch({ headless: true });

  // macOS-style Safari WebKit behavior: expansion, phase animation, inspection and filtering.
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  await prepare(desktop);
  mkdirSync('artifacts', { recursive: true });
  await desktop.screenshot({ path: 'artifacts/iteration-editorial-desktop.png', fullPage: true });
  assert.equal(await desktop.locator('.iteration-issue-card').count(), 4);
  assert.equal(await desktop.locator('.iteration-chain-group').count(), 2);
  assert.equal(await desktop.locator('.iteration-tree-node[data-tree-parent="P01.1"]').count(), 1);
  assert.equal(await desktop.locator('.iteration-tree-focus').count(), 1);
  const heroDesign = await desktop.locator('.iteration-hero-disc-center').evaluate(el => ({
    size: parseFloat(getComputedStyle(el).fontSize),
    caption: getComputedStyle(document.querySelector('.iteration-hero-art-caption')).display,
    linkColor: getComputedStyle(document.querySelector('.iteration-hero-action')).color,
    linkChildColor: getComputedStyle(document.querySelector('.iteration-hero-action span')).color,
    searchLabelWidth: getComputedStyle(document.querySelector('.iteration-search-wrap .sr-only')).width
  }));
  assert.ok(heroDesign.size >= 95, 'hero center glyph should be large');
  assert.equal(heroDesign.caption, 'flex', 'hero caption must stay horizontal');
  assert.equal(heroDesign.linkColor, heroDesign.linkChildColor, 'CTA text must inherit readable contrast');
  assert.equal(heroDesign.searchLabelWidth, '1px', 'accessible search label must stay visually hidden');
  // The child tree preserves its ancestry through collapse and filtering.
  const branch = desktop.locator('.iteration-tree-node[data-tree-depth="0"]').filter({ has: desktop.locator('[data-issue-id="P01"]') }).first().locator(':scope > .iteration-tree-branch > .iteration-tree-toggle');
  await branch.click();
  assert.equal(await desktop.locator('[data-issue-id="P01.1.1"]').count(), 0);
  await branch.click();
  assert.equal(await desktop.locator('[data-issue-id="P01.1.1"]').count(), 1);
  await desktop.locator('#iteration-search').fill('P01.1.1');
  assert.equal(await desktop.locator('.iteration-issue-card').count(), 3);
  assert.equal(await desktop.locator('[data-issue-id="P01"] .iteration-issue-phase').textContent(), '行动');
  await desktop.locator('#iteration-search').fill('');
  assert.equal(await desktop.locator('#iteration-records').evaluate(el => el.open), false);
  const card = desktop.locator('[data-issue-id="P01"]');
  await card.locator('.iteration-issue-trigger').click();
  await card.locator('.iteration-orbit-center-phase').waitFor({ state: 'visible' });
  assert.equal(await card.locator('.iteration-orbit-center-phase').textContent(), '行动');
  await desktop.waitForTimeout(1250);
  const pointerState = await card.locator('.iteration-orbit-pointer').evaluate(element => ({
    target: element.style.getPropertyValue('--orbit-turn'),
    transform: getComputedStyle(element).transform
  }));
  assert.equal(pointerState.target, '180deg');
  assert.notEqual(pointerState.transform, 'none');
  await card.locator('.iteration-orbit-step[data-orbit-position="3"]').click();
  assert.match(await card.locator('.iteration-orbit-inspection-title').textContent(), /查看 · 反馈/);
  assert.equal(await card.locator('.iteration-orbit-center-phase').textContent(), '行动',
    'Inspecting another step must not rewrite actual phase');
  await card.locator('.iteration-issue-details').screenshot({ path: 'artifacts/iteration-editorial-orbit-desktop.png' });
  await card.locator('.iteration-detail-edit').click();
  assert.equal(await desktop.locator('#iteration-records').evaluate(el => el.open), true,
    'Edit issue should reveal the collapsed Markdown archive');
  await desktop.locator('[data-iteration-filter="反馈"]').click();
  assert.equal(await desktop.locator('.iteration-issue-card').count(), 1);
  assert.equal(await desktop.locator('.iteration-issue-card').getAttribute('data-issue-id'), 'P02');

  // iPhone-style Safari: no <16px input zoom, reachable touch targets and reduced-motion.
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'reduce'
  });
  await prepare(mobile);
  await mobile.screenshot({ path: 'artifacts/iteration-editorial-mobile.png', fullPage: true });
  const mobileArt = await mobile.locator('.iteration-hero-art')
    .evaluate(el => getComputedStyle(el).display);
  assert.equal(mobileArt, 'none', 'mobile hero art should not displace the work list');
  const inputSize = await mobile.locator('#iteration-search').evaluate(element => getComputedStyle(element).fontSize);
  const editorSize = await mobile.locator('#iteration-editor').evaluate(element => getComputedStyle(element).fontSize);
  assert.ok(parseFloat(inputSize) >= 16, 'iPhone Safari focus would otherwise zoom search field');
  assert.ok(parseFloat(editorSize) >= 16, 'iPhone Safari focus would otherwise zoom editor');
  const bottomCard = await mobile.locator('[data-issue-id="P01.1.1"]').boundingBox();
  assert.ok(bottomCard && bottomCard.x >= 0 && bottomCard.x + bottomCard.width <= 390, 'nested tree must fit iPhone width');
  await mobile.locator('[data-issue-id="P01"] .iteration-issue-trigger').click();
  const orbit = mobile.locator('[data-issue-id="P01"]');
  await orbit.locator('.iteration-orbit-step').first().waitFor({ state: 'visible' });
  await orbit.screenshot({ path: 'artifacts/iteration-editorial-orbit-mobile.png' });
  const touchHeight = await orbit.locator('.iteration-orbit-step').first()
    .evaluate(element => parseFloat(getComputedStyle(element).minHeight));
  assert.ok(touchHeight >= 44, 'mobile orbit touch targets should be at least 44px high');
  const mask = await orbit.locator('.iteration-orbit-ambient')
    .evaluate(element => getComputedStyle(element).webkitMaskImage || getComputedStyle(element).maskImage);
  assert.notEqual(mask, 'none', 'Safari masked ring should render');
  assert.equal(await orbit.locator('.iteration-orbit-ambient')
    .evaluate(element => getComputedStyle(element).animationName), 'none');
  assert.equal(await orbit.locator('.iteration-orbit-pointer')
    .evaluate(element => element.style.getPropertyValue('--orbit-turn')), '180deg');

  console.log('WebKit smoke PASS: orbit, phase, filter, mask, touch targets, zoom and reduced motion');
}
try {
  await run();
} finally {
  await browser?.close();
  // Terminate the whole npm -> astro subprocess group; otherwise GitHub CI
  // can stay alive with preview's inherited stdout/stderr still open.
  if (server.pid) {
    try { process.kill(-server.pid, 'SIGTERM'); }
    catch { server.kill('SIGTERM'); }
  }
}
