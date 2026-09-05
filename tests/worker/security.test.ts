import assert from 'node:assert/strict';
import test from 'node:test';
import { testHelpers } from '../../worker/index.ts';

test('slug and source paths stay inside the blog collection', () => {
	assert.equal(testHelpers.isValidSlug('my-release-2'), true);
	assert.equal(testHelpers.isValidSlug('../workflow'), false);
	assert.equal(testHelpers.isValidSlug('UPPERCASE'), false);
	assert.equal(testHelpers.sourcePathForSlug('my-release'), 'src/content/blog/my-release.md');
	assert.equal(testHelpers.sourcePathForSlug('my-release', 'src/content/blog/my-release.mdx'), 'src/content/blog/my-release.mdx');
	assert.equal(testHelpers.sourcePathForSlug('my-release', '.github/workflows/deploy.yml'), null);
});

test('aliases are normalized and reserved routes are rejected', () => {
	assert.deepEqual(testHelpers.normalizeAliases(['/release/', '/notes']), ['/release', '/notes']);
	assert.equal(testHelpers.normalizeAliases(['/admin']), null);
	assert.equal(testHelpers.normalizeAliases(['/admin/settings']), null);
	assert.equal(testHelpers.normalizeAliases(['https://example.com']), null);
});

test('public URLs reject executable and local destinations', () => {
	assert.equal(testHelpers.safePublicUrl('https://example.com/path'), 'https://example.com/path');
	assert.equal(testHelpers.safePublicUrl('javascript:alert(1)'), null);
	assert.equal(testHelpers.safePublicUrl('http://127.0.0.1/admin'), null);
	assert.equal(testHelpers.safePublicUrl('http://[::1]/'), null);
	assert.equal(testHelpers.safePublicUrl('http://169.254.169.254/latest/meta-data'), null);
});

test('preview escapes raw HTML', () => {
	const output = testHelpers.safeMarkdownPreview('# Safe\n<img src=x onerror=alert(1)>');
	assert.match(output, /<h1>Safe<\/h1>/);
	assert.doesNotMatch(output, /<img/);
	assert.match(output, /&lt;img/);
});

