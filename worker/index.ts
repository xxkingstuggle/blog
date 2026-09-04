/**
 * Cloudflare Worker runtime for the static Astro release site.
 *
 * Static pages continue to come from ASSETS. This entry point owns only
 * authenticated admin APIs, public comments/links, immutable media, health
 * checks and the GitHub-backed publishing state machine.
 */

type JsonRecord = Record<string, unknown>;

interface D1Result<T = JsonRecord> {
	results: T[];
	meta?: JsonRecord;
}

interface D1Statement {
	bind(...values: unknown[]): D1Statement;
	first<T = JsonRecord>(): Promise<T | null>;
	all<T = JsonRecord>(): Promise<D1Result<T>>;
	run(): Promise<D1Result>;
}

interface D1DatabaseLike {
	prepare(query: string): D1Statement;
	batch(statements: D1Statement[]): Promise<D1Result[]>;
}

interface R2ObjectLike {
	body: ReadableStream<Uint8Array> | null;
	httpEtag?: string;
	httpMetadata?: Record<string, string>;
}

interface R2BucketLike {
	get(key: string): Promise<R2ObjectLike | null>;
	put(key: string, value: ArrayBuffer | ReadableStream<Uint8Array>, options?: JsonRecord): Promise<void>;
	delete(keys: string | string[]): Promise<void>;
}

interface AssetsLike {
	fetch(request: Request): Promise<Response>;
}

interface RateLimitLike {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface ExecutionContextLike {
	waitUntil(promise: Promise<unknown>): void;
}

interface ScheduledControllerLike {
	scheduledTime: number;
}

interface Env {
	ASSETS: AssetsLike;
	DB: D1DatabaseLike;
	MEDIA?: R2BucketLike;
	COMMENTS_RATE_LIMIT?: RateLimitLike;
	PUBLIC_ORIGIN: string;
	CN_ORIGIN?: string;
	ACCESS_ISSUER: string;
	ACCESS_AUDIENCE: string;
	ADMIN_EMAILS: string;
	CSRF_SECRET: string;
	HEALTH_TOKEN?: string;
	ORIGIN_BUILD_URL?: string;
	GITHUB_APP_ID?: string;
	GITHUB_INSTALLATION_ID?: string;
	GITHUB_PRIVATE_KEY?: string;
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
	ADMIN_GITHUB_LOGINS?: string;
	SESSION_SECRET?: string;
	GITHUB_OWNER?: string;
	GITHUB_REPO?: string;
	GITHUB_BRANCH?: string;
	CN_HEALTH_URL?: string;
	CN_HEALTH_TOKEN?: string;
	CF_RULE_API_URL?: string;
	CF_API_TOKEN?: string;
	COMMENT_WEBHOOK_URL?: string;
}

const JSON_HEADERS = {
	'Content-Type': 'application/json; charset=utf-8',
	'Cache-Control': 'no-store',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const ADMIN_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_DRAFT_REQUEST_BYTES = 1024 * 1024;
const MAX_COMMENT_REQUEST_BYTES = 16 * 1024;
const MAX_MEDIA_REQUEST_BYTES = 12 * 1024 * 1024;
const RESERVED_ALIAS_PATHS = new Set([
	'/',
	'/about',
	'/posts',
	'/archive',
	'/tags',
	'/links',
	'/admin',
	'/api',
	'/media',
	'/.well-known',
	'/robots.txt',
	'/rss.xml',
	'/sitemap.xml',
]);

function json(data: JsonRecord, status = 200, headers: HeadersInit = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...JSON_HEADERS, ...headers },
	});
}

function error(message: string, status = 400, code?: string) {
	return json({ error: message, ...(code ? { code } : {}) }, status);
}

function noStore(response: Response) {
	const headers = new Headers(response.headers);
	headers.set('Cache-Control', 'no-store, max-age=0');
	return new Response(response.body, { status: response.status, headers });
}

function decodeBase64Url(value: string) {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
	return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}

function decodeJsonPart(value: string): JsonRecord | null {
	try {
		return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as JsonRecord;
	} catch {
		return null;
	}
}

function pemToBytes(pem: string) {
	return decodeBase64Url(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, ''));
}

function toBase64(bytes: Uint8Array) {
	let value = '';
	for (let index = 0; index < bytes.length; index += 0x8000) {
		value += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	}
	return btoa(value);
}

