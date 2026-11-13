// Keep the small mobile navigation stable. No scroll-chasing or disappearing dock.
function installMobileMenu() {
  const menu = document.querySelector<HTMLDetailsElement>('.studio-dock-menu');
  if (!menu) return;
  const summary = menu.querySelector<HTMLElement>(':scope > summary');

  document.addEventListener('pointerdown', event => {
    if (menu.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
  }, { passive: true });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    summary?.focus({ preventScroll: true });
  });

  window.addEventListener('pageshow', () => {
    menu.open = false;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installMobileMenu, { once: true });
} else {
  installMobileMenu();
}
