import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseIterationIssues, parseIterationRelationships, buildIterationTree } from '../../src/scripts/iteration-wheel.ts';

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


test('relationship table builds a nested issue chain without flattening the four phase cycles', () => {
  const markdown = [
    '## 问题关系（供画板读取）',
    '| 编号 | 父问题 | 问题链 | 焦点 |',
    '|---|---|---|---|',
    '| P01 | — | Alpha chain | |',
    '| P07 | P01 | Alpha chain | |',
    '| P08 | P07 | Alpha chain | 当前 |',
    '| P02 | — | Beta chain | |',
    '## 当前各问题',
    '| 编号 | 要解决什么 | 当前阶段 | 当前真实进度 | 下次关注 |',
    '|---|---|---|---|---|',
    '| P01 | Root task | 办法 | Proposal recorded | Try it |',
    '| P07 | Execution obstacle | 行动 | Trial scheduled | Report result |',
    '| P08 | Underlying obstacle | 问题 | Need to investigate | Pick an experiment |',
    '| P02 | Separate task | 反馈 | Feedback arrived | Review it |',
  ].join('\n');
  const links = parseIterationRelationships(markdown);
  assert.equal(links.length, 4);
  assert.equal(links[2].parentId, 'P07');
  assert.equal(links[2].isFocus, true);
  const groups = buildIterationTree(markdown);
  assert.deepEqual(groups.map(group => group.name), ['Alpha chain', 'Beta chain']);
  const root = groups[0].roots[0];
  assert.equal(root.id, 'P01');
  assert.equal(root.phase, '办法');
  assert.equal(root.children[0].id, 'P07');
  assert.equal(root.children[0].phase, '行动');
  assert.equal(root.children[0].children[0].id, 'P08');
  assert.equal(root.children[0].children[0].phase, '问题');
  assert.equal(root.children[0].children[0].depth, 2);
  assert.equal(root.children[0].children[0].isFocus, true);
  assert.equal(groups[1].roots[0].id, 'P02');
});

test('missing, cross-category and circular parent references do not drop issues', () => {
  const md = [
    '## 问题关系（供画板读取）',
    '| P01 | P02 | A | 当前 |',
    '| P02 | P01 | A | |',
    '| P03 | P99 | B | |',
    '| P04 | P01 | B | |',
    '## 当前各问题',
    '| P01 | One | 问题 | Recorded | Next |',
    '| P02 | Two | 办法 | Recorded | Next |',
    '| P03 | Three | 行动 | Recorded | Next |',
    '| P04 | Four | 反馈 | Recorded | Next |'
  ].join('\n');
  const groups = buildIterationTree(md);
  const ids: string[] = [];
  function visit(node: typeof groups[number]['roots'][number]) {
    ids.push(node.id);
    node.children.forEach(visit);
  }
  groups.forEach(group => group.roots.forEach(visit));
  assert.deepEqual([...ids].sort(), ['P01','P02','P03','P04']);
  assert.equal(ids.length, new Set(ids).size, 'no issue should be duplicated');
});

test('nested UI includes navigable chain path, sibling folding and independent orbits', () => {
  const ui = readFileSync('src/scripts/iteration-wheel.ts', 'utf8');
  const css = readFileSync('src/styles/iteration-editorial.css', 'utf8');
  assert.match(ui, /iteration-tree-children/);
  assert.match(ui, /iteration-tree-fold/);
  assert.match(ui, /iteration-tree-trail-link/);
  assert.match(ui, /makeDetails\(issue\)/);
  assert.match(ui, /aria-controls/);
  assert.match(css, /\.iteration-body \.iteration-tree-children\[hidden\]/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(ui, /日夜颠倒|等.*感觉|P08.*等待/);
});