function toBase64Url(bytes: Uint8Array) {
	return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function safeEqual(left: string, right: string) {
	if (left.length !== right.length) return false;
	let result = 0;
	for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
	return result === 0;
}

function contentType(request: Request, expected: 'json' | 'multipart') {
	const header = request.headers.get('content-type')?.toLowerCase() ?? '';
	return expected === 'json' ? header.startsWith('application/json') : header.startsWith('multipart/form-data');
}

function declaredBodyWithinLimit(request: Request, maxBytes: number) {
	const header = request.headers.get('content-length');
	if (!header) return true;
	const length = Number(header);
	return Number.isFinite(length) && length >= 0 && length <= maxBytes;
}

async function readBodyWithinLimit(request: Request, maxBytes: number) {
	if (!declaredBodyWithinLimit(request, maxBytes)) return null;
	if (!request.body) return new Uint8Array();
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;
			total += value.byteLength;
			if (total > maxBytes) {
				await reader.cancel('request body too large');
				return null;
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

function originAllowed(request: Request, env: Env, includeCn = false) {
	const origin = request.headers.get('Origin');
	const allowed = new Set([env.PUBLIC_ORIGIN, ...(includeCn && env.CN_ORIGIN ? [env.CN_ORIGIN] : [])]);
	return Boolean(origin && allowed.has(origin));
}

function sameOriginFetch(request: Request) {
	return request.headers.get('Sec-Fetch-Site') === 'same-origin';
}

async function hmac(value: string, secret: string) {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
	return toBase64Url(new Uint8Array(signature));
}

async function issueCsrf(subject: string, env: Env) {
	const expires = Math.floor(Date.now() / 1000) + 3600;
	const payload = `${subject}.${expires}`;
	return `${expires}.${await hmac(payload, env.CSRF_SECRET)}`;
}

async function verifyCsrf(request: Request, subject: string, env: Env) {
	const token = request.headers.get('X-CSRF-Token') ?? '';
	const [expiresText, signature] = token.split('.');
	const expires = Number(expiresText);
	if (!signature || !Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
	const expected = await hmac(`${subject}.${expires}`, env.CSRF_SECRET);
	return safeEqual(signature, expected);
}

async function verifyAccessJwt(request: Request, env: Env) {
	if (!env.ACCESS_AUDIENCE || env.ACCESS_AUDIENCE.startsWith('REPLACE_') || !env.ACCESS_ISSUER) return null;
	const token = request.headers.get('Cf-Access-Jwt-Assertion');
	if (!token) return null;
	const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
	if (!encodedHeader || !encodedPayload || !encodedSignature) return null;
	const header = decodeJsonPart(encodedHeader);
	const payload = decodeJsonPart(encodedPayload);
	if (!header || !payload || header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
	const issuer = env.ACCESS_ISSUER.replace(/\/$/, '');
	if (payload.iss !== issuer) return null;
	const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
	if (!audience.includes(env.ACCESS_AUDIENCE)) return null;
	const now = Math.floor(Date.now() / 1000);
	if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
	if (typeof payload.nbf === 'number' && payload.nbf > now) return null;
	const allowedEmails = env.ADMIN_EMAILS.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
	if (typeof payload.email !== 'string' || !allowedEmails.includes(payload.email.toLowerCase())) return null;

	try {
		const certificates = (await fetch(`${issuer}/cdn-cgi/access/certs`, { cf: { cacheTtl: 300 } } as RequestInit).then((response) => response.json())) as { keys?: Array<JsonWebKey & { kid?: string }> };
		const jwk = certificates.keys?.find((candidate) => candidate.kid === header.kid);
		if (!jwk) return null;
		const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
		const signed = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
		const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeBase64Url(encodedSignature), signed);
		return valid ? payload : null;
	} catch {
		return null;
	}
}

function cookieValue(request: Request, name: string) {
	const cookie = request.headers.get('Cookie') ?? '';
	for (const part of cookie.split(';')) {
		const [key, ...rest] = part.trim().split('=');
		if (key === name) return rest.join('=');
	}
	return null;
}

function secureCookie(name: string, value: string, maxAge: number) {
	return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

async function issueAdminSession(login: string, env: Env) {
	if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET 未配置');
	const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ login, exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60 })));
	return `${payload}.${await hmac(payload, env.SESSION_SECRET)}`;
}

async function verifyAdminSession(request: Request, env: Env) {
	if (!env.SESSION_SECRET) return null;
	const token = cookieValue(request, '__Host-xingx-admin');
	if (!token) return null;
	const [payloadPart, signature] = token.split('.');
	if (!payloadPart || !signature || !safeEqual(signature, await hmac(payloadPart, env.SESSION_SECRET))) return null;
	try {
		const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadPart))) as { login?: string; exp?: number };
		const allowed = (env.ADMIN_GITHUB_LOGINS ?? '').split(',').map((login) => login.trim().toLowerCase()).filter(Boolean);
		if (typeof payload.login !== 'string' || typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000) || !allowed.includes(payload.login.toLowerCase())) return null;
		return `github:${payload.login}`;
	} catch {
		return null;
	}
}

async function authenticateAdmin(request: Request, env: Env) {
	const access = await verifyAccessJwt(request, env);
	if (access && typeof access.email === 'string') return access.email;
	return verifyAdminSession(request, env);
}

async function requireAdmin(request: Request, env: Env) {
	const subject = await authenticateAdmin(request, env);
	if (!subject) return { response: error('需要有效的管理员身份。', 401, 'unauthorized') };
	if (ADMIN_METHODS.has(request.method)) {
		if (!originAllowed(request, env) || !sameOriginFetch(request)) return { response: error('拒绝跨站写入。', 403, 'csrf_origin') };
		if (!(await verifyCsrf(request, subject, env))) return { response: error('CSRF 校验失败。', 403, 'csrf_token') };
	}
	return { subject };
}

async function githubOAuthStart(request: Request, env: Env) {
	if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET) return error('GitHub 登录尚未配置。', 503, 'oauth_unavailable');
	if (new URL(request.url).origin !== env.PUBLIC_ORIGIN) return error('登录入口只允许主站访问。', 404);
	const state = toBase64Url(crypto.getRandomValues(new Uint8Array(24)));
	const expires = Math.floor(Date.now() / 1000) + 600;
	const signedState = `${state}.${expires}.${await hmac(`${state}.${expires}`, env.SESSION_SECRET)}`;
	const authorize = new URL('https://github.com/login/oauth/authorize');
	authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
	authorize.searchParams.set('redirect_uri', `${env.PUBLIC_ORIGIN}/auth/github/callback`);
	authorize.searchParams.set('state', state);
	return new Response(null, { status: 302, headers: { Location: authorize.toString(), 'Set-Cookie': secureCookie('__Host-xingx-oauth-state', signedState, 600), 'Cache-Control': 'no-store' } });
}