test('image signatures must match their declared safe type', () => {
	assert.equal(testHelpers.hasValidImageSignature(new Uint8Array([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg'), true);
	assert.equal(testHelpers.hasValidImageSignature(new TextEncoder().encode('<svg onload=alert(1)>'), 'image/svg+xml'), false);
	assert.equal(testHelpers.hasValidImageSignature(new TextEncoder().encode('<svg onload=alert(1)>'), 'image/png'), false);
});

test('GitHub App PKCS#1 keys are wrapped as PKCS#8 for WebCrypto', () => {
	const pkcs1 = '-----BEGIN RSA PRIVATE KEY-----\nAQID\n-----END RSA PRIVATE KEY-----';
	const wrapped = testHelpers.pemToBytes(pkcs1);
	assert.equal(wrapped[0], 0x30);
	assert.deepEqual([...wrapped.slice(-5)], [0x04, 0x03, 0x01, 0x02, 0x03]);
});

import fs from 'node:fs';
import path from 'node:path';
import worker from '../../worker/index.ts';
import { DatabaseSync } from 'node:sqlite';

async function createTestEnv() {
	const db = new DatabaseSync(':memory:');
	const m1 = fs.readFileSync(path.resolve('migrations/0001_initial.sql'), 'utf8');
	const m2 = fs.readFileSync(path.resolve('migrations/0002_draft_version_and_comment_limits.sql'), 'utf8');
	db.exec(m1);
	db.exec(m2);

	const d1Adapter = {
		prepare(query: string) {
			const stmt = db.prepare(query);
			let boundValues: unknown[] = [];
			const statementObj = {
				bind(...values: unknown[]) {
					boundValues = values.map((v) => (v === undefined ? null : v));
					return statementObj;
				},
				async first<T = Record<string, unknown>>() {
					const row = stmt.get(...(boundValues as any[])) as T | undefined;
					return row ?? null;
				},
				async all<T = Record<string, unknown>>() {
					const results = stmt.all(...(boundValues as any[])) as T[];
					return { results, meta: { changes: 0 } };
				},
				async run() {
					const info = stmt.run(...(boundValues as any[]));
					return { results: [], meta: { changes: Number(info.changes) } };
				},
			};
			return statementObj;
		},
		async batch(statements: any[]) {
			const results = [];
			for (const stmt of statements) {
				results.push(await stmt.run());
			}
			return results;
		},
	};

	const keyPair = await crypto.subtle.generateKey(
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
		true,
		['sign'],
	);
	const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
	const privateKeyPem = '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(pkcs8).toString('base64') + '\n-----END PRIVATE KEY-----';

	const env = {
		ASSETS: { fetch: async () => new Response('ok') },
		DB: d1Adapter,
		PUBLIC_ORIGIN: 'https://test.local',
		ACCESS_ISSUER: '',
		ACCESS_AUDIENCE: '',
		ADMIN_EMAILS: '',
		CSRF_SECRET: 'test-csrf-secret-12345678901234567890',
		SESSION_SECRET: 'test-session-secret-12345678901234567890',
		ADMIN_GITHUB_LOGINS: 'admin-user',
		GITHUB_APP_ID: '12345',
		GITHUB_INSTALLATION_ID: '67890',
		GITHUB_PRIVATE_KEY: privateKeyPem,
		GITHUB_OWNER: 'testowner',
		GITHUB_REPO: 'testrepo',
		GITHUB_BRANCH: 'main',
	};

	const ctx = {
		waitUntil: (_promise: Promise<unknown>) => {},
	};

	const sessionCookie = await testHelpers.issueAdminSession('admin-user', env as any);
	const csrfToken = await testHelpers.issueCsrf('github:admin-user', env as any);

	function authedRequest(url: string, init: RequestInit = {}) {
		const headers = new Headers(init.headers);
		headers.set('Cookie', `__Host-xingx-admin=${sessionCookie}`);
		headers.set('Origin', 'https://test.local');
		headers.set('Sec-Fetch-Site', 'same-origin');
		if (init.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(init.method.toUpperCase())) {
			if (!headers.has('X-CSRF-Token')) {
				headers.set('X-CSRF-Token', csrfToken);
			}
		}
		return new Request(url, { ...init, headers });
	}

	return { db, env, ctx, authedRequest, sessionCookie, csrfToken };
}

test('客户端不能伪造或清空 SHA，且已保存草稿锁定 Slug', async () => {
	const { env, ctx, authedRequest, db } = await createTestEnv();

	// 1. 新建草稿时客户端提供 sourceBlobSha 会被忽略，保持为 NULL
	const createReq = authedRequest('https://test.local/api/admin/drafts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			slug: 'sha-guard',
			title: 'SHA Guard',
			body: 'Content',
			sourceBlobSha: '1111111111111111111111111111111111111111',
		}),
	});
	const createRes = await worker.fetch(createReq, env as any, ctx);
	assert.equal(createRes.status, 201);
	const { id } = (await createRes.json()) as { id: string };

	let row = db.prepare('SELECT slug, source_blob_sha, version FROM drafts WHERE id=?').get(id) as any;
	assert.equal(row.source_blob_sha, null);
	assert.equal(row.version, 1);

	// 2. 模拟后端发布写入了合法的 SHA
	db.prepare("UPDATE drafts SET source_blob_sha='real-blob-sha-1234' WHERE id=?").run(id);

	// 3. 客户端尝试清空或伪造 SHA，更新后依然保留真实的 SHA
	const updateReq = authedRequest(`https://test.local/api/admin/drafts/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			slug: 'sha-guard',
			title: 'SHA Guard Updated',
			body: 'Content updated',
			version: 1,
			sourceBlobSha: null,
		}),
	});
	const updateRes = await worker.fetch(updateReq, env as any, ctx);
	assert.equal(updateRes.status, 200);

	row = db.prepare('SELECT slug, source_blob_sha, version FROM drafts WHERE id=?').get(id) as any;
	assert.equal(row.source_blob_sha, 'real-blob-sha-1234');
	assert.equal(row.version, 2);

	// 4. 已保存草稿修改 Slug 必须被拒绝 (slug_immutable)
	const changeSlugReq = authedRequest(`https://test.local/api/admin/drafts/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			slug: 'different-slug',
			title: 'SHA Guard Updated',
			body: 'Content updated',
			version: 2,
		}),
	});
	const changeSlugRes = await worker.fetch(changeSlugReq, env as any, ctx);
	assert.equal(changeSlugRes.status, 422);
	const errBody = (await changeSlugRes.json()) as any;
	assert.equal(errBody.code, 'slug_immutable');
});

