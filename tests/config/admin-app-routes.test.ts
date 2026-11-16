import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('private app entry paths are rewritten through the authenticated Worker with either slash form', () => {
  const cfg = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const rewrites = cfg.rewrites as Array<{ source: string; destination: string }>;
  const catchAllIndex = rewrites.findIndex((rule) => rule.source === '/admin/:path*');
  assert.notEqual(catchAllIndex, -1, 'generic admin Worker rewrite must remain configured');

  const routes = [
    { source: '/admin/apps', destination: 'https://blog-production.guozhongeba.workers.dev/admin/apps/' },
    { source: '/admin/apps/', destination: 'https://blog-production.guozhongeba.workers.dev/admin/apps/' },
    { source: '/admin/apps/studio-notes', destination: 'https://blog-production.guozhongeba.workers.dev/admin/apps/studio-notes/' },
    { source: '/admin/apps/studio-notes/', destination: 'https://blog-production.guozhongeba.workers.dev/admin/apps/studio-notes/' },
  ];

  for (const expected of routes) {
    const rule = rewrites.find((candidate) => candidate.source === expected.source);
    assert.ok(rule, 'explicit authenticated rewrite missing: ' + expected.source);
    assert.equal(rule.destination, expected.destination);
    assert.ok(rewrites.indexOf(rule) < catchAllIndex, 'explicit app route must precede the generic admin rewrite');
  }
});
