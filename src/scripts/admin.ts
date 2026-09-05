/**
 * Admin Backoffice Client Logic
 * Handles session, atomic draft publishing, autosave, comments moderation, and links management.
 */

interface DraftRecord {
	id: string;
	slug: string;
	title: string;
	description?: string;
	body: string;
	pub_date?: string;
	tags_json?: string | string[];
	kind?: string;
	presentation?: string;
	featured?: number | boolean;
	kicker?: string;
	source_path?: string;
	source_blob_sha?: string | null;
	listed?: number | boolean;
	aliases_json?: string;
	aliases?: string[];
	status?: string;
	publish_commit_sha?: string | null;
	error_code?: string | null;
	version?: number;
	updated_at?: string;
}

interface CommentRecord {
	id: string;
	slug: string;
	author_name: string;
	author_url?: string | null;
	body: string;
	status: 'pending' | 'approved' | 'rejected' | 'spam';
	created_at: string;
}

interface LinkRecord {
	id: string;
	name: string;
	url: string;
	description?: string | null;
	status: 'active' | 'hidden' | 'offline';
	sort_order: number;
	checked_at?: string | null;
}

interface AutosaveRecord {
	baseVersion: number;
	values: NonNullable<ReturnType<typeof extractEditableValues>>;
	timestamp: number;
}

const CHINESE_STATUS_MAP: Record<string, string> = {
	draft: '草稿',
	publishing: '提交中',
	deploying: '部署中',
	published: '已发布',
	published_superseded: '已有更新版本',
	conflict: '冲突',
	publish_failed: '发布失败',
};

const AUTOSAVE_PREFIX = 'xingx_admin_draft_';

// State
let csrfToken = '';
let currentId = '';
let currentVersion = 0;
let initialFormValuesJson = '';
let isSubmitting = false;
let activeLoadDraftSeq = 0;
let currentCommentFilter = 'pending';
let currentPublicOrigin = '';
let currentEnvironment: 'staging' | 'production' = 'production';

// Map of active polling timers per draft ID
const activePollTimers = new Map<string, number>();

// Elements
let form: HTMLFormElement | null = null;
let headerStatus: HTMLElement | null = null;
let dockIndicator: HTMLElement | null = null;
let dockText: HTMLElement | null = null;
let dockLink: HTMLAnchorElement | null = null;
let dockBtn: HTMLButtonElement | null = null;
let envBanner: HTMLElement | null = null;
let draftList: HTMLElement | null = null;
let previewFrame: HTMLIFrameElement | null = null;

let newDraftBtn: HTMLButtonElement | null = null;
let saveDraftBtn: HTMLButtonElement | null = null;
let publishDraftBtn: HTMLButtonElement | null = null;
let previewDraftBtn: HTMLButtonElement | null = null;
let logoutBtn: HTMLButtonElement | null = null;

// Slug input and helper
let slugInput: HTMLInputElement | null = null;
let slugHelper: HTMLElement | null = null;

// Details inputs
let sourcePathInput: HTMLInputElement | null = null;
let sourceBlobShaInput: HTMLInputElement | null = null;
let publishCommitShaInput: HTMLInputElement | null = null;
let systemStatusTextInput: HTMLInputElement | null = null;

function initDOMElements() {
	if (typeof document === 'undefined') return;
	form = document.getElementById('draft-form') as HTMLFormElement | null;
	headerStatus = document.getElementById('admin-status');
	dockIndicator = document.getElementById('admin-dock-indicator');
	dockText = document.getElementById('admin-dock-text');
	dockLink = document.getElementById('admin-dock-link') as HTMLAnchorElement | null;
	dockBtn = document.getElementById('admin-dock-btn') as HTMLButtonElement | null;
	envBanner = document.getElementById('admin-env-banner');
	draftList = document.getElementById('draft-list');
	previewFrame = document.getElementById('preview-frame') as HTMLIFrameElement | null;

	newDraftBtn = document.getElementById('new-draft') as HTMLButtonElement | null;
	saveDraftBtn = document.getElementById('save-draft') as HTMLButtonElement | null;
	publishDraftBtn = document.getElementById('publish-draft') as HTMLButtonElement | null;
	previewDraftBtn = document.getElementById('preview-draft') as HTMLButtonElement | null;
	logoutBtn = document.getElementById('logout') as HTMLButtonElement | null;

	slugInput = document.getElementById('field-slug') as HTMLInputElement | null;
	slugHelper = document.getElementById('slug-helper');

	sourcePathInput = document.getElementById('field-sourcePath') as HTMLInputElement | null;
	sourceBlobShaInput = document.getElementById('field-sourceBlobSha') as HTMLInputElement | null;
	publishCommitShaInput = document.getElementById('field-publishCommitSha') as HTMLInputElement | null;
	systemStatusTextInput = document.getElementById('field-systemStatusText') as HTMLInputElement | null;
}

if (typeof document !== 'undefined') {
	initDOMElements();
}

// --- Button Label Helpers ---
function getPublicOrigin(): string {
	return currentPublicOrigin || (typeof window !== 'undefined' ? window.location?.origin || '' : '');
}

function isPreviouslyPublished(draft: Partial<DraftRecord> | null): boolean {
	return Boolean(draft && (draft.source_blob_sha || draft.publish_commit_sha));
}

function updatePublishButtonLabel(draft: Partial<DraftRecord> | null) {
	if (!publishDraftBtn) return;
	publishDraftBtn.textContent = isPreviouslyPublished(draft) ? '更新文章' : '发布文章';
}

// --- Status Management ---
function setStatus(
	message: string,
	type: 'info' | 'success' | 'warning' | 'error' | 'loading' = 'info',
	link?: { href: string; label: string },
	action?: { label: string; action: () => void },
) {
	if (headerStatus) headerStatus.textContent = message;
	if (dockText) dockText.textContent = message;
	if (dockIndicator) dockIndicator.className = `admin-dock-indicator ${type}`;
	if (dockLink) {
		if (link) {
			dockLink.href = link.href;
			dockLink.textContent = link.label;
			dockLink.hidden = false;
			dockLink.target = '_blank';
			dockLink.rel = 'noopener noreferrer';
		} else {
			dockLink.hidden = true;
			dockLink.textContent = '';
		}
	}
	if (dockBtn) {
		if (action) {
			dockBtn.textContent = action.label;
			dockBtn.onclick = (e) => {
				e.preventDefault();
				action.action();
			};
			dockBtn.hidden = false;
		} else {
			dockBtn.hidden = true;
			dockBtn.onclick = null;
		}
	}
}

// --- API Request Wrapper with CSRF Auto-Refresh ---
async function api<T = any>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
	const headers = new Headers(init.headers);
	if (csrfToken) headers.set('X-CSRF-Token', csrfToken);

	const response = await fetch(path, { ...init, headers });
	const body = await response.json().catch(() => ({}));

	if (response.status === 401 && path === '/api/admin/session') {
		location.assign('/auth/github/start');
		throw new Error('正在进入 GitHub 登录…');
	}

	// Automatic CSRF token refresh and retry
	if (
		response.status === 403 &&
		(body.code === 'csrf_token' || String(body.error || '').includes('CSRF')) &&
		!isRetry
	) {
		try {
			const sessionRes = await fetch('/api/admin/session');
			if (sessionRes.ok) {
				const sessionData = await sessionRes.json();
				if (sessionData.csrfToken) {
					csrfToken = sessionData.csrfToken;
					return await api<T>(path, init, true);
				}
			}
		} catch {
			// Fall through
		}
	}

	if (!response.ok) {
		const err = new Error(body.error || `请求失败（${response.status}）`);
		(err as any).code = body.code;
		(err as any).status = response.status;
		throw err;
	}

	return body as T;
}

