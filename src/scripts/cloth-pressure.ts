/**
 * Tactile card surfaces, not a cursor spotlight.
 *
 * The pointer deforms only the card under it: a small, light-dominant
 * concavity and a <=0.75deg counter-tilt. No global canvas, glow,
 * wake, coloured trail, or moving dark shadow.
 */
function initializeClothPressure(): void {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      matchMedia('(forced-colors: active)').matches) return;

  const cards = [...document.querySelectorAll<HTMLElement>('.gallery-card')];
  if (!cards.length) return;
  let active: HTMLElement | null = null;
  let targetX = 50, targetY = 50, x = 50, y = 50;
  let opacity = 0, targetOpacity = 0;
  let tiltX = 0, tiltY = 0, targetTiltX = 0, targetTiltY = 0;
  let raf = 0, lastTime = 0;

  const ease = (delta: number, duration: number): number =>
    1 - Math.exp(-delta / duration);

  function clear(card: HTMLElement): void {
    card.style.setProperty('--pressure-opacity', '0');
    card.style.setProperty('--pressure-rotate-x', '0deg');
    card.style.setProperty('--pressure-rotate-y', '0deg');
    card.removeAttribute('data-cloth-active');
  }

  function tick(time: number): void {
    raf = 0;
    const dt = Math.min(45, Math.max(8, lastTime ? time - lastTime : 16.7));
    lastTime = time;
    const motion = ease(dt, 74);
    x += (targetX - x) * motion;
    y += (targetY - y) * motion;
    tiltX += (targetTiltX - tiltX) * ease(dt, 100);
    tiltY += (targetTiltY - tiltY) * ease(dt, 100);
    opacity += (targetOpacity - opacity) * ease(dt, targetOpacity ? 90 : 240);
    if (active) {
      active.style.setProperty('--pressure-x', x.toFixed(1) + '%');
      active.style.setProperty('--pressure-y', y.toFixed(1) + '%');
      active.style.setProperty('--pressure-opacity', opacity.toFixed(3));
      active.style.setProperty('--pressure-rotate-x', tiltX.toFixed(3) + 'deg');
      active.style.setProperty('--pressure-rotate-y', tiltY.toFixed(3) + 'deg');
      active.dataset.pressureDepth = opacity.toFixed(2);
    }
    const moving = Math.abs(x-targetX) > .25 || Math.abs(y-targetY) > .25 ||
      Math.abs(opacity-targetOpacity) > .007 ||
      Math.abs(tiltX-targetTiltX) > .015 ||
      Math.abs(tiltY-targetTiltY) > .015;
    if (moving) {
      raf = requestAnimationFrame(tick);
    } else if (!targetOpacity && active) {
      const old = active;
      active = null;
      clear(old);
      old.removeAttribute('data-pressure-depth');
      lastTime = 0;
    }
  }

  function update(event: PointerEvent): void {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const node = event.target;
    const card = node instanceof Element
      ? node.closest<HTMLElement>('.gallery-card') : null;
    if (!card) {
      release(); // Allow the surface to rebound; do not abruptly clear it.
      return;
    }
    if (card !== active) {
      if (active) clear(active);
      active = card;
      opacity = 0;
      tiltX = tiltY = 0;
      x = y = 50;
    }
    const rect = card.querySelector<HTMLElement>('.gallery-card-visual')?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;
    targetX = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
    targetY = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
    targetOpacity = .84;
    targetTiltX = (targetY - 50) / 85;
    targetTiltY = (50 - targetX) / 85;
    card.dataset.clothActive = 'true';
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function release(): void {
    if (!active) return;
    targetOpacity = 0;
    targetTiltX = targetTiltY = 0;
    targetX = targetY = 50;
    if (!raf) raf = requestAnimationFrame(tick);
  }
  document.addEventListener('pointermove', update, { passive: true });
  document.addEventListener('pointerout', event => {
    if (active && !(event.relatedTarget instanceof Node &&
      active.contains(event.relatedTarget))) release();
  }, { passive: true });
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
  });
  document.addEventListener('focusin', event => {
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest<HTMLElement>('.gallery-card');
    if (!card) return;
    if (active && active !== card) clear(active);
    active = card;
    x = targetX = 50; y = targetY = 50;
    targetOpacity = .42; targetTiltX = targetTiltY = 0;
    card.dataset.clothActive = 'true';
    if (!raf) raf = requestAnimationFrame(tick);
  });
  document.addEventListener('focusout', release);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeClothPressure, { once:true });
} else {
  initializeClothPressure();
}
