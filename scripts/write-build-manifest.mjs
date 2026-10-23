import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, relative, sep } from 'node:path';
import { parse } from 'yaml';

const root = resolve(new URL('..', import.meta.url).pathname);
const contentRoot = resolve(root, 'src/content/blog');
const dist = resolve(root, 'dist');
const publicDir = resolve(root, 'public');

function git(command, fallback) {
	try {
		return execFileSync('git', command, { cwd: root, encoding: 'utf8' }).trim() || fallback;
	} catch {
		return fallback;
	}
}

function gitBlobSha(content) {
	const bytes = Buffer.from(content, 'utf8');
	const header = Buffer.from(`blob ${bytes.byteLength}\0`, 'utf8');
	return createHash('sha1').update(Buffer.concat([header, bytes])).digest('hex');
}

function normalizeDateString(value) {
	if (!value) return '';
	if (value instanceof Date && !Number.isNaN(value.valueOf())) {
		return value.toISOString().slice(0, 10);
	}
	const str = String(value).trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
	const parsed = new Date(str);
	return Number.isNaN(parsed.valueOf()) ? str : parsed.toISOString().slice(0, 10);
}

const KNOWN_FRONTMATTER_KEYS = new Set([
	'title',
	'pubDate',
	'updatedDate',
	'description',
	'tags',
	'draft',
	'listed',
	'aliases',
	'featured',
	'kind',
	'presentation',
	'kicker',
	'cover',
]);

const providerSha = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
const sha = providerSha || git(['rev-parse', 'HEAD'], 'local');
const dirty = providerSha ? false : git(['status', '--porcelain'], '') !== '';
if (process.env.CI && !providerSha && dirty) {
	throw new Error('Refusing to create a release manifest from a dirty CI checkout.');
}
const manifest = {
	commitSha: sha,
	dirty,
	generatedAt: new Date().toISOString(),
	app: 'myzjx.com',
};

const files = (await readdir(contentRoot, { recursive: true, withFileTypes: true }))
	.filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
	.map((entry) => resolve(entry.parentPath, entry.name));

const articles = [];
for (const file of files) {
	const raw = await readFile(file, 'utf8');
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
	const rawFrontmatter = match ? match[1] : '';
	const body = match ? raw.slice(match[0].length).replace(/^\r?\n/, '').replace(/\s+$/, '') : raw;
	const fm = rawFrontmatter ? (parse(rawFrontmatter) ?? {}) : {};
	const relPath = relative(root, file).split(sep).join('/');
	const slug = relative(contentRoot, file).split(sep).join('/').replace(/\.mdx?$/, '');
	const blobSha = gitBlobSha(raw);

	const extraFrontmatter = {};
	for (const [key, value] of Object.entries(fm)) {
		if (!KNOWN_FRONTMATTER_KEYS.has(key) && value !== undefined) {
			extraFrontmatter[key] = value;
		}
	}

	const hasMdxFeatures =
		relPath.endsWith('.mdx') ||
		/^\s*import\s+.+from\s+['"].+['"]/m.test(body) ||
		/<[A-Z][A-Za-z0-9]*\b/.test(body);

	articles.push({
		id: `repo:${slug}`,
		slug,
		title: String(fm.title ?? slug),
		description: String(fm.description ?? fm.title ?? ''),
		body,
		pub_date: normalizeDateString(fm.pubDate) || new Date().toISOString().slice(0, 10),
		updated_date: normalizeDateString(fm.updatedDate) || null,
		tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
		kind: ['thought', 'project', 'update'].includes(String(fm.kind)) ? String(fm.kind) : 'thought',
		presentation: ['article', 'feature'].includes(String(fm.presentation)) ? String(fm.presentation) : 'article',
		featured: fm.featured === true ? 1 : 0,
		kicker: typeof fm.kicker === 'string' ? fm.kicker : null,
		listed: fm.listed === false ? 0 : 1,
		draft: fm.draft === true,
		aliases: Array.isArray(fm.aliases) ? fm.aliases.map(String) : [],
		cover: typeof fm.cover === 'string' ? fm.cover : null,
		extra_frontmatter: extraFrontmatter,
		source_path: relPath,
		source_blob_sha: blobSha,
		has_mdx: hasMdxFeatures,
	});
}

articles.sort((a, b) => String(b.pub_date).localeCompare(String(a.pub_date)));

const contentCatalog = {
	commitSha: sha,
	generatedAt: manifest.generatedAt,
	articles,
};

await mkdir(dist, { recursive: true });
await mkdir(publicDir, { recursive: true });
await writeFile(resolve(dist, '__build.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(resolve(dist, '__content.json'), `${JSON.stringify(contentCatalog, null, 2)}\n`, 'utf8');
await writeFile(resolve(publicDir, '__content.json'), `${JSON.stringify(contentCatalog, null, 2)}\n`, 'utf8');
console.log(`wrote dist/__build.json and __content.json (${articles.length} repo articles, ${sha}${dirty ? ', dirty' : ''})`);