test('未保存内容不会被旧版本发布', async () => {
	const { env, ctx, authedRequest, db } = await createTestEnv();

	// 创建草稿（version 1）
	const createRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/drafts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: 'version-check', title: 'Version Check', body: 'V1' }),
		}),
		env as any,
		ctx,
	);
	const { id } = (await createRes.json()) as { id: string };

	// 更新草稿（version 变为 2）
	await worker.fetch(
		authedRequest(`https://test.local/api/admin/drafts/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: 'version-check', title: 'Version Check V2', body: 'V2', version: 1 }),
		}),
		env as any,
		ctx,
	);

	// 用旧版本号 version: 1 尝试发布，应返回版本冲突 409
	const publishRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/publish', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, version: 1 }),
		}),
		env as any,
		ctx,
	);
	assert.equal(publishRes.status, 409);
	const err = (await publishRes.json()) as any;
	assert.equal(err.code, 'draft_version_conflict');

	// 验证草稿未进入发布中状态
	const row = db.prepare('SELECT status FROM drafts WHERE id=?').get(id) as any;
	assert.equal(row.status, 'draft');
});

test('首次发布后保存 GitHub blob SHA，且第二次发布正常更新原文件', async () => {
	const { env, ctx, authedRequest, db } = await createTestEnv();

	// 创建草稿
	const createRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/drafts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: 'double-publish', title: 'Double Publish', body: 'Initial Body' }),
		}),
		env as any,
		ctx,
	);
	const { id } = (await createRes.json()) as { id: string };

	const originalFetch = globalThis.fetch;
	let githubFileSha: string | null = null;
	let lastPutSha: string | undefined = undefined;

	globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		if (url.includes('/access_tokens')) {
			return new Response(JSON.stringify({ token: 'mock-token' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
		}
		if (url.includes('/contents/src/content/blog/double-publish.md')) {
			if (init?.method === 'PUT') {
				const body = JSON.parse(String(init.body || '{}'));
				lastPutSha = body.sha;
				githubFileSha = 'blob-sha-v' + (lastPutSha ? '2' : '1');
				return new Response(JSON.stringify({ commit: { sha: 'commit-sha-' + githubFileSha }, content: { sha: githubFileSha } }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			if (!githubFileSha) {
				return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
			}
			return new Response(JSON.stringify({ sha: githubFileSha, path: 'src/content/blog/double-publish.md' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return originalFetch(input, init);
	};

	try {
		// 1. 首次发布
		const pub1 = await worker.fetch(
			authedRequest('https://test.local/api/admin/publish', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, version: 1 }),
			}),
			env as any,
			ctx,
		);
		assert.equal(pub1.status, 202);
		const pub1Body = (await pub1.json()) as any;
		assert.equal(pub1Body.sourceBlobSha, 'blob-sha-v1');

		// 检查 D1 记录保存了 blob sha
		let row = db.prepare('SELECT source_blob_sha, status, version FROM drafts WHERE id=?').get(id) as any;
		assert.equal(row.source_blob_sha, 'blob-sha-v1');
		assert.equal(row.status, 'deploying');
		assert.equal(lastPutSha, undefined); // 首次提交无 sha

		// 模拟构建部署完成，状态变为 published
		db.prepare("UPDATE drafts SET status='published' WHERE id=?").run(id);

		// 2. 修改草稿内容后保存
		const saveRes = await worker.fetch(
			authedRequest(`https://test.local/api/admin/drafts/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slug: 'double-publish', title: 'Double Publish Edit', body: 'Second Body', version: 1 }),
			}),
			env as any,
			ctx,
		);
		assert.equal(saveRes.status, 200);

		// D1 依然保留了 blob-sha-v1
		row = db.prepare('SELECT source_blob_sha, version FROM drafts WHERE id=?').get(id) as any;
		assert.equal(row.source_blob_sha, 'blob-sha-v1');
		assert.equal(row.version, 2);

		// 3. 第二次发布：正常带入 blob-sha-v1 更新原文件
		const pub2 = await worker.fetch(
			authedRequest('https://test.local/api/admin/publish', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, version: 2 }),
			}),
			env as any,
			ctx,
		);
		assert.equal(pub2.status, 202);
		const pub2Body = (await pub2.json()) as any;
		assert.equal(pub2Body.sourceBlobSha, 'blob-sha-v2');
		assert.equal(lastPutSha, 'blob-sha-v1'); // 第二次提交正确带入上一版本 blob sha

		row = db.prepare('SELECT source_blob_sha FROM drafts WHERE id=?').get(id) as any;
		assert.equal(row.source_blob_sha, 'blob-sha-v2');

		// 4. 模拟外部在 GitHub 修改了文件（SHA 不一致），触发冲突保护
		db.prepare("UPDATE drafts SET status='published' WHERE id=?").run(id);
		githubFileSha = 'external-modified-blob-sha';
		const pubConflict = await worker.fetch(
			authedRequest('https://test.local/api/admin/publish', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, version: 2 }),
			}),
			env as any,
			ctx,
		);
		assert.equal(pubConflict.status, 409);
		const conflictBody = (await pubConflict.json()) as any;
		assert.equal(conflictBody.code, 'source_changed');
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('友链后台接口需要管理员身份和 CSRF', async () => {
	const { env, ctx, authedRequest, sessionCookie } = await createTestEnv();

	// 1. 无凭证访问返回 401
	const unauthedRes = await worker.fetch(new Request('https://test.local/api/admin/links'), env as any, ctx);
	assert.equal(unauthedRes.status, 401);

	// 2. 有会话但缺少 CSRF 时 POST 返回 403
	const noCsrfReq = new Request('https://test.local/api/admin/links', {
		method: 'POST',
		headers: {
			Cookie: `__Host-xingx-admin=${sessionCookie}`,
			Origin: 'https://test.local',
			'Sec-Fetch-Site': 'same-origin',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ name: 'Friend', url: 'https://friend.com' }),
	});
	const noCsrfRes = await worker.fetch(noCsrfReq, env as any, ctx);
	assert.equal(noCsrfRes.status, 403);

	// 3. 有完整身份与 CSRF：新增成功 (201)
	const createRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/links', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Friend Blog', url: 'https://friend.com', description: 'Great blog', sortOrder: 1, status: 'active' }),
		}),
		env as any,
		ctx,
	);
	assert.equal(createRes.status, 201);
	const created = (await createRes.json()) as any;
	assert.equal(created.name, 'Friend Blog');

	// 4. 修改友链为 hidden
	const updateRes = await worker.fetch(
		authedRequest(`https://test.local/api/admin/links/${created.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Friend Blog Updated', url: 'https://friend.com', status: 'hidden', sortOrder: 2 }),
		}),
		env as any,
		ctx,
	);
	assert.equal(updateRes.status, 200);

	// 5. 公开接口 GET /api/links 不返回 hidden 状态的友链
	const pubRes = await worker.fetch(new Request('https://test.local/api/links'), env as any, ctx);
	assert.equal(pubRes.status, 200);
	const pubLinks = ((await pubRes.json()) as any).links;
	assert.equal(pubLinks.some((l: any) => l.id === created.id), false);

	// 6. 后台 GET /api/admin/links 返回所有友链（包括 hidden）
	const adminListRes = await worker.fetch(authedRequest('https://test.local/api/admin/links'), env as any, ctx);
	assert.equal(adminListRes.status, 200);
	const adminLinks = ((await adminListRes.json()) as any).links;
	assert.equal(adminLinks.some((l: any) => l.id === created.id), true);

	// 7. 删除友链
	const deleteRes = await worker.fetch(authedRequest(`https://test.local/api/admin/links/${created.id}`, { method: 'DELETE' }), env as any, ctx);
	assert.equal(deleteRes.status, 200);
	assert.equal(((await deleteRes.json()) as any).deleted, true);
});