// --- Form Values Extraction (Editable Fields Only) ---
function getFormValue(name: string): string {
	if (!form) return '';
	const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
	if (el && typeof el.value === 'string') return el.value;
	const byId = document.getElementById('field-' + name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
	return byId && typeof byId.value === 'string' ? byId.value : '';
}

function getFormChecked(name: string): boolean {
	if (!form) return false;
	const el = form.elements.namedItem(name) as HTMLInputElement | null;
	if (el && typeof el.checked === 'boolean') return el.checked;
	const byId = document.getElementById('field-' + name) as HTMLInputElement | null;
	return Boolean(byId?.checked);
}

function extractEditableValues() {
	if (!form) return null;
	return {
		slug: getFormValue('slug').trim(),
		title: getFormValue('title').trim(),
		description: getFormValue('description').trim(),
		body: getFormValue('body'),
		pubDate: getFormValue('pubDate'),
		kind: getFormValue('kind') || 'thought',
		presentation: getFormValue('presentation') || 'article',
		featured: getFormChecked('featured'),
		tags: getFormValue('tags').split(',').map((v) => v.trim()).filter(Boolean),
		kicker: getFormValue('kicker').trim(),
		aliases: getFormValue('aliases').split(',').map((v) => v.trim()).filter(Boolean),
		listed: getFormChecked('listed'),
	};
}

function isFormDirty() {
	if (!initialFormValuesJson) return false;
	const current = extractEditableValues();
	if (!current) return false;
	return JSON.stringify(current) !== initialFormValuesJson;
}

function setEditorInputsDisabled(disabled: boolean) {
	if (!form) return;
	const controls = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>(
		'input, textarea, select, button'
	);
	controls.forEach((ctrl) => {
		ctrl.disabled = disabled;
	});
	if (!disabled && slugInput) {
		slugInput.readOnly = Boolean(currentId);
	}
}

function setControlsLocked(locked: boolean) {
	isSubmitting = locked;
	setEditorInputsDisabled(locked);
	if (saveDraftBtn) saveDraftBtn.disabled = locked;
	if (publishDraftBtn) publishDraftBtn.disabled = locked;
	if (newDraftBtn) newDraftBtn.disabled = locked;
	if (previewDraftBtn) previewDraftBtn.disabled = locked;
	draftList?.querySelectorAll<HTMLButtonElement>('.admin-draft-item').forEach((btn) => {
		btn.disabled = locked;
	});
}

function invalidatePendingDraftLoads() {
	activeLoadDraftSeq += 1;
}

// --- Form Values Restoration ---
function restoreFormValues(values: NonNullable<ReturnType<typeof extractEditableValues>>, isNewDraft = false) {
	if (!form) return;
	if (isNewDraft && slugInput && values.slug !== undefined) {
		slugInput.value = values.slug;
	}
	const titleEl = form.elements.namedItem('title') as HTMLInputElement | null;
	if (titleEl && values.title !== undefined) titleEl.value = values.title;

	const descEl = form.elements.namedItem('description') as HTMLInputElement | null;
	if (descEl && values.description !== undefined) descEl.value = values.description;

	const bodyEl = form.elements.namedItem('body') as HTMLTextAreaElement | null;
	if (bodyEl && values.body !== undefined) bodyEl.value = values.body;

	const pubDateEl = form.elements.namedItem('pubDate') as HTMLInputElement | null;
	if (pubDateEl && values.pubDate !== undefined) pubDateEl.value = values.pubDate;

	const kindEl = form.elements.namedItem('kind') as HTMLSelectElement | null;
	if (kindEl && values.kind !== undefined) kindEl.value = values.kind;

	const presEl = form.elements.namedItem('presentation') as HTMLSelectElement | null;
	if (presEl && values.presentation !== undefined) presEl.value = values.presentation;

	const featEl = form.elements.namedItem('featured') as HTMLInputElement | null;
	if (featEl && values.featured !== undefined) featEl.checked = Boolean(values.featured);

	const listEl = form.elements.namedItem('listed') as HTMLInputElement | null;
	if (listEl && values.listed !== undefined) listEl.checked = Boolean(values.listed);

	const tagsEl = form.elements.namedItem('tags') as HTMLInputElement | null;
	if (tagsEl && values.tags !== undefined) {
		tagsEl.value = Array.isArray(values.tags) ? values.tags.join(', ') : String(values.tags);
	}

	const kickEl = form.elements.namedItem('kicker') as HTMLInputElement | null;
	if (kickEl && values.kicker !== undefined) kickEl.value = values.kicker || '';

	const aliasEl = form.elements.namedItem('aliases') as HTMLInputElement | null;
	if (aliasEl && values.aliases !== undefined) {
		aliasEl.value = Array.isArray(values.aliases) ? values.aliases.join(', ') : String(values.aliases);
	}
}

// --- Autosave ---
let autosaveTimeout: number | null = null;

function performAutosave() {
	if (!form) return;
	const values = extractEditableValues();
	if (!values) return;
	const key = AUTOSAVE_PREFIX + (currentId || 'new');
	const record: AutosaveRecord = {
		baseVersion: currentVersion,
		values,
		timestamp: Date.now(),
	};
	try {
		localStorage.setItem(key, JSON.stringify(record));
	} catch {
		// LocalStorage may be full or restricted
	}
}

function triggerAutosave() {
	if (autosaveTimeout) clearTimeout(autosaveTimeout);
	autosaveTimeout = window.setTimeout(() => {
		performAutosave();
		autosaveTimeout = null;
	}, 500);
}

function flushPendingAutosave() {
	if (autosaveTimeout) {
		clearTimeout(autosaveTimeout);
		autosaveTimeout = null;
		performAutosave();
	}
}

function clearAutosave(id: string) {
	try {
		localStorage.removeItem(AUTOSAVE_PREFIX + (id || 'new'));
	} catch {
		// Ignore
	}
}

function checkAndRestoreDraftAutosave(draftId: string, serverVersion: number) {
	try {
		const raw = localStorage.getItem(AUTOSAVE_PREFIX + draftId);
		if (!raw) return;
		const record = JSON.parse(raw) as AutosaveRecord;
		if (!record?.values) return;

		const cacheTime = new Date(record.timestamp).toLocaleTimeString();
		const serverValues = extractEditableValues();
		const hasDifferences = JSON.stringify(record.values) !== JSON.stringify(serverValues);
		if (!hasDifferences) {
			clearAutosave(draftId);
			return;
		}

		if (record.baseVersion === serverVersion) {
			restoreFormValues(record.values, false);
			setStatus(`已恢复本地未提交草稿（${cacheTime}），处于未保存修改状态`, 'info');
		} else {
			const shouldRestore = confirm(
				`服务器草稿已更新至 v${serverVersion}，本地有基于 v${record.baseVersion}（${cacheTime}）的未提交修改。\n\n点击“确定”恢复本地修改（将处于未保存状态），点击“取消”保留服务器最新内容。`
			);
			if (shouldRestore) {
				restoreFormValues(record.values, false);
				setStatus(`已恢复本地草稿（基于旧版本 v${record.baseVersion}），请检查后保存`, 'warning');
			} else {
				clearAutosave(draftId);
				setStatus(`已保留服务器最新版本 (v${serverVersion})`, 'info');
			}
		}
	} catch {
		// Ignore
	}
}

function checkAndRestoreNewDraftAutosave() {
	try {
		const raw = localStorage.getItem(AUTOSAVE_PREFIX + 'new');
		if (!raw) return;
		const record = JSON.parse(raw) as AutosaveRecord;
		if (!record?.values) return;

		const hasContent = Boolean(
			record.values.title || record.values.body || record.values.slug || record.values.description
		);
		if (!hasContent) {
			clearAutosave('new');
			return;
		}

		const cacheTime = new Date(record.timestamp).toLocaleTimeString();
		restoreFormValues(record.values, true);
		setStatus(`已恢复未保存的新建草稿（${cacheTime}），处于未保存修改状态`, 'info');
	} catch {
		// Ignore
	}
}

// --- Draft UI Manipulation ---
function fillDraft(draft: DraftRecord) {
	if (!form) return;
	currentId = String(draft.id || '');
	currentVersion = Number(draft.version || 0);

	// Lock slug if already saved
	if (slugInput) {
		slugInput.readOnly = Boolean(currentId);
		if (slugHelper) {
			slugHelper.textContent = currentId ? '已保存草稿已锁定 Slug，不可修改' : '小写字母、数字与连字符；已保存草稿将自动锁定';
		}
	}

	for (const [name, value] of Object.entries({
		slug: draft.slug,
		title: draft.title,
		description: draft.description,
		body: draft.body,
		pubDate: draft.pub_date,
		kicker: draft.kicker,
	})) {
		const input = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
		if (input) input.value = String(value || '');
	}

	for (const name of ['kind', 'presentation']) {
		const select = form.elements.namedItem(name) as HTMLSelectElement | null;
		if (select && typeof (draft as any)[name] === 'string') {
			select.value = String((draft as any)[name]);
		}
	}

	const featuredInput = form.elements.namedItem('featured') as HTMLInputElement | null;
	if (featuredInput) {
		featuredInput.checked = draft.featured === 1 || draft.featured === true;
	}

	const listedInput = form.elements.namedItem('listed') as HTMLInputElement | null;
	if (listedInput) {
		listedInput.checked = draft.listed !== 0 && draft.listed !== false;
	}

	const tagsInput = form.elements.namedItem('tags') as HTMLInputElement | null;
	if (tagsInput) {
		try {
			tagsInput.value = Array.isArray(draft.tags_json)
				? draft.tags_json.join(', ')
				: JSON.parse(String(draft.tags_json || '[]')).join(', ');
		} catch {
			tagsInput.value = '';
		}
	}

	const aliasesInput = form.elements.namedItem('aliases') as HTMLInputElement | null;
	if (aliasesInput) {
		try {
			aliasesInput.value = Array.isArray(draft.aliases)
				? draft.aliases.join(', ')
				: JSON.parse(String(draft.aliases_json || '[]')).join(', ');
		} catch {
			aliasesInput.value = '';
		}
	}

	// System info (always based on server data)
	if (sourcePathInput) sourcePathInput.value = String(draft.source_path || '');
	if (sourceBlobShaInput) sourceBlobShaInput.value = String(draft.source_blob_sha || '');
	if (publishCommitShaInput) publishCommitShaInput.value = String(draft.publish_commit_sha || '');
	if (systemStatusTextInput) {
		const statusText = CHINESE_STATUS_MAP[draft.status || 'draft'] || draft.status || '草稿';
		systemStatusTextInput.value = `${statusText} (v${draft.version || 1})`;
	}

	// Record server state baseline
	initialFormValuesJson = JSON.stringify(extractEditableValues());

	// Update publish button label based on draft history
	updatePublishButtonLabel(draft);

	// Check local autosave
	checkAndRestoreDraftAutosave(currentId, currentVersion);
}

function resetForm({ restoreAutosave = false } = {}) {
	if (!form) return;
	invalidatePendingDraftLoads();
	setEditorInputsDisabled(false);
	currentId = '';
	currentVersion = 0;
	form.reset();

	if (slugInput) {
		slugInput.readOnly = false;
		if (slugHelper) {
			slugHelper.textContent = '小写字母、数字与连字符；已保存草稿将自动锁定';
		}
	}

	if (sourcePathInput) sourcePathInput.value = '';
	if (sourceBlobShaInput) sourceBlobShaInput.value = '';
	if (publishCommitShaInput) publishCommitShaInput.value = '';
	if (systemStatusTextInput) systemStatusTextInput.value = '未保存草稿';
	if (previewFrame) previewFrame.srcdoc = '';

	// Baseline for blank form
	initialFormValuesJson = JSON.stringify(extractEditableValues());
	updatePublishButtonLabel(null);
	draftList?.querySelectorAll('.admin-draft-item').forEach((el) => el.removeAttribute('aria-current'));

	// Check autosave for new draft only if restoreAutosave is true
	if (restoreAutosave) {
		checkAndRestoreNewDraftAutosave();
	}
}

// --- Draft List Management ---
async function loadDrafts() {
	if (!draftList) return;
	try {
		const result = await api<{ drafts: DraftRecord[] }>('/api/admin/drafts');
		draftList.replaceChildren();

		if (!result.drafts || result.drafts.length === 0) {
			const emptyItem = document.createElement('li');
			emptyItem.className = 'admin-empty-state';
			emptyItem.id = 'draft-list-empty';
			emptyItem.textContent = '暂无草稿';
			draftList.append(emptyItem);
			return;
		}

		for (const draft of result.drafts) {
			if (draft.status === 'deploying' && !activePollTimers.has(draft.id)) {
				startPublishPolling(draft.id, draft.publish_commit_sha ?? undefined);
			}

			const item = document.createElement('li');
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'admin-draft-item';
			button.dataset.id = String(draft.id);

			const titleSpan = document.createElement('span');
			titleSpan.className = 'admin-draft-title';
			titleSpan.textContent = String(draft.title || draft.slug || '未命名草稿');

			const metaSpan = document.createElement('span');
			metaSpan.className = 'admin-draft-meta';

			const statusBadge = document.createElement('span');
			const status = String(draft.status || 'draft');
			statusBadge.className = `admin-status-badge status-${status}`;
			statusBadge.textContent = CHINESE_STATUS_MAP[status] || status;

			const slugText = document.createTextNode(` · ${draft.slug || ''}`);
			metaSpan.append(statusBadge, slugText);

			button.append(titleSpan, metaSpan);

			if (draft.id === currentId) {
				button.setAttribute('aria-current', 'true');
			}

			button.addEventListener('click', async () => {
				await selectDraft(draft, button);
			});

			item.append(button);
			draftList.append(item);
		}
	} catch (err) {
		setStatus(err instanceof Error ? err.message : '获取草稿列表失败', 'error');
	}
}

async function selectDraft(draft: DraftRecord, buttonEl?: HTMLButtonElement) {
	if (isSubmitting) return;
	if (draft.id === currentId) return;

	if (isFormDirty()) {
		if (!confirm('当前草稿有未保存的修改，切换将丢失。确定要切换吗？')) {
			return;
		}
	}

	// Flush autosave of current draft before changing
	flushPendingAutosave();

	const reqSeq = ++activeLoadDraftSeq;
	setStatus('正在加载草稿…', 'loading');

	// Protect current input while loading draft
	setEditorInputsDisabled(true);

	try {
		const detail = await api<{ draft: DraftRecord }>(`/api/admin/drafts/${encodeURIComponent(draft.id)}`);
		// Discard stale out-of-order response if user clicked another draft or clicked "新建" in the meantime
		if (reqSeq !== activeLoadDraftSeq) return;

		setEditorInputsDisabled(false);
		fillDraft(detail.draft || draft);
		draftList?.querySelectorAll('.admin-draft-item').forEach((cand) => cand.removeAttribute('aria-current'));
		buttonEl?.setAttribute('aria-current', 'true');

		if (detail.draft.status === 'deploying') {
			setStatus('正在发布，网站更新完成后会通知你', 'loading');
			startPublishPolling(detail.draft.id, detail.draft.publish_commit_sha ?? undefined);
		} else if (detail.draft.status === 'publish_failed' && detail.draft.error_code === 'deployment_timeout') {
			setStatus('尚未确认上线，草稿已保留', 'warning', undefined, {
				label: '重新检查',
				action: () => recheckDeployment(detail.draft.id),
			});
		} else if (detail.draft.status === 'published_superseded') {
			const origin = getPublicOrigin();
			setStatus('已有更新版本上线', 'info', { href: `${origin}/posts/${detail.draft.slug}`, label: '查看文章' });
		} else if (detail.draft.status === 'published') {
			const origin = getPublicOrigin();
			setStatus('已发布／已更新', 'success', { href: `${origin}/posts/${detail.draft.slug}`, label: '查看文章' });
		} else {
			setStatus(`已载入：${detail.draft.title || detail.draft.slug}`, 'info');
		}
	} catch (err) {
		if (reqSeq === activeLoadDraftSeq) {
			setEditorInputsDisabled(false);
			setStatus(err instanceof Error ? err.message : '载入草稿失败', 'error');
		}
	}
}

// --- Save Draft Workflow ---
async function saveCurrentDraft(silent = false) {
	if (!form) return null;

	// 1. Capture snapshot before disabling controls
	flushPendingAutosave();
	invalidatePendingDraftLoads();
	const targetDraftId = currentId;
	const targetVersion = currentVersion;
	const editableSnapshot = extractEditableValues();
	if (!editableSnapshot) return null;

	// 2. Lock controls
	setControlsLocked(true);

	try {
		if (!silent) setStatus('正在保存', 'loading');

		const isUpdate = Boolean(targetDraftId);
		const url = isUpdate ? `/api/admin/drafts/${encodeURIComponent(targetDraftId)}` : '/api/admin/drafts';
		const method = isUpdate ? 'PUT' : 'POST';

		const payload = {
			...editableSnapshot,
			...(isUpdate ? { version: targetVersion } : {}),
			...(sourcePathInput?.value?.trim() ? { sourcePath: sourcePathInput.value.trim() } : {}),
		};

		const result = await api<{ id: string; status: string; version: number }>(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		// If user hasn't switched away while request was in-flight, update state
		if (currentId === targetDraftId) {
			currentId = result.id || currentId;
			currentVersion = Number(result.version || currentVersion);
			// Save baseline is the actual submitted snapshot of editable values
			initialFormValuesJson = JSON.stringify(editableSnapshot);

			if (slugInput) slugInput.readOnly = true;
			if (slugHelper) slugHelper.textContent = '已保存草稿已锁定 Slug，不可修改';
			if (systemStatusTextInput) systemStatusTextInput.value = `草稿 (v${currentVersion})`;
			updatePublishButtonLabel({
				source_blob_sha: sourceBlobShaInput?.value,
				publish_commit_sha: publishCommitShaInput?.value,
			});
		}

		// Clear autosave for saved article
		if (!targetDraftId) {
			clearAutosave('new');
		} else {
			clearAutosave(targetDraftId);
		}

		if (!silent) setStatus('草稿已保存', 'success');
		await loadDrafts();
		return result;
	} catch (err: any) {
		if (err.code === 'draft_version_conflict') {
			setStatus('草稿版本冲突：已被其他窗口修改，请重新载入后合并', 'warning');
		} else if (err.code === 'publish_in_progress') {
			setStatus('草稿正在发布中，暂时无法保存', 'warning');
		} else {
			setStatus(err instanceof Error ? err.message : '保存失败', 'error');
		}
		throw err;
	} finally {
		setControlsLocked(false);
	}
}

// --- Publish Workflow ---
async function publishCurrentDraft() {
	if (!form) return;

	// Step 1: Check form validity
	if (!form.checkValidity()) {
		form.reportValidity();
		setStatus('请先完善必填项后再发布', 'warning');
		return;
	}

	// 1. Capture snapshot before disabling
	flushPendingAutosave();
	invalidatePendingDraftLoads();
	const targetDraftId = currentId;
	const targetVersion = currentVersion;
	const editableSnapshot = extractEditableValues();
	if (!editableSnapshot) return;

	const wasPublished = Boolean(sourceBlobShaInput?.value || publishCommitShaInput?.value);

	setControlsLocked(true);

	try {
		// Step 2: Save current draft content first
		setStatus('正在保存', 'loading');
		const isUpdate = Boolean(targetDraftId);
		const saveUrl = isUpdate ? `/api/admin/drafts/${encodeURIComponent(targetDraftId)}` : '/api/admin/drafts';
		const saveMethod = isUpdate ? 'PUT' : 'POST';

		const payload = {
			...editableSnapshot,
			...(isUpdate ? { version: targetVersion } : {}),
			...(sourcePathInput?.value?.trim() ? { sourcePath: sourcePathInput.value.trim() } : {}),
		};

		const saveResult = await api<{ id: string; status: string; version: number }>(saveUrl, {
			method: saveMethod,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		const publishTargetId = saveResult.id || targetDraftId;
		const publishTargetVersion = Number(saveResult.version || targetVersion);

		if (currentId === targetDraftId) {
			currentId = publishTargetId;
			currentVersion = publishTargetVersion;
			initialFormValuesJson = JSON.stringify(editableSnapshot);
			if (slugInput) slugInput.readOnly = true;
		}

		if (!targetDraftId) clearAutosave('new');
		else clearAutosave(targetDraftId);

		// Step 3: Commit to publish with atomic version check
		setStatus('正在发布，网站更新完成后会通知你', 'loading');
		const publishResult = await api<{ id: string; status: string; commitSha?: string; sourceBlobSha?: string }>(
			'/api/admin/publish',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: publishTargetId, version: publishTargetVersion }),
			},
		);

		const commitSha = publishResult.commitSha || '';
		if (currentId === publishTargetId) {
			if (publishCommitShaInput && commitSha) publishCommitShaInput.value = commitSha;
			if (sourceBlobShaInput && publishResult.sourceBlobSha) sourceBlobShaInput.value = publishResult.sourceBlobSha;
			if (systemStatusTextInput) systemStatusTextInput.value = '部署中';
			updatePublishButtonLabel({
				source_blob_sha: publishResult.sourceBlobSha || sourceBlobShaInput?.value,
				publish_commit_sha: commitSha,
			});
		}

		setStatus('正在发布，网站更新完成后会通知你', 'loading');
		await loadDrafts();

		// Release edit controls so user can freely inspect or work on other drafts while deployment proceeds
		setControlsLocked(false);

		// Step 4: Start chained polling bound strictly to publishTargetId
		startPublishPolling(publishTargetId, commitSha, wasPublished);
	} catch (cause: any) {
		setControlsLocked(false);
		setStatus('发布失败，草稿已保留', 'error');
		await loadDrafts();
	}
}

// --- Deployment Re-check (Does not create GitHub commits) ---
async function recheckDeployment(draftId: string) {
	try {
		setStatus('正在重新检查上线状态…', 'loading');
		const detail = await api<{ draft: DraftRecord }>(`/api/admin/drafts/${encodeURIComponent(draftId)}?recheck=1`);
		const draft = detail.draft;
		if (!draft) return;

		const origin = getPublicOrigin();
		const articleUrl = `${origin}/posts/${draft.slug}`;

		if (draft.status === 'published') {
			setStatus('已发布／已更新', 'success', { href: articleUrl, label: '查看文章' });
			if (currentId === draftId) {
				if (publishCommitShaInput) publishCommitShaInput.value = draft.publish_commit_sha || '';
				if (sourceBlobShaInput) sourceBlobShaInput.value = draft.source_blob_sha || '';
				if (systemStatusTextInput) systemStatusTextInput.value = `已发布 (v${draft.version || 1})`;
				updatePublishButtonLabel(draft);
			}
			await loadDrafts();
		} else if (draft.status === 'published_superseded') {
			setStatus('已有更新版本上线', 'info', { href: articleUrl, label: '查看文章' });
			if (currentId === draftId) {
				if (publishCommitShaInput) publishCommitShaInput.value = draft.publish_commit_sha || '';
				if (sourceBlobShaInput) sourceBlobShaInput.value = draft.source_blob_sha || '';
				if (systemStatusTextInput) systemStatusTextInput.value = '已有更新版本上线';
				updatePublishButtonLabel(draft);
			}
			await loadDrafts();
		} else if (draft.status === 'deploying') {
			setStatus('正在发布，网站更新完成后会通知你', 'loading');
			startPublishPolling(draftId, draft.publish_commit_sha ?? undefined);
		} else {
			setStatus('尚未确认上线，草稿已保留', 'warning', undefined, {
				label: '重新检查',
				action: () => recheckDeployment(draftId),
			});
		}
	} catch {
		setStatus('检查失败，请稍后重试', 'error', undefined, {
			label: '重新检查',
			action: () => recheckDeployment(draftId),
		});
	}
}

function startPublishPolling(draftId: string, commitSha?: string, wasPublished = false) {
	if (activePollTimers.has(draftId)) {
		window.clearTimeout(activePollTimers.get(draftId));
		activePollTimers.delete(draftId);
	}

	let isPolling = true;
	let consecutiveNetworkErrors = 0;

	async function poll() {
		if (!isPolling) return;
		try {
			const detail = await api<{ draft: DraftRecord }>(`/api/admin/drafts/${encodeURIComponent(draftId)}`);
			consecutiveNetworkErrors = 0;
			const draft = detail.draft;
			if (!draft) return;

			// If another newer commit took over for this draft, stop this polling instance
			if (commitSha && draft.publish_commit_sha && draft.publish_commit_sha !== commitSha && draft.status === 'deploying') {
				isPolling = false;
				activePollTimers.delete(draftId);
				return;
			}

			if (draft.status === 'published') {
				isPolling = false;
				activePollTimers.delete(draftId);

				const origin = getPublicOrigin();
				const articleUrl = `${origin}/posts/${draft.slug}`;
				const label = wasPublished || draft.source_blob_sha ? '已发布／已更新' : '已发布';
				setStatus(
					label,
					'success',
					{ href: articleUrl, label: '查看文章' },
				);

				if (currentId === draftId) {
					if (publishCommitShaInput) publishCommitShaInput.value = draft.publish_commit_sha || '';
					if (sourceBlobShaInput) sourceBlobShaInput.value = draft.source_blob_sha || '';
					if (systemStatusTextInput) systemStatusTextInput.value = `已发布 (v${draft.version || 1})`;
					updatePublishButtonLabel(draft);
				}
				await loadDrafts();
				return;
			} else if (draft.status === 'published_superseded') {
				isPolling = false;
				activePollTimers.delete(draftId);

				const origin = getPublicOrigin();
				const articleUrl = `${origin}/posts/${draft.slug}`;
				setStatus(
					'已有更新版本上线',
					'info',
					{ href: articleUrl, label: '查看文章' },
				);

				if (currentId === draftId) {
					if (publishCommitShaInput) publishCommitShaInput.value = draft.publish_commit_sha || '';
					if (sourceBlobShaInput) sourceBlobShaInput.value = draft.source_blob_sha || '';
					if (systemStatusTextInput) systemStatusTextInput.value = '已有更新版本上线';
					updatePublishButtonLabel(draft);
				}
				await loadDrafts();
				return;
			} else if (draft.status === 'publish_failed') {
				isPolling = false;
				activePollTimers.delete(draftId);

				if (draft.error_code === 'deployment_timeout') {
					setStatus(
						'尚未确认上线，草稿已保留',
						'warning',
						undefined,
						{
							label: '重新检查',
							action: () => recheckDeployment(draftId),
						},
					);
				} else {
					setStatus('发布失败，草稿已保留', 'error');
				}

				if (currentId === draftId && systemStatusTextInput) {
					systemStatusTextInput.value = `发布失败 (${draft.error_code || ''})`;
				}
				await loadDrafts();
				return;
			} else if (draft.status === 'conflict') {
				isPolling = false;
				activePollTimers.delete(draftId);
				setStatus('发布失败，草稿已保留', 'warning');
				await loadDrafts();
				return;
			} else {
				// Still deploying
				if (currentId === draftId) {
					setStatus('正在发布，网站更新完成后会通知你', 'loading');
				}
			}
		} catch (err: any) {
			if (err?.code === 'unauthorized' || err?.status === 401) {
				isPolling = false;
				activePollTimers.delete(draftId);
				setStatus('会话已失效，请重新登录', 'error');
				return;
			}
			consecutiveNetworkErrors++;
			if (consecutiveNetworkErrors >= 6) {
				// Pausing after persistent network errors
				isPolling = false;
				activePollTimers.delete(draftId);
				setStatus('尚未确认上线，草稿已保留', 'warning', undefined, {
					label: '重新检查',
					action: () => recheckDeployment(draftId),
				});
				return;
			}
		}

		// Wait 5 seconds AFTER previous request completes before sending the next one
		if (isPolling) {
			const timerId = window.setTimeout(poll, 5000);
			activePollTimers.set(draftId, timerId);
		}
	}

	const timerId = window.setTimeout(poll, 5000);
	activePollTimers.set(draftId, timerId);
}

// --- Preview Workflow ---
async function previewCurrentDraft() {
	if (!previewFrame || !form) return;
	const body = (form.elements.namedItem('body') as HTMLTextAreaElement | null)?.value || '';
	try {
		setStatus('正在生成安全预览…', 'loading');
		const result = await api<{ html: string }>('/api/admin/preview', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ markdown: body }),
		});

		// Theme sync
		const isDark =
			document.documentElement.dataset.colorMode === 'dark' ||
			(document.documentElement.dataset.colorMode !== 'light' &&
				window.matchMedia('(prefers-color-scheme: dark)').matches);

		const bg = isDark ? '#181C18' : '#FFFFFF';
		const color = isDark ? '#EDEFEA' : '#121512';
		const linkColor = isDark ? '#B6FF3B' : '#0F5C20';
		const codeBg = isDark ? '#0D100D' : '#F2F0E9';

		previewFrame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"/><style>
