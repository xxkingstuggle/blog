/**
 * A lightweight, pointer-driven light field.
 *
 * One glow follows the pointer on a spring, two smaller lights lag behind.
 * Nearby cards respond before hover; movement velocity stretches the glow.
 * On exit, the lights decay rather than popping off. No canvas, WebGL,
 * third-party packages, timers, or per-frame layout scans.
 */
function mountKineticLight(): void {
  const stage = document.querySelector<HTMLElement>('[data-ambient-stage]');
  if (!stage || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const contrast = matchMedia('(forced-colors: active)');
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  });
  const unavailable = () => reduced.matches || contrast.matches ||
    !!connection.connection?.saveData ||
    (connection.deviceMemory !== undefined && connection.deviceMemory <= 2);
  if (unavailable()) return;

  const cards = [...document.querySelectorAll<HTMLElement>('.gallery-card')];
  if (!cards.length) return;

  const field = document.createElement('div');
  field.className = 'studio-kinetic-field';
  field.setAttribute('aria-hidden', 'true');
  field.innerHTML = [
    '<span class="studio-kinetic-core"></span>',
    '<span class="studio-kinetic-wake"></span>',
    '<span class="studio-kinetic-echo"></span>',
  ].join('');
  stage.appendChild(field);
  const core = field.children[0] as HTMLElement;
  const wake = field.children[1] as HTMLElement;
  const echo = field.children[2] as HTMLElement;

  const proximityRadius = 136;
  const basePrimary = [126, 144, 191];
  const baseSecondary = [165, 151, 188];
  let targetPrimary = [...basePrimary], targetSecondary = [...baseSecondary];
  let currentPrimary = [...basePrimary], currentSecondary = [...baseSecondary];
  let activeCard: HTMLElement | null = null;
  let pointerX = -500, pointerY = -500;
  let headX = -500, headY = -500;
  let wakeX = -500, wakeY = -500;
  let echoX = -500, echoY = -500;
  let lastPointerX = -500, lastPointerY = -500;
  let lastFrameAt = 0, lastPointerAt = 0;
  let rotation = 0, pointerImpulse = 0;
  let lastInputAt = 0;
  let velocity = 0, direction = 0;
  let targetOpacity = 0, opacity = 0;
  let raf = 0;
  let prepared = false;

  function parseRgb(raw: string, fallback: number[]): number[] {
    const parsed = raw.split(',').map(v => Number(v.trim()));
    if (parsed.length !== 3 || parsed.some(v => !Number.isFinite(v))) return [...fallback];
    return parsed.map(v => Math.max(35, Math.min(235, v)));
  }

  function palette(card: HTMLElement): void {
    const surface = card.querySelector<HTMLElement>('[data-glass-media]') ?? card;
    const css = getComputedStyle(surface);
    targetPrimary = parseRgb(css.getPropertyValue('--glass-primary-rgb'), basePrimary);
    targetSecondary = parseRgb(css.getPropertyValue('--glass-secondary-rgb'), baseSecondary);
  }

  function clearCard(): void {
    if (!activeCard) return;
    const item = activeCard.closest<HTMLElement>('.gallery-item');
    item?.removeAttribute('data-kinetic-near');
    item?.style.removeProperty('--local-glow-x');
    item?.style.removeProperty('--local-glow-y');
    activeCard.style.removeProperty('--sheen-x');
    activeCard.style.removeProperty('--sheen-y');
    activeCard = null;
    stage!.removeAttribute('data-kinetic-card');
  }

  function nearest(x: number, y: number): { card: HTMLElement; proximity: number } | null {
    let closest: HTMLElement | null = null;
    let shortest = proximityRadius;
    // Only pointer input (not animation frames) reads card geometry.
    for (const card of cards) {
      if (card.closest('[hidden]')) continue;
      const r = card.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const dx = Math.max(r.left - x, 0, x - r.right);
      const dy = Math.max(r.top - y, 0, y - r.bottom);
      const distance = Math.hypot(dx, dy);
      if (distance < shortest) {
        shortest = distance;
        closest = card;
      }
    }
    if (!closest) return null;
    return { card: closest, proximity: Math.max(0, 1 - shortest / proximityRadius) };
  }

  function updateTarget(): void {
    const near = nearest(pointerX, pointerY);
    if (!near) {
      targetOpacity = 0;
      clearCard();
      stage!.dataset.kineticTarget = 'none';
      return;
    }
    const card = near.card;
    const nextOpacity = .14 + .62 * Math.pow(near.proximity, .8);
    targetOpacity = Math.min(.76, nextOpacity);
    if (card !== activeCard) {
      clearCard();
      activeCard = card;
      palette(card);
      stage!.dataset.kineticCard = card.getAttribute('href') ?? 'gallery-card';
    }
    card.closest<HTMLElement>('.gallery-item')?.setAttribute('data-kinetic-near', 'true');
    stage!.dataset.kineticTarget = 'near';
  }

  const smooth = (dt: number, rate: number) => 1 - Math.exp(-dt / rate);
  function draw(time: number): void {
    raf = 0;
    if (document.hidden || unavailable()) {
      targetOpacity = 0;
      clearCard();
    }
    const dt = Math.min(50, Math.max(8, lastFrameAt ? time - lastFrameAt : 16.7));
    lastFrameAt = time;

    const previousHeadX = headX, previousHeadY = headY;
    const follow = smooth(dt, 43);
    headX += (pointerX - headX) * follow;
    headY += (pointerY - headY) * follow;
    const lag = smooth(dt, 105);
    wakeX += (headX - wakeX) * lag;
    wakeY += (headY - wakeY) * lag;
    const echoFollow = smooth(dt, 164);
    echoX += (wakeX - echoX) * echoFollow;
    echoY += (wakeY - echoY) * echoFollow;

    const travelled = Math.hypot(headX - previousHeadX, headY - previousHeadY);
    // Current kinetic energy follows actual movement, then falls naturally.
    const sensed = Math.max(Math.min(2.8, travelled / dt), pointerImpulse);
    velocity += (sensed - velocity) * smooth(dt, 66);
    pointerImpulse *= Math.exp(-dt / 115);
    const displayedStretch = 1 + Math.min(.70, velocity * .52);
    const angularDifference = ((direction - rotation + 540) % 360) - 180;
    rotation += angularDifference * smooth(dt, 78);
    const faded = targetOpacity < opacity;
    opacity += (targetOpacity - opacity) * smooth(dt, faded ? 225 : 94);
    opacity = Math.max(0, Math.min(1, opacity));

    for (let i=0; i<3; i++) {
      currentPrimary[i] += (targetPrimary[i] - currentPrimary[i]) * smooth(dt, 240);
      currentSecondary[i] += (targetSecondary[i] - currentSecondary[i]) * smooth(dt, 280);
    }
    const colorString = (rgb: number[]) => rgb.map(v => String(Math.round(v))).join(', ');
    field.style.setProperty('--kinetic-primary-rgb', colorString(currentPrimary));
    field.style.setProperty('--kinetic-secondary-rgb', colorString(currentSecondary));

    const transform = (x: number, y: number, rotate: number, sx: number, sy: number) =>
      'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) +
      'px,0) translate(-50%,-50%) rotate(' + rotate.toFixed(1) +
      'deg) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
    core.style.transform = transform(headX, headY, rotation, displayedStretch, 1 / (1 + (displayedStretch - 1)*.38));
    wake.style.transform = transform(wakeX, wakeY, rotation, 1 + (displayedStretch-1)*1.2, 1);
    echo.style.transform = transform(echoX, echoY, rotation, 1 + (displayedStretch-1)*.48, 1);
    core.style.opacity = (opacity * .70).toFixed(3);
    wake.style.opacity = (opacity * .45 * Math.min(1.3, .78 + velocity*.28)).toFixed(3);
    echo.style.opacity = (opacity * .31).toFixed(3);

    if (activeCard) {
      // One active card is allowed a moving reflection and a local halo.
      // Read its bounds only while its positional glow is visibly changing.
      const rect = activeCard.getBoundingClientRect();
      if (rect.width && rect.height) {
        const x = Math.max(4, Math.min(96, (headX - rect.left) / rect.width * 100)).toFixed(1)+'%';
        const y = Math.max(4, Math.min(96, (headY - rect.top) / rect.height * 100)).toFixed(1)+'%';
        activeCard.style.setProperty('--sheen-x', x);
        activeCard.style.setProperty('--sheen-y', y);
        const item = activeCard.closest<HTMLElement>('.gallery-item');
        item?.style.setProperty('--local-glow-x', x);
        item?.style.setProperty('--local-glow-y', y);
      }
    }
    stage!.dataset.kineticStretch = displayedStretch.toFixed(2);
    stage!.dataset.kineticOpacity = opacity.toFixed(2);
    stage!.dataset.kineticCoreX = headX.toFixed(1);
    stage!.dataset.kineticWakeX = wakeX.toFixed(1);

    // Keep the field steady under a stationary pointer, but stop RAF work.
    const settled =
      Math.hypot(pointerX-headX, pointerY-headY) < .65 &&
      Math.hypot(headX-wakeX, headY-wakeY) < .9 &&
      Math.hypot(wakeX-echoX, wakeY-echoY) < 1.3 &&
      velocity < .028 &&
      Math.abs(targetOpacity-opacity) < .008;
    if (!settled && (opacity > .012 || targetOpacity > .012 ||
      time - lastInputAt < 250)) {
      raf = requestAnimationFrame(draw);
    }
  }

  function requestDraw(): void {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function onPointer(event: PointerEvent): void {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const x = event.clientX, y = event.clientY;
    const time = performance.now();
    const dx = x - lastPointerX, dy = y - lastPointerY;
    const distance = Math.hypot(dx, dy);
    if (prepared && distance > 2) {
      direction = Math.atan2(dy, dx) * 180 / Math.PI;
      // Pointer events can be coalesced: movement velocity must not be inferred
      // only from how far the animated light travelled in the latest frame.
      const elapsed = Math.max(8, Math.min(250, time - lastPointerAt));
      pointerImpulse = Math.min(3.6, Math.max(pointerImpulse*.6, distance / elapsed));
    }
    // A discrete pointer jump is not painted instantly: springs and three
    // lagging positions keep the transition continuous across card gaps.
    if (!prepared) {
      prepared = true;
      headX = wakeX = echoX = x;
      headY = wakeY = echoY = y;
      lastFrameAt = time;
    }
    lastPointerX = pointerX = x;
    lastPointerY = pointerY = y;
    lastInputAt = time;
    lastPointerAt = time;
    updateTarget();
    requestDraw();
  }

  function leave(): void {
    targetOpacity = 0;
    clearCard();
    stage!.dataset.kineticTarget = 'none';
    requestDraw();
  }

  document.addEventListener('pointermove', onPointer, { passive:true });
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget) leave();
  }, { passive:true });
  window.addEventListener('blur', leave);
  window.addEventListener('scroll', () => {
    if (!prepared) return;
    updateTarget();
    requestDraw();
  }, { passive:true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) leave();
  });
  reduced.addEventListener?.('change', () => {
    if (reduced.matches) {
      leave();
      field.hidden = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else field.hidden = false;
  });
  document.addEventListener('glass-palette-ready', event => {
    if (!activeCard || !(event.target instanceof Element) ||
      !activeCard.contains(event.target)) return;
    palette(activeCard);
    requestDraw();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountKineticLight, { once: true });
} else {
  mountKineticLight();
}
