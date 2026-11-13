import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('iteration workspace uses shared MYZJX theme tokens instead of a hard-coded palette', () => {
  const page = fs.readFileSync('src/pages/admin-shell/iteration/index.astro', 'utf8');
  const css = fs.readFileSync('src/styles/iteration.css', 'utf8');
  assert.match(page, /import ['"]\.\.\/\.\.\/\.\.\/styles\/iteration\.css['"]/);
  assert.doesNotMatch(page, /<style>/);
  assert.match(css, /\.iteration-goal h2\s*\{[^}]*color:\s*var\(--text\)/s);
  assert.match(css, /\.iteration-goal\s*\{[^}]*background:\s*var\(--surface\)/s);
  assert.match(css, /\.iteration-step\.is-selected\s*\{[^}]*background:\s*var\(--accent-soft\)/s);
  assert.match(css, /\.iteration-state\[data-status='error'\]/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'page-specific hardcoded colors drift from dark mode');
});