body { font: 15px/1.7 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; max-width: 680px; margin: 20px auto; padding: 0 16px; background: ${bg}; color: ${color}; }
img { max-width: 100%; height: auto; border-radius: 6px; }
a { color: ${linkColor}; text-decoration: underline; }
h1, h2, h3 { color: ${color}; letter-spacing: -0.02em; }
code { font-family: ui-monospace, Menlo, monospace; font-size: 13px; background: ${codeBg}; padding: 2px 5px; border-radius: 4px; }
blockquote { border-left: 3px solid ${linkColor}; margin: 1em 0; padding-left: 12px; color: ${isDark ? '#949E95' : '#5E6660'}; }
</style></head><body>${result.html}</body></html>`;

		setStatus('预览已生成（隔离沙盒）', 'success');
	} catch (err) {
		setStatus(err instanceof Error ? err.message : '预览生成失败', 'error');
	}
}

// --- Comments Moderation ---
async function loadComments(status: string = currentCommentFilter) {
	currentCommentFilter = status;
	const listEl = document.getElementById('comments-list');
	if (!listEl) return;

	listEl.replaceChildren();
	const loadingItem = document.createElement('div');
	loadingItem.className = 'admin-empty-state';
	loadingItem.textContent = '正在加载评论…';
	listEl.append(loadingItem);

	try {
		const result = await api<{ comments: CommentRecord[] }>(`/api/admin/comments?status=${encodeURIComponent(status)}`);
		listEl.replaceChildren();

		if (!result.comments || result.comments.length === 0) {
			const emptyItem = document.createElement('div');
			emptyItem.className = 'admin-empty-state';
			emptyItem.textContent = `暂无${status === 'all' ? '' : status === 'pending' ? '待审核' : status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : '垃圾'}评论`;
			listEl.append(emptyItem);
			return;
		}

		for (const comment of result.comments) {
			const card = document.createElement('div');
			card.className = 'admin-comment-card';

			const header = document.createElement('div');
			header.className = 'admin-comment-header';

			const authorWrap = document.createElement('div');
			authorWrap.className = 'admin-comment-author';
			if (comment.author_url) {
				const authorLink = document.createElement('a');
				authorLink.href = comment.author_url;
				authorLink.textContent = comment.author_name;
				authorLink.target = '_blank';
				authorLink.rel = 'noopener noreferrer nofollow';
				authorLink.style.color = 'var(--text)';
				authorWrap.append(authorLink);
			} else {
				authorWrap.textContent = comment.author_name;
			}

			const metaWrap = document.createElement('div');
			metaWrap.className = 'admin-comment-meta';

			const slugLink = document.createElement('a');
			slugLink.href = `/posts/${comment.slug}`;
			slugLink.target = '_blank';
			slugLink.rel = 'noopener noreferrer';
			slugLink.textContent = `/${comment.slug}`;
			slugLink.style.color = 'var(--text-muted)';

			const timeText = document.createTextNode(comment.created_at || '');

			const statusBadge = document.createElement('span');
			statusBadge.className = `admin-status-badge status-${comment.status}`;
			statusBadge.textContent =
				comment.status === 'pending'
					? '待审核'
					: comment.status === 'approved'
					? '已通过'
					: comment.status === 'rejected'
					? '已拒绝'
					: '垃圾';

			metaWrap.append(slugLink, document.createTextNode(' · '), timeText, statusBadge);
			header.append(authorWrap, metaWrap);

			// Pure text content rendering strictly prevents XSS
			const bodyEl = document.createElement('p');
			bodyEl.className = 'admin-comment-body';
			bodyEl.textContent = comment.body;

			const actionsWrap = document.createElement('div');
			actionsWrap.className = 'admin-comment-actions';

			const createActionBtn = (label: string, actionStatus: string, danger = false) => {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = `admin-small-button ${danger ? 'admin-btn-danger' : ''}`;
				btn.textContent = label;
				btn.addEventListener('click', async () => {
					try {
						btn.disabled = true;
						await api(`/api/admin/comments/${encodeURIComponent(comment.id)}`, {
							method: 'PATCH',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ status: actionStatus }),
						});
						setStatus(`评论已${label}`, 'success');
						await loadComments(currentCommentFilter);
					} catch (err) {
						setStatus(err instanceof Error ? err.message : '操作失败', 'error');
						btn.disabled = false;
					}
				});
				return btn;
			};

			if (comment.status !== 'approved') actionsWrap.append(createActionBtn('通过', 'approved'));
			if (comment.status !== 'rejected') actionsWrap.append(createActionBtn('拒绝', 'rejected'));
			if (comment.status !== 'spam') actionsWrap.append(createActionBtn('垃圾', 'spam'));

			const deleteBtn = document.createElement('button');
			deleteBtn.type = 'button';
			deleteBtn.className = 'admin-small-button admin-btn-danger';
			deleteBtn.textContent = '删除';
			deleteBtn.addEventListener('click', async () => {
				if (!confirm('确定要永久删除这条评论吗？')) return;
				try {
					deleteBtn.disabled = true;
					await api(`/api/admin/comments/${encodeURIComponent(comment.id)}`, { method: 'DELETE' });
					setStatus('评论已删除', 'success');
					await loadComments(currentCommentFilter);
				} catch (err) {
					setStatus(err instanceof Error ? err.message : '删除失败', 'error');
					deleteBtn.disabled = false;
				}
			});
			actionsWrap.append(deleteBtn);

			card.append(header, bodyEl, actionsWrap);
			listEl.append(card);
		}
	} catch (err) {
		setStatus(err instanceof Error ? err.message : '获取评论失败', 'error');
	}
}

// --- Links Management ---
const linkFormCard = document.getElementById('link-form-card');
const linkForm = document.getElementById('link-form') as HTMLFormElement | null;
const linkFormTitle = document.getElementById('link-form-title');
const linkIdInput = document.getElementById('link-id') as HTMLInputElement | null;
const btnAddLink = document.getElementById('btn-add-link');
const btnCancelLink = document.getElementById('btn-cancel-link');
const linksTbody = document.getElementById('links-tbody');
const linksCards = document.getElementById('links-cards');

function showLinkForm(editLink?: LinkRecord) {
	if (!linkFormCard || !linkForm) return;
	linkFormCard.hidden = false;
	if (editLink) {
		if (linkFormTitle) linkFormTitle.textContent = '编辑友链';
		if (linkIdInput) linkIdInput.value = editLink.id;
		(linkForm.elements.namedItem('name') as HTMLInputElement).value = editLink.name;
		(linkForm.elements.namedItem('url') as HTMLInputElement).value = editLink.url;
		(linkForm.elements.namedItem('description') as HTMLInputElement).value = editLink.description || '';
		(linkForm.elements.namedItem('sortOrder') as HTMLInputElement).value = String(editLink.sort_order ?? 0);
		(linkForm.elements.namedItem('status') as HTMLSelectElement).value = editLink.status || 'active';
	} else {
		if (linkFormTitle) linkFormTitle.textContent = '新增友链';
		linkForm.reset();
		if (linkIdInput) linkIdInput.value = '';
	}
	linkFormCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideLinkForm() {
	if (!linkFormCard) return;
	linkFormCard.hidden = true;
	linkForm?.reset();
	if (linkIdInput) linkIdInput.value = '';
}

// Shared status toggle for desktop & mobile
async function toggleLinkStatus(link: LinkRecord, triggerBtn?: HTMLButtonElement) {
	if (triggerBtn) triggerBtn.disabled = true;
	try {
		const nextStatus = link.status === 'active' ? 'hidden' : 'active';
		await api(`/api/admin/links/${encodeURIComponent(link.id)}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: link.name,
				url: link.url,
				description: link.description || null,
				sortOrder: link.sort_order, // explicitly preserve sort_order as sortOrder
				status: nextStatus,
			}),
		});
		setStatus(`友链“${link.name}”已切换为${nextStatus === 'active' ? '显示' : '隐藏'}`, 'success');
		await loadLinks();
	} catch (err) {
		setStatus(err instanceof Error ? err.message : '操作失败', 'error');
	} finally {
		if (triggerBtn) triggerBtn.disabled = false;
	}
}

