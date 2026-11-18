import test from 'node:test';
import assert from 'node:assert/strict';
import {checkVisualSources, expectedGlobalStyles} from '../../scripts/verify-visual-architecture.mjs';

const good = {
  globalCss: expectedGlobalStyles.map(file => "@import './" + file + "';").join('\n'),
  cssFiles: {'src/styles/cloth-media.css': '@media (prefers-reduced-motion:reduce) {}'},
  codeFiles: {'src/scripts/cloth-pressure.ts': "document.addEventListener('pointermove', onMove);"}
};
test('current style owner map passes', () => {
  assert.deepEqual(checkVisualSources(good).errors, []);
});
test('new global CSS override fails with actionable diagnostic', () => {
  const r = checkVisualSources({...good, globalCss: good.globalCss + "\n@import './extra-override.css';"});
  assert.match(r.errors.join('\n'), /VISUAL-CSS-001/);
});
test('new important overrides fail with actionable diagnostic', () => {
  const cssFiles = {...good.cssFiles, 'src/styles/extra.css': 'x{color:red!important;}'.repeat(112)};
  assert.match(checkVisualSources({...good, cssFiles}).errors.join('\n'), /VISUAL-CSS-002/);
});
test('global pointer spotlight is rejected', () => {
  const codeFiles = {...good.codeFiles, 'src/pages/index.astro': '<div class="studio-kinetic-field"></div>'};
  assert.match(checkVisualSources({...good, codeFiles}).errors.join('\n'), /VISUAL-MOTION-003/);
});
test('new global cursor listener is rejected', () => {
  const codeFiles = {...good.codeFiles, 'src/scripts/new-glow.ts': "document.addEventListener('mousemove', updateGlow);"};
  assert.match(checkVisualSources({...good, codeFiles}).errors.join('\n'), /VISUAL-MOTION-004/);
});
test('reduced motion fallback cannot disappear', () => {
  const cssFiles = {...good.cssFiles, 'src/styles/cloth-media.css': 'a{opacity:1}'};
  assert.match(checkVisualSources({...good, cssFiles}).errors.join('\n'), /VISUAL-A11Y-005/);
});
