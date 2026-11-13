/**
 * The problem navigator is deliberately driven by the private Markdown table.
 * Rendering is read-only: inspecting a step never changes the stored phase.
 * Only a saved edit to iteration-current.md changes the authoritative state.
 */
export const PHASES = ['问题', '办法', '行动', '反馈'] as const;
export type Phase = typeof PHASES[number];
export interface IterationIssue {
  id: string;
  title: string;
  phase: Phase | null;
  progress: string;
  next: string;
}
const descriptions = [
  '把想改变的现状和期待说清楚。先确认问题，不急着给自己下结论。',
  '选择一条具体的、能试的办法，并约定以后怎么判断是否有效。',
  '把办法拿到现实中执行。还没实际发生的事，不能写成完成。',
  '带回实际结果和感受，决定保留、调整、暂停或重新开始。'
];
const shortDescriptions = ['明确问题', '确定办法', '实际行动', '收集反馈'];
const svgNS = 'http://www.w3.org/2000/svg';
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className = '', text = ''
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
export function parseIterationIssues(markdown: string): IterationIssue[] {
  const issues: IterationIssue[] = [];
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    if (!/^\|\s*P\d{2}\s*\|/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(x => x.trim());
    if (cells.length !== 4 && cells.length !== 5) continue;
    const [id, title] = cells;
    const namedPhase = cells.length === 5 ? cells[2] : '';
    const phase = (PHASES as readonly string[]).includes(namedPhase) ? namedPhase as Phase : null;
    const progress = cells.length === 5 ? cells[3] : cells[2];
    const next = cells.length === 5 ? cells[4] : cells[3];
    if (!title || !progress || !next || issues.some(x => x.id === id)) continue;
    issues.push({ id, title, phase, progress, next });
  }
  return issues;
}