async function loadLinks() {
	if (!linksTbody || !linksCards) return;

	try {
		const result = await api<{ links: LinkRecord[] }>('/api/admin/links');
		linksTbody.replaceChildren();
		linksCards.replaceChildren();

		if (!result.links || result.links.length === 0) {
			const emptyRow = document.createElement('tr');
			const emptyCell = document.createElement('td');
			emptyCell.colSpan = 6;
			emptyCell.className = 'admin-empty-state';
			emptyCell.textContent = '暂无友链，点击上方“新增友链”添加。';
			emptyRow.append(emptyCell);
			linksTbody.append(emptyRow);
			return;
		}

		for (const link of result.links) {
			// Desktop table row
			const tr = document.createElement('tr');

			const tdOrder = document.createElement('td');
			tdOrder.className = 'admin-control-mono';
			tdOrder.textContent = String(link.sort_order ?? 0);

			const tdName = document.createElement('td');
			tdName.style.fontWeight = '600';
			tdName.textContent = link.name;

			const tdUrl = document.createElement('td');
			const a = document.createElement('a');
			a.href = link.url;
			a.textContent = link.url;
			a.target = '_blank';
			a.rel = 'noopener noreferrer';
			a.className = 'admin-dock-link';
			tdUrl.append(a);
			if (link.description) {
				const descSpan = document.createElement('div');
				descSpan.style.fontSize = '12px';
				descSpan.style.color = 'var(--text-muted)';
				descSpan.style.marginTop = '4px';
				descSpan.textContent = link.description;
				tdUrl.append(descSpan);
			}

			const tdStatus = document.createElement('td');
			const statusBadge = document.createElement('span');
			const statusKey = link.status === 'active' ? 'published' : link.status === 'hidden' ? 'draft' : 'conflict';
			statusBadge.className = `admin-status-badge status-${statusKey}`;
			statusBadge.textContent = link.status === 'active' ? '正常' : link.status === 'hidden' ? '隐藏' : '离线';
			tdStatus.append(statusBadge);

			const tdChecked = document.createElement('td');
			tdChecked.className = 'admin-control-mono';
			tdChecked.style.fontSize = '11px';
			tdChecked.style.color = 'var(--text-muted)';
			tdChecked.textContent = link.checked_at ? link.checked_at.slice(0, 16) : '未检查';

			const tdActions = document.createElement('td');
			tdActions.style.textAlign = 'right';

			const editBtn = document.createElement('button');
			editBtn.type = 'button';
			editBtn.className = 'admin-small-button';
			editBtn.textContent = '编辑';
			editBtn.style.marginRight = '6px';
			editBtn.addEventListener('click', () => showLinkForm(link));

			const toggleBtn = document.createElement('button');
			toggleBtn.type = 'button';
			toggleBtn.className = 'admin-small-button';
			toggleBtn.textContent = link.status === 'active' ? '隐藏' : '显示';
			toggleBtn.style.marginRight = '6px';
			toggleBtn.addEventListener('click', () => toggleLinkStatus(link, toggleBtn));

			const delBtn = document.createElement('button');
			delBtn.type = 'button';
			delBtn.className = 'admin-small-button admin-btn-danger';
			delBtn.textContent = '删除';
			delBtn.addEventListener('click', async () => {
				if (!confirm(`确定要删除友链“${link.name}”吗？`)) return;
				try {
					delBtn.disabled = true;
					await api(`/api/admin/links/${encodeURIComponent(link.id)}`, { method: 'DELETE' });
					setStatus('友链已删除', 'success');
					await loadLinks();
				} catch (err) {
					setStatus(err instanceof Error ? err.message : '删除失败', 'error');
					delBtn.disabled = false;
				}
			});

			tdActions.append(editBtn, toggleBtn, delBtn);
			tr.append(tdOrder, tdName, tdUrl, tdStatus, tdChecked, tdActions);
			linksTbody.append(tr);

			// Mobile Card
			const card = document.createElement('div');
			card.className = 'admin-link-card';
			const cardTitle = document.createElement('div');
			cardTitle.style.fontWeight = '600';
			cardTitle.textContent = link.name;

			const cardLink = document.createElement('a');
			cardLink.href = link.url;
			cardLink.textContent = link.url;
			cardLink.target = '_blank';
			cardLink.className = 'admin-dock-link';

			const cardActions = document.createElement('div');
			cardActions.style.display = 'flex';
			cardActions.style.gap = '8px';
			cardActions.style.marginTop = '6px';

			const mobileEditBtn = document.createElement('button');
			mobileEditBtn.type = 'button';
			mobileEditBtn.className = 'admin-small-button';
			mobileEditBtn.textContent = '编辑';
			mobileEditBtn.addEventListener('click', () => showLinkForm(link));

			const mobileToggleBtn = document.createElement('button');
			mobileToggleBtn.type = 'button';
			mobileToggleBtn.className = 'admin-small-button';
			mobileToggleBtn.textContent = link.status === 'active' ? '隐藏' : '显示';
			mobileToggleBtn.addEventListener('click', () => toggleLinkStatus(link, mobileToggleBtn));

			const mobileDelBtn = document.createElement('button');
			mobileDelBtn.type = 'button';
			mobileDelBtn.className = 'admin-small-button admin-btn-danger';
			mobileDelBtn.textContent = '删除';
			mobileDelBtn.addEventListener('click', async () => {
				if (!confirm(`确定要删除友链“${link.name}”吗？`)) return;
				try {
					mobileDelBtn.disabled = true;
					await api(`/api/admin/links/${encodeURIComponent(link.id)}`, { method: 'DELETE' });
					setStatus('友链已删除', 'success');
					await loadLinks();
				} catch (err) {
					setStatus(err instanceof Error ? err.message : '删除失败', 'error');
					mobileDelBtn.disabled = false;
				}
			});

			cardActions.append(mobileEditBtn, mobileToggleBtn, mobileDelBtn);
			card.append(cardTitle, cardLink, cardActions);
			linksCards.append(card);
		}
	} catch (err) {
		setStatus(err instanceof Error ? err.message : '获取友链失败', 'error');
	}
}

