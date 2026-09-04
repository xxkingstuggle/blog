import { getListedPosts } from '../lib/posts';
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

function escapeCdata(value: string) {
	return value.replace(/\]\]>/g, ']]]]><![CDATA[>');
}

export async function GET() {
	const posts = await getListedPosts();
	const items = posts.map((post) => {
		const url = new URL(`/posts/${post.id}/`, siteConfig.url).toString();
		return `
		<item>
			<title>${escapeXml(post.data.title)}</title>
			<link>${url}</link>
			<guid>${url}</guid>
			<description>${escapeXml(post.data.description)}</description>
			<pubDate>${post.data.pubDate.toUTCString()}</pubDate>
			<category>${post.data.tags.map(escapeXml).join('</category><category>')}</category>
				<content:encoded><![CDATA[${escapeCdata(post.body ?? '')}]]></content:encoded>
		</item>`;
	}).join('');

	const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
	<channel>
		<title>${escapeXml(siteConfig.name)}</title>
		<link>${siteConfig.url}</link>
		<description>${escapeXml(siteConfig.description)}</description>
		<language>zh-CN</language>
		<lastBuildDate>${(posts[0]?.data.updatedDate ?? posts[0]?.data.pubDate ?? new Date()).toUTCString()}</lastBuildDate>
		${items}
	</channel>
</rss>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
	});
}
