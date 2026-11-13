/**
 * One on-screen muted preview at a time.
 * No network fetch before viewport proximity, no external player or shader.
 * Sampling 24x14 pixels at <= 0.7Hz makes the moving image influence both
 * its glass stage and the page-wide optical field without full-frame reads.
 */
function installGalleryVideo(): void {
  const videos = [...document.querySelectorAll<HTMLVideoElement>('[data-motion-video]')];
  const manualVideos = [...document.querySelectorAll<HTMLVideoElement>('[data-video-light]')];
  if (!videos.length && !manualVideos.length) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection;
  const device = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const constrained = Boolean(connection?.saveData ||
    /(^|-)2g$/.test(connection?.effectiveType ?? '') ||
    (device !== undefined && device <= 2));
  const canAutoPlay = () => !reduced.matches && !constrained;

  // One reusable tiny surface. No per-frame allocations and no frame-by-frame
  // sampling of the full size of a video.
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 14;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const lastSamples = new WeakMap<HTMLVideoElement, number>();
  let active: HTMLVideoElement | null = null;

  function paintVideoLight(video: HTMLVideoElement): void {
    if (!context || video.readyState < 2 || active !== video) return;
    const now = performance.now();
    if (now - (lastSamples.get(video) ?? 0) < 1400) return;
    lastSamples.set(video, now);
    try {
      context.drawImage(video, 0, 0, 24, 14);
      const pixels = context.getImageData(0, 0, 24, 14).data;
      let r = 0, g = 0, b = 0, weight = 0, r2 = 0, g2 = 0, b2 = 0, w2 = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index], green = pixels[index + 1], blue = pixels[index + 2];
        const brightness = Math.max(red, green, blue);
        if (brightness < 24) continue;
        const chroma = Math.max(red,green,blue) - Math.min(red,green,blue);
        const factor = 0.35 + chroma / 255;
        r += red * factor; g += green * factor; b += blue * factor; weight += factor;
        if (index % 8 === 0) {
          r2 += red * factor; g2 += green * factor; b2 += blue * factor; w2 += factor;
        }
      }
      if (weight < 1) return;
      const normalize = (n: number) => Math.round(Math.max(38,Math.min(225,n)));
      const primary = [r,g,b].map(value => normalize(value / weight)).join(', ');
      const secondary = w2 > 0
        ? [r2,g2,b2].map(value => normalize(value / w2 * .72 + 52)).join(', ')
        : primary;
      const surface = video.closest<HTMLElement>('[data-glass-media]');
      const card = video.closest<HTMLElement>('.gallery-card, .studio-motion-well');
      const item = card?.closest<HTMLElement>('.gallery-item');
      if (!surface || !card) return;
      for (const element of [surface, card, ...(item ? [item] : [])]) {
        element.style.setProperty('--glass-primary-rgb', primary);
        element.style.setProperty('--glass-secondary-rgb', secondary);
      }
      surface.dispatchEvent(new CustomEvent('glass-palette-ready', { bubbles: true }));
    } catch {
      // Cross-origin videos or an unsupported canvas fall back to poster light.
    }
  }

  function stop(video: HTMLVideoElement) {
    video.pause();
    video.closest<HTMLElement>('.gallery-card, .studio-motion-well')?.setAttribute('data-motion-playing', 'false');
  }

  async function activate(video: HTMLVideoElement): Promise<void> {
    if (!canAutoPlay() || document.hidden) return;
    if (active === video && !video.paused) return;
    if (active && active !== video) stop(active);
    active = video;
    if (!video.getAttribute('src')) {
      const url = video.dataset.src;
      // Local assets only: remote video requests cannot silently bypass budgets.
      if (!url?.startsWith('/media/')) return;
      video.src = url;
      video.preload = 'metadata';
      video.load();
    }
    try { await video.play(); }
    catch { video.closest<HTMLElement>('.gallery-card')?.setAttribute('data-motion-playing', 'false'); }
  }

  function stopAll() {
    videos.forEach(stop);
    active = null;
  }

  if ('IntersectionObserver' in window) {
    const visible = new Map<HTMLVideoElement, number>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting && entry.intersectionRatio >= .45) visible.set(video, entry.intersectionRatio);
        else visible.delete(video);
      }
      const best = [...visible].sort((a,b) => b[1] - a[1])[0]?.[0];
      if (best && canAutoPlay() && !document.hidden) void activate(best);
      else stopAll();
    }, { threshold: [0,.2,.45,.65,.9], rootMargin: '32px 0px' });
    videos.forEach(video => observer.observe(video));
  }

  videos.forEach(video => {
    video.addEventListener('playing', () => {
      video.closest<HTMLElement>('.gallery-card')?.setAttribute('data-motion-playing','true');
      paintVideoLight(video);
    });
    video.addEventListener('timeupdate', () => paintVideoLight(video), { passive:true });
    video.addEventListener('pause', () => {
      video.closest<HTMLElement>('.gallery-card')?.setAttribute('data-motion-playing','false');
    });
    video.addEventListener('error', () => {
      video.closest<HTMLElement>('.gallery-card')?.setAttribute('data-motion-playing','false');
      if (active === video) active = null;
    });
    video.closest<HTMLElement>('.gallery-card')?.addEventListener('pointerenter', () => {
      if (canAutoPlay()) void activate(video);
    }, { passive: true });
  });

  manualVideos.forEach(video => {
    video.addEventListener('playing', () => {
      active = video;
      video.closest<HTMLElement>('.studio-motion-well')?.setAttribute('data-motion-playing','true');
      paintVideoLight(video);
    });
    video.addEventListener('timeupdate', () => paintVideoLight(video), { passive:true });
    video.addEventListener('pause', () => {
      video.closest<HTMLElement>('.studio-motion-well')?.setAttribute('data-motion-playing','false');
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAll();
      manualVideos.forEach(video => video.pause());
    }
  });
  reduced.addEventListener?.('change', () => {
    if (reduced.matches) stopAll();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installGalleryVideo, { once:true });
} else {
  installGalleryVideo();
}