async function githubOAuthCallback(request: Request, env: Env) {
	if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET) return error('GitHub 登录尚未配置。', 503, 'oauth_unavailable');
	const url = new URL(request.url);
	if (url.origin !== env.PUBLIC_ORIGIN) return error('登录回调只允许主站访问。', 404);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const cookie = cookieValue(request, '__Host-xingx-oauth-state');
	const [cookieState, expiresText, signature] = cookie?.split('.') ?? [];
	const expires = Number(expiresText);
	if (!code || !state || !cookieState || state !== cookieState || !signature || !Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000) || !safeEqual(signature, await hmac(`${cookieState}.${expires}`, env.SESSION_SECRET))) return error('GitHub 登录状态无效或已过期。', 400, 'oauth_state');

	const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'xingx-blog-worker' },
		body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${env.PUBLIC_ORIGIN}/auth/github/callback` }),
	});
	const tokenBody = (await tokenResponse.json()) as { access_token?: string; error?: string };
	if (!tokenResponse.ok || !tokenBody.access_token) return error('GitHub 登录凭据交换失败。', 502, tokenBody.error ?? 'oauth_exchange');
	const userResponse = await fetch('https://api.github.com/user', { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${tokenBody.access_token}`, 'User-Agent': 'xingx-blog-worker' } });
	const user = (await userResponse.json()) as { login?: string };
	const allowed = (env.ADMIN_GITHUB_LOGINS ?? '').split(',').map((login) => login.trim().toLowerCase()).filter(Boolean);
	if (!userResponse.ok || typeof user.login !== 'string' || !allowed.includes(user.login.toLowerCase())) return error('该 GitHub 账号没有后台权限。', 403, 'oauth_forbidden');

	const basic = btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`);
	await fetch(`https://api.github.com/applications/${encodeURIComponent(env.GITHUB_CLIENT_ID)}/token`, {
		method: 'DELETE',
		headers: { Accept: 'application/vnd.github+json', Authorization: `Basic ${basic}`, 'Content-Type': 'application/json', 'User-Agent': 'xingx-blog-worker' },
		body: JSON.stringify({ access_token: tokenBody.access_token }),
	}).catch(() => undefined);
	const session = await issueAdminSession(user.login, env);
	const headers = new Headers({ Location: '/admin/', 'Cache-Control': 'no-store' });
	headers.append('Set-Cookie', secureCookie('__Host-xingx-admin', session, 8 * 60 * 60));
	headers.append('Set-Cookie', secureCookie('__Host-xingx-oauth-state', '', 0));
	return new Response(null, { status: 302, headers });
}

async function githubOAuthLogout(request: Request, env: Env) {
	if (request.method !== 'POST') return error('退出请求无效。', 405);
	const auth = await requireAdmin(request, env);
	if (auth.response) return auth.response;
	return new Response(null, { status: 204, headers: { 'Set-Cookie': secureCookie('__Host-xingx-admin', '', 0), 'Cache-Control': 'no-store' } });
}

async function readJson(request: Request, maxBytes = 1024 * 1024) {
	if (!contentType(request, 'json')) return null;
	try {
		const bytes = await readBodyWithinLimit(request, maxBytes);
		if (!bytes) return null;
		return JSON.parse(new TextDecoder().decode(bytes)) as JsonRecord;
	} catch {
		return null;
	}
}

async function readFormData(request: Request, maxBytes: number) {
	if (!contentType(request, 'multipart')) return null;
	const bytes = await readBodyWithinLimit(request, maxBytes);
	if (!bytes) return null;
	try {
		return await new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData();
	} catch {
		return null;
	}
}

function changes(result: D1Result) {
	return Number(result.meta?.changes ?? 0);
}

function isValidSlug(value: string) {
	return value.length >= 1 && value.length <= 80 && SLUG_PATTERN.test(value);
}

function sourcePathForSlug(slug: string, requested?: string) {
	const markdown = `src/content/blog/${slug}.md`;
	const mdx = `src/content/blog/${slug}.mdx`;
	if (!requested) return markdown;
	return requested === markdown || requested === mdx ? requested : null;
}

function normalizeAliases(value: unknown) {
	if (!Array.isArray(value) || value.length > 20) return null;
	const aliases: string[] = [];
	for (const entry of value) {
		if (typeof entry !== 'string') return null;
		const alias = entry.trim().replace(/\/$/, '');
		if (!/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(alias) || RESERVED_ALIAS_PATHS.has(alias)) return null;
		if (!aliases.includes(alias)) aliases.push(alias);
	}
	return aliases;
}

function isPrivateHostname(hostname: string) {
	const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
	if (host === '::' || host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true;
	if (host.startsWith('::ffff:')) return isPrivateHostname(host.slice('::ffff:'.length));
	const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)?.slice(1).map(Number);
	if (!ipv4 || ipv4.some((part) => part > 255)) return false;
	const [a, b] = ipv4;
	return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

function safePublicUrl(value: unknown) {
	if (typeof value !== 'string' || value.length > 500) return null;
	try {
		const url = new URL(value);
		if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || isPrivateHostname(url.hostname)) return null;
		return url.toString();
	} catch {
		return null;
	}
}

async function commentRateKey(request: Request, slug: string, env: Env) {
	const address = request.headers.get('CF-Connecting-IP') ?? 'unknown';
	const userAgent = (request.headers.get('User-Agent') ?? 'unknown').slice(0, 200);
	return hmac(`${address}|${userAgent}|${slug}`, env.CSRF_SECRET);
}

async function consumeDailyCommentAllowance(env: Env, keyHash: string) {
	const result = await env.DB.prepare(`INSERT INTO comment_rate_daily (day, key_hash, submissions) VALUES (date('now'), ?, 1)
	ON CONFLICT(day, key_hash) DO UPDATE SET submissions=MIN(comment_rate_daily.submissions + 1, 51)
	RETURNING submissions`).bind(keyHash).first<{ submissions: number }>();
	return Number(result?.submissions ?? 51) <= 50;
}

async function checkPublicLink(rawUrl: string) {
	let current = rawUrl;
	for (let redirects = 0; redirects <= 5; redirects += 1) {
		const safe = safePublicUrl(current);
		if (!safe) return false;
		let response = await fetch(safe, { method: 'HEAD', redirect: 'manual' });
		if (response.status === 405 || response.status === 501) {
			response = await fetch(safe, { method: 'GET', redirect: 'manual', headers: { Range: 'bytes=0-0' } });
			await response.body?.cancel();
		}
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('Location');
			if (!location) return false;
			current = new URL(location, safe).toString();
			continue;
		}
		return response.ok;
	}
	return false;
}

const IMAGE_MIME_EXTENSIONS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/avif': 'avif',
};

