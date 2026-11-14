/**
 * MYZJX / Chromatic Atmosphere v4
 * Two painted viewport layers crossfade between local image/video palettes;
 * the same light sits beneath the desktop glass rail and gallery.
 * The page ambience follows scroll/focus, never mouse position.
 */
type AmbientScene = {
  element: HTMLElement;
  primary: string;
  secondary: string;
  x: number;
  y: number;
};

function bootAmbientStage(): void {
  const field = document.querySelector<HTMLElement>('[data-ambient-stage]');
  if (!field) return;
  const layers = [...field.querySelectorAll<HTMLElement>('[data-ambient-layer]')];
  if (layers.length !== 2) return;

  const cards = [...document.querySelectorAll<HTMLElement>('.gallery-card')];
  const covers = [...document.querySelectorAll<HTMLElement>(
    '.gallery-detail-cover--image, .product-gallery[data-glass-media], .studio-motion-well[data-glass-media]'
  )];
  const sources = [...cards, ...covers];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let selected: HTMLElement | null = null;
  let pinned: HTMLElement | null = null;
  let selectedLayer = 0;
  let hasRendered = false;
  let pendingScroll = false;

  function visible(element: HTMLElement): boolean {
    if (element.closest('[hidden]')) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 &&
      rect.bottom > 0 && rect.top < innerHeight &&
      rect.right > 0 && rect.left < innerWidth;
  }

  function enhance(rgb: string, fallback: [number,number,number]): string {
    const values = rgb.split(',').map(n => Number(n.trim()));
    if (values.length !== 3 || values.some(v => !Number.isFinite(v))) {
      return fallback.join(', ');
    }
    const max = Math.max(...values), min = Math.min(...values);
    const span = max - min;
    if (span < 19) {
      // Monochrome UI frames still emit a *coloured* light, rather than
      // faint neutral grey. Their brightness informs the final tone.
      const average = values.reduce((a,b)=>a+b,0)/3;
      const shift = Math.max(-15,Math.min(15,(average-150)*.19));
      return fallback.map(v => Math.round(v + shift)).join(', ');
    }
    const average = values.reduce((a,b)=>a+b,0)/3;
    const boost = span < 80 ? 1.30 : 1.18;
    const center = 154 + (average - 154) * .18;
    return values.map(v => Math.max(42,Math.min(235,
      Math.round(center + (v-average)*boost)))).join(', ');
  }

  function sceneFor(element: HTMLElement): AmbientScene {
    const surface = element.matches('.gallery-card')
      ? element.querySelector<HTMLElement>('[data-glass-media]') ?? element
      : element;
    const css = getComputedStyle(surface);
    const rawPrimary = css.getPropertyValue('--glass-primary-rgb').trim();
    const rawSecondary = css.getPropertyValue('--glass-secondary-rgb').trim();
    const rect = element.getBoundingClientRect();
    return {
      element,
      primary: enhance(rawPrimary, [112,125,214]),
      secondary: enhance(rawSecondary, [193,129,193]),
      x: Math.max(10,Math.min(88,
        (rect.left + rect.width*.5)/Math.max(1,innerWidth)*100)),
      y: Math.max(13,Math.min(84,
        (rect.top + rect.height*.46)/Math.max(1,innerHeight)*100)),
    };
  }

  function markActive(element: HTMLElement | null) {
    for (const card of cards) {
      const item = card.closest<HTMLElement>('.gallery-item');
      if (item) {
        if (card === element) item.dataset.ambientActive = 'true';
        else delete item.dataset.ambientActive;
      }
    }
  }

  function render(element: HTMLElement, force = false, intent: 'hover'|'focus'|'scroll' = 'scroll') {
    if (element === selected && !force) {
      field!.dataset.ambientIntent = intent;
      return;
    }
    selected = element;
    field!.dataset.ambientScene = 'active';
    field!.dataset.ambientIntent = intent;
    const scene = sceneFor(element);
    const next = hasRendered ? 1 - selectedLayer : 0;
    const layer = layers[next];
    layer.style.setProperty('--ambient-primary-rgb', scene.primary);
    layer.style.setProperty('--ambient-secondary-rgb', scene.secondary);
    layer.style.setProperty('--ambient-x', scene.x.toFixed(2)+'%');
    layer.style.setProperty('--ambient-y', scene.y.toFixed(2)+'%');

    field!.dataset.ambientSource = element.getAttribute('href') ??
      (element.matches('.studio-motion-well') ? 'motion-scene' : element.classList[0] || 'artwork');
    field!.dataset.ambientPrimary = scene.primary;
    field!.dataset.ambientSecondary = scene.secondary;
    if (hasRendered) layers[selectedLayer].style.opacity = '0';
    layer.style.opacity = '1';
    selectedLayer = next;
    hasRendered = true;
    markActive(element);
  }

  function closestVisible(): HTMLElement | null {
    let result: HTMLElement | null = null;
    let minDistance = Infinity;
    for (const element of sources) {
      if (!visible(element)) continue;
      const rect = element.getBoundingClientRect();
      const midpoint = rect.top + Math.min(rect.height*.5,innerHeight*.37);
      const distance = Math.abs(midpoint-innerHeight*.49);
      if (distance < minDistance) {minDistance = distance;result = element;}
    }
    return result;
  }

  function refreshVisible(): void {
    pendingScroll = false;
    if (pinned && visible(pinned)) return;
    if (pinned && !visible(pinned)) pinned = null;
    const nearest = closestVisible();
    if (nearest) render(nearest,false,'scroll');
    else {
      field!.dataset.ambientScene = 'rest';
      markActive(null);
    }
  }
  function scheduleRefresh(): void {
    if (pendingScroll) return;
    pendingScroll = true;
    requestAnimationFrame(refreshVisible);
  }

  // Even content-light pages get the same subtle atmosphere, instead of a
  // hard transition from a luminous gallery to an entirely blank route.
  if (!sources.length) {
    field.dataset.ambientScene = 'rest';
    layers[0].style.opacity = '1';
    layers[0].style.setProperty('--ambient-primary-rgb','116, 131, 208');
    layers[0].style.setProperty('--ambient-secondary-rgb','185, 133, 194');
    layers[0].style.setProperty('--ambient-x','58%');
    layers[0].style.setProperty('--ambient-y','34%');
    return;
  }

  // Pointer movement now belongs exclusively to the cloth-pressure surface.
  // Ambient colour changes by scroll or keyboard focus, not mouse hover.

  document.addEventListener('focusin', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const card = target.closest<HTMLElement>('.gallery-card');
    if (!card) return;
    pinned = card;
    render(card,false,'focus');
  });
  document.addEventListener('focusout', event => {
    if (!pinned) return;
    const next = event.relatedTarget;
    if (next instanceof Node && pinned.contains(next)) return;
    pinned = null;
    scheduleRefresh();
  });

  // Video colour sampling is throttled separately (<=0.7 Hz). A new frame
  // changes the two ambient layers, not a full-screen canvas read.
  document.addEventListener('glass-palette-ready', event => {
    const node = event.target;
    if (!(node instanceof HTMLElement)) return;
    const card = node.closest<HTMLElement>('.gallery-card') ??
      (node.matches('.gallery-detail-cover--image,.product-gallery,.studio-motion-well') ? node : null);
    if (card && selected === card) render(card,true,field!.dataset.ambientIntent==='hover'?'hover':'scroll');
  });

  window.addEventListener('scroll',scheduleRefresh,{passive:true});
  window.addEventListener('resize',scheduleRefresh,{passive:true});
  window.addEventListener('pageshow',scheduleRefresh);
  document.addEventListener('click',event => {
    if (event.target instanceof Element &&
      event.target.closest('[data-gallery-filter],[data-filter]')) scheduleRefresh();
  });
  if (reducedMotion.matches) field.dataset.ambientReduced = 'true';
  scheduleRefresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded',bootAmbientStage,{once:true});
} else {
  bootAmbientStage();
}
