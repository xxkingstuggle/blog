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

function initMobileToc(): void {
	document.querySelectorAll<HTMLDetailsElement>('[data-mobile-toc]').forEach((toc) => {
		toc.querySelectorAll<HTMLAnchorElement>('[data-mobile-toc-link]').forEach((link) => {
			link.addEventListener('click', () => {
				toc.open = false;
			});
		});
	});
}

function initCodeCopyButtons(): void {
	const codeBlocks = document.querySelectorAll<HTMLPreElement>('.article-prose pre');
	codeBlocks.forEach((pre) => {
		if (pre.parentElement?.classList.contains('article-code-block')) return;
		const wrapper = document.createElement('div');
		wrapper.className = 'article-code-block';
		pre.parentNode?.insertBefore(wrapper, pre);
		wrapper.append(pre);

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'code-copy-btn';
		button.textContent = '复制';
		button.setAttribute('aria-label', '复制代码');

		let resetTimer: number | undefined;
		button.addEventListener('click', async () => {
			const codeNode = pre.querySelector('code');
			const text = (codeNode ?? pre).textContent ?? '';
			try {
				await navigator.clipboard.writeText(text);
				button.textContent = '已复制';
				button.dataset.copied = 'true';
			} catch {
				button.textContent = '复制失败';
			}
			if (resetTimer) window.clearTimeout(resetTimer);
			resetTimer = window.setTimeout(() => {
				button.textContent = '复制';
				delete button.dataset.copied;
			}, 1800);
		});

		wrapper.append(button);
	});
}

function initArticleEnhancements(): void {
	initReadingProgress();
	initMobileToc();
	initCodeCopyButtons();
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initArticleEnhancements, { once: true });
} else {
	initArticleEnhancements();
}