function hasValidImageSignature(bytes: Uint8Array, mime: string) {
	if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
	if (mime === 'image/png') return bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
	if (mime === 'image/gif') return new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF87a' || new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF89a';
	if (mime === 'image/webp') return new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
	if (mime === 'image/avif') return new TextDecoder().decode(bytes.slice(4, 12)).startsWith('ftypavi');
	return false;
}

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function safeMarkdownPreview(markdown: string) {
	// Raw HTML is deliberately escaped. The admin UI should place this output
	// inside a sandboxed iframe without allow-scripts/allow-same-origin.
	return markdown
		.split(/\r?\n/)
		.map((line) => {
			const escaped = escapeHtml(line);
			if (line.startsWith('### ')) return `<h3>${escaped.slice(4)}</h3>`;
			if (line.startsWith('## ')) return `<h2>${escaped.slice(3)}</h2>`;
			if (line.startsWith('# ')) return `<h1>${escaped.slice(2)}</h1>`;
			return escaped ? `<p>${escaped}</p>` : '';
		})
		.join('');
}

async function buildSha(env: Env) {
	try {
		const manifestUrl = new URL('/__build.json', env.PUBLIC_ORIGIN);
		manifestUrl.searchParams.set('verify', String(Date.now()));
		const response = await env.ASSETS.fetch(new Request(manifestUrl, { headers: { 'Cache-Control': 'no-cache' } }));
		if (!response.ok) return null;
			const manifest = (await response.json()) as { commitSha?: string; dirty?: boolean };
			return manifest.dirty === false ? manifest.commitSha ?? null : null;
	} catch {
		return null;
	}
}

function githubPath(path: string) {
	return path.split('/').map((part) => encodeURIComponent(part)).join('/');
}

async function githubAppToken(env: Env) {
	if (!env.GITHUB_APP_ID || !env.GITHUB_INSTALLATION_ID || !env.GITHUB_PRIVATE_KEY) throw new Error('GitHub App 未配置');
	const header = toBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
	const now = Math.floor(Date.now() / 1000);
	const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ iat: now - 30, exp: now + 540, iss: env.GITHUB_APP_ID })));
	const key = await crypto.subtle.importKey('pkcs8', pemToBytes(env.GITHUB_PRIVATE_KEY), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
	const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`));
	const appJwt = `${header}.${payload}.${toBase64Url(new Uint8Array(signature))}`;
	const response = await fetch(`https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, {
		method: 'POST',
		headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${appJwt}`, 'User-Agent': 'xingx-blog-worker' },
	});
	if (!response.ok) throw new Error(`GitHub installation token failed (${response.status})`);
	const body = (await response.json()) as { token?: string };
	if (!body.token) throw new Error('GitHub installation token missing');
	return body.token;
}

async function githubFile(env: Env, token: string, path: string) {
	if (!env.GITHUB_OWNER || !env.GITHUB_REPO) throw new Error('GitHub 仓库未配置');
	const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${githubPath(path)}?ref=${encodeURIComponent(env.GITHUB_BRANCH ?? 'main')}`, {
		headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'xingx-blog-worker' },
	});
	if (response.status === 404) return null;
	if (!response.ok) throw new Error(`GitHub contents read failed (${response.status})`);
	return (await response.json()) as { sha: string; content?: string; path: string };
}

