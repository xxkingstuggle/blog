/* MYZJX Motion Lite — shared by the no-build preview and Astro gallery.
 * Only composited transforms / opacity change on pointer motion.
 * All content is visible without JS. No shader, animated filter or perpetual RAF.
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const cards = Array.from(document.querySelectorAll('[data-motion-card]'))
    .map(card => ({
      card, surface: card.querySelector('[data-motion-surface]'),
      halo: card.querySelector('[data-motion-halo]'), rect: null,
      visible: false, entered: false, x: 0, y: 0,
      tx: 0, ty: 0, ox: 0, oy: 0, cx: 0, cy: 0, alpha: 0, targetAlpha: 0
    })).filter(item => item.surface);
  const prefersReduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  const hasFinePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const lowCpu = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  const lowRam = navigator.deviceMemory && navigator.deviceMemory <= 4;
  const supports3d = !!(window.CSS && CSS.supports && CSS.supports('transform', 'translate3d(1px,1px,0)'));
  let preference = 'auto';
  let tier = 'standard';
  let active = null;
  let animationId = 0;
  let scrollId = 0;
  let lastFrame = 0;
  let sampleFrames = 0, sampleTime = 0, slowSamples = 0;
  const controls = Array.from(document.querySelectorAll('[data-motion-choice]'));

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const near = (a, b, eps) => Math.abs(a - b) < eps;
  function getTier() {
    if ((prefersReduced && prefersReduced.matches) || !supports3d) return 'lite';
    if (preference !== 'auto') return preference;
    if (saveData || lowRam || lowCpu || !hasFinePointer) return 'standard';
    return 'enhanced';
  }
  function updateTier() {
    tier = getTier();
    root.dataset.motionTier = tier;
    const state = document.querySelector('[data-motion-state]');
    if (state) state.textContent = tier === 'enhanced' ? '增强 · 2.5D' : tier === 'standard' ? '标准 · 轻动效' : '轻量 · 静态';
    controls.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.motionChoice === preference)));
    if (animationId) { cancelAnimationFrame(animationId); animationId = 0; }
    if (scrollId) { cancelAnimationFrame(scrollId); scrollId = 0; }
    active = null;
    for (const item of cards) {
      item.alpha = item.targetAlpha = item.cx = item.cy = item.tx = item.ty = item.ox = item.oy = 0;
      item.card.removeAttribute('data-motion-active');
      item.surface.style.removeProperty('--motion-tilt-x');
      item.surface.style.removeProperty('--motion-tilt-y');
      item.surface.style.removeProperty('--motion-scroll-y');
      if (item.halo) {
        item.halo.style.opacity = '0';
        item.halo.style.transform = 'translate3d(-250px,-250px,0)';
      }
    }
    if (tier === 'enhanced') scheduleScroll();
  }
  controls.forEach(button => button.addEventListener('click', () => {
    preference = button.dataset.motionChoice || 'auto';
    updateTier();
  }));
  if (prefersReduced) {
    if (prefersReduced.addEventListener) prefersReduced.addEventListener('change', updateTier);
    else if (prefersReduced.addListener) prefersReduced.addListener(updateTier);
  }

  function enter(item, ev) {
    if (tier === 'lite' || !hasFinePointer) return;
    if (active && active !== item) leave(active);
    active = item;
    item.rect = item.surface.getBoundingClientRect();
    item.card.setAttribute('data-motion-active', '');
    item.targetAlpha = tier === 'enhanced' ? 0.85 : 0.53;
    position(item, ev);
  }
  function position(item, ev) {
    if (tier === 'lite' || !hasFinePointer || !ev || !item.rect) return;
    const r = item.rect;
    const nx = clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1);
    const ny = clamp((ev.clientY - r.top) / Math.max(1, r.height), 0, 1);
    item.x = nx * r.width - 100;
    item.y = ny * r.height - 100;
    item.tx = tier === 'enhanced' ? (0.5 - ny) * 1.8 : 0;
    item.ty = tier === 'enhanced' ? (nx - 0.5) * 1.8 : 0;
    if (!animationId) animationId = requestAnimationFrame(tick);
  }
  function leave(item) {
    item.tx = item.ty = 0;
    item.targetAlpha = 0;
    if (active === item && !animationId) animationId = requestAnimationFrame(tick);
  }
  function tick(now) {
    animationId = 0;
    if (!active || document.hidden || tier === 'lite') return;
    const item = active;
    const dt = lastFrame ? clamp(now - lastFrame, 8, 48) : 16;
    lastFrame = now;
    const mix = 1 - Math.exp(-dt / (tier === 'enhanced' ? 90 : 58));
    const alphaMix = 1 - Math.exp(-dt / 110);
    item.ox += (item.tx - item.ox) * mix;
    item.oy += (item.ty - item.oy) * mix;
    item.cx += (item.x - item.cx) * mix;
    item.cy += (item.y - item.cy) * mix;
    item.alpha += (item.targetAlpha - item.alpha) * alphaMix;
    if (item.halo) {
      item.halo.style.transform = 'translate3d(' + item.cx.toFixed(1) + 'px,' + item.cy.toFixed(1) + 'px,0)';
      item.halo.style.opacity = item.alpha.toFixed(3);
    }
    item.surface.style.setProperty('--motion-tilt-x', item.ox.toFixed(3) + 'deg');
    item.surface.style.setProperty('--motion-tilt-y', item.oy.toFixed(3) + 'deg');
    const settled = near(item.ox, item.tx, .015) && near(item.oy, item.ty, .015) &&
      near(item.cx, item.x, .45) && near(item.cy, item.y, .45) && near(item.alpha, item.targetAlpha, .012);
    if (!settled) animationId = requestAnimationFrame(tick);
    else if (!item.targetAlpha) {
      item.card.removeAttribute('data-motion-active');
      item.surface.style.removeProperty('--motion-tilt-x');
      item.surface.style.removeProperty('--motion-tilt-y');
      if (item.halo) item.halo.style.opacity = '0';
      active = null;
      lastFrame = 0;
    }
    // One-way automatic fallback after repeated sustained low FPS while interacting.
    if (preference === 'auto' && tier === 'enhanced') {
      sampleFrames++; sampleTime += dt;
      if (sampleFrames >= 35) {
        const slow = sampleTime / sampleFrames > 27;
        slowSamples = slow ? slowSamples + 1 : 0;
        sampleFrames = sampleTime = 0;
        if (slowSamples >= 2) {
          slowSamples = 0;
          preference = 'standard';
          updateTier();
        }
      }
    }
  }
  for (const item of cards) {
    item.card.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') enter(item, e); }, { passive: true });
    item.card.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      if (active !== item) enter(item, e);
      else position(item, e);
    }, { passive: true });
    item.card.addEventListener('pointerleave', () => leave(item), { passive: true });
    item.card.addEventListener('pointercancel', () => leave(item), { passive: true });
  }

  // Only visible covers are updated, on actual scroll input. No idle loop.
  function onScroll() {
    scrollId = 0;
    if (tier !== 'enhanced' || document.hidden) return;
    const h = window.innerHeight || 900;
    for (const item of cards) {
      if (!item.visible || !item.card.hasAttribute('data-motion-depth')) continue;
      const r = item.card.getBoundingClientRect();
      const focus = (r.top + r.height * .5 - h * .5) / h;
      const shift = clamp(-focus * 12, -7, 7);
      item.surface.style.setProperty('--motion-scroll-y', shift.toFixed(2) + 'px');
    }
  }
  function scheduleScroll() {
    if (tier !== 'enhanced' || scrollId) return;
    scrollId = requestAnimationFrame(onScroll);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const item = cards.find(x => x.card === entry.target);
        if (!item) continue;
        item.visible = entry.isIntersecting;
        if (item.visible && !item.entered) {
          item.entered = true;
          const wrapper = item.card.closest('.gallery-item');
          if (wrapper && tier !== 'lite' && wrapper.animate) {
            wrapper.animate(
              [{ opacity: .62, transform: 'translate3d(0,18px,0) scale(.985)' },
                { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }],
              { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
          }
        }
      }
      scheduleScroll();
    }, { rootMargin: '12% 0px', threshold: .01 });
    cards.forEach(item => observer.observe(item.card));
  } else cards.forEach(item => item.visible = true);
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', () => {
    if (active) active.rect = active.surface.getBoundingClientRect();
    scheduleScroll();
  }, { passive: true });
  window.addEventListener('blur', () => { if (active) leave(active); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animationId) cancelAnimationFrame(animationId);
      if (scrollId) cancelAnimationFrame(scrollId);
      animationId = scrollId = 0;
      if (active) leave(active);
    } else scheduleScroll();
  });
  updateTier();
})();