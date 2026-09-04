import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;
export type PostKind = 'thought' | 'project' | 'update';
export type PostPresentation = 'article' | 'feature';

export const KIND_LABELS: Record<PostKind, string> = {
	thought: '思考',
	project: '项目',
	update: '近况',
};

export const KIND_SLUGS: Record<PostKind, string> = {
	thought: 'thoughts',
	project: 'projects',
	update: 'updates',
};

export interface GetPostsOptions {
	kind?: PostKind;
}

export async function getPublishedPosts(options: GetPostsOptions = {}) {
	const { kind } = options;
	const posts = await getCollection('blog', ({ data }) => {
		if (data.draft) return false;
		if (kind && data.kind !== kind) return false;
		return true;
	});
	return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getListedPosts(options: GetPostsOptions = {}) {
	const posts = await getPublishedPosts(options);
	return posts.filter((post) => post.data.listed !== false);
}

/**
 * Backwards-compatible alias for public index consumers. New code should use
 * getListedPosts() or getPublishedPosts() to make visibility intent explicit.
 */
export async function getPosts(options: GetPostsOptions = {}) {
	return getListedPosts(options);
}

export async function getFeaturedPost() {
	const posts = await getListedPosts();
	return posts.find((post) => post.data.featured) ?? posts[0];
}

export async function getProjectPosts() {
	return getListedPosts({ kind: 'project' });
}

export async function getNextListedPost(current: BlogPost) {
	const posts = await getListedPosts();
	return posts.find((post) => post.data.pubDate.valueOf() < current.data.pubDate.valueOf()) ?? null;
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
