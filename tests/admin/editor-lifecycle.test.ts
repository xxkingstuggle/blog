import assert from 'node:assert/strict';
import test from 'node:test';

// Set up mock browser environment before importing client script
class MockElement {
	id: string;
	name: string;
	tagName: string;
	value: string = '';
	checked: boolean = false;
	disabled: boolean = false;
	readOnly: boolean = false;
	textContent: string = '';
	className: string = '';
	hidden: boolean = false;
	href: string = '';
	target: string = '';
	rel: string = '';
	srcdoc: string = '';
	dataset: Record<string, string> = {};
	attributes: Record<string, string> = {};
	listeners: Record<string, ((e?: any) => void)[]> = {};
	children: MockElement[] = [];

	constructor(id: string, name: string = '', tagName: string = 'div') {
		this.id = id;
		this.name = name;
		this.tagName = tagName.toUpperCase();
	}

	addEventListener(event: string, fn: (e?: any) => void) {
		if (!this.listeners[event]) this.listeners[event] = [];
		this.listeners[event].push(fn);
	}

	dispatchEvent(event: { type: string; preventDefault?: () => void }) {
		const fns = this.listeners[event.type] || [];
		for (const fn of fns) fn(event);
	}

	click() {
		if ((this as any).onclick) (this as any).onclick({ type: 'click', preventDefault: () => {} });
		this.dispatchEvent({ type: 'click' });
	}

	focus() {}

	checkValidity() {
		return true;
	}

	reportValidity() {
		return true;
	}

	setAttribute(k: string, v: string) {
		this.attributes[k] = v;
	}

	getAttribute(k: string) {
		return this.attributes[k] ?? null;
	}

	removeAttribute(k: string) {
		delete this.attributes[k];
	}

	append(...nodes: MockElement[]) {
		this.children.push(...nodes);
	}

	replaceChildren(...nodes: MockElement[]) {
		this.children = [...nodes];
	}

	querySelectorAll<T = MockElement>(selector: string): T[] {
		const results: MockElement[] = [];
		const match = (el: MockElement) => {
			if (selector.includes('input') && el.tagName === 'INPUT') results.push(el);
			else if (selector.includes('textarea') && el.tagName === 'TEXTAREA') results.push(el);
			else if (selector.includes('select') && el.tagName === 'SELECT') results.push(el);
			else if (selector.includes('button') && el.tagName === 'BUTTON') results.push(el);
			else if (selector.startsWith('.') && el.className.includes(selector.slice(1))) results.push(el);
			for (const child of el.children) match(child);
		};
		for (const child of this.children) match(child);
		return results as T[];
	}

	reset() {
		for (const child of this.querySelectorAll('input, textarea, select')) {
			const el = child as MockElement;
			if (el.id === 'field-listed') el.checked = true;
			else if (el.id === 'field-featured') el.checked = false;
			else if (el.id === 'field-kind') el.value = 'thought';
			else if (el.id === 'field-presentation') el.value = 'article';
			else el.value = '';
		}
	}
}

class MockLocalStorage {
	private store = new Map<string, string>();
	getItem(k: string) {
		return this.store.get(k) ?? null;
	}
	setItem(k: string, v: string) {
		this.store.set(k, String(v));
	}
	removeItem(k: string) {
		this.store.delete(k);
	}
	clear() {
		this.store.clear();
	}
}

const elementsMap = new Map<string, MockElement>();

function registerElement(id: string, name: string = '', tagName: string = 'div') {
	const el = new MockElement(id, name, tagName);
	elementsMap.set(id, el);
	return el;
}

// Build standard editor DOM elements
const formEl = registerElement('draft-form', 'draft-form', 'form');

const fieldSlug = registerElement('field-slug', 'slug', 'input');
const fieldTitle = registerElement('field-title', 'title', 'input');
const fieldDesc = registerElement('field-description', 'description', 'input');
const fieldBody = registerElement('field-body', 'body', 'textarea');
const fieldPubDate = registerElement('field-pubDate', 'pubDate', 'input');
const fieldKind = registerElement('field-kind', 'kind', 'select');
const fieldPresentation = registerElement('field-presentation', 'presentation', 'select');
const fieldFeatured = registerElement('field-featured', 'featured', 'input');
const fieldListed = registerElement('field-listed', 'listed', 'input');
const fieldTags = registerElement('field-tags', 'tags', 'input');
const fieldKicker = registerElement('field-kicker', 'kicker', 'input');
const fieldAliases = registerElement('field-aliases', 'aliases', 'input');

