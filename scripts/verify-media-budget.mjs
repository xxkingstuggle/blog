/**
 * Build-time, zero-dependency media budget gate.
 * Reports real emitted sizes instead of speculative performance scores.
 * Does not contact production or generate an extra Vercel build.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const video = join(dist,'media','motion-study.mp4');
const poster = join(dist,'media','motion-study-poster.svg');
const home = join(dist,'index.html');
const detail = join(dist,'lab','motion','index.html');

for(const path of [video,poster,home,detail]) {
  assert.ok(existsSync(path),'required production artifact missing: '+path);
}
const videoBytes=statSync(video).size;
const posterBytes=statSync(poster).size;
assert.ok(videoBytes > 1000 && videoBytes <= 24*1024,
  '4s local H.264 preview must be within 24 KiB');
assert.ok(posterBytes <= 12*1024,
  'static vector poster must be within 12 KiB');
const html=readFileSync(home,'utf-8');
const motion=readFileSync(detail,'utf-8');
assert.ok(html.includes('data-motion-video') && html.includes('data-src="/media/motion-study.mp4"'),
  'homepage must use data-src for deferred network load');
const videoTag=html.match(/<video\b[^>]*data-motion-video[^>]*>/)?.[0];
assert.ok(videoTag && !/\s+src=/.test(videoTag) && /preload="none"/.test(videoTag),
  'homepage must not eagerly preload an autoplay preview');
assert.ok(!/<iframe[^>]+(?:youtube|vimeo)/i.test(html),
  'no heavyweight third-party video iframe in the homepage');
assert.ok(motion.includes('src="/media/motion-study.mp4"') && motion.includes('controls'),
  'motion lab must expose native video controls and functional video URL');
assert.ok(/data-glass-media/.test(motion),'video scene should support sampling');

const walk = dir => readdirSync(dir, { withFileTypes:true })
  .flatMap(entry=>entry.isDirectory() ? walk(join(dir,entry.name)) : [join(dir,entry.name)]);
const assets=walk(join(dist,'_astro'));
const bytes = ext => assets.filter(p=>p.endsWith(ext))
  .reduce((sum,p)=>sum+statSync(p).size,0);
const jsBytes=bytes('.js'), cssBytes=bytes('.css');
const kib=n=>(n/1024).toFixed(1)+' KiB';
console.log('MEDIA BUDGET:',JSON.stringify({
  video:kib(videoBytes),poster:kib(posterBytes),
  totalVideoAndPoster:kib(videoBytes+posterBytes),
  buildJs:kib(jsBytes),buildCss:kib(cssBytes),
  note:'JS/CSS totals include all generated routes; browser loads only linked chunks'
}));
assert.ok(jsBytes <= 1024*1024,
  'aggregate generated JS exceeds 1 MiB; inspect accidental heavy dependencies');