test('评论审核状态转换正确', async () => {
	const { env, ctx, authedRequest, db } = await createTestEnv();

	// 插入待审核评论
	db.prepare("INSERT INTO comments (id, slug, author_name, body, status, created_at) VALUES ('c-1', 'post-1', 'Alice', 'Nice post!', 'pending', datetime('now'))").run();

	// 1. 公开 GET /api/comments?slug=post-1 不显示待审核评论
	let pubRes = await worker.fetch(new Request('https://test.local/api/comments?slug=post-1'), env as any, ctx);
	assert.equal(((await pubRes.json()) as any).comments.length, 0);

	// 2. 后台通过审核 (approved)
	let patchRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/comments/c-1', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: 'approved' }),
		}),
		env as any,
		ctx,
	);
	assert.equal(patchRes.status, 200);
	assert.equal(((await patchRes.json()) as any).status, 'approved');

	// 公开接口现在可以看到通过审核的评论
	pubRes = await worker.fetch(new Request('https://test.local/api/comments?slug=post-1'), env as any, ctx);
	assert.equal(((await pubRes.json()) as any).comments.length, 1);

	// 3. 拒绝评论 (rejected)
	patchRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/comments/c-1', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: 'rejected' }),
		}),
		env as any,
		ctx,
	);
	assert.equal(patchRes.status, 200);
	assert.equal(((await patchRes.json()) as any).status, 'rejected');

	// 4. 标记为垃圾评论 (spam)
	patchRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/comments/c-1', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: 'spam' }),
		}),
		env as any,
		ctx,
	);
	assert.equal(patchRes.status, 200);
	assert.equal(((await patchRes.json()) as any).status, 'spam');

	// 5. 无效状态返回 422
	const invalidPatch = await worker.fetch(
		authedRequest('https://test.local/api/admin/comments/c-1', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: 'invalid_status' }),
		}),
		env as any,
		ctx,
	);
	assert.equal(invalidPatch.status, 422);

	// 6. 删除评论
	const delRes = await worker.fetch(authedRequest('https://test.local/api/admin/comments/c-1', { method: 'DELETE' }), env as any, ctx);
	assert.equal(delRes.status, 200);
	assert.equal(((await delRes.json()) as any).deleted, true);

	const check = db.prepare('SELECT id FROM comments WHERE id=?').get('c-1');
	assert.equal(check, undefined);
});

