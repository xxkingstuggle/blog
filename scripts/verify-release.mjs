const [url, expectedSha, attemptInput] = process.argv.slice(2);
if (!url || !/^[a-f0-9]{40}$/.test(expectedSha ?? '')) {
	throw new Error('Usage: node scripts/verify-release.mjs <build-manifest-url> <40-char-commit-sha> [attempts]');
}

const maxAttempts = Number.isInteger(Number(attemptInput)) && Number(attemptInput) > 0 ? Number(attemptInput) : 12;

let lastError = 'deployment not visible';
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
	try {
		const target = new URL(url);
		target.searchParams.set('verify', `${Date.now()}-${attempt}`);
		const response = await fetch(target, { headers: { 'Cache-Control': 'no-cache' } });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const manifest = await response.json();
		if (manifest.dirty === false && manifest.commitSha === expectedSha) {
			console.log(`verified deployment ${expectedSha}`);
			process.exit(0);
		}
		lastError = `received sha=${manifest.commitSha ?? 'missing'} dirty=${String(manifest.dirty)}`;
	} catch (error) {
		lastError = error instanceof Error ? error.message : String(error);
	}
	if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 5000));
}

throw new Error(`Deployment verification failed: ${lastError}`);
