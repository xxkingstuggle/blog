import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { parse } from 'yaml';

const root = resolve(new URL('..', import.meta.url).pathname);
const contentRoot = resolve(root, 'src/content/blog');
const output = resolve(root, 'dist/_redirects');
const reserved = new Set(['/', '/about', '/posts', '/archive', '/tags', '/links', '/admin', '/api', '/media', '/.well-known', '/robots.txt', '/rss.xml', '/sitemap.xml']);
const aliasPattern = /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const files = (await readdir(contentRoot, { recursive: true, withFileTypes: true }))
	.filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
	.map((entry) => resolve(entry.parentPath, entry.name));
const seen = new Map();
const redirects = [];

for (const file of files) {
	const source = await readFile(file, 'utf8');
	const match = source.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/);
	if (!match) continue;
	const frontmatter = parse(match[1]) ?? {};
	const aliases = frontmatter.aliases ?? [];
	if (!Array.isArray(aliases)) throw new Error(`${relative(root, file)}: aliases must be an array`);
	const slug = relative(contentRoot, file).split(sep).join('/').replace(/\.mdx?$/, '');
	for (const rawAlias of aliases) {
		const alias = typeof rawAlias === 'string' ? rawAlias.trim().replace(/\/$/, '') : '';
		if (!aliasPattern.test(alias) || reserved.has(alias)) throw new Error(`${relative(root, file)}: invalid or reserved alias ${JSON.stringify(rawAlias)}`);
		if (seen.has(alias)) throw new Error(`${relative(root, file)}: alias ${alias} is already owned by ${seen.get(alias)}`);
		seen.set(alias, relative(root, file));
		redirects.push(`${alias} /posts/${slug}/ 308`);
	}
}

await writeFile(output, `# Generated from src/content/blog frontmatter.\n${redirects.join('\n')}${redirects.length ? '\n' : ''}`, 'utf8');
console.log(`wrote dist/_redirects (${redirects.length} aliases)`);
