import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('Claude-inspired iteration editorial theme is isolated to iteration page', () => {
  const layout = readFileSync('src/layouts/AdminLayout.astro','utf8');
  const page = readFileSync('src/pages/admin-shell/iteration/index.astro','utf8');
  const css = readFileSync('src/styles/iteration-editorial.css','utf8');
  assert.match(layout,/bodyClass\?: string/);
  assert.match(layout,/<body class:list=\{\["admin-body", bodyClass\]\}>/);
  assert.match(page,/bodyClass="iteration-body"/);
  assert.match(page,/styles\/iteration\.css/);
  assert.match(page,/styles\/iteration-editorial\.css/);
  assert.match(page,/id="iteration-progress-list"/);
  assert.match(page,/id="iteration-search"/);
  assert.match(page,/id="iteration-editor"/);
  assert.match(page,/id="iteration-save"/);
  assert.match(css,/body\.iteration-body\s*\{/);
  assert.match(css,/var\(--font-editorial\)/);
  assert.match(css,/:root\[data-color-mode="dark"\] body\.iteration-body/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/@media \(max-width: 760px\)/);
  assert.match(css,/\.iteration-body \.iteration-hero-art \{ display: none; \}/);
  assert.doesNotMatch(css,/https?:\/\/|personal-iteration-system\.md|P01 \|/,'the public design sheet must not embed private content or network dependencies');
});

test('editorial theme preserves progress as read-only rendered data', () => {
  const page = readFileSync('src/pages/admin-shell/iteration/index.astro','utf8');
  const wheel = readFileSync('src/scripts/iteration-wheel.ts','utf8');
  assert.match(page,/renderProgress\(payload\.files\['iteration-current\.md'\]\?\.content\|\|''\)/);
  assert.match(wheel,/parseIterationIssues\(markdown/);
  assert.match(wheel,/阅读|只(?:是|会)查看|不会改动 GitHub 记录/);
});
