type MotionDetailsState = {
	details: HTMLDetailsElement;
	summary: HTMLElement;
	panels: HTMLElement[];
	kind: 'mobile-nav' | 'faq-item';
	logicalOpen: boolean;
	generation: number;
	animations: Animation[];
};

type VisualFrame = {
	opacity: string;
	transform: string;
};

const REVEAL_SELECTOR = '[data-reveal]';
const DETAILS_SELECTOR = 'details.mobile-nav, details.faq-item';
const DETAILS_DURATION = 240;
const DETAILS_EASING = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

function installSiteMotion(): void {
	const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
	let prefersReducedMotion = motionQuery?.matches ?? false;
	const detailsStates = new Map<HTMLDetailsElement, MotionDetailsState>();
	const revealAnimations = new Set<Animation>();

	function updateSummary(state: MotionDetailsState): void {
		state.summary.setAttribute('aria-expanded', String(state.logicalOpen));
		if (state.kind === 'mobile-nav') {
			state.summary.setAttribute('aria-label', state.logicalOpen ? '关闭导航菜单' : '打开导航菜单');
		}
	}

	function setPanelsUnavailable(state: MotionDetailsState, unavailable: boolean): void {
		for (const panel of state.panels) {
			panel.toggleAttribute('inert', unavailable);
			panel.setAttribute('aria-hidden', String(unavailable));
		}
	}

	function cancelDetailsAnimations(state: MotionDetailsState): void {
		for (const animation of state.animations) {
			animation.onfinish = null;
			animation.cancel();
		}
		state.animations = [];
	}

	function settleDetails(state: MotionDetailsState, generation: number): void {
		if (generation !== state.generation) return;
		cancelDetailsAnimations(state);
		state.details.open = state.logicalOpen;
		setPanelsUnavailable(state, !state.logicalOpen);
		updateSummary(state);
	}

	function currentVisualFrames(state: MotionDetailsState, interrupting: boolean): VisualFrame[] {
		return state.panels.map((panel) => {
			if (!interrupting) {
				return state.logicalOpen
					? { opacity: '1', transform: 'translateY(0px)' }
					: { opacity: '0', transform: 'translateY(-8px)' };
			}

			const style = getComputedStyle(panel);
			return {
				opacity: style.opacity,
				transform: style.transform === 'none' ? 'translateY(0px)' : style.transform,
			};
		});
	}

	function transitionDetails(state: MotionDetailsState, shouldOpen: boolean): void {
		if (
			state.logicalOpen === shouldOpen &&
			state.details.open === shouldOpen &&
			state.animations.length === 0
		) {
			return;
		}

		const interrupting = state.animations.length > 0;
		let fromFrames: VisualFrame[];
		try {
			fromFrames = currentVisualFrames(state, interrupting);
		} catch {
			fromFrames = state.panels.map(() =>
				state.logicalOpen
					? { opacity: '1', transform: 'translateY(0px)' }
					: { opacity: '0', transform: 'translateY(-8px)' },
			);
		}

		state.generation += 1;
		const generation = state.generation;
		cancelDetailsAnimations(state);
		state.logicalOpen = shouldOpen;
		// Keep the disclosure open until its closing animation is complete.
		state.details.open = true;
		updateSummary(state);
		const focusWasInPanel = state.panels.some((panel) => panel.contains(document.activeElement));
		setPanelsUnavailable(state, !shouldOpen);

		if (!shouldOpen && focusWasInPanel) {
			state.summary.focus({ preventScroll: true });
		}

		if (prefersReducedMotion || state.panels.some((panel) => typeof panel.animate !== 'function')) {
			settleDetails(state, generation);
			return;
		}

		const animations: Animation[] = [];
		try {
			state.panels.forEach((panel, index) => {
				const from = fromFrames[index] ?? { opacity: shouldOpen ? '0' : '1', transform: 'translateY(0px)' };
				const to: VisualFrame = shouldOpen
					? { opacity: '1', transform: 'translateY(0px)' }
					: { opacity: '0', transform: 'translateY(-8px)' };
				animations.push(
					panel.animate([from, to], {
						duration: DETAILS_DURATION,
						easing: DETAILS_EASING,
						fill: 'forwards',
					}),
				);
			});
		} catch {
			state.animations = animations;
			settleDetails(state, generation);
			return;
		}

		state.animations = animations;
		let remaining = animations.length;
		for (const animation of animations) {
			animation.onfinish = () => {
				if (generation !== state.generation) return;
				remaining -= 1;
				if (remaining === 0) settleDetails(state, generation);
			};
		}

		if (remaining === 0) settleDetails(state, generation);
	}

	function initializeDetails(): void {
		let generatedPanelId = 0;
		const details = document.querySelectorAll<HTMLDetailsElement>(DETAILS_SELECTOR);
		for (const element of details) {
			const summary = element.querySelector<HTMLElement>(':scope > summary');
			if (!summary) continue;

			const panels = Array.from(element.children).filter(
				(child): child is HTMLElement => child instanceof HTMLElement && child !== summary,
			);
			if (panels.length === 0) continue;

			for (const panel of panels) {
				if (!panel.id) panel.id = `site-motion-panel-${++generatedPanelId}`;
			}
			summary.setAttribute('aria-controls', panels.map((panel) => panel.id).join(' '));

			const state: MotionDetailsState = {
				details: element,
				summary,
				panels,
				kind: element.matches('details.mobile-nav') ? 'mobile-nav' : 'faq-item',
				logicalOpen: element.open,
				generation: 0,
				animations: [],
			};
			detailsStates.set(element, state);
			updateSummary(state);
			setPanelsUnavailable(state, !state.logicalOpen);

			summary.addEventListener('click', (event) => {
				if (
					event.defaultPrevented ||
					event.button !== 0 ||
					event.metaKey ||
					event.ctrlKey ||
					event.shiftKey ||
					event.altKey
				) {
					return;
				}
				event.preventDefault();
				transitionDetails(state, !state.logicalOpen);
			});

			// Reconcile changes made outside this controller while preserving the animation.
			element.addEventListener('toggle', () => {
				if (state.animations.length > 0 || element.open === state.logicalOpen) return;
				const shouldOpen = element.open;
				if (!shouldOpen) element.open = true;
				transitionDetails(state, shouldOpen);
			});
		}
	}

	function revealDelay(element: HTMLElement): number {
		const siblings = Array.from(element.parentElement?.children ?? []).filter(
			(child) => child instanceof HTMLElement && child.matches(REVEAL_SELECTOR),
		);
		const index = siblings.indexOf(element);
		return Math.min(Math.max(index, 0) * 55, 165);
	}

	function initializeReveals(): void {
		const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
		if (elements.length === 0) return;

		const revealed = new WeakSet<HTMLElement>();
		const reveal = (element: HTMLElement): void => {
			if (revealed.has(element)) return;
			revealed.add(element);
			if (prefersReducedMotion || typeof element.animate !== 'function') return;

			try {
				const animation = element.animate(
					[
						{ opacity: 0, transform: 'translateY(20px)' },
						{ opacity: 1, transform: 'translateY(0px)' },
					],
					{
						duration: 500,
						delay: revealDelay(element),
						easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
						fill: 'backwards',
					},
				);
				revealAnimations.add(animation);
				animation.onfinish = () => revealAnimations.delete(animation);
			} catch {
				// Content stays visible if the browser cannot create a Web Animation.
			}
		};

		if (typeof IntersectionObserver === 'undefined') {
			elements.forEach(reveal);
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
					observer.unobserve(entry.target);
					reveal(entry.target);
				}
			},
			{ threshold: 0.12 },
		);
		for (const element of elements) observer.observe(element);
	}

	initializeDetails();
	initializeReveals();

	// Touch browsers do not consistently keep :active during a held press.
	// Mirror the real pointer lifecycle; scrolling cancels through pointercancel.
	let pressedElement: HTMLElement | null = null;
	const clearPress = (): void => {
		pressedElement?.removeAttribute('data-pressed');
		pressedElement = null;
	};
	document.addEventListener('pointerdown', (event) => {
		if (event.pointerType === 'mouse' || !(event.target instanceof Element)) return;
		clearPress();
		const target = event.target.closest<HTMLElement>('a[href], button:not(:disabled), summary');
		if (!target || target.closest('[inert], fieldset:disabled')) return;
		pressedElement = target;
		target.setAttribute('data-pressed', '');
	});
	document.addEventListener('pointerup', clearPress);
	document.addEventListener('pointercancel', clearPress);
	window.addEventListener('blur', clearPress);


	document.addEventListener('click', (event) => {
		const mobileNav = Array.from(detailsStates.values()).find((state) => state.kind === 'mobile-nav');
		if (!mobileNav?.logicalOpen || !(event.target instanceof Node)) return;

		const target = event.target;
		const inside = mobileNav.details.contains(target);
		const activatedLink = target instanceof Element ? target.closest('a[href]') : null;
		if (!inside || (activatedLink !== null && mobileNav.details.contains(activatedLink))) {
			transitionDetails(mobileNav, false);
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;

		const activeElement = document.activeElement;
		const mobileNav = Array.from(detailsStates.values()).find(
			(state) => state.kind === 'mobile-nav' && state.logicalOpen,
		);
		const focusedDisclosure = Array.from(detailsStates.values()).find(
			(state) => state.kind === 'faq-item' && state.logicalOpen && state.details.contains(activeElement),
		);
		const state = mobileNav ?? focusedDisclosure;
		if (!state) return;

		event.preventDefault();
		event.stopPropagation();
		transitionDetails(state, false);
		state.summary.focus({ preventScroll: true });
	});

	const mobileNav = Array.from(detailsStates.values()).find((state) => state.kind === 'mobile-nav');
	const wideScreenQuery = window.matchMedia?.('(min-width: 1025px)');
	const closeMenuOnWideScreen = (): void => {
		if (mobileNav?.logicalOpen && (wideScreenQuery?.matches ?? window.innerWidth > 1024)) {
			transitionDetails(mobileNav, false);
		}
	};
	closeMenuOnWideScreen();
	wideScreenQuery?.addEventListener?.('change', closeMenuOnWideScreen);
	if (!wideScreenQuery?.addEventListener) {
		window.addEventListener('resize', closeMenuOnWideScreen);
	}

	const onMotionPreferenceChange = (event: MediaQueryListEvent): void => {
		prefersReducedMotion = event.matches;
		if (!prefersReducedMotion) return;

		for (const animation of revealAnimations) {
			animation.onfinish = null;
			animation.cancel();
		}
		revealAnimations.clear();

		for (const state of detailsStates.values()) {
			if (state.animations.length > 0) transitionDetails(state, state.logicalOpen);
		}
	};
	if (motionQuery?.addEventListener) {
		motionQuery.addEventListener('change', onMotionPreferenceChange);
	}
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', installSiteMotion, { once: true });
	} else {
		installSiteMotion();
	}
}
