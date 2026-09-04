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