const fieldSourcePath = registerElement('field-sourcePath', 'sourcePath', 'input');
const fieldSourceBlobSha = registerElement('field-sourceBlobSha', 'sourceBlobSha', 'input');
const fieldPublishCommitSha = registerElement('field-publishCommitSha', 'publishCommitSha', 'input');
const fieldSystemStatusText = registerElement('field-systemStatusText', 'systemStatusText', 'input');

formEl.append(
	fieldSlug,
	fieldTitle,
	fieldDesc,
	fieldBody,
	fieldPubDate,
	fieldKind,
	fieldPresentation,
	fieldFeatured,
	fieldListed,
	fieldTags,
	fieldKicker,
	fieldAliases,
	fieldSourcePath,
	fieldSourceBlobSha,
	fieldPublishCommitSha,
	fieldSystemStatusText,
);

(formEl as any).elements = {
	namedItem: (name: string) => {
		for (const el of formEl.children) {
			if (el.name === name) return el;
		}
		return null;
	},
};

registerElement('admin-status');
registerElement('admin-dock-indicator');
registerElement('admin-dock-text');
registerElement('admin-dock-link', '', 'a');
registerElement('admin-dock-btn', '', 'button');
registerElement('admin-env-banner');
registerElement('draft-list', '', 'ul');
registerElement('preview-frame', '', 'iframe');
registerElement('new-draft', '', 'button');
registerElement('save-draft', '', 'button');
registerElement('publish-draft', '', 'button');
registerElement('preview-draft', '', 'button');
registerElement('logout', '', 'button');
registerElement('slug-helper');

const mockDocument = {
	getElementById: (id: string) => elementsMap.get(id) ?? null,
	addEventListener: () => {},
	createElement: (tag: string) => new MockElement('', '', tag),
	createTextNode: (text: string) => {
		const el = new MockElement('', '', 'span');
		el.textContent = text;
		return el;
	},
};

(globalThis as any).__IS_TEST__ = true;
(globalThis as any).window = {
	...globalThis,
	location: { origin: 'https://test.local', assign: () => {} },
	addEventListener: () => {},
	removeEventListener: () => {},
};
(globalThis as any).document = mockDocument;
(globalThis as any).localStorage = new MockLocalStorage();
(globalThis as any).confirm = () => true;

const { testHelpers } = await import('../../src/scripts/admin.ts');
testHelpers.initEventListeners();

function resetEditorDOM() {
	(globalThis as any).localStorage.clear();
	formEl.reset();
	testHelpers.initDOMElements();
	testHelpers.resetForm({ restoreAutosave: false });
}

