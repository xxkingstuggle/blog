import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { testHelpers } from '../../worker/index.ts';

const env = {
  PUBLIC_ORIGIN: 'https://myzjx.com',
  ACCESS_AUDIENCE: 'REPLACE_AUDIENCE',
  ACCESS_ISSUER: '',
  ADMIN_EMAILS: '',
  ADMIN_GITHUB_LOGINS: 'owner',
  SESSION_SECRET: 'test-session-secret',
  CSRF_SECRET: 'test-csrf-secret',
  GITHUB_OWNER: 'xxkingstuggle',
  ASSETS: { fetch: async () => new Response('static') },
} as any;
const ctx = { waitUntil() {} } as any;

test('iteration repository configuration never falls back to public blog repository', () => {
  assert.equal(testHelpers.iterationRepositoryEnv(env), null);
  const configured = testHelpers.iterationRepositoryEnv({
    ...env, ITERATION_GITHUB_REPO: 'personal-iteration-system'
  });
  assert.equal(configured?.GITHUB_OWNER, 'xxkingstuggle');
  assert.equal(configured?.GITHUB_REPO, 'personal-iteration-system');
  assert.equal(configured?.GITHUB_BRANCH, 'main');
  assert.equal(testHelpers.iterationRepositoryEnv({...env, ITERATION_GITHUB_REPO: '../blog'}), null);
});

test('GitHub content base64 decoding preserves Chinese Markdown', () => {
  const content = '# 个人迭代系统\n问题 → 办法 → 行动 → 反馈\n';
  const encoded = Buffer.from(content, 'utf8').toString('base64');
  assert.equal(testHelpers.readIterationMarkdown({ content: encoded }), content);
});

test('iteration API rejects unauthenticated access before reading private data', async () => {
  const request = new Request('https://myzjx.com/api/admin/iteration/files');
  const response = await worker.fetch(request, env, ctx);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('iteration API refuses unauthorized Markdown even for logged-in admin', async () => {
  const cookie = await testHelpers.issueAdminSession('owner', env);
  const token = await testHelpers.issueCsrf('github:owner', env);
  const request = new Request('https://myzjx.com/api/admin/iteration/files/AI%E8%A1%8C%E4%B8%BA%E8%A7%84%E5%88%99.md', {
    method: 'PUT',
    headers: {
      Cookie: '__Host-xingx-admin='+cookie,
      Origin: 'https://myzjx.com',
      'Sec-Fetch-Site': 'same-origin',
      'X-CSRF-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: '# overwritten', sha: 'a'.repeat(40) }),
  });
  const response = await worker.fetch(request, env, ctx);
  assert.equal(response.status, 404);
});

test('iteration API never accepts a write without CSRF token', async () => {
  const cookie = await testHelpers.issueAdminSession('owner', env);
  const request = new Request('https://myzjx.com/api/admin/iteration/files/iteration-current.md', {
    method: 'PUT',
    headers: {
      Cookie: '__Host-xingx-admin='+cookie,
      Origin: 'https://myzjx.com',
      'Sec-Fetch-Site': 'same-origin',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({content:'# result',sha:'a'.repeat(40)})
  });
  const response = await worker.fetch(request, env, ctx);
  assert.equal(response.status, 403);
});

test('iteration API shows a clear error until private repository is configured', async () => {
  const cookie = await testHelpers.issueAdminSession('owner', env);
  const request = new Request('https://myzjx.com/api/admin/iteration/files', {
    headers: { Cookie: '__Host-xingx-admin='+cookie }
  });
  const response = await worker.fetch(request, env, ctx);
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.match(body, /ITERATION_GITHUB_REPO/);
});
