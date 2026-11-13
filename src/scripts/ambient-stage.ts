/**
 * A single page-wide light field follows the actual gallery content.
 * It is separate from every rounded card, so the light can genuinely
 * illuminate surrounding page space instead of being clipped by media.
 * Hover/focus on desktop; viewport proximity on scroll/touch devices.
 * Two cross-fading layers prevent CSS RGB custom-property snap cuts.
 */
type Scene = {
  card: HTMLElement;
  primary: string;
  secondary: string;
  x: number;
  y: number;
};

function bootAmbientStage(): void {
  const field = document.querySelector<HTMLElement>('[data-ambient-stage]');
  if (!field) return;
  const layers = Array.from(field.querySelectorAll<HTMLElement>('[data-ambient-layer]'));
  if (layers.length !== 2) return;

  const cards = Array.from(document.querySelectorAll<HTMLElement>('.gallery-card'));
  const covers = Array.from(document.querySelectorAll<HTMLElement>(
    '.gallery-detail-cover--image, .product-gallery[data-glass-media], .studio-motion-well[data-glass-media]'
  ));
  const sources = [...cards, ...covers];
  if (sources.length === 0) {
    field.hidden = true;
    return;
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let current: HTMLElement | null = null;
  let pinned: HTMLElement | null = null;
  let queued = false;
  let didRender = false;

  const visible = (el: HTMLElement) => {
    if (el.closest('[hidden]')) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 &&
      rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
  };

  function sceneFor(card: HTMLElement): Scene {
    const surface = card.matches('.gallery-card') ?
      card.querySelector<HTMLElement>('[data-glass-media]') ?? card : card;
    const styles = getComputedStyle(surface);
    const primary = styles.getPropertyValue('--glass-primary-rgb').trim() ||
      '136, 148, 172';
    const secondary = styles.getPropertyValue('--glass-secondary-rgb').trim() ||
      '172, 187, 204';
    const rect = card.getBoundingClientRect();
    return {
      card, primary, secondary,
      x: Math.min(90, Math.max(10, (rect.left + rect.width / 2) / innerWidth * 100)),
      y: Math.min(85, Math.max(15, (rect.top + rect.height / 2) / innerHeight * 100)),
    };
  }

  function render(card: HTMLElement, force = false): void {
    if (!force && current === card) return;
    current = card;
    field!.dataset.ambientScene = 'active';
    const scene = sceneFor(card);
    const next = didRender ? 1 - active : 0;
    const target = layers[next];
    target.style.setProperty('--ambient-primary-rgb', scene.primary);
    target.style.setProperty('--ambient-secondary-rgb', scene.secondary);
    target.style.setProperty('--ambient-x', scene.x + '%');
    target.style.setProperty('--ambient-y', scene.y + '%');

    field!.dataset.ambientSource = card.getAttribute('href') ??
      card.className.split(' ')[0] ?? 'media';
    field!.dataset.ambientPrimary = scene.primary;
    if (didRender) layers[active].style.opacity = '0';
    target.style.opacity = '1';
    active = next;
    didRender = true;
  }

  function closestVisible(): HTMLElement | null {
    let winner: HTMLElement | null = null;
    let shortest = Infinity;
    for (const el of sources) {
      if (!visible(el)) continue;
      const rect = el.getBoundingClientRect();
      const point = rect.top + Math.min(rect.height * .5, innerHeight * .35);
      const distance = Math.abs(point - innerHeight * .48);
      if (distance < shortest) {
        shortest = distance;
        winner = el;
      }
    }
    return winner;
  }

  function updateScroll(): void {
    queued = false;
    if (pinned && visible(pinned)) return;
    const closest = closestVisible();
    if (closest) render(closest);
    else field!.dataset.ambientScene = 'rest';
  }

  function requestUpdate(): void {
    if (queued) return;
    queued = true;
    requestAnimationFrame(updateScroll);
  }

  // Only precise pointers pin a hovered card; touch scroll remains viewport-driven.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.addEventListener('pointerover', event => {
      const node = event.target;
      if (!(node instanceof Element)) return;
      const target = node.closest<HTMLElement>('.gallery-card');
      if (!target) return;
      pinned = target;
      render(target);
    }, { passive: true });

    document.addEventListener('pointerout', event => {
      const node = event.target;
      if (!(node instanceof Element)) return;
      const card = node.closest<HTMLElement>('.gallery-card');
      if (card && card === pinned) {
        const destination = event.relatedTarget;
        if (destination instanceof Node && card.contains(destination)) return;
        pinned = null;
        requestUpdate();
      }
    }, { passive: true });
  }

  document.addEventListener('focusin', event => {
    const node = event.target;
    if (!(node instanceof Element)) return;
    const card = node.closest<HTMLElement>('.gallery-card');
    if (card) {
      pinned = card;
      render(card);
    }
  });
  document.addEventListener('focusout', event => {
    const node = event.target;
    if (node === pinned) pinned = null;
    requestUpdate();
  });
  document.addEventListener('glass-palette-ready', event => {
    const node = event.target;
    if (!(node instanceof HTMLElement)) return;
    const affected = node.closest<HTMLElement>('.gallery-card') ??
      (node.matches('.gallery-detail-cover--image, .product-gallery, .studio-motion-well') ? node : null);
    if (affected && current === affected) render(affected, true);
  });

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  document.addEventListener('click', event => {
    if (event.target instanceof Element &&
      event.target.closest('[data-gallery-filter], [data-filter]')) {
      requestUpdate();
    }
  });
  window.addEventListener('pageshow', requestUpdate);
  if (reduced.matches) field.dataset.ambientReduced = 'true';
  requestUpdate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAmbientStage, { once: true });
} else {
  bootAmbientStage();
}