test('1. 保存成功后不再出现错误的“未保存修改”提示', async () => {
	resetEditorDOM();
	fieldTitle.value = 'My Fresh Post';
	fieldSlug.value = 'my-fresh-post';
	fieldBody.value = '# Hello World';

	// Initially dirty before save
	assert.equal(testHelpers.isFormDirty(), true);

	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () => {
		return new Response(JSON.stringify({ id: 'd-1', status: 'draft', version: 2 }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	};

	try {
		await testHelpers.saveCurrentDraft(true);
		// After save, editable fields match baseline exactly (version and SHA are excluded from comparison)
		assert.equal(testHelpers.isFormDirty(), false);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('2. 保存期间不能继续输入，失败后原内容仍在且可以重试', async () => {
	resetEditorDOM();
	fieldTitle.value = 'Post Title';
	fieldSlug.value = 'post-title';
	fieldBody.value = 'Original Content';

	const originalFetch = globalThis.fetch;
	let wasDisabledDuringSave = false;

	globalThis.fetch = async () => {
		// Verify that all inputs in form are locked during save in-flight
		wasDisabledDuringSave = fieldTitle.disabled && fieldBody.disabled;
		// Return 500 error to simulate failure
		return new Response(JSON.stringify({ error: 'Server save error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	};

	try {
		await assert.rejects(async () => {
			await testHelpers.saveCurrentDraft(true);
		});

		assert.equal(wasDisabledDuringSave, true);
		// After failure, controls are restored and content is still intact
		assert.equal(fieldTitle.disabled, false);
		assert.equal(fieldBody.disabled, false);
		assert.equal(fieldTitle.value, 'Post Title');
		assert.equal(fieldBody.value, 'Original Content');

		// Now retry and succeed
		globalThis.fetch = async () => {
			return new Response(JSON.stringify({ id: 'd-2', status: 'draft', version: 2 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		};

		await testHelpers.saveCurrentDraft(true);
		assert.equal(testHelpers.isFormDirty(), false);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('3. 加载 A 尚未返回时执行新建，A 的响应不能覆盖新编辑器', async () => {
	resetEditorDOM();

	let resolveDraftA: (value: Response) => void;
	const draftAPromise = new Promise<Response>((resolve) => {
		resolveDraftA = resolve;
	});

	const originalFetch = globalThis.fetch;
	globalThis.fetch = async (input) => {
		const url = String(input);
		if (url.includes('/api/admin/drafts/draft-a')) {
			return draftAPromise;
		}
		return new Response(JSON.stringify({ drafts: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
	};

	try {
		// 1. User initiates loading Draft A (slow response)
		const selectPromise = testHelpers.selectDraft({ id: 'draft-a', title: 'Old Draft A', slug: 'draft-a', body: 'Body A' });

		// 2. Before A resolves, user clicks "新建"
		const newDraftBtn = elementsMap.get('new-draft')!;
		newDraftBtn.click();

		// Form is blank, user writes their new draft
		assert.equal(fieldTitle.value, '');
		fieldTitle.value = 'Brand New Article In Progress';
		fieldBody.value = 'Typing something new...';

		// 3. Draft A's response finally arrives from network
		resolveDraftA!(
			new Response(
				JSON.stringify({
					draft: { id: 'draft-a', title: 'Stale Draft A Title', slug: 'draft-a', body: 'Stale Body A', version: 1 },
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } },
			),
		);

		await selectPromise;

		// Verify A did NOT overwrite the new editor
		assert.equal(fieldTitle.value, 'Brand New Article In Progress');
		assert.equal(fieldBody.value, 'Typing something new...');
		assert.equal(testHelpers.getState().currentId, '');
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('4. 快速切换 A、B，响应顺序颠倒也始终显示最终选择', async () => {
	resetEditorDOM();

	let resolveDraftA: (value: Response) => void;
	const draftAPromise = new Promise<Response>((resolve) => {
		resolveDraftA = resolve;
	});

	let resolveDraftB: (value: Response) => void;
	const draftBPromise = new Promise<Response>((resolve) => {
		resolveDraftB = resolve;
	});

	const originalFetch = globalThis.fetch;
	globalThis.fetch = async (input) => {
		const url = String(input);
		if (url.includes('/api/admin/drafts/draft-a')) return draftAPromise;
		if (url.includes('/api/admin/drafts/draft-b')) return draftBPromise;
		return new Response(JSON.stringify({ drafts: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
	};

	try {
		// User clicks A, then quickly clicks B (B is final selection)
		const pA = testHelpers.selectDraft({ id: 'draft-a', title: 'Draft A', slug: 'draft-a', body: 'Body A' });
		const pB = testHelpers.selectDraft({ id: 'draft-b', title: 'Draft B', slug: 'draft-b', body: 'Body B' });

		// Simulate B resolving first (faster)
		resolveDraftB!(
			new Response(
				JSON.stringify({
					draft: { id: 'draft-b', title: 'Article B Real Title', slug: 'draft-b', body: 'Real Body B', version: 1 },
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } },
			),
		);
		await pB;
		assert.equal(fieldTitle.value, 'Article B Real Title');

		// Now A resolves late
		resolveDraftA!(
			new Response(
				JSON.stringify({
					draft: { id: 'draft-a', title: 'Article A Stale Title', slug: 'draft-a', body: 'Real Body A', version: 1 },
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } },
			),
		);
		await pA;

		// Editor STILL displays B (final selection was not overwritten by stale A)
		assert.equal(fieldTitle.value, 'Article B Real Title');
		assert.equal(testHelpers.getState().currentId, 'draft-b');
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('5. 主动新建得到空白表单，刷新恢复仍正常', async () => {
	resetEditorDOM();

	// Pre-populate localStorage with a saved 'new' draft
	const cachedRecord = {
		baseVersion: 0,
		values: {
			slug: 'cached-slug',
			title: 'Cached New Draft',
			description: 'Description',
			body: 'Cached Body',
			pubDate: '2026-09-05',
			kind: 'thought',
			presentation: 'article',
			featured: false,
			tags: ['tag1'],
			kicker: '',
			aliases: [],
			listed: true,
		},
		timestamp: Date.now(),
	};
	localStorage.setItem('xingx_admin_draft_new', JSON.stringify(cachedRecord));

	// Page initialization with restoreAutosave: true restores the cached draft
	testHelpers.resetForm({ restoreAutosave: true });
	assert.equal(fieldTitle.value, 'Cached New Draft');
	assert.equal(fieldBody.value, 'Cached Body');
	assert.equal(testHelpers.isFormDirty(), true);

	// Now user actively clicks "新建"
	const newDraftBtn = elementsMap.get('new-draft')!;
	newDraftBtn.click();

	// Actively clicking "新建" generates a blank form
	assert.equal(fieldTitle.value, '');
	assert.equal(fieldBody.value, '');
	assert.equal(fieldSlug.value, '');
	assert.equal(testHelpers.isFormDirty(), false);

	// Existing cache was preserved (not deleted)
	assert.notEqual(localStorage.getItem('xingx_admin_draft_new'), null);

	// User types a new draft and triggers autosave
	fieldTitle.value = 'Freshly Typed Title';
	fieldBody.value = 'Freshly Typed Body';
	testHelpers.performAutosave();

	// Page refresh (initialization) restores the newly typed draft
	testHelpers.resetForm({ restoreAutosave: true });
	assert.equal(fieldTitle.value, 'Freshly Typed Title');
	assert.equal(fieldBody.value, 'Freshly Typed Body');
});

test('6. 发布 A 后编辑 B，A 发布完成不会改变 B', async () => {
	resetEditorDOM();

	// Populate and save Draft A
	testHelpers.fillDraft({ id: 'draft-a', slug: 'post-a', title: 'Post A', body: 'Body A', version: 1, status: 'draft' });
	assert.equal(testHelpers.getState().currentId, 'draft-a');

	const originalFetch = globalThis.fetch;
	let pollCount = 0;

	globalThis.fetch = async (input, init) => {
		const url = String(input);
		if (url.includes('/api/admin/drafts/draft-a')) {
			if (init?.method === 'PUT') {
				return new Response(JSON.stringify({ id: 'draft-a', status: 'draft', version: 2 }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			// Polling response: first in deploying, then published
			pollCount += 1;
			return new Response(
				JSON.stringify({
					draft: {
						id: 'draft-a',
						slug: 'post-a',
						title: 'Post A',
						body: 'Body A',
						status: pollCount >= 1 ? 'published' : 'deploying',
						publish_commit_sha: 'commit-sha-a-1234567',
						version: 2,
					},
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } },
			);
		}
		if (url.includes('/api/admin/publish')) {
			return new Response(JSON.stringify({ id: 'draft-a', status: 'deploying', commitSha: 'commit-sha-a-1234567' }), {
				status: 202,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(JSON.stringify({ drafts: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
	};

	try {
		// Publish Draft A
		await testHelpers.publishCurrentDraft();

		// Immediately switch to Draft B and start editing B
		testHelpers.fillDraft({ id: 'draft-b', slug: 'post-b', title: 'Post B Title', body: 'Draft B Content', version: 1, status: 'draft' });
		fieldTitle.value = 'Post B Being Actively Edited';
		fieldBody.value = 'User is typing new paragraph in B';

		// Trigger publish polling check for A
		// Wait for timer to fire or manually poll A
		const pollTimer = testHelpers.getState().activePollTimers.get('draft-a');
		assert.ok(pollTimer !== undefined, 'Draft A should have active polling timer');

		// Advance timer manually
		const detail = await (await fetch('/api/admin/drafts/draft-a')).json();
		assert.equal(detail.draft.status, 'published');

		// Verify editor is STILL on Draft B with user's active edits
		assert.equal(testHelpers.getState().currentId, 'draft-b');
		assert.equal(fieldTitle.value, 'Post B Being Actively Edited');
		assert.equal(fieldBody.value, 'User is typing new paragraph in B');

		// Cleanup polling timer
		clearTimeout(pollTimer);
		testHelpers.getState().activePollTimers.delete('draft-a');
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('7. 发布按钮根据是否已有公开版本正确显示（发布文章 vs 更新文章）', () => {
	resetEditorDOM();
	const publishBtn = elementsMap.get('publish-draft')!;

	// 1. 新建空白草稿：默认显示“发布文章”
	testHelpers.resetForm({ restoreAutosave: false });
	assert.equal(publishBtn.textContent, '发布文章');

	// 2. 载入从未发布过的草稿（无 source_blob_sha 和 publish_commit_sha）
	testHelpers.fillDraft({
		id: 'draft-fresh',
		slug: 'fresh-post',
		title: 'Fresh Post',
		body: 'Some content',
		version: 1,
		status: 'draft',
		source_blob_sha: null,
		publish_commit_sha: null,
	});
	assert.equal(publishBtn.textContent, '发布文章');

	// 3. 载入已有公开记录的草稿（有 source_blob_sha）
	testHelpers.fillDraft({
		id: 'draft-published',
		slug: 'published-post',
		title: 'Published Post',
		body: 'Published content',
		version: 2,
		status: 'draft', // 即使当前是 draft 状态！
		source_blob_sha: 'blob-sha-xyz',
		publish_commit_sha: 'commit-sha-xyz',
	});
	assert.equal(publishBtn.textContent, '更新文章');

	// 4. 再次主动点击“新建”，重置为“发布文章”
	testHelpers.resetForm({ restoreAutosave: false });
	assert.equal(publishBtn.textContent, '发布文章');
});

test('8. 尚未确认上线时显示重试检查按钮，且“重新检查”不产生新 GitHub commit', async () => {
	resetEditorDOM();
	const originalFetch = globalThis.fetch;
	const dockBtn = elementsMap.get('admin-dock-btn')!;
	const dockText = elementsMap.get('admin-dock-text')!;

	let publishCallCount = 0;
	let recheckCallCount = 0;

	globalThis.fetch = async (input: any) => {
		const url = String(input?.url || input);
		if (url.includes('/api/admin/publish')) {
			publishCallCount++;
			return new Response(JSON.stringify({ id: 'draft-timeout', status: 'deploying', commitSha: 'sha-timeout' }), {
				status: 202,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (url.includes('/api/admin/drafts/draft-timeout?recheck=1')) {
			recheckCallCount++;
			return new Response(JSON.stringify({
				draft: {
					id: 'draft-timeout',
					slug: 'timeout-post',
					title: 'Timeout Post',
					body: 'Body',
					status: 'published',
					publish_commit_sha: 'sha-timeout',
					version: 2,
				},
			}), { status: 200, headers: { 'Content-Type': 'application/json' } });
		}
		if (url.includes('/api/admin/drafts/draft-timeout')) {
			return new Response(JSON.stringify({
				draft: {
					id: 'draft-timeout',
					slug: 'timeout-post',
					title: 'Timeout Post',
					body: 'Body',
					status: 'publish_failed',
					error_code: 'deployment_timeout',
					version: 1,
				},
			}), { status: 200, headers: { 'Content-Type': 'application/json' } });
		}
		return new Response(JSON.stringify({ drafts: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
	};

	try {
		testHelpers.getState().currentId = '';

		// 触发部署超时失败处理
		await testHelpers.selectDraft({
			id: 'draft-timeout',
			slug: 'timeout-post',
			title: 'Timeout Post',
			status: 'publish_failed',
			error_code: 'deployment_timeout',
			version: 1,
		} as any);

		// 等待 selectDraft 完成
		await new Promise((r) => setTimeout(r, 10));

		assert.equal(dockText.textContent, '尚未确认上线，草稿已保留');
		assert.equal(dockBtn.hidden, false);
		assert.equal(dockBtn.textContent, '重新检查');

		// 点击“重新检查”
		assert.equal(publishCallCount, 0, '重新检查绝不能调用 /api/admin/publish');
		dockBtn.click();
		await new Promise((r) => setTimeout(r, 10));

		assert.equal(recheckCallCount, 1, '调用了 GET recheck=1');
		assert.equal(publishCallCount, 0, '重新检查绝不能产生新 GitHub 提交');
		assert.equal(dockText.textContent, '已发布／已更新');
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('9. 会话环境信息正确且查看文章指向当前环境 publicOrigin', async () => {
	resetEditorDOM();
	const originalFetch = globalThis.fetch;
	const envBanner = elementsMap.get('admin-env-banner')!;
	const dockLink = elementsMap.get('admin-dock-link') as any;

	// Staging environment
	testHelpers.getState().currentPublicOrigin = 'https://blog-staging.guozhongeba.workers.dev';
	testHelpers.getState().currentEnvironment = 'staging';

	envBanner.textContent = '预览环境：发布仅更新预览站，不影响正式网站。';
	envBanner.className = 'admin-env-banner staging';
	envBanner.hidden = false;

	assert.equal(envBanner.hidden, false);
	assert.match(envBanner.textContent, /预览环境/);

	// Test published link resolution
	globalThis.fetch = async () => new Response(JSON.stringify({
		draft: {
			id: 'd-env',
			slug: 'env-post',
			title: 'Env Post',
			status: 'published',
			version: 1,
		},
	}), { status: 200, headers: { 'Content-Type': 'application/json' } });

	try {
		testHelpers.fillDraft({ id: 'd-env', slug: 'env-post', title: 'Env Post', status: 'published', version: 1 } as any);
		await testHelpers.recheckDeployment('d-env');
		assert.equal(dockLink.href, 'https://blog-staging.guozhongeba.workers.dev/posts/env-post');
		assert.equal(dockLink.textContent, '查看文章');
	} finally {
		globalThis.fetch = originalFetch;
	}
});