async function putGithubFile(env: Env, token: string, path: string, body: string, sha?: string) {
	if (!env.GITHUB_OWNER || !env.GITHUB_REPO) throw new Error('GitHub 仓库未配置');
	const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${githubPath(path)}`, {
		method: 'PUT',
		headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'xingx-blog-worker', 'Content-Type': 'application/json' },
		body: JSON.stringify({ message: `Publish ${path}`, content: toBase64(new TextEncoder().encode(body)), branch: env.GITHUB_BRANCH ?? 'main', ...(sha ? { sha } : {}) }),
	});
	if (response.status === 409) throw new Error('source_changed');
	if (!response.ok) throw new Error(`GitHub contents write failed (${response.status})`);
	return (await response.json()) as { commit?: { sha?: string }; content?: { sha?: string } };
}

async function adminSession(request: Request, env: Env) {
	const auth = await requireAdmin(request, env);
	if (auth.response) return auth.response;
	return json({ email: auth.subject, csrfToken: await issueCsrf(auth.subject ?? '', env), expiresIn: 3600 });
}

async function listDrafts(env: Env) {
	const result = await env.DB.prepare('SELECT id, slug, title, description, pub_date, kind, presentation, status, source_path, source_blob_sha, listed, version, updated_at, publish_commit_sha, error_code FROM drafts ORDER BY updated_at DESC LIMIT 100').all();
	return json({ drafts: result.results });
}

async function getDraft(env: Env, id: string) {
	const draft = await env.DB.prepare('SELECT * FROM drafts WHERE id=?').bind(id).first<JsonRecord>();
	if (!draft) return error('草稿不存在。', 404);
	try { draft.aliases = JSON.parse(String(draft.aliases_json ?? '[]')); } catch { draft.aliases = []; }
	return json({ draft });
}

async function saveDraft(request: Request, env: Env, id?: string) {
	const input = await readJson(request, MAX_DRAFT_REQUEST_BYTES);
	if (!input || typeof input.slug !== 'string' || typeof input.title !== 'string' || typeof input.body !== 'string') return error('草稿必须包含 slug、title、body。', 422, 'invalid_draft');
	const slug = input.slug.trim();
	const title = input.title.trim();
	if (!isValidSlug(slug)) return error('slug 只能包含小写字母、数字和单个连字符，长度为 1–80。', 422, 'invalid_slug');
	if (!title || title.length > 160 || input.body.length > 900_000) return error('标题或正文长度无效。', 422, 'invalid_draft');
	const aliases = normalizeAliases(input.aliases ?? []);
	if (!aliases) return error('Alias 只能使用未占用的小写根路径，最多 20 个。', 422, 'invalid_alias');
	const sourcePath = sourcePathForSlug(slug, typeof input.sourcePath === 'string' ? input.sourcePath : undefined);
	if (!sourcePath) return error('源文件只能位于 src/content/blog，且必须与 slug 一致。', 422, 'invalid_source_path');
	const draftId = id ?? crypto.randomUUID();
	const kind = ['thought', 'project', 'update'].includes(String(input.kind)) ? String(input.kind) : 'thought';
	const presentation = ['article', 'feature'].includes(String(input.presentation)) ? String(input.presentation) : 'article';
	const description = typeof input.description === 'string' && input.description.trim() ? input.description.trim().slice(0, 300) : title;
	const tags = Array.isArray(input.tags)
		? input.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 20)
		: [];
	const pubDate = typeof input.pubDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.pubDate) ? input.pubDate : new Date().toISOString().slice(0, 10);
	const values = [
		slug,
		title,
		description,
		input.body,
		pubDate,
		JSON.stringify(tags),
		kind,
		presentation,
		input.featured === true ? 1 : 0,
		typeof input.kicker === 'string' ? input.kicker.trim().slice(0, 120) : null,
		sourcePath,
		typeof input.sourceBlobSha === 'string' && /^[a-f0-9]{40}$/.test(input.sourceBlobSha) ? input.sourceBlobSha : null,
		input.listed === false ? 0 : 1,
		JSON.stringify(aliases),
	] as const;

	if (!id) {
		await env.DB.prepare(`INSERT INTO drafts (id, slug, title, description, body, pub_date, tags_json, kind, presentation, featured, kicker, source_path, source_blob_sha, listed, aliases_json, status, version, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, datetime('now'))`).bind(draftId, ...values).run();
		return json({ id: draftId, status: 'draft', version: 1 }, 201);
	}

	const version = Number(input.version);
	if (!Number.isInteger(version) || version < 1) return error('缺少有效的草稿版本，请重新载入。', 428, 'draft_version_required');
	const existing = await env.DB.prepare('SELECT status FROM drafts WHERE id=?').bind(id).first<{ status: string }>();
	if (!existing) return error('草稿不存在。', 404);
	if (existing.status === 'publishing' || existing.status === 'deploying') return error('草稿正在发布，暂时不能保存。', 409, 'publish_in_progress');
	const result = await env.DB.prepare(`UPDATE drafts SET slug=?, title=?, description=?, body=?, pub_date=?, tags_json=?, kind=?, presentation=?, featured=?, kicker=?, source_path=?, source_blob_sha=?, listed=?, aliases_json=?, status='draft', error_code=NULL, version=version+1, updated_at=datetime('now')
	WHERE id=? AND version=?`).bind(...values, id, version).run();
	if (changes(result) !== 1) return error('草稿已在其他页面被修改，请重新载入后合并。', 409, 'draft_version_conflict');
	return json({ id, status: 'draft', version: version + 1 });
}

function yamlString(value: string) {
	return JSON.stringify(value.replace(/\r?\n/g, ' '));
}

function markdownFileFromDraft(draft: JsonRecord) {
	let tags: string[] = [];
	try { tags = JSON.parse(String(draft.tags_json ?? '[]')); } catch { tags = []; }
	let aliases: string[] = [];
	try { aliases = JSON.parse(String(draft.aliases_json ?? '[]')); } catch { aliases = []; }
	const lines = [
		'---',
		`title: ${yamlString(String(draft.title ?? ''))}`,
		`pubDate: ${yamlString(String(draft.pub_date ?? new Date().toISOString().slice(0, 10)))}`,
		`description: ${yamlString(String(draft.description ?? draft.title ?? ''))}`,
		`tags: [${tags.map(yamlString).join(', ')}]`,
		'draft: false',
		`listed: ${draft.listed !== 0}`,
		`aliases: [${aliases.map(yamlString).join(', ')}]`,
		`featured: ${draft.featured === 1}`,
		`kind: ${yamlString(String(draft.kind ?? 'thought'))}`,
		`presentation: ${yamlString(String(draft.presentation ?? 'article'))}`,
		...(draft.kicker ? [`kicker: ${yamlString(String(draft.kicker))}`] : []),
		'---',
		'',
		String(draft.body ?? ''),
		'',
	];
	return lines.join('\n');
}

async function preview(request: Request, env: Env) {
	const auth = await requireAdmin(request, env);
	if (auth.response) return auth.response;
	const input = await readJson(request, 1024 * 1024);
	if (!input || typeof input.markdown !== 'string') return error('缺少 Markdown 内容。', 422);
	return json({ html: safeMarkdownPreview(input.markdown) });
}

async function publish(request: Request, env: Env, ctx: ExecutionContextLike) {
	const input = await readJson(request);
	if (!input || typeof input.id !== 'string') return error('缺少草稿 id。', 422);
	const draft = await env.DB.prepare('SELECT * FROM drafts WHERE id = ?').bind(input.id).first<JsonRecord>();
	if (!draft) return error('草稿不存在。', 404);
	const slug = String(draft.slug ?? '');
	if (!isValidSlug(slug)) return error('草稿 slug 无效，发布已拒绝。', 422, 'invalid_slug');
	const path = sourcePathForSlug(slug, typeof draft.source_path === 'string' ? draft.source_path : undefined);
	if (!path) return error('草稿源文件路径无效，发布已拒绝。', 422, 'invalid_source_path');
	const claimed = await env.DB.prepare("UPDATE drafts SET status='publishing', error_code=NULL, updated_at=datetime('now') WHERE id=? AND status NOT IN ('publishing','deploying')").bind(input.id).run();
	if (changes(claimed) !== 1) return error('已有发布任务进行中。', 409, 'publish_in_progress');
	try {
		const token = await githubAppToken(env);
		const current = await githubFile(env, token, path);
		const expectedSha = typeof draft.source_blob_sha === 'string' ? draft.source_blob_sha : null;
		if (expectedSha && current?.sha !== expectedSha) throw new Error('source_changed');
		if (!expectedSha && current) throw new Error('source_exists');
		const commit = await putGithubFile(env, token, path, markdownFileFromDraft(draft), current?.sha);
		const commitSha = commit.commit?.sha ?? null;
		await env.DB.prepare("UPDATE drafts SET status='deploying', publish_commit_sha=?, updated_at=datetime('now') WHERE id=?").bind(commitSha, input.id).run();
		ctx.waitUntil(markPublishedMedia(env, String(draft.body ?? '')));
		ctx.waitUntil(reconcilePublishing(env));
		return json({ id: input.id, status: 'deploying', commitSha }, 202);
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : 'publish_failed';
		const conflict = message === 'source_changed' || message === 'source_exists';
		const code = conflict ? message : 'publish_failed';
		await env.DB.prepare("UPDATE drafts SET status=?, error_code=?, updated_at=datetime('now') WHERE id=?").bind(conflict ? 'conflict' : 'publish_failed', code, input.id).run();
		return error(conflict ? '仓库文件已变化或目标已存在，发布未覆盖任何内容。' : '发布失败，草稿和错误信息已保留。', conflict ? 409 : 502, code);
	}
}

async function markPublishedMedia(env: Env, body: string) {
	const matches = [...body.matchAll(/\/media\/([a-f0-9]{64}\.[a-z0-9]+)/gi)].map((match) => `media/${match[1]}`);
	for (const key of new Set(matches)) {
		await env.DB.prepare("UPDATE media SET ever_published_at=COALESCE(ever_published_at, datetime('now')), soft_deleted_at=NULL WHERE object_key=?").bind(key).run();
	}
}

async function softDeleteMedia(request: Request, env: Env, key: string) {
	if (!key || key.includes('..') || key.includes('/')) return error('媒体 key 无效。', 422);
	const requestContentType = request.headers.get('content-type');
	if (requestContentType && !contentType(request, 'json')) return error('删除媒体请求必须使用 application/json。', 415);
	await env.DB.prepare("UPDATE media SET soft_deleted_at=datetime('now') WHERE object_key=? AND ever_published_at IS NULL").bind(`media/${key}`).run();
	return json({ status: 'soft_deleted' });
}

async function cleanupOrphanMedia(env: Env) {
	if (!env.MEDIA) return;
	const candidates = await env.DB.prepare(`SELECT object_key FROM media
WHERE ever_published_at IS NULL AND soft_deleted_at IS NOT NULL
AND soft_deleted_at < datetime('now', '-30 day')
AND NOT EXISTS (SELECT 1 FROM drafts WHERE body LIKE '%' || media.object_key || '%')`).all<{ object_key: string }>();
	if (!candidates.results.length) return;
	await env.MEDIA.delete(candidates.results.map((candidate) => candidate.object_key));
	for (const candidate of candidates.results) await env.DB.prepare('DELETE FROM media WHERE object_key=? AND ever_published_at IS NULL').bind(candidate.object_key).run();
}

async function cleanupCommentRateCounters(env: Env) {
	await env.DB.prepare("DELETE FROM comment_rate_daily WHERE day < date('now', '-2 day')").run();
}

async function checkLinks(env: Env) {
	const links = await env.DB.prepare("SELECT id, url FROM links WHERE checked_at IS NULL OR checked_at < datetime('now', '-20 minutes') LIMIT 20").all<{ id: string; url: string }>();
	for (const link of links.results) {
		let online = false;
		try {
			online = await checkPublicLink(link.url);
		} catch { online = false; }
		await env.DB.prepare("UPDATE links SET status=?, checked_at=datetime('now') WHERE id=?").bind(online ? 'active' : 'offline', link.id).run();
	}
}

async function reconcilePublishing(env: Env) {
	const jobs = await env.DB.prepare("SELECT id, publish_commit_sha, updated_at FROM drafts WHERE status='deploying'").all<{ id: string; publish_commit_sha: string | null; updated_at: string }>();
	const deployedSha = env.ORIGIN_BUILD_URL
		? await fetch(`${env.ORIGIN_BUILD_URL}${env.ORIGIN_BUILD_URL.includes('?') ? '&' : '?'}verify=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }).then(async (response) => {
			if (!response.ok) return null;
			const manifest = (await response.json()) as { commitSha?: string; dirty?: boolean };
			return manifest.dirty === false ? manifest.commitSha ?? null : null;
		}).catch(() => null)
		: null;
	for (const job of jobs.results) {
		if (job.publish_commit_sha && deployedSha === job.publish_commit_sha) {
			await env.DB.prepare("UPDATE drafts SET status='published', updated_at=datetime('now') WHERE id=?").bind(job.id).run();
		} else if (Date.now() - Date.parse(`${job.updated_at.replace(' ', 'T')}Z`) > 10 * 60 * 1000) {
			await env.DB.prepare("UPDATE drafts SET status='publish_failed', error_code='deployment_timeout', updated_at=datetime('now') WHERE id=?").bind(job.id).run();
		}
	}
}

