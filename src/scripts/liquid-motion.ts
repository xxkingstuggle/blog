// Liquid Glass Damped Spring Engine (< 4 KB bundled, 0% idle CPU, compositor-only rAF)

interface CachedBox {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface NavSpringState {
	container: HTMLElement;
	pill: HTMLElement;
	items: HTMLElement[];
	cache: Map<HTMLElement, CachedBox>;
	dirty: boolean;
	x: number;
	y: number;
	vx: number;
	vy: number;
	tx: number;
	ty: number;
	visible: boolean;
	initialized: boolean;
}

const STIFFNESS = 190;
const DAMPING = 22;
const STOP_EPSILON = 0.04;

function initLiquidMotion(): void {
	const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
	let reducedMotion = motionQuery?.matches ?? false;
	motionQuery?.addEventListener?.('change', (e) => {
		reducedMotion = e.matches;
	});

	const states: NavSpringState[] = [];
	let rafId = 0;
	let lastTime = 0;

	function findActiveItem(items: HTMLElement[]): HTMLElement | null {
		return (
			items.find(
				(el) =>
					el.getAttribute('aria-current') === 'page' ||
					el.getAttribute('aria-pressed') === 'true' ||
					el.getAttribute('aria-selected') === 'true' ||
					el.classList.contains('is-active')
			) ?? null
		);
	}

	function measureContainer(state: NavSpringState): void {
		state.cache.clear();
		for (const item of state.items) {
			if (item.hidden) continue;
			state.cache.set(item, {
				x: item.offsetLeft,
				y: item.offsetTop,
				w: item.offsetWidth,
				h: item.offsetHeight,
			});
		}
		state.dirty = false;
	}

	function stepSprings(now: number): void {
		const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.032) : 1 / 60;
		lastTime = now;
		let anyMoving = false;

		for (const state of states) {
			if (!state.visible) continue;
			const dx = state.tx - state.x;
			const dy = state.ty - state.y;
			const ax = STIFFNESS * dx - DAMPING * state.vx;
			const ay = STIFFNESS * dy - DAMPING * state.vy;

			state.vx += ax * dt;
			state.vy += ay * dt;
			state.x += state.vx * dt;
			state.y += state.vy * dt;

			const energy =
				Math.abs(state.tx - state.x) +
				Math.abs(state.ty - state.y) +
				Math.abs(state.vx) +
				Math.abs(state.vy);

			if (energy >= STOP_EPSILON) {
				anyMoving = true;
				const sx = 1 + Math.min(Math.abs(state.vx) * 0.00012, 0.04);
				const sy = 1 + Math.min(Math.abs(state.vy) * 0.00015, 0.04);
				state.pill.style.transform = `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, 0) scale3d(${sx.toFixed(3)}, ${sy.toFixed(3)}, 1)`;
			} else {
				state.x = state.tx;
				state.y = state.ty;
				state.vx = 0;
				state.vy = 0;
				state.pill.style.transform = `translate3d(${state.tx.toFixed(2)}px, ${state.ty.toFixed(2)}px, 0) scale3d(1, 1, 1)`;
			}
		}

		if (anyMoving) {
			rafId = requestAnimationFrame(stepSprings);
		} else {
			rafId = 0;
			lastTime = 0;
		}
	}

	function scheduleSpring(): void {
		if (rafId === 0 && !reducedMotion) {
			lastTime = performance.now();
			rafId = requestAnimationFrame(stepSprings);
		}
	}

	function targetItem(state: NavSpringState, item: HTMLElement | null, immediate = false): void {
		if (!item) {
			state.visible = false;
			state.pill.style.opacity = '0';
			return;
		}
		if (state.dirty || !state.cache.has(item)) {
			measureContainer(state);
		}
		const box = state.cache.get(item);
		if (!box || box.w === 0 || box.h === 0) {
			state.visible = false;
			state.pill.style.opacity = '0';
			return;
		}

		state.pill.style.width = `${box.w}px`;
		state.pill.style.height = `${box.h}px`;
		state.pill.style.opacity = '1';
		state.tx = box.x;
		state.ty = box.y;
		state.visible = true;

		if (!state.initialized || immediate || reducedMotion) {
			state.x = box.x;
			state.y = box.y;
			state.vx = 0;
			state.vy = 0;
			state.initialized = true;
			state.pill.style.transform = `translate3d(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px, 0) scale3d(1, 1, 1)`;
			return;
		}

		scheduleSpring();
	}

	const navContainers = document.querySelectorAll<HTMLElement>('[data-liquid-nav]');
	navContainers.forEach((container) => {
		let pill = container.querySelector<HTMLElement>(':scope > .liquid-nav-pill');
		if (!pill) {
			pill = document.createElement('span');
			pill.className = 'liquid-nav-pill';
			pill.setAttribute('aria-hidden', 'true');
			container.prepend(pill);
		}

		const items = Array.from(
			container.querySelectorAll<HTMLElement>(':scope > a[href], :scope > button')
		);
		if (items.length === 0) return;

		const state: NavSpringState = {
			container,
			pill,
			items,
			cache: new Map(),
			dirty: true,
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			tx: 0,
			ty: 0,
			visible: false,
			initialized: false,
		};
		states.push(state);

		const active = findActiveItem(items);
		if (active) {
			targetItem(state, active, true);
		}

		items.forEach((item) => {
			item.addEventListener('pointerenter', () => {
				targetItem(state, item);
			});
			item.addEventListener('focus', () => {
				targetItem(state, item);
			});
			item.addEventListener('click', () => {
				requestAnimationFrame(() => {
					state.dirty = true;
					const nextActive = findActiveItem(items) ?? item;
					targetItem(state, nextActive);
				});
			});
		});

		container.addEventListener('pointerleave', () => {
			const currentActive = findActiveItem(items);
			targetItem(state, currentActive);
		});
	});

	window.addEventListener(
		'resize',
		() => {
			for (const state of states) {
				state.dirty = true;
				const active = findActiveItem(state.items);
				if (active) targetItem(state, active, true);
			}
		},
		{ passive: true }
	);

	// Homepage gallery category filter ([data-gallery-filter])
	const filterButtons = document.querySelectorAll<HTMLButtonElement>('[data-gallery-filter]');
	const galleryItems = document.querySelectorAll<HTMLElement>('#home-gallery [data-gallery-kind]');
	const liveCount = document.getElementById('gallery-live-count');

	if (filterButtons.length > 0 && galleryItems.length > 0) {
		filterButtons.forEach((btn) => {
			btn.addEventListener('click', () => {
				const filter = btn.dataset.galleryFilter ?? 'all';
				filterButtons.forEach((b) =>
					b.setAttribute('aria-pressed', String(b === btn))
				);
				let count = 0;
				galleryItems.forEach((item) => {
					const match = filter === 'all' || item.dataset.galleryKind === filter;
					item.hidden = !match;
					if (match) count++;
				});
				if (liveCount) {
					liveCount.textContent = `正在展示 ${count} 项内容`;
				}
			});
		});
	}
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initLiquidMotion, { once: true });
	} else {
		initLiquidMotion();
	}
}
