import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseIterationIssues, parseIterationIssueTree } from '../../src/scripts/iteration-wheel.ts';

test('five-column live Markdown drives the authoritative issue phase', () => {
  const md = [
    '| 编号 | 要解决什么 | 当前阶段 | 当前真实进度 | 下次关注 |',
    '|---|---|---|---|---|',
    '| P01 | 休息被拖延 | 行动 | 用户安排九点十分享受休息，尚未验证 | 真的离开电脑了吗 |',
    '| P02 | 记得任务 | 反馈 | 提醒已经设置，结果未知 | 提醒有效吗 |',
    '| P03 | 岗位调查 | 办法 | 有若干候选研究计划 | 采用哪个办法 |',
  ].join('\n');
  const records = parseIterationIssues(md);
  assert.equal(records.length, 3);
  assert.deepEqual(records.map(i => i.phase), ['行动','反馈','办法']);
  assert.equal(records[0].next, '真的离开电脑了吗');
  assert.equal(records[1].progress, '提醒已经设置，结果未知');
});

test('no fabricated position when phase is absent, invalid, or old four-column table is used', () => {
  const md = [
    '| P01 | 休息 | 行动结束 | 做了什么未知 | 以后再说 |',
    '| P02 | 岗位 | 正在调研 | 先看五个岗位 | 谁来执行 |',
    '| P03 | 迷惑 | 没有说明阶段 | 之后再聊 |',
    '| P01 | 重复 | 行动 | 不应该展示 | 忽略 |'
  ].join('\n');
  const records = parseIterationIssues(md);
  assert.deepEqual(records.map(r=>r.phase),[null, null, null]);
  assert.equal(records.length, 3);
  assert.equal(records[2].progress, '没有说明阶段');
});

test('interactive UI source includes disclosure, orbit inspect and reduced motion', () => {
  const page = readFileSync('src/pages/admin-shell/iteration/index.astro','utf8');
  const ts = readFileSync('src/scripts/iteration-wheel.ts','utf8');
  const css = readFileSync('src/styles/iteration.css','utf8');
  assert.match(page, /id="iteration-progress-list"/);
  assert.match(page, /data-iteration-filter="反馈"/);
  assert.match(page, /mountIssueBoard/);
  assert.match(ts, /aria-expanded/);
  assert.match(ts, /aria-pressed/);
  assert.match(ts, /aria-controls/);
  assert.match(ts, /iteration-orbit-pointer/);
  assert.match(ts, /function awakenOrbit/);
  assert.match(ts, /idx < 0/);
  assert.match(ts, /不(?:会|要)修改问题的实际进度/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /iteration-orbit-spin/);
  assert.match(css, /iteration-issue-details\[hidden\]\s*\{\s*display:\s*none/);
});

test('private Markdown problem tree retains parent chain and independent phase cycles', () => {
  const md = [
    '## 当前问题链（树形结构）',
    '```text',
    '作息与行动切换',
    '└─ P01 总问题',
    '   ├─ P07 如何准时上床',
    '   │  └─ P08 为什么总在等某种感觉',
    '   └─ P09 其他实际卡点',
    '```',
    '## 当前各问题',
    '| 编号 | 要解决什么 | 当前阶段 | 当前真实进度 | 下次关注 |',
    '|---|---|---|---|---|',
    '| P01 | 总问题 | 办法 | 已选办法待实测 | 有效果吗 |',
    '| P07 | 子问题 | 行动 | 准备开始尝试 | 有没有真的行动 |',
    '| P08 | 底层问题 | 问题 | 最近才发现 | 当前卡在哪里 |',
    '| P09 | 并列子问题 | 反馈 | 有初步反馈 | 是否保留 |'
  ].join('\n');
  assert.deepEqual(parseIterationIssueTree(md), [
    { id: 'P01', parentId: null, chain: '作息与行动切换', depth: 0 },
    { id: 'P07', parentId: 'P01', chain: '作息与行动切换', depth: 1 },
    { id: 'P08', parentId: 'P07', chain: '作息与行动切换', depth: 2 },
    { id: 'P09', parentId: 'P01', chain: '作息与行动切换', depth: 1 }
  ]);
  assert.deepEqual(parseIterationIssues(md).map(x => x.phase), ['办法', '行动', '问题', '反馈']);
});

test('legacy Markdown without a tree remains valid and does not invent parent links', () => {
  assert.deepEqual(parseIterationIssueTree('| P01 | 休息 | 行动 | 已开始 | 反馈 |'), []);
});

test('hierarchical UI is read-only, has child controls and preserves visible ancestors during filtering', () => {
  const ts = readFileSync('src/scripts/iteration-wheel.ts', 'utf8');
  const css = readFileSync('src/styles/iteration-editorial.css', 'utf8');
  assert.match(ts, /parseIterationIssueTree\(markdown\)/);
  assert.match(ts, /iteration-tree-children/);
  assert.match(ts, /included\.add\(ancestor\)/);
  assert.match(ts, /aria-controls/);
  assert.match(ts, /aria-expanded/);
  assert.match(ts, /inTree/);
  assert.match(css, /\.iteration-tree-children\[hidden\]/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
