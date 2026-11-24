/**
 * Build-time, zero-dependency media budget gate.
 * Reports real emitted sizes instead of speculative performance scores.
 * Does not contact production or generate an extra Vercel build.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const home = join(dist,'index.html');

for(const path of [home]) {
  assert.ok(existsSync(path),'required production artifact missing: '+path);
}
const html=readFileSync(home,'utf-8');
assert.ok(!/<iframe[^>]+(?:youtube|vimeo)/i.test(html),
  'no heavyweight third-party video iframe in the homepage');

const walk = dir => readdirSync(dir, { withFileTypes:true })
  .flatMap(entry=>entry.isDirectory() ? walk(join(dir,entry.name)) : [join(dir,entry.name)]);
const assets=walk(join(dist,'_astro'));
const bytes = ext => assets.filter(p=>p.endsWith(ext))
  .reduce((sum,p)=>sum+statSync(p).size,0);
const jsBytes=bytes('.js'), cssBytes=bytes('.css');
const kib=n=>(n/1024).toFixed(1)+' KiB';
console.log('MEDIA BUDGET:',JSON.stringify({
  buildJs:kib(jsBytes),buildCss:kib(cssBytes),
  note:'JS/CSS totals include all generated routes; browser loads only linked chunks'
}));
assert.ok(jsBytes <= 1024*1024,
  'aggregate generated JS exceeds 1 MiB; inspect accidental heavy dependencies');
