import { getAllTags, getListedPosts } from '../lib/posts';
import { SOFTWARE_PRODUCTS } from '../lib/software';
import { siteConfig } from '../config';

function escapeXml(value: string) {
	return value.replace(/[<>&'\"]/g, (character) => ({
		'<': '&lt;',
		'>': '&gt;',
		'&': '&amp;',
		"'": '&apos;',
		'\"': '&quot;',
	}[character] ?? character));
}

function extractIsoDate(raw: string, fallback: string): string {
	const match = raw.match(/\d{4}-\d{2}-\d{2}/);
	if (!match) return fallback;
	const parsed = new Date(`${match[0]}T00:00:00.000Z`);
	return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

export async function GET() {
	const posts = await getListedPosts();
	const latestPostDate = posts[0]
		? (posts[0].data.updatedDate ?? posts[0].data.pubDate).toISOString()
		: new Date().toISOString();

	const entries: Array<{ path: string; lastmod: string }> = [
		{ path: '/', lastmod: latestPostDate },
		{ path: '/software/', lastmod: latestPostDate },
		{ path: '/posts/', lastmod: latestPostDate },
		{ path: '/about/', lastmod: latestPostDate },
		{ path: '/archive/', lastmod: latestPostDate },
		{ path: '/tags/', lastmod: latestPostDate },
		{ path: '/links/', lastmod: latestPostDate },
		...SOFTWARE_PRODUCTS.map((product) => ({
			path: `/software/${product.slug}/`,
			lastmod: extractIsoDate(product.verifiedAt || product.releaseDate, latestPostDate),
		})),
		...posts.map((post) => ({
			path: `/posts/${post.id}/`,
			lastmod: (post.data.updatedDate ?? post.data.pubDate).toISOString(),
		})),
		...getAllTags(posts).map((tag) => {
			const tagPosts = posts.filter((post) => post.data.tags.includes(tag));
			const tagLastmod = tagPosts[0]
				? (tagPosts[0].data.updatedDate ?? tagPosts[0].data.pubDate).toISOString()
				: latestPostDate;
			return {
				path: `/tags/${encodeURIComponent(tag)}/`,
				lastmod: tagLastmod,
			};
		}),
	];

	const urls = entries
		.map(
			({ path, lastmod }) =>
				`\n\t<url><loc>${escapeXml(new URL(path, siteConfig.url).toString())}</loc><lastmod>${escapeXml(lastmod)}</lastmod></url>`
		)
		.join('');
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`;
	return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