// --- Tabs Management with Keyboard Navigation ---
function setupTabs() {
	const tabBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('.admin-tab-btn'));
	const panels = document.querySelectorAll<HTMLElement>('.admin-tab-panel');

	function switchTab(targetTab: string, focus = false) {
		tabBtns.forEach((btn) => {
			const isMatch = btn.dataset.tab === targetTab;
			btn.setAttribute('aria-selected', String(isMatch));
			btn.tabIndex = isMatch ? 0 : -1;
			if (isMatch && focus) btn.focus();
		});

		panels.forEach((panel) => {
			const isMatch = panel.id === `tab-panel-${targetTab}`;
			panel.hidden = !isMatch;
		});

		if (targetTab === 'comments') {
			loadComments(currentCommentFilter);
		} else if (targetTab === 'links') {
			loadLinks();
		}

		try {
			history.replaceState(null, '', `#${targetTab}`);
		} catch {
			// Ignore
		}
	}

	tabBtns.forEach((btn, index) => {
		btn.addEventListener('click', () => {
			const tab = btn.dataset.tab;
			if (tab) switchTab(tab);
		});

		btn.addEventListener('keydown', (e) => {
			let nextIndex = index;
			if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
				e.preventDefault();
				nextIndex = (index + 1) % tabBtns.length;
			} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
				e.preventDefault();
				nextIndex = (index - 1 + tabBtns.length) % tabBtns.length;
			} else if (e.key === 'Home') {
				e.preventDefault();
				nextIndex = 0;
			} else if (e.key === 'End') {
				e.preventDefault();
				nextIndex = tabBtns.length - 1;
			} else {
				return;
			}
			const nextTab = tabBtns[nextIndex].dataset.tab;
			if (nextTab) switchTab(nextTab, true);
		});
	});

	const hash = location.hash.replace(/^#/, '');
	if (['posts', 'comments', 'links'].includes(hash)) {
		switchTab(hash);
	}
}

