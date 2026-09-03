import { getPosts } from '../lib/posts';
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

export async function GET() {
	const posts = await getPosts();
	const paths = ['/', '/posts/', '/about/', '/archive/', '/tags/', ...posts.map((post) => `/posts/${post.id}/`)];
	const urls = paths.map((path) => `\n\t<url><loc>${escapeXml(new URL(path, siteConfig.url).toString())}</loc></url>`).join('');
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`;
	return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
