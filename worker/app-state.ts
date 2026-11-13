/**
 * Private app-state API. The caller MUST authenticate and CSRF-check with
 * requireAdmin before invoking handleAppState; no untrusted public route
 * should import this handler directly.
 *
 * Writes are compare-and-swap to prevent lost updates across devices.
 * D1.batch is transactional; every accepted revision gets a history entry.
 */
export interface AppDbResult {
  results?: unknown[];
  meta?: Record<string, unknown>;
}
export interface AppDbStatement {
  bind(...values: unknown[]): AppDbStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<AppDbResult>;
}
export interface AppDb {
  prepare(sql: string): AppDbStatement;
  batch(statements: AppDbStatement[]): Promise<AppDbResult[]>;
}
export interface AppStateEnv { DB: AppDb; }
type StateRow = { content_json: string; revision: number; updated_at: string };
type HistoryRow = { revision: number; content_json: string; saved_at: string };
const MAX_BYTES = 128 * 1024;
const SLUG = /^[a-z][a-z0-9-]{0,63}$/;
const NO_STORE = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function respond(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {status, headers: NO_STORE});
}
function failure(message: string, status = 400, code = 'invalid_request'): Response {
  return respond({ error: message, code }, status);
}
export function validAppSegment(segment: string): boolean {
  return SLUG.test(segment) && !segment.includes('--');
}
export function isValidPayload(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
async function parseBody(request: Request): Promise<{ content: Record<string, unknown>; expectedRevision: number } | null> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) return null;
  const length = Number(request.headers.get('content-length') ?? 0);
  if (!Number.isFinite(length) || length > MAX_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      if (!result.value) continue;
      size += result.value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); return null; }
      chunks.push(result.value);
    }
  } catch { return null; } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as Record<string, unknown>;
    if (!isValidPayload(value.content) ||
        !Number.isSafeInteger(value.expectedRevision) ||
        (value.expectedRevision as number) < 0) return null;
    return { content: value.content as Record<string, unknown>, expectedRevision: value.expectedRevision as number };
  } catch { return null; }
}

async function load(db: AppDb, owner: string, app: string, key: string) {
  return db.prepare('SELECT content_json, revision, updated_at FROM app_documents WHERE owner=? AND app_id=? AND doc_key=?')
    .bind(owner, app, key).first<StateRow>();
}
function decode(row: StateRow | null) {
  return row ? { content: JSON.parse(row.content_json), revision: row.revision, updatedAt: row.updated_at } :
    { content: {}, revision: 0, updatedAt: null };
}
async function save(db: AppDb, owner: string, app: string, key: string, input: { content: Record<string, unknown>, expectedRevision: number }) {
  const json = JSON.stringify(input.content);
  if (new TextEncoder().encode(json).length > MAX_BYTES) return failure('文档超过 128 KB 限制。', 413, 'document_too_large');
  const next = input.expectedRevision + 1;
  const timestamp = new Date().toISOString();
  const history = db.prepare(
    'INSERT INTO app_document_history(owner, app_id, doc_key, revision, content_json, saved_at) ' +
    'SELECT owner, app_id, doc_key, revision, content_json, ? FROM app_documents ' +
    'WHERE owner=? AND app_id=? AND doc_key=? AND revision=? AND content_json=? ' +
    'ON CONFLICT(owner, app_id, doc_key, revision) DO NOTHING'
  ).bind(timestamp, owner, app, key, next, json);
  let results: AppDbResult[];
  if (input.expectedRevision === 0) {
    results = await db.batch([
      db.prepare('INSERT INTO app_documents(owner, app_id, doc_key, content_json, revision, created_at, updated_at) ' +
        'VALUES (?, ?, ?, ?, 1, ?, ?) ON CONFLICT(owner, app_id, doc_key) DO NOTHING')
        .bind(owner, app, key, json, timestamp, timestamp),
      history,
    ]);
  } else {
    results = await db.batch([
      db.prepare('UPDATE app_documents SET content_json=?, revision=revision+1, updated_at=? ' +
        'WHERE owner=? AND app_id=? AND doc_key=? AND revision=?')
        .bind(json, timestamp, owner, app, key, input.expectedRevision),
      history,
    ]);
  }
  if (Number(results[0]?.meta?.changes) !== 1) {
    const latest = await load(db, owner, app, key);
    return respond({ ...decode(latest), error: '其他设备已经修改了这个文档，请先查看新版本。', code: 'revision_conflict' }, 409);
  }
  return respond({ content: input.content, revision: next, updatedAt: timestamp, saved: true });
}

/** Pass the authenticated principal (not client-supplied) to isolate documents. */
export async function handleAppState(request: Request, env: AppStateEnv, owner: string): Promise<Response> {
  const path = new URL(request.url).pathname;
  const match = path.match(/^\/api\/admin\/apps\/([^/]+)\/documents\/([^/]+)(?:\/(history|restore|export))?$/);
  if (!match || !validAppSegment(match[1]) || !validAppSegment(match[2])) {
    return failure('应用或文档标识无效。', 404, 'not_found');
  }
  const [, app, key, action] = match;
  if (!action && request.method === 'GET') {
    return respond(decode(await load(env.DB, owner, app, key)));
  }
  if (action === 'history' && request.method === 'GET') {
    const result = env.DB.prepare('SELECT revision, content_json, saved_at FROM app_document_history ' +
      'WHERE owner=? AND app_id=? AND doc_key=? ORDER BY revision DESC LIMIT 50')
      .bind(owner, app, key);
    const rows = await result.all<HistoryRow>();
    return respond({ history: rows.results.map(row => ({
      revision: row.revision, savedAt: row.saved_at,
      content: JSON.parse(row.content_json),
    })) });
  }
  if (action === 'export' && request.method === 'GET') {
    const current = await load(env.DB, owner, app, key);
    if (!current) return failure('文档不存在。', 404, 'not_found');
    return respond({ format: 'myzjx-private-app/v1', appId: app, documentKey: key, exportedAt: new Date().toISOString(),
      ...decode(current) });
  }
  if (!action && request.method === 'PUT') {
    const input = await parseBody(request);
    if (!input) return failure('请提交有效的 JSON 文档和 expectedRevision。', 422, 'invalid_document');
    return save(env.DB, owner, app, key, input);
  }
  if (action === 'restore' && request.method === 'POST') {
    const input = await parseBody(request);
    if (!input || !Number.isSafeInteger(input.content.targetRevision) ||
        (input.content.targetRevision as number) < 1) {
      return failure('恢复时需要 targetRevision 与 expectedRevision。', 422, 'invalid_restore');
    }
    const version = await env.DB.prepare(
      'SELECT content_json FROM app_document_history WHERE owner=? AND app_id=? AND doc_key=? AND revision=?'
    ).bind(owner, app, key, input.content.targetRevision).first<{ content_json: string }>();
    if (!version) return failure('找不到指定历史版本。', 404, 'not_found');
    return save(env.DB, owner, app, key, {
      content: JSON.parse(version.content_json) as Record<string, unknown>, expectedRevision: input.expectedRevision,
    });
  }
  return failure('不支持的操作。', 405, 'method_not_allowed');
}