test('定时检查排除隐藏友链，且检查期间隐藏的友链不会被回写公开', async () => {
	const { env, db } = await createTestEnv();

	// 插入三条友链：一条 active，一条 hidden，一条并发测试 active
	db.prepare("INSERT INTO links (id, name, url, status, sort_order, checked_at) VALUES ('link-1', 'Active Blog', 'https://friend1.example.com', 'active', 10, NULL)").run();
	db.prepare("INSERT INTO links (id, name, url, status, sort_order, checked_at) VALUES ('link-2', 'Hidden Blog', 'https://friend2.example.com', 'hidden', 20, NULL)").run();
	db.prepare("INSERT INTO links (id, name, url, status, sort_order, checked_at) VALUES ('link-3', 'Concurrent Blog', 'https://friend3.example.com', 'active', 30, NULL)").run();

	const originalFetch = globalThis.fetch;
	const fetchedUrls: string[] = [];

	globalThis.fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
		const url = String(input);
		fetchedUrls.push(url);

		// 当检查到 link-3 时，模拟管理员并发在后台将其设置为 hidden
		if (url.includes('friend3.example.com')) {
			db.prepare("UPDATE links SET status='hidden' WHERE id='link-3'").run();
		}

		return new Response('OK', { status: 200 });
	};

	try {
		await testHelpers.checkLinks(env as any);

		// 1. link-2 是 hidden，checkLinks() 查询时必须排除，因此从未向其发起网络请求
		assert.equal(fetchedUrls.some((u) => u.includes('friend2.example.com')), false);
		// link-1 和 link-3 都参与了检查
		assert.equal(fetchedUrls.some((u) => u.includes('friend1.example.com')), true);
		assert.equal(fetchedUrls.some((u) => u.includes('friend3.example.com')), true);

		// 2. 检查结果回写：link-1 在线，保持 active
		const link1 = db.prepare('SELECT status, checked_at FROM links WHERE id=?').get('link-1') as any;
		assert.equal(link1.status, 'active');
		assert.notEqual(link1.checked_at, null);

		// 3. link-2 原本是 hidden，检查后依然保持 hidden
		const link2 = db.prepare('SELECT status FROM links WHERE id=?').get('link-2') as any;
		assert.equal(link2.status, 'hidden');

		// 4. link-3 在检查网络请求期间被置为 hidden，回写时由于 status != 'hidden' 保护，未被覆盖为 active
		const link3 = db.prepare('SELECT status FROM links WHERE id=?').get('link-3') as any;
		assert.equal(link3.status, 'hidden');

		// 5. 公开接口 GET /api/links 验证：只返回 active 友链，hidden 绝不泄露
		const pubRes = await worker.fetch(new Request('https://test.local/api/links'), env as any, { waitUntil: () => {} } as any);
		assert.equal(pubRes.status, 200);
		const pubLinks = ((await pubRes.json()) as any).links;
		assert.equal(pubLinks.length, 1);
		assert.equal(pubLinks[0].id, 'link-1');
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('发布与保存草稿执行原子版本校验与并发状态互斥', async () => {
	const { env, ctx, authedRequest, db } = await createTestEnv();

	// 1. 创建草稿（初始 version 为 1）
	const createRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/drafts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: 'atomic-test', title: 'Atomic Test', body: 'Draft body' }),
		}),
		env as any,
		ctx,
	);
	assert.equal(createRes.status, 201);
	const { id } = (await createRes.json()) as { id: string };

	// 2. 发布请求缺少有效的 version（无 version、非数字、非整数、<=0）应当被拒绝 (428)
	const noVersionRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/publish', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id }),
		}),
		env as any,
		ctx,
	);
	assert.equal(noVersionRes.status, 428);
	const noVersionErr = (await noVersionRes.json()) as any;
	assert.equal(noVersionErr.code, 'draft_version_required');

	const invalidVersionRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/publish', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, version: 'invalid' }),
		}),
		env as any,
		ctx,
	);
	assert.equal(invalidVersionRes.status, 428);

	// 3. 发布时版本号冲突（例如传入 version: 99）返回 409
	const conflictVersionRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/publish', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, version: 99 }),
		}),
		env as any,
		ctx,
	);
	assert.equal(conflictVersionRes.status, 409);
	const conflictErr = (await conflictVersionRes.json()) as any;
	assert.equal(conflictErr.code, 'draft_version_conflict');

	// 4. 保存草稿缺少版本号应返回 428
	const saveNoVersionRes = await worker.fetch(
		authedRequest(`https://test.local/api/admin/drafts/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: 'atomic-test', title: 'Atomic Test', body: 'Updated body' }),
		}),
		env as any,
		ctx,
	);
	assert.equal(saveNoVersionRes.status, 428);
	const saveNoVersionErr = (await saveNoVersionRes.json()) as any;
	assert.equal(saveNoVersionErr.code, 'draft_version_required');

	// 5. 保存草稿时版本号冲突（传入 version: 99）返回 409
	const saveConflictRes = await worker.fetch(
		authedRequest(`https://test.local/api/admin/drafts/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: 'atomic-test', title: 'Atomic Test', body: 'Updated body', version: 99 }),
		}),
		env as any,
		ctx,
	);
	assert.equal(saveConflictRes.status, 409);
	const saveConflictErr = (await saveConflictRes.json()) as any;
	assert.equal(saveConflictErr.code, 'draft_version_conflict');

	// 6. 模拟状态为 publishing 时，并发的 publish 和 saveDraft 均被互斥拦截 (409 publish_in_progress)
	db.prepare("UPDATE drafts SET status='publishing' WHERE id=?").run(id);

	const pubInProgressRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/publish', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, version: 1 }),
		}),
		env as any,
		ctx,
	);
	assert.equal(pubInProgressRes.status, 409);
	const pubInProgressErr = (await pubInProgressRes.json()) as any;
	assert.equal(pubInProgressErr.code, 'publish_in_progress');

	const saveInProgressRes = await worker.fetch(
		authedRequest(`https://test.local/api/admin/drafts/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: 'atomic-test', title: 'Atomic Test', body: 'Updated body', version: 1 }),
		}),
		env as any,
		ctx,
	);
	assert.equal(saveInProgressRes.status, 409);
	const saveInProgressErr = (await saveInProgressRes.json()) as any;
	assert.equal(saveInProgressErr.code, 'publish_in_progress');

	// 7. 模拟状态为 deploying 时，并发的 publish 和 saveDraft 也被互斥拦截
	db.prepare("UPDATE drafts SET status='deploying' WHERE id=?").run(id);

	const pubDeployingRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/publish', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, version: 1 }),
		}),
		env as any,
		ctx,
	);
	assert.equal(pubDeployingRes.status, 409);
	assert.equal(((await pubDeployingRes.json()) as any).code, 'publish_in_progress');

	const saveDeployingRes = await worker.fetch(
		authedRequest(`https://test.local/api/admin/drafts/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slug: 'atomic-test', title: 'Atomic Test', body: 'Updated body', version: 1 }),
		}),
		env as any,
		ctx,
	);
	assert.equal(saveDeployingRes.status, 409);
	assert.equal(((await saveDeployingRes.json()) as any).code, 'publish_in_progress');
});