async function monitorChinaFallback(env: Env) {
	if (!env.CN_HEALTH_URL || !env.CF_RULE_API_URL || env.CF_RULE_API_URL.startsWith('REPLACE_') || !env.CF_API_TOKEN) return;
	const current = await env.DB.prepare("SELECT value FROM runtime_flags WHERE key='cn_health_failures'").first<{ value: string }>();
	const disabled = await env.DB.prepare("SELECT value FROM runtime_flags WHERE key='cn_edge_disabled'").first<{ value: string }>();
	if (disabled?.value === '1') return;
	const previousFailures = Number(current?.value ?? '0');
	let healthy = false;
	try {
		const response = await fetch(env.CN_HEALTH_URL, {
			headers: env.CN_HEALTH_TOKEN ? { 'X-Health-Token': env.CN_HEALTH_TOKEN, 'Cache-Control': 'no-cache' } : { 'Cache-Control': 'no-cache' },
		});
		const body = (await response.json()) as { ok?: boolean; commitSha?: string };
		const expected = await buildSha(env);
		healthy = response.ok && body.ok === true && Boolean(expected) && body.commitSha === expected;
	} catch {
		healthy = false;
	}
	const failures = healthy ? 0 : previousFailures + 1;
	await env.DB.prepare(`INSERT INTO runtime_flags (key, value, updated_at) VALUES ('cn_health_failures', ?, datetime('now'))
ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`).bind(String(failures)).run();
	if (failures < 3) return;

	// The API URL is intentionally supplied as a secret/config value from the
	// Cloudflare Rulesets dashboard. This avoids guessing a zone/ruleset ID and
	// makes the kill switch auditable and reversible.
	const disableResponse = await fetch(env.CF_RULE_API_URL, {
		method: 'PATCH',
		headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ enabled: false }),
	});
	if (disableResponse.ok) {
		await env.DB.prepare(`INSERT INTO runtime_flags (key, value, updated_at) VALUES ('cn_edge_disabled', '1', datetime('now'))
ON CONFLICT(key) DO UPDATE SET value='1', updated_at=datetime('now')`).run();
	}
}

