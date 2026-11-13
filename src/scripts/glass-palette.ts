/**
 * Local, progressive image-palette extraction for MYZJX glass surfaces.
 *
 * Every source is already present on the page, is downsampled to 36×36, and
 * never leaves the browser. No third-party image services, CSS background URL
 * replication, per-frame canvas sampling or persistent storage is involved.
 */
type Palette = readonly [string, string];
type WeightedColor = { r: number; g: number; b: number; weight: number; hue: number };

const SAMPLE_SIZE = 36;
const paletteCache = new Map<string, Palette | null>();
const processed = new WeakSet<HTMLElement>();

function hueDegrees(r: number, g: number, b: number, maximum: number, chroma: number): number {
  if (chroma <= 0) return 0;
  let hue = 0;
  if (maximum === r) hue = ((g - b) / chroma) % 6;
  else if (maximum === g) hue = (b - r) / chroma + 2;
  else hue = (r - g) / chroma + 4;
  return (hue * 60 + 360) % 360;
}

function roundedColor(color: WeightedColor): string {
  const average = (value: number) => Math.max(0, Math.min(255, Math.round(value / color.weight)));
  return [average(color.r), average(color.g), average(color.b)].join(', ');
}

function extractPalette(image: HTMLImageElement): Palette | null {
  if (!image.naturalWidth || !image.naturalHeight) return null;
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;

  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const pixels = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
    // Neutral accumulators cover dark/monochrome interface screenshots where
    // thin accent pixels disappear during the thumbnail downsampling.
    const neutral: WeightedColor = { r:0, g:0, b:0, weight:0, hue:0 };
    const bins: WeightedColor[] = Array.from({ length: 12 }, (_, i) => ({
      r: 0, g: 0, b: 0, weight: 0, hue: i * 30,
    }));

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha < 168) continue;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const chroma = max - min;
      const light = (max + min) / 2;
      if (light > 25 && light < 245) {
        const n = (alpha / 255) * (0.4 + Math.min(1, chroma / 80));
        neutral.r += r * n;
        neutral.g += g * n;
        neutral.b += b * n;
        neutral.weight += n;
      }
      // Near-white UI screenshots and black backgrounds should not dominate
      // an accent palette; use their actual coloured pixels instead.
      if (chroma < 18 || light < 34 || light > 234) continue;
      const hue = hueDegrees(r, g, b, max, chroma);
      const bin = bins[Math.floor(hue / 30) % bins.length];
      const weight = Math.min(3.2, 0.35 + chroma / 60) * (alpha / 255);
      bin.r += r * weight;
      bin.g += g * weight;
      bin.b += b * weight;
      bin.weight += weight;
    }
    const ranked = bins.filter(bin => bin.weight >= 1).sort((a, b) => b.weight - a.weight);
    if (!ranked.length) {
      if (neutral.weight < 1) return null;
      const base = [neutral.r, neutral.g, neutral.b].map(n => n / neutral.weight);
      // Use a neutralized version of the actual screenshot colours.
      const main = base.map(n => Math.round(n * 0.55 + 120 * 0.45));
      const soft = base.map(n => Math.round(n * 0.35 + 186 * 0.65));
      return [main.join(', '), soft.join(', ')];
    }

    const primary = ranked[0];
    const second = ranked.find(bin => {
      const distance = Math.abs(bin.hue - primary.hue);
      return Math.min(distance, 360 - distance) >= 60 && bin.weight >= 2;
    });
    const rgbA = roundedColor(primary);
    // When an image contains only one meaningful hue, a softer version of
    // that hue produces a natural secondary glow without inventing a neon hue.
    const rgbB = second
      ? roundedColor(second)
      : [primary.r, primary.g, primary.b]
          .map(value => Math.round((value / primary.weight) * 0.64 + 195 * 0.36))
          .join(', ');
    return [rgbA, rgbB];
  } catch {
    // Cross-origin or undecodable images retain the CSS neutral fallback.
    return null;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

function applyPalette(surface: HTMLElement, palette: Palette): void {
  const card = surface.closest<HTMLElement>('.gallery-card');
  const elements = card ? [card, surface] : [surface];
  for (const element of elements) {
    element.style.setProperty('--glass-primary-rgb', palette[0]);
    element.style.setProperty('--glass-secondary-rgb', palette[1]);
    element.dataset.glassState = 'sampled';
  }
}

function attachSurface(surface: HTMLElement): void {
  if (processed.has(surface)) return;
  processed.add(surface);
  const image = surface.querySelector<HTMLImageElement>('img');
  if (!image) return;

  const sample = () => {
    if (!image.naturalWidth || !image.naturalHeight) return;
    const url = image.currentSrc || image.src;
    if (!url) return;
    let palette = paletteCache.get(url);
    if (palette === undefined) {
      palette = extractPalette(image);
      paletteCache.set(url, palette);
    }
    if (palette) applyPalette(surface, palette);
    else surface.dataset.glassState = 'fallback';
  };
  if (image.complete && image.naturalWidth > 0) sample();
  else image.addEventListener('load', sample, { once: true });
  image.addEventListener('error', () => { surface.dataset.glassState = 'fallback'; }, { once: true });
}

function installGlassPalette(): void {
  document.querySelectorAll<HTMLElement>('[data-glass-media]').forEach(attachSurface);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installGlassPalette, { once: true });
} else {
  installGlassPalette();
}
