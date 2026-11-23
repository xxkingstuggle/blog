function initReadingProgress(): void {
	const progressBar = document.getElementById('reading-progress');
	if (!progressBar) return;

	let scrollTotal = 0;
	let rafQueued = false;

	const measureScrollTotal = () => {
		scrollTotal = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
	};

	const renderProgress = () => {
		rafQueued = false;
		if (scrollTotal <= 0) {
			progressBar.style.transform = 'scaleX(0)';
			return;
		}
		const ratio = Math.min(1, Math.max(0, window.scrollY / scrollTotal));
		progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;
	};

	const requestRender = () => {
		if (rafQueued) return;
		rafQueued = true;
		requestAnimationFrame(renderProgress);
	};

	const handleResize = () => {
		measureScrollTotal();
		requestRender();
	};

	measureScrollTotal();
	renderProgress();

	window.addEventListener('scroll', requestRender, { passive: true });
	window.addEventListener('resize', handleResize, { passive: true });
	window.addEventListener('pageshow', handleResize);

	if (typeof ResizeObserver !== 'undefined') {
		const observer = new ResizeObserver(handleResize);
		observer.observe(document.documentElement);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initReadingProgress, { once: true });
} else {
	initReadingProgress();
}