async function comments(request: Request, env: Env, ctx: ExecutionContextLike) {
	if (request.method === 'GET') {
		const slug = new URL(request.url).searchParams.get('slug');
		if (!slug) return error('缺少 slug。', 422);
		const result = await env.DB.prepare("SELECT id, slug, author_name, body, created_at FROM comments WHERE slug=? AND status='approved' ORDER BY created_at ASC").bind(slug).all();
		return json({ comments: result.results }, 200, { 'Cache-Control': 'public, max-age=60' });
	}
	if (request.method !== 'POST') return error('只支持 GET/POST。', 405);
	if (!originAllowed(request, env, true) || !sameOriginFetch(request) || !contentType(request, 'json')) return error('评论请求不符合安全要求。', 403);
	const input = await readJson(request, MAX_COMMENT_REQUEST_BYTES);
	if (!input || typeof input.slug !== 'string' || !isValidSlug(input.slug) || typeof input.body !== 'string' || input.body.length < 2 || input.body.length > 2000) return error('评论参数或内容长度无效。', 422);
	if (typeof input.website === 'string' && input.website.trim()) return error('评论未通过校验。', 400);
	const authorName = typeof input.authorName === 'string' && input.authorName.trim() ? input.authorName.trim().slice(0, 80) : '匿名访客';
	const authorUrl = input.authorUrl ? safePublicUrl(input.authorUrl) : null;
	if (input.authorUrl && !authorUrl) return error('个人链接必须是公开的 HTTP/HTTPS 地址。', 422);
	const rateKey = await commentRateKey(request, input.slug, env);
	const limited = env.COMMENTS_RATE_LIMIT ? !(await env.COMMENTS_RATE_LIMIT.limit({ key: rateKey })).success : false;
	if (limited) return error('评论提交过于频繁，请稍后再试。', 429);
	if (!(await consumeDailyCommentAllowance(env, rateKey))) return error('今天的评论提交次数已达到上限。', 429);
	const id = crypto.randomUUID();
	await env.DB.prepare("INSERT INTO comments (id, slug, author_name, author_url, body, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))").bind(id, input.slug, authorName, authorUrl, input.body).run();
	if (env.COMMENT_WEBHOOK_URL) {
		ctx.waitUntil(fetch(env.COMMENT_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, slug: input.slug, authorName, body: input.body }) }).catch(() => undefined));
	}
	return json({ status: 'pending' }, 202);
}

async function adminComments(request: Request, env: Env) {
	if (request.method === 'GET') {
		const status = new URL(request.url).searchParams.get('status') || 'pending';
		const result = await env.DB.prepare('SELECT * FROM comments WHERE status=? ORDER BY created_at DESC LIMIT 100').bind(status).all();
		return json({ comments: result.results });
	}
	const match = new URL(request.url).pathname.match(/^\/api\/admin\/comments\/([^/]+)$/);
	if (!match) return error('评论路径不存在。', 404);
	if (request.method === 'DELETE') {
		await env.DB.prepare('DELETE FROM comments WHERE id=?').bind(decodeURIComponent(match[1])).run();
		return json({ deleted: true });
	}
	if (request.method !== 'PATCH') return error('只支持 GET/PATCH/DELETE。', 405);
	const input = await readJson(request, 8 * 1024);
	if (!input || !['pending', 'approved', 'rejected', 'spam'].includes(String(input.status))) return error('评论状态无效。', 422);
	await env.DB.prepare('UPDATE comments SET status=? WHERE id=?').bind(String(input.status), decodeURIComponent(match[1])).run();
	return json({ status: input.status });
}

