/** Adaptive mobile navigation: stay discoverable, avoid covering cards while scrolling. */
function installMobileDock() {
  const dock = document.querySelector<HTMLElement>('.studio-mobile-dock');
  if (!dock) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastY = window.scrollY;
  let raf = 0;
  let reopenTimer = 0;
  function show() {dock.classList.remove('is-hidden');}
  function onScroll() {
    if(raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      if(y < 130 || delta < -8) show();
      else if(delta > 9 && !motion.matches && !dock.matches(':focus-within')) dock.classList.add('is-hidden');
      if(reopenTimer) clearTimeout(reopenTimer);
      reopenTimer = window.setTimeout(show, 1200);
      lastY = y;
    });
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  dock.addEventListener('focusin',show);
  window.addEventListener('pageshow',()=>{lastY=window.scrollY;show();});
  motion.addEventListener?.('change',show);
}
if(typeof window !== 'undefined') {
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installMobileDock,{once:true});
  else installMobileDock();
}