function createOrbit(issue: IterationIssue): HTMLElement {
  const shell = el('div', 'iteration-orbit-shell');
  const wheel = el('div', 'iteration-orbit');
  wheel.setAttribute('role', 'group');
  wheel.setAttribute('aria-label', '四步迭代圆盘，可以检查每个阶段');
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 320 320');
  svg.classList.add('iteration-orbit-svg');
  svg.setAttribute('aria-hidden', 'true');
  const track = document.createElementNS(svgNS, 'circle');
  track.setAttribute('cx', '160'); track.setAttribute('cy', '160'); track.setAttribute('r', '102');
  track.classList.add('iteration-orbit-base');
  svg.append(track);
  PHASES.forEach((name, index) => {
    const arc = document.createElementNS(svgNS, 'circle');
    arc.setAttribute('cx', '160'); arc.setAttribute('cy', '160'); arc.setAttribute('r', '102');
    arc.setAttribute('stroke-dasharray', '146 495');
    arc.setAttribute('transform', 'rotate(' + (-126 + index * 90) + ' 160 160)');
    arc.classList.add('iteration-orbit-arc');
    if (issue.phase === name) arc.classList.add('is-current');
    svg.append(arc);
  });
  wheel.append(svg);

  const ambient = el('div', 'iteration-orbit-ambient');
  ambient.setAttribute('aria-hidden', 'true');
  const indicator = el('div', 'iteration-orbit-pointer');
  indicator.setAttribute('aria-hidden', 'true');
  indicator.append(el('span', 'iteration-orbit-pointer-dot'));
  indicator.style.setProperty('--orbit-turn', '0deg');
  indicator.dataset.targetTurn = String(issue.phase ? PHASES.indexOf(issue.phase) * 90 : 0);
  wheel.append(ambient, indicator);
  const center = el('div', 'iteration-orbit-center');
  center.append(
    el('span', 'iteration-orbit-center-kicker', '真实进度'),
    el('strong', 'iteration-orbit-center-number', issue.phase ? '0' + (PHASES.indexOf(issue.phase) + 1) : '—'),
    el('span', 'iteration-orbit-center-phase', issue.phase || '待判断'),
    el('small', 'iteration-orbit-center-note', issue.phase ? shortDescriptions[PHASES.indexOf(issue.phase)] : '尚无有效阶段标注')
  );
  wheel.append(center);
  const info = el('div', 'iteration-orbit-inspection');
  info.setAttribute('aria-live', 'polite');
  const infoTitle = el('strong', 'iteration-orbit-inspection-title');
  const infoCopy = el('p', 'iteration-orbit-inspection-copy');
  const currentIndex = issue.phase ? PHASES.indexOf(issue.phase) : -1;

  const setInspection = (index: number | null) => {
    const viewingCurrent = index === null || index === currentIndex;
    const idx = index === null ? currentIndex : index;
    const label = idx < 0 ? '阶段未标注' : PHASES[idx];
    infoTitle.textContent = viewingCurrent ? '当前 · ' + label : '查看 · ' + label;
    infoCopy.textContent = idx < 0
      ? '当前 Markdown 尚未填写有效阶段。请先在正式记录中确认，不猜测进度。'
      : descriptions[idx] + (viewingCurrent
        ? ' 以下进度与追问来自 GitHub 的原始记录。'
        : ' 这里只是查看该阶段的含义，不会修改问题的实际进度。');
    wheel.querySelectorAll<HTMLButtonElement>('.iteration-orbit-step').forEach(button => {
      const selected = Number(button.dataset.orbitPhase) === idx;
      button.classList.toggle('is-inspected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  };
  PHASES.forEach((phase, index) => {
    const button = el('button', 'iteration-orbit-step');
    button.type = 'button';
    button.dataset.orbitPhase = String(index);
    button.dataset.orbitPosition = String(index);
    button.setAttribute('aria-label', '查看' + phase + '阶段');
    if (phase === issue.phase) button.classList.add('is-current');
    button.append(el('span', 'iteration-orbit-step-number', String(index + 1).padStart(2, '0')), el('span', '', phase));
    button.addEventListener('click', () => setInspection(index));
    wheel.append(button);
  });
  const reset = el('button', 'iteration-inspection-reset', '返回真实阶段');
  reset.type = 'button';
  reset.addEventListener('click', () => setInspection(null));
  info.append(infoTitle, infoCopy, reset);
  shell.append(wheel, info);

  setInspection(null);
  return shell;
}
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function awakenOrbit(detail: HTMLElement) {
  const indicator = detail.querySelector<HTMLElement>('.iteration-orbit-pointer');
  if (!indicator) return;
  const turn = indicator.dataset.targetTurn || '0';
  if (prefersReducedMotion()) {
    indicator.style.setProperty('--orbit-turn', turn + 'deg');
    return;
  }
  // Safari/WebKit can batch the first two animation frames after an
  // element is revealed. Force the initial transform to be committed.
  indicator.style.setProperty('--orbit-turn', '0deg');
  void indicator.offsetWidth;
  requestAnimationFrame(() => {
    if (!detail.hidden && detail.isConnected) {
      indicator.style.setProperty('--orbit-turn', turn + 'deg');
    }
  });
}
function makeDetails(issue: IterationIssue): HTMLElement {
  const detail = el('section', 'iteration-issue-details');
  detail.id = 'iteration-issue-details-' + issue.id;
  detail.hidden = true;
  detail.setAttribute('aria-label', issue.title + '：迭代详情');

  const interior = el('div', 'iteration-issue-detail-grid');
  interior.append(createOrbit(issue));
  const column = el('div', 'iteration-detail-copy');
  column.append(el('p', 'iteration-eyebrow', 'CURRENT EXPERIMENT'));
  column.append(el('h3', 'iteration-detail-title', issue.title));
  const status = el('div', 'iteration-detail-phase');
  status.append(
    el('span', 'iteration-detail-pulse'),
    el('span', '', issue.phase ? '当前处于「' + issue.phase + '」' : '当前阶段待标注')
  );
  column.append(status);
  const progress = el('div', 'iteration-detail-section');
  progress.append(el('span', 'iteration-detail-section-label', '当前进展 · 已记录的事实'), el('p', '', issue.progress));
  const next = el('div', 'iteration-detail-section iteration-detail-next');
  next.append(el('span', 'iteration-detail-section-label', '下一次应该追问'), el('p', '', issue.next));
  const note = el('p', 'iteration-detail-footnote', '点圆盘四个节点可查看每一步的意义；查看不会改动 GitHub 记录。');
  const editButton = el('button', 'iteration-detail-edit', '查看 / 编辑原始记录');
  editButton.type = 'button';
  editButton.addEventListener('click', () => {
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('#iteration-doc-tabs button')];
    tabs.find(tab => tab.dataset.file === 'iteration-current.md')?.click();
    document.querySelector('#iteration-editor-heading')?.scrollIntoView({behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start'});
  });
  column.append(progress, next, editButton, note);
  interior.append(column);
  detail.append(interior);
  return detail;
}
export function mountIssueBoard(root: HTMLElement) {
  let issues: IterationIssue[] = [];
  let opened: string | null = null;
  let query = '';
  let filter: Phase | 'all' | 'unknown' = 'all';
  const count = document.querySelector<HTMLElement>('#iteration-progress-count');
  const search = document.querySelector<HTMLInputElement>('#iteration-search');
  const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-iteration-filter]')];
  function setButtons() {
    for (const b of filters) {
      const key = b.dataset.iterationFilter as typeof filter;
      const active = key === filter;
      b.classList.toggle('is-selected', active);
      b.setAttribute('aria-pressed', String(active));
      const qty = key === 'all' ? issues.length
        : issues.filter(i => key === 'unknown' ? i.phase === null : i.phase === key).length;
      const qtyEl = b.querySelector<HTMLElement>('.iteration-filter-count');
      if (qtyEl) qtyEl.textContent = String(qty);
    }
  }
  function buildCard(issue: IterationIssue) {
    const article = el('article', 'iteration-issue-card');
    if (opened === issue.id) article.classList.add('is-open');
    article.dataset.issueId = issue.id;
    const trigger = el('button', 'iteration-issue-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-expanded', String(opened === issue.id));
    trigger.setAttribute('aria-controls', 'iteration-issue-details-' + issue.id);
    const index = el('span', 'iteration-issue-index', issue.id);
    const main = el('span', 'iteration-issue-main');
    main.append(el('strong', 'iteration-issue-name', issue.title), el('small', 'iteration-issue-summary', issue.progress));
    const badge = el('span', 'iteration-issue-phase', issue.phase || '待确认');
    badge.dataset.phase = issue.phase || 'unknown';
    const chevron = el('span', 'iteration-issue-chevron', '⌄');
    chevron.setAttribute('aria-hidden', 'true');
    trigger.append(index, main, badge, chevron);
    const details = makeDetails(issue);
    details.hidden = opened !== issue.id;
    trigger.addEventListener('click', () => {
      const isOpening = opened !== issue.id;
      opened = isOpening ? issue.id : null;
      root.querySelectorAll<HTMLElement>('.iteration-issue-card').forEach(card => {
        const match = card.dataset.issueId === opened;
        card.classList.toggle('is-open', match);
        const button = card.querySelector<HTMLButtonElement>('.iteration-issue-trigger');
        if (button) button.setAttribute('aria-expanded', String(match));
        const panel = card.querySelector<HTMLElement>('.iteration-issue-details');
        if (panel) panel.hidden = !match;
        if (panel && match) awakenOrbit(panel);
      });
    });
    article.append(trigger, details);
    return article;
  }
  function paint() {
    const normalized = query.trim().toLocaleLowerCase();
    const visible = issues.filter(issue => {
      const matchesPhase = filter === 'all' || (filter === 'unknown' ? issue.phase === null : issue.phase === filter);
      const searchable = [issue.id, issue.title, issue.progress, issue.next].join(' ').toLocaleLowerCase();
      return matchesPhase && (!normalized || searchable.includes(normalized));
    });
    root.replaceChildren();
    if (!visible.length) {
      root.append(el('p', 'iteration-issues-empty', issues.length ? '没有符合条件的问题，试试清除搜索或切换阶段。' : '暂无可读取的问题记录。'));
    } else {
      const group = el('div', 'iteration-issue-stack');
      for (const issue of visible) group.append(buildCard(issue));
      root.append(group);
      if (opened) { const expanded = root.querySelector<HTMLElement>('#iteration-issue-details-' + opened); if (expanded) awakenOrbit(expanded); }
    }
    if (count) count.textContent = '显示 ' + visible.length + ' / ' + issues.length + ' 个';
    setButtons();
  }
  search?.addEventListener('input', () => {
    query = search.value;
    paint();
  });
  filters.forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.iterationFilter;
    if (key === 'all' || key === 'unknown' || PHASES.includes(key as Phase)) {
      filter = key as typeof filter;
      paint();
    }
  }));
  return {
    render(markdown: string) {
      issues = parseIterationIssues(markdown);
      if (!issues.some(x => x.id === opened)) opened = null;
      paint();
    }
  };
}
