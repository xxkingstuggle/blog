import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Current audited ownership map. New layers need evidence and deliberate review.
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const expectedGlobalStyles = [
  'tokens.css', 'base.css', 'components.css', 'journal.css',
  'article.css', 'brand.css', 'motion.css', 'godly.css',
  'godly-fidelity.css', 'glass-media.css', 'ambient-editorial.css',
  'optical-system.css', 'chromatic-atmosphere.css',
  'cloth-media.css', 'theme-coherence.css'
];
export const initialImportantCeiling = 111;

export function checkVisualSources({globalCss, cssFiles, codeFiles}) {
  const errors = [];
  const actual = [...globalCss.matchAll(/@import\s+['"]\.\/([^'"]+)['"]\s*;/g)].map(m => m[1]);
  if (JSON.stringify(actual) !== JSON.stringify(expectedGlobalStyles)) {
    errors.push('VISUAL-CSS-001: global.css style import order changed. Reconcile style owners and delete old layers instead of adding override files. Found: ' + actual.join(', '));
  }
  const important = Object.values(cssFiles).reduce((sum, source) => sum + (source.match(/!important\b/g) || []).length, 0);
  if (important > initialImportantCeiling) {
    errors.push('VISUAL-CSS-002: !important count grew to ' + important + ' (baseline ' + initialImportantCeiling + '). Resolve selector ownership instead of stacking another emergency override.');
  }
  for (const [path, source] of Object.entries(codeFiles)) {
    if (/\bstudio-kinetic-field\b/.test(source)) {
      errors.push('VISUAL-MOTION-003: ' + path + ' reintroduces the removed global pointer spotlight.');
    }
    if (path !== 'src/scripts/cloth-pressure.ts' &&
        /(?:document|window)\.addEventListener\(\s*['"\x60](?:pointermove|mousemove)['"\x60]/.test(source)) {
      errors.push('VISUAL-MOTION-004: ' + path + ' adds a global cursor listener outside its assigned owner.');
    }
  }
  const cloth = cssFiles['src/styles/cloth-media.css'] || '';
  if (!cloth.includes('prefers-reduced-motion:reduce')) {
    errors.push('VISUAL-A11Y-005: reduced-motion fallback disappeared from cloth-media.css.');
  }
  return {errors, importedStyles: actual.length, importantDeclarations: important, examinedCssFiles: Object.keys(cssFiles).length};
}

function walkFiles(dir, output = []) {
  for (const item of readdirSync(dir, {withFileTypes: true})) {
    const p = join(dir, item.name);
    if (item.isDirectory()) walkFiles(p, output);
    else output.push(p);
  }
  return output;
}

export function inspectProject(projectRoot = root) {
  const globalCss = readFileSync(join(projectRoot, 'src/styles/global.css'), 'utf8');
  const cssFiles = Object.fromEntries(
    walkFiles(join(projectRoot, 'src/styles')).filter(p => p.endsWith('.css'))
      .map(p => [relative(projectRoot, p), readFileSync(p, 'utf8')]));
  const codeFiles = Object.fromEntries(
    walkFiles(join(projectRoot, 'src')).filter(p => /\.(?:astro|ts|js)$/.test(p))
      .map(p => [relative(projectRoot, p), readFileSync(p, 'utf8')]));
  return checkVisualSources({globalCss, cssFiles, codeFiles});
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = inspectProject();
  console.log('MYZJX visual guard: ' + result.importedStyles + ' active global imports, ' +
    result.importantDeclarations + ' !important occurrences across ' + result.examinedCssFiles + ' CSS files');
  if (result.errors.length) {
    for (const problem of result.errors) console.error(problem);
    process.exitCode = 1;
  } else {
    console.log('PASS: No new legacy effects or CSS override layers detected. This does not certify aesthetic quality.');
  }
}
