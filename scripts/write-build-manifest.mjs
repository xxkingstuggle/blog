import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const dist = resolve(root, 'dist');
const catalogMetaPath = resolve(root, 'worker/.generated/repo-catalog-meta.json');

function git(command, fallback) {
	try {
		return execFileSync('git', command, { cwd: root, encoding: 'utf8' }).trim() || fallback;
	} catch {
		return fallback;
	}
}

const providerSha = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
const sha = providerSha || git(['rev-parse', 'HEAD'], 'local');
const dirty = providerSha ? false : git(['status', '--porcelain'], '') !== '';
if (process.env.CI && !providerSha && dirty) {
	throw new Error('Refusing to create a release manifest from a dirty CI checkout.');
}

const catalogMeta = JSON.parse(await readFile(catalogMetaPath, 'utf8'));
if (catalogMeta.commitSha !== sha) {
	throw new Error(`Worker content catalog SHA ${catalogMeta.commitSha} does not match build SHA ${sha}.`);
}

const manifest = {
	commitSha: sha,
	dirty,
	generatedAt: new Date().toISOString(),
	app: 'myzjx.com',
};

await mkdir(dist, { recursive: true });
await writeFile(resolve(dist, '__build.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`wrote dist/__build.json (${sha}${dirty ? ', dirty' : ''}; ${catalogMeta.articleCount} articles bundled in Worker)`);
