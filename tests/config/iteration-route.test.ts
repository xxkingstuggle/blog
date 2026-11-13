import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('both iteration URL spellings are proxied through the existing authenticated Worker', () => {
  const cfg = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const rewrites = cfg.rewrites as Array<{source:string;destination:string}>;
  for (const source of ['/admin/iteration','/admin/iteration/']) {
    const rule = rewrites.find(x => x.source === source);
    assert.ok(rule, 'explicit rewrite missing: ' + source);
    assert.equal(rule.destination, 'https://blog-production.guozhongeba.workers.dev/admin/iteration/');
    assert.ok(rewrites.indexOf(rule) < rewrites.findIndex(x=>x.source==='/admin/:path*'));
  }
});