// --- Event Listeners Initialization ---
function initEventListeners() {
	// Form change listener for debounced autosave
	form?.addEventListener('input', () => triggerAutosave());

	// Save draft submit
	form?.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (isSubmitting) return;
		try {
			await saveCurrentDraft();
		} catch {
			// Error already handled and displayed by saveCurrentDraft
		}
	});

	// New Draft
	newDraftBtn?.addEventListener('click', () => {
		if (isSubmitting) return;
		if (isFormDirty()) {
			if (!confirm('当前草稿有未保存的修改，新建将丢失未保存内容。确定要新建吗？')) {
				return;
			}
		}
		flushPendingAutosave();
		invalidatePendingDraftLoads();
		resetForm({ restoreAutosave: false });
		setStatus('已创建空白草稿', 'info');
	});

	// Publish Draft
	publishDraftBtn?.addEventListener('click', () => {
		if (isSubmitting) return;
		publishCurrentDraft();
	});

	// Preview Draft
	previewDraftBtn?.addEventListener('click', () => {
		previewCurrentDraft();
	});

	// Logout
	logoutBtn?.addEventListener('click', async () => {
		try {
			await api('/auth/logout', { method: 'POST' });
			location.assign('/');
		} catch (err) {
			setStatus(err instanceof Error ? err.message : '退出失败', 'error');
		}
	});

	// Comments filter bar
	const commentsFilterBar = document.getElementById('comments-filter-bar');
	commentsFilterBar?.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		if (target.classList.contains('admin-filter-btn')) {
			commentsFilterBar.querySelectorAll('.admin-filter-btn').forEach((b) => b.classList.remove('active'));
			target.classList.add('active');
			const status = target.dataset.status || 'pending';
			loadComments(status);
		}
	});

	document.getElementById('refresh-comments')?.addEventListener('click', () => {
		loadComments(currentCommentFilter);
		setStatus('评论列表已刷新', 'info');
	});

	// Links UI
	btnAddLink?.addEventListener('click', () => showLinkForm());
	btnCancelLink?.addEventListener('click', () => hideLinkForm());
	document.getElementById('refresh-links')?.addEventListener('click', () => {
		loadLinks();
		setStatus('友链列表已刷新', 'info');
	});

	linkForm?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const data = new FormData(linkForm);
		const id = String(data.get('id') || '').trim();
		const payload = {
			name: String(data.get('name') || '').trim(),
			url: String(data.get('url') || '').trim(),
			description: String(data.get('description') || '').trim() || null,
			sortOrder: Number(data.get('sortOrder')) || 0,
			status: String(data.get('status') || 'active'),
		};

		try {
			if (id) {
				await api(`/api/admin/links/${encodeURIComponent(id)}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});
				setStatus('友链更新成功', 'success');
			} else {
				await api('/api/admin/links', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});
				setStatus('友链新增成功', 'success');
			}
			hideLinkForm();
			await loadLinks();
		} catch (err) {
			setStatus(err instanceof Error ? err.message : '保存友链失败', 'error');
		}
	});

	// Window unload autosave flush and dirty warning
	window.addEventListener('beforeunload', (e) => {
		flushPendingAutosave();
		if (isFormDirty()) {
			e.preventDefault();
		}
	});
	window.addEventListener('pagehide', () => {
		flushPendingAutosave();
	});
}

// --- App Initialization ---
async function start() {
	try {
		initDOMElements();
		setStatus('正在建立安全连接…', 'loading');
		const session = await api<{ email: string; csrfToken: string; environment?: 'staging' | 'production'; publicOrigin?: string }>('/api/admin/session');
		csrfToken = session.csrfToken;
		currentPublicOrigin = session.publicOrigin || getPublicOrigin();
		currentEnvironment = session.environment || (getPublicOrigin().includes('staging') ? 'staging' : 'production');

		if (envBanner) {
			if (currentEnvironment === 'staging') {
				envBanner.textContent = '预览环境：发布仅更新预览站，不影响正式网站。';
				envBanner.className = 'admin-env-banner staging';
				envBanner.hidden = false;
			} else if (currentEnvironment === 'production') {
				envBanner.textContent = '正式环境：发布后会更新 xingx.cc.cd。';
				envBanner.className = 'admin-env-banner production';
				envBanner.hidden = false;
			}
		}

		setupTabs();
		initEventListeners();

		// Page initialization restores local autosave for 'new' if present
		resetForm({ restoreAutosave: true });

		await loadDrafts();
		setStatus(`已就绪 · ${session.email}`, 'info');
	} catch (cause) {
		setStatus(cause instanceof Error ? cause.message : '后台连接失败', 'error');
	}
}

// Launch in browser
if (typeof window !== 'undefined' && !(globalThis as any).__IS_TEST__) {
	start();
}

export const testHelpers = {
	initDOMElements,
	initEventListeners,
	extractEditableValues,
	isFormDirty,
	setControlsLocked,
	setEditorInputsDisabled,
	invalidatePendingDraftLoads,
	resetForm,
	fillDraft,
	saveCurrentDraft,
	publishCurrentDraft,
	recheckDeployment,
	updatePublishButtonLabel,
	isPreviouslyPublished,
	selectDraft,
	checkAndRestoreDraftAutosave,
	checkAndRestoreNewDraftAutosave,
	performAutosave,
	clearAutosave,
	startPublishPolling,
	getState: () => ({
		get currentId() { return currentId; },
		set currentId(v: string) { currentId = v; },
		get currentVersion() { return currentVersion; },
		set currentVersion(v: number) { currentVersion = v; },
		get activeLoadDraftSeq() { return activeLoadDraftSeq; },
		set activeLoadDraftSeq(v: number) { activeLoadDraftSeq = v; },
		get initialFormValuesJson() { return initialFormValuesJson; },
		set initialFormValuesJson(v: string) { initialFormValuesJson = v; },
		get isSubmitting() { return isSubmitting; },
		set isSubmitting(v: boolean) { isSubmitting = v; },
		get csrfToken() { return csrfToken; },
		set csrfToken(v: string) { csrfToken = v; },
		get currentPublicOrigin() { return currentPublicOrigin; },
		set currentPublicOrigin(v: string) { currentPublicOrigin = v; },
		get currentEnvironment() { return currentEnvironment; },
		set currentEnvironment(v: 'staging' | 'production') { currentEnvironment = v; },
		get activePollTimers() { return activePollTimers; },
	}),
};