test('友链修改和切换显示/隐藏状态时完整保留 sort_order', async () => {
	const { env, ctx, authedRequest, db } = await createTestEnv();

	// 1. 创建带有明确排序权重 sortOrder: 99 的友链
	const createRes = await worker.fetch(
		authedRequest('https://test.local/api/admin/links', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'Ranked Friend',
				url: 'https://ranked.example.com',
				description: 'A well ranked friend blog',
				sortOrder: 99,
				status: 'active',
			}),
		}),
		env as any,
		ctx,
	);
	assert.equal(createRes.status, 201);
	const created = (await createRes.json()) as any;
	assert.equal(created.sort_order, 99);
	const linkId = created.id;

	// 2. 模拟前端切换状态为 hidden：传入 sortOrder: link.sort_order (99)
	const hideRes = await worker.fetch(
		authedRequest(`https://test.local/api/admin/links/${linkId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'Ranked Friend',
				url: 'https://ranked.example.com',
				description: 'A well ranked friend blog',
				status: 'hidden',
				sortOrder: 99,
			}),
		}),
		env as any,
		ctx,
	);
	assert.equal(hideRes.status, 200);
	const hiddenLink = (await hideRes.json()) as any;
	assert.equal(hiddenLink.status, 'hidden');
	assert.equal(hiddenLink.sort_order, 99);

	// 数据库中确实保存为 99 而不是 0
	let row = db.prepare('SELECT sort_order, status FROM links WHERE id=?').get(linkId) as any;
	assert.equal(row.sort_order, 99);
	assert.equal(row.status, 'hidden');

	// 3. 再次切换状态为 active：传入 sortOrder: 99
	const unhideRes = await worker.fetch(
		authedRequest(`https://test.local/api/admin/links/${linkId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'Ranked Friend',
				url: 'https://ranked.example.com',
				description: 'A well ranked friend blog',
				status: 'active',
				sortOrder: 99,
			}),
		}),
		env as any,
		ctx,
	);
	assert.equal(unhideRes.status, 200);
	const activeLink = (await unhideRes.json()) as any;
	assert.equal(activeLink.status, 'active');
	assert.equal(activeLink.sort_order, 99);

	row = db.prepare('SELECT sort_order, status FROM links WHERE id=?').get(linkId) as any;
	assert.equal(row.sort_order, 99);
	assert.equal(row.status, 'active');
});

