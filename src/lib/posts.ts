import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

export async function getPosts() {
	const posts = await getCollection('blog', ({ data }) => !data.draft);
	return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function formatDate(date: Date) {
	return new Intl.DateTimeFormat('zh-CN', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	}).format(date);
}

export function getReadingTime(body = '') {
	const chineseCharacters = (body.match(/[\u4e00-\u9fff]/g) ?? []).length;
	const latinWords = (body.match(/[A-Za-z0-9]+/g) ?? []).length;
	const minutes = Math.max(1, Math.ceil((chineseCharacters / 450) + (latinWords / 200)));
	return `${minutes} 分钟阅读`;
}

export function getAllTags(posts: BlogPost[]) {
	return [...new Set(posts.flatMap((post) => post.data.tags))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}
