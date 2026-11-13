// Aurora Home: optional decorative interactions, no network or personal-data access.
const root = document.querySelector<HTMLElement>('.aurora-home');
const toggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
const label = toggle?.querySelector<HTMLElement>('[data-motion-label]');
if (root && toggle && label) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let userPaused = false;
  try { userPaused = sessionStorage.getItem('myzjx-ambient-paused') === '1'; } catch { /* browser storage disabled */ }

  const refresh = () => {
    const paused = userPaused || reduced.matches;
    root.dataset.ambientPaused = String(paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? '播放背景动效' : '暂停背景动效');
    label.textContent = reduced.matches ? '系统减少动效' : paused ? '播放动效' : '暂停动效';
    toggle.disabled = reduced.matches;
  };
  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    try { sessionStorage.setItem('myzjx-ambient-paused', userPaused ? '1' : '0'); } catch { /* optional */ }
    refresh();
  });
  reduced.addEventListener?.('change', refresh);
  refresh();

  // Spotlight follows real pointer interaction only. No hover tracking on touch devices.
  const surfaces = document.querySelectorAll<HTMLElement>('.aurora-glow-surface');
  for (const surface of surfaces) {
    let scheduled = false;
    let x = 50, y = 50;
    surface.addEventListener('pointermove', (event: PointerEvent) => {
      if (!finePointer.matches || reduced.matches || event.pointerType !== 'mouse') return;
      const bounds = surface.getBoundingClientRect();
      x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
      y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        surface.style.setProperty('--glow-x', x + '%');
        surface.style.setProperty('--glow-y', y + '%');
        scheduled = false;
      });
    }, { passive: true });
  }
}