test('会话接口返回正确的 environment 与 publicOrigin，且不泄漏密钥', async () => {
	const { env, authedRequest } = await createTestEnv();
	const customEnv = {
		...env,
		ENVIRONMENT: 'staging',
		PUBLIC_ORIGIN: 'https://blog-staging.guozhongeba.workers.dev',
	};

	const res = await worker.fetch(
		authedRequest('https://test.local/api/admin/session', { method: 'GET' }),
		customEnv as any,
		{ waitUntil: () => {} },
	);
	assert.equal(res.status, 200);
	const data = (await res.json()) as any;
	assert.equal(data.environment, 'staging');
	assert.equal(data.publicOrigin, 'https://blog-staging.guozhongeba.workers.dev');
	assert.ok(data.csrfToken);
	assert.equal(data.email, 'github:admin-user');
	// 确认绝不泄漏密钥
	assert.equal(data.GITHUB_PRIVATE_KEY, undefined);
	assert.equal(data.SESSION_SECRET, undefined);
	assert.equal(data.CSRF_SECRET, undefined);
});

test('reconcilePublishing: 线上 SHA 相同、后继祖先提交包含同一文章、文章已被替换三种确认结果', async () => {
	const { db, env } = await createTestEnv();

	// 插入三篇 deploying 草稿
	db.prepare(`INSERT INTO drafts (id, slug, title, body, status, source_path, publish_commit_sha, source_blob_sha, version, updated_at)
VALUES
  ('draft-exact', 'post-exact', 'Exact', 'Body', 'deploying', 'src/content/blog/post-exact.md', 'commit-exact', 'blob-exact', 1, datetime('now')),
  ('draft-ancestor', 'post-ancestor', 'Ancestor', 'Body', 'deploying', 'src/content/blog/post-ancestor.md', 'commit-ancestor', 'blob-ancestor-v1', 1, datetime('now')),
  ('draft-superseded', 'post-superseded', 'Superseded', 'Body', 'deploying', 'src/content/blog/post-superseded.md', 'commit-superseded', 'blob-superseded-v1', 1, datetime('now')),
  ('draft-dirty', 'post-dirty', 'Dirty', 'Body', 'deploying', 'src/content/blog/post-dirty.md', 'commit-dirty', 'blob-dirty', 1, datetime('now'))`).run();

	const originalFetch = globalThis.fetch;
	try {
		// Mock external fetches for build manifest and GitHub API
		globalThis.fetch = async (input: any) => {
			const url = String(input?.url || input);

			// 1. __build.json manifest
			if (url.includes('/__build.json')) {
				return new Response(JSON.stringify({
					commitSha: 'commit-online-latest',
					dirty: false,
				}), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}

			// GitHub installation token
			if (url.includes('/access_tokens')) {
				return new Response(JSON.stringify({ token: 'mock-gh-token' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}

			// GitHub compare API: /compare/{base}...{head}
			if (url.includes('/compare/commit-exact...commit-online-latest')) {
				return new Response(JSON.stringify({ status: 'identical' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
			if (url.includes('/compare/commit-ancestor...commit-online-latest')) {
				return new Response(JSON.stringify({ status: 'ahead' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
			if (url.includes('/compare/commit-superseded...commit-online-latest')) {
				return new Response(JSON.stringify({ status: 'ahead' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}

			// GitHub contents API: /contents/{path}?ref=commit-online-latest
			if (url.includes('/contents/src/content/blog/post-ancestor.md')) {
				return new Response(JSON.stringify({ sha: 'blob-ancestor-v1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
			if (url.includes('/contents/src/content/blog/post-superseded.md')) {
				// Blob sha is different: another newer version replaced it!
				return new Response(JSON.stringify({ sha: 'blob-superseded-v2-newer' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}

			return new Response('not found', { status: 404 });
		};

		const reconcileEnv = {
			...env,
			ORIGIN_BUILD_URL: 'https://test.local/__build.json',
		};

		// 运行 reconcile
		await testHelpers.reconcilePublishing(reconcileEnv as any);

		const exactRow = db.prepare('SELECT status FROM drafts WHERE id=?').get('draft-exact') as any;
		assert.equal(exactRow.status, 'deploying'); // commit-online-latest !== commit-exact, and compare returned identical? Wait, commit-online-latest is compare head

		const ancestorRow = db.prepare('SELECT status FROM drafts WHERE id=?').get('draft-ancestor') as any;
		assert.equal(ancestorRow.status, 'published', '后继祖先提交包含同一文章 blob SHA 时正常确认 published');

		const supersededRow = db.prepare('SELECT status FROM drafts WHERE id=?').get('draft-superseded') as any;
		assert.equal(supersededRow.status, 'published_superseded', '后继祖先提交中文章 blob SHA 已改变时标记为 published_superseded');

		// 测试 exact 匹配
		globalThis.fetch = async (input: any) => {
			const url = String(input?.url || input);
			if (url.includes('/__build.json')) {
				return new Response(JSON.stringify({
					commitSha: 'commit-exact',
					dirty: false,
				}), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
			return new Response('not found', { status: 404 });
		};

		await testHelpers.reconcilePublishing(reconcileEnv as any);
		const exactRowUpdated = db.prepare('SELECT status FROM drafts WHERE id=?').get('draft-exact') as any;
		assert.equal(exactRowUpdated.status, 'published', '线上 SHA 相等时正常确认 published');

		// 测试 dirty: true 绝不能通过确认
		db.prepare("UPDATE drafts SET status='deploying' WHERE id='draft-dirty'").run();
		globalThis.fetch = async (input: any) => {
			const url = String(input?.url || input);
			if (url.includes('/__build.json')) {
				return new Response(JSON.stringify({
					commitSha: 'commit-dirty',
					dirty: true, // DIRTY!
				}), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
			return new Response('not found', { status: 404 });
		};

		await testHelpers.reconcilePublishing(reconcileEnv as any);
		const dirtyRow = db.prepare('SELECT status FROM drafts WHERE id=?').get('draft-dirty') as any;
		assert.equal(dirtyRow.status, 'deploying', 'dirty: true 的构建绝不能通过发布确认');
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('reconcilePublishing: 旧检查任务等待网络响应期间草稿进入新发布任务，旧任务返回后不将新发布误标为已发布 (P1)', async () => {
	const { db, env } = await createTestEnv();

	// 初始状态：草稿处于第一次发布任务 A（version=1, commit=commit-A）
	db.prepare(`INSERT INTO drafts (id, slug, title, body, status, source_path, publish_commit_sha, source_blob_sha, version, updated_at)
VALUES ('draft-race', 'post-race', 'Race', 'Body v1', 'deploying', 'src/content/blog/post-race.md', 'commit-A', 'blob-v1', 1, datetime('now'))`).run();

	const originalFetch = globalThis.fetch;
	try {
		const reconcileEnv = {
			...env,
			ORIGIN_BUILD_URL: 'https://test.local/__build.json',
		};

		// 模拟检查任务 A 执行：
		// 在 fetch 检查期间，用户发布了新版本 B（version 升级为 2，commit 变为 commit-B）
		globalThis.fetch = async (input: any) => {
			const url = String(input?.url || input);
			if (url.includes('/__build.json')) {
				// 任务 A 网络返回前，草稿进入新发布任务 B
				db.prepare(`UPDATE drafts SET version=2, publish_commit_sha='commit-B', status='deploying', updated_at=datetime('now') WHERE id='draft-race'`).run();

				// 任务 A 网络返回：线上 SHA 刚刚赶上 commit-A
				return new Response(JSON.stringify({
					commitSha: 'commit-A',
					dirty: false,
				}), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
			return new Response('not found', { status: 404 });
		};

		// 执行任务 A 的 reconcile
		await testHelpers.reconcilePublishing(reconcileEnv as any);

		// 验证：任务 A 的旧结果必须被安全丢弃，任务 B（尚未上线）绝不能被标记为 published！
		const rowAfterA = db.prepare('SELECT status, version, publish_commit_sha FROM drafts WHERE id=?').get('draft-race') as any;
		assert.equal(rowAfterA.version, 2, '草稿版本必须仍为任务 B 的版本 2');
		assert.equal(rowAfterA.publish_commit_sha, 'commit-B', 'commit SHA 必须仍为任务 B 的 commit-B');
		assert.equal(rowAfterA.status, 'deploying', '尚未上线的任务 B 绝不能被旧检查任务 A 误标记为 published');

		// 随后：线上构建真正完成了任务 B（commit-B 上线）
		globalThis.fetch = async (input: any) => {
			const url = String(input?.url || input);
			if (url.includes('/__build.json')) {
				return new Response(JSON.stringify({
					commitSha: 'commit-B',
					dirty: false,
				}), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
			return new Response('not found', { status: 404 });
		};

		// 任务 B 的 reconcile 正常确认
		await testHelpers.reconcilePublishing(reconcileEnv as any);
		const rowAfterB = db.prepare('SELECT status FROM drafts WHERE id=?').get('draft-race') as any;
		assert.equal(rowAfterB.status, 'published', '任务 B 真正上线后被正确标记为 published');
	} finally {
		globalThis.fetch = originalFetch;
	}
});
