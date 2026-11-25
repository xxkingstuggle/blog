// Lightweight viewport reveal & touch press feedback (0% idle CPU)

function installSiteMotion(): void {
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
				observer.unobserve(entry.target);
				entry.target.animate?.(
					[
						{ opacity: 0.35, transform: 'translate3d(0, 7px, 0)' },
						{ opacity: 1, transform: 'translate3d(0, 0, 0)' },
					],
					{ duration: 240, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
				);
			}
		},
		{ threshold: 0.1 }
	);
	document.querySelectorAll<HTMLElement>('[data-reveal]:not(.gallery-item)').forEach((el) => observer.observe(el));
}

installSiteMotion();
