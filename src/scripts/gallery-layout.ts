/**
 * A tiny progressive enhancement for variable-height gallery cards.
 *
 * Plain CSS Grid is the fallback. At 2-3 columns, a measured row-span grid
 * packs landscape screenshots and longer editorial covers without leaving
 * the empty row-sized holes caused by forced identical card heights.
 * No animation or DOM reordering is involved. One column remains natural.
 */
function installGalleryLayout(): void {
  const galleries = Array.from(document.querySelectorAll<HTMLElement>('.gallery-grid'));
  if (!galleries.length) return;

  const ROW = 6;
  const GAP = 18;
  for (const grid of galleries) {
    let queued = false;
    const items = Array.from(grid.children).filter((node): node is HTMLElement => node instanceof HTMLElement);

    const layout = () => {
      queued = false;
      const columns = getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length;
      if (columns <= 1) {
        grid.removeAttribute('data-masonry');
        for (const item of items) item.style.removeProperty('grid-row-end');
        return;
      }

      grid.dataset.masonry = 'true';
      for (const item of items) {
        if (item.hidden) {
          item.style.removeProperty('grid-row-end');
          continue;
        }
        const height = item.getBoundingClientRect().height;
        if (height < 1) continue;
        const span = Math.max(1, Math.ceil((height + GAP) / (ROW + GAP)));
        const expected = 'span ' + span;
        if (item.style.gridRowEnd !== expected) item.style.gridRowEnd = expected;
      }
    };

    const requestLayout = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(layout);
    };

    requestLayout();
    window.addEventListener('resize', requestLayout, { passive: true });
    window.addEventListener('pageshow', requestLayout);
    grid.addEventListener('load', requestLayout, true);

    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(requestLayout);
      resize.observe(grid);
      for (const item of items) resize.observe(item);
    }
    const visibility = new MutationObserver(requestLayout);
    for (const item of items) visibility.observe(item, { attributes: true, attributeFilter: ['hidden'] });
    document.fonts?.ready.then(requestLayout).catch(() => undefined);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installGalleryLayout, { once: true });
} else {
  installGalleryLayout();
}
