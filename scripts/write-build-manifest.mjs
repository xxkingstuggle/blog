import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const dist = resolve(root, 'dist');

function git(command, fallback) {
	try {
		return execFileSync('git', command, { cwd: root, encoding: 'utf8' }).trim() || fallback;
	} catch {
		return fallback;
	}
}

const sha = git(['rev-parse', 'HEAD'], 'local');
const dirty = git(['status', '--porcelain'], '') !== '';
if (process.env.CI && dirty) {
	throw new Error('Refusing to create a release manifest from a dirty CI checkout.');
}
const manifest = {
	commitSha: sha,
	dirty,
	generatedAt: new Date().toISOString(),
	app: 'xingx.cc.cd',
};

await mkdir(dist, { recursive: true });
await writeFile(resolve(dist, '__build.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`wrote dist/__build.json (${sha}${dirty ? ', dirty' : ''})`);