async function media(request: Request, env: Env) {
	if (request.method !== 'POST') return error('只支持 POST。', 405);
	const auth = await requireAdmin(request, env);
	if (auth.response) return auth.response;
	if (!env.MEDIA) return error('媒体存储尚未配置。', 503, 'media_storage_unavailable');
	const form = await readFormData(request, MAX_MEDIA_REQUEST_BYTES);
	if (!form) return error('图片请求必须为 multipart/form-data 且不超过 12MB。', 413);
	const file = form.get('file');
	if (!(file instanceof File) || !IMAGE_MIME_EXTENSIONS[file.type]) return error('只允许 JPEG、PNG、GIF、WebP 或 AVIF 图片。', 415);
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!hasValidImageSignature(bytes, file.type)) return error('图片文件内容与格式不匹配。', 415);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	const sha = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
	const extension = IMAGE_MIME_EXTENSIONS[file.type];
	const key = `media/${sha}.${extension}`;
	await env.MEDIA.put(key, bytes.buffer, { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' } });
	await env.DB.prepare(`INSERT INTO media (sha256, object_key, bytes, mime, ever_published_at, soft_deleted_at)
VALUES (?, ?, ?, ?, NULL, NULL) ON CONFLICT(sha256) DO UPDATE SET soft_deleted_at=NULL`).bind(sha, key, bytes.byteLength, file.type).run();
	return json({ key, url: `/media/${sha}.${extension}`, sha256: sha }, 201);
}

async function links(request: Request, env: Env) {
	if (request.method === 'GET') {
		const result = await env.DB.prepare("SELECT id, name, url, description, status, checked_at FROM links WHERE status='active' ORDER BY sort_order ASC, name ASC").all();
		return json({ links: result.results }, 200, { 'Cache-Control': 'public, max-age=300' });
	}
	const auth = await requireAdmin(request, env);
	if (auth.response) return auth.response;
	if (request.method !== 'POST' && request.method !== 'PUT') return error('只支持 GET/POST/PUT。', 405);
	const input = await readJson(request, 16 * 1024);
	if (!input || typeof input.name !== 'string' || typeof input.url !== 'string') return error('友链必须包含 name 与 url。', 422);
	if (!input.name.trim() || input.name.trim().length > 100) return error('友链名称长度必须为 1–100。', 422);
	const safeUrl = safePublicUrl(input.url);
	if (!safeUrl) return error('友链必须使用公开的 HTTP/HTTPS 地址。', 422, 'invalid_link_url');
	const id = typeof input.id === 'string' ? input.id : crypto.randomUUID();
	await env.DB.prepare(`INSERT INTO links (id, name, url, description, status, sort_order, checked_at)
	VALUES (?, ?, ?, ?, 'active', ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET name=excluded.name, url=excluded.url, description=excluded.description, sort_order=excluded.sort_order`).bind(id, input.name.trim().slice(0, 100), safeUrl, typeof input.description === 'string' ? input.description.trim().slice(0, 500) : null, Number(input.sortOrder) || 0).run();
	return json({ id }, 201);
}

async function api(request: Request, env: Env, ctx: ExecutionContextLike) {
	const url = new URL(request.url);
	if (url.pathname === '/api/health' && request.method === 'GET') return json({ ok: true, commitSha: await buildSha(env) }, 200, { 'Cache-Control': 'no-store' });
	if (url.pathname === '/api/comments') return comments(request, env, ctx);
	if (url.pathname === '/api/links') return links(request, env);
	if (url.pathname === '/api/admin/session' && request.method === 'GET') return adminSession(request, env);
	if (url.pathname === '/api/admin/preview' && request.method === 'POST') return preview(request, env);
	if (url.pathname === '/api/admin/comments' && request.method === 'GET') {
		const auth = await requireAdmin(request, env);
		return auth.response ?? adminComments(request, env);
	}
	if (url.pathname.startsWith('/api/admin/comments/')) {
		const auth = await requireAdmin(request, env);
		return auth.response ?? adminComments(request, env);
	}
	if (url.pathname === '/api/admin/drafts' && request.method === 'GET') {
		const auth = await requireAdmin(request, env);
		return auth.response ?? listDrafts(env);
	}
	if (url.pathname === '/api/admin/drafts' && request.method === 'POST') {
		const auth = await requireAdmin(request, env);
		return auth.response ?? saveDraft(request, env);
	}
	const draftMatch = url.pathname.match(/^\/api\/admin\/drafts\/([^/]+)$/);
	if (draftMatch && request.method === 'GET') {
		const auth = await requireAdmin(request, env);
		return auth.response ?? getDraft(env, decodeURIComponent(draftMatch[1]));
	}
	if (draftMatch && request.method === 'PUT') {
		const auth = await requireAdmin(request, env);
		return auth.response ?? saveDraft(request, env, decodeURIComponent(draftMatch[1]));
	}
	if (url.pathname === '/api/admin/publish' && request.method === 'POST') {
		const auth = await requireAdmin(request, env);
		return auth.response ?? publish(request, env, ctx);
	}
	if (url.pathname === '/api/admin/media' && request.method === 'POST') {
		const auth = await requireAdmin(request, env);
		return auth.response ?? media(request, env);
	}
	const mediaDeleteMatch = url.pathname.match(/^\/api\/admin\/media\/([^/]+)$/);
	if (mediaDeleteMatch && request.method === 'DELETE') {
		const auth = await requireAdmin(request, env);
		return auth.response ?? softDeleteMedia(request, env, decodeURIComponent(mediaDeleteMatch[1]));
	}
	return error('API 路径不存在。', 404);
}

async function handle(request: Request, env: Env, ctx: ExecutionContextLike) {
	const url = new URL(request.url);
	const adminPath = /^\/admin(?:\/|$)/.test(url.pathname) || /^\/api\/admin(?:\/|$)/.test(url.pathname);
	if ((url.hostname === 'cn.xingx.cc.cd' || url.hostname === 'origin.xingx.cc.cd') && adminPath) return error('admin is only available on the primary host', 404);
	if (url.pathname === '/auth/github/start' && request.method === 'GET') return githubOAuthStart(request, env);
	if (url.pathname === '/auth/github/callback' && request.method === 'GET') return githubOAuthCallback(request, env);
	if (url.pathname === '/auth/logout') return githubOAuthLogout(request, env);
	if (url.pathname === '/__health') {
		if (env.HEALTH_TOKEN && request.headers.get('X-Health-Token') !== env.HEALTH_TOKEN) return error('health token required', 401);
		return noStore(json({ ok: true, commitSha: await buildSha(env), checkedAt: new Date().toISOString() }));
	}
	if (url.pathname.startsWith('/api/')) return api(request, env, ctx);
	if (url.pathname.startsWith('/media/')) {
		if (!env.MEDIA) return new Response('Media storage unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
		const key = url.pathname.slice('/media/'.length);
		const object = await env.MEDIA.get(`media/${key}`);
		if (!object?.body) return new Response('Not found', { status: 404 });
			const headers = new Headers(object.httpMetadata ?? {});
			headers.set('Cache-Control', 'public, max-age=31536000, immutable');
			headers.set('X-Content-Type-Options', 'nosniff');
			if (object.httpEtag) headers.set('ETag', object.httpEtag);
			return new Response(object.body, { headers });
		}
	if (/^\/admin(?:\/|$)/.test(url.pathname)) {
		const subject = await authenticateAdmin(request, env);
		if (!subject) return new Response(null, { status: 302, headers: { Location: '/auth/github/start', 'Cache-Control': 'no-store' } });
	}
	return env.ASSETS.fetch(request);
}

export const testHelpers = {
	isValidSlug,
	sourcePathForSlug,
	normalizeAliases,
	safePublicUrl,
	safeMarkdownPreview,
	hasValidImageSignature,
};

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContextLike) {
		return handle(request, env, ctx);
	},
	scheduled(_controller: ScheduledControllerLike, env: Env, ctx: ExecutionContextLike) {
		ctx.waitUntil(reconcilePublishing(env));
		ctx.waitUntil(monitorChinaFallback(env));
		ctx.waitUntil(cleanupOrphanMedia(env));
		ctx.waitUntil(cleanupCommentRateCounters(env));
		ctx.waitUntil(checkLinks(env));
	},
};
