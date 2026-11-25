// Liquid Glass Damped Spring Engine (< 4 KB bundled, 0% idle CPU, compositor-only rAF)

interface CachedBox {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface StoredRailPill {
	groupIndex: number;
	y: number;
	railY?: number;
	h: number;
	ts: number;
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
	lockedItem: HTMLElement | null;
	initialActiveItem: HTMLElement | null;
	railGroupIndex: number;
}

const STIFFNESS = 260;
const DAMPING = 32;
const STOP_EPSILON = 0.04;
const RAIL_STORAGE_KEY = 'myzjx:rail-pill:v1';
const RAIL_STORAGE_TTL_MS = 1200;

function initLiquidMotion(): void {
	const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
	const states: NavSpringState[] = [];
	const sideRail = document.querySelector<HTMLElement>('.studio-side-rail');
	const railStates: NavSpringState[] = [];
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

	function getContainerRailOffsetY(container: HTMLElement): number {
		if (!sideRail) return 0;
		return container.getBoundingClientRect().top - sideRail.getBoundingClientRect().top;
	}

	function readAndConsumeRailPillState(): StoredRailPill | null {
		try {
			const raw = sessionStorage.getItem(RAIL_STORAGE_KEY);
			if (!raw) return null;
			sessionStorage.removeItem(RAIL_STORAGE_KEY);
			const parsed = JSON.parse(raw) as Partial<StoredRailPill>;
			if (
				typeof parsed.y !== 'number' ||
				typeof parsed.h !== 'number' ||
				typeof parsed.ts !== 'number' ||
				Date.now() - parsed.ts > RAIL_STORAGE_TTL_MS
			) {
				return null;
			}
			return {
				groupIndex: typeof parsed.groupIndex === 'number' ? parsed.groupIndex : 0,
				y: parsed.y,
				railY: typeof parsed.railY === 'number' ? parsed.railY : undefined,
				h: parsed.h,
				ts: parsed.ts,
			};
		} catch {
			return null;
		}
	}

	function saveRailPillState(state: NavSpringState): void {
		if (!sideRail || state.railGroupIndex < 0) return;
		const activeItem = state.lockedItem ?? findActiveItem(state.items);
		const box = activeItem ? state.cache.get(activeItem) : undefined;
		const y = state.initialized ? state.y : (box?.y ?? 0);
		const h = box?.h || parseFloat(state.pill.style.height) || 40;
		const railY = getContainerRailOffsetY(state.container) + y;
		const payload: StoredRailPill = {
			groupIndex: state.railGroupIndex,
			y,
			railY,
			h,
			ts: Date.now(),
		};
		try {
			sessionStorage.setItem(RAIL_STORAGE_KEY, JSON.stringify(payload));
		} catch {
			// Ignore storage quota or private mode restrictions
		}
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
			const prevX = state.x;
			const prevY = state.y;
			const dx = state.tx - state.x;
			const dy = state.ty - state.y;
			const ax = STIFFNESS * dx - DAMPING * state.vx;
			const ay = STIFFNESS * dy - DAMPING * state.vy;

			state.vx += ax * dt;
			state.vy += ay * dt;
			state.x += state.vx * dt;
			state.y += state.vy * dt;

			if ((state.tx - prevX) * (state.tx - state.x) < 0) {
				state.x = state.tx;
				state.vx = 0;
			}
			if ((state.ty - prevY) * (state.ty - state.y) < 0) {
				state.y = state.ty;
				state.vy = 0;
			}

			const remX = Math.abs(state.tx - state.x);
			const remY = Math.abs(state.ty - state.y);
			const energy =
				remX +
				remY +
				Math.abs(state.vx) +
				Math.abs(state.vy);

			if (energy >= STOP_EPSILON) {
				anyMoving = true;
				const proximity = Math.min(1, Math.hypot(remX, remY) / 16);
				const rawStretchX = Math.max(
					-0.015,
					Math.min(Math.abs(state.vx) * 0.00008 - Math.abs(state.vy) * 0.00004, 0.02)
				);
				const rawStretchY = Math.max(
					-0.015,
					Math.min(Math.abs(state.vy) * 0.00009 - Math.abs(state.vx) * 0.00004, 0.02)
				);
				const stretchX = rawStretchX * proximity;
				const stretchY = rawStretchY * proximity;
				const sx = 1 + stretchX;
				const sy = 1 + stretchY;
				state.pill.style.transform = `translate3d(${state.x.toFixed(2)}px,${state.y.toFixed(2)}px,0) scale3d(${sx.toFixed(3)},${sy.toFixed(3)},1)`;
			} else {
				state.x = state.tx;
				state.y = state.ty;
				state.vx = 0;
				state.vy = 0;
				state.pill.style.transform = `translate3d(${state.tx.toFixed(2)}px,${state.ty.toFixed(2)}px,0)`;
			}
		}

		rafId = anyMoving ? requestAnimationFrame(stepSprings) : ((lastTime = 0), 0);
	}

	function targetItem(state: NavSpringState, item: HTMLElement | null, immediate = false): void {
		const resolvedItem = state.lockedItem ?? item;
		const forceImmediate = immediate;
		if (resolvedItem && (state.dirty || !state.cache.has(resolvedItem))) measureContainer(state);
		const box = resolvedItem ? state.cache.get(resolvedItem) : undefined;
		if (!box || box.w === 0 || box.h === 0) {
			state.visible = false;
			state.pill.style.opacity = '0';
			return;
		}

		const wasVisible = state.visible;
		state.pill.style.width = `${box.w}px`;
		state.pill.style.height = `${box.h}px`;
		state.pill.style.opacity = '1';
		state.tx = box.x;
		state.ty = box.y;
		state.visible = true;

		if (!state.initialized || !wasVisible || forceImmediate || reducedMotion) {
			state.x = box.x;
			state.y = box.y;
			state.vx = 0;
			state.vy = 0;
			state.initialized = true;
			state.pill.style.transform = `translate3d(${box.x.toFixed(2)}px,${box.y.toFixed(2)}px,0)`;
			return;
		}

		if (rafId === 0) {
			lastTime = performance.now();
			rafId = requestAnimationFrame(stepSprings);
		}
	}

	const storedRailPill = sideRail ? readAndConsumeRailPillState() : null;
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

		const isRailGroup = Boolean(sideRail && sideRail.contains(container));
		const railGroupIndex = isRailGroup ? railStates.length : -1;
		const active = findActiveItem(items);

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
			lockedItem: null,
			initialActiveItem: active,
			railGroupIndex,
		};
		states.push(state);
		if (isRailGroup) railStates.push(state);

		if (active) {
			if (isRailGroup && storedRailPill) {
				measureContainer(state);
				const box = state.cache.get(active);
				if (box && box.w > 0 && box.h > 0) {
					const startY =
						typeof storedRailPill.railY === 'number'
							? storedRailPill.railY - getContainerRailOffsetY(container)
							: storedRailPill.groupIndex === railGroupIndex
								? storedRailPill.y
								: box.y;
					if (!reducedMotion && Math.abs(startY - box.y) > 2) {
						state.pill.style.width = `${box.w}px`;
						state.pill.style.height = `${storedRailPill.h || box.h}px`;
						state.pill.style.opacity = '1';
						state.x = box.x;
						state.y = startY;
						state.vx = 0;
						state.vy = 0;
						state.tx = box.x;
						state.ty = box.y;
						state.visible = true;
						state.initialized = true;
						state.pill.style.transform = `translate3d(${box.x.toFixed(2)}px,${startY.toFixed(2)}px,0)`;
						targetItem(state, active, false);
					} else {
						targetItem(state, active, true);
					}
				} else {
					targetItem(state, active, true);
				}
			} else {
				targetItem(state, active, true);
			}
		}

		items.forEach((item) => {
			item.addEventListener('pointerenter', () => targetItem(state, item));
			item.addEventListener('focus', () => targetItem(state, item));
			item.addEventListener('click', (event: MouseEvent) => {
				const isPrimaryLinkClick =
					item instanceof HTMLAnchorElement &&
					event.button === 0 &&
					!event.metaKey &&
					!event.ctrlKey &&
					!event.shiftKey &&
					!event.altKey &&
					item.getAttribute('target') !== '_blank' &&
					!item.hasAttribute('download');

				if (isPrimaryLinkClick) {
					for (const peer of state.items) {
						if (peer === item) {
							peer.setAttribute('aria-current', 'page');
						} else {
							peer.removeAttribute('aria-current');
						}
					}
					if (isRailGroup) {
						for (const other of railStates) {
							if (other === state) continue;
							other.lockedItem = null;
							for (const peer of other.items) {
								peer.removeAttribute('aria-current');
							}
							other.visible = false;
							other.pill.style.opacity = '0';
						}
					}
					if (state.dirty || !state.cache.has(item)) measureContainer(state);
					const targetBox = state.cache.get(item);
					const nearTarget = Boolean(
						state.initialized &&
							state.visible &&
							targetBox &&
							Math.hypot(targetBox.x - state.x, targetBox.y - state.y) <= 3
					);
					const rawHref = item.getAttribute('href') ?? '';
					if (!rawHref.startsWith('#')) {
						state.lockedItem = item;
						targetItem(state, item, nearTarget);
						if (isRailGroup) {
							saveRailPillState(state);
						}
						return;
					}
					targetItem(state, item, nearTarget);
					return;
				}

				requestAnimationFrame(() => {
					state.dirty = true;
					targetItem(state, findActiveItem(items) ?? item);
				});
			});
		});

		container.addEventListener('pointerleave', () => targetItem(state, findActiveItem(items)));
	});

	requestAnimationFrame(() => {
		for (const state of states) {
			state.pill.dataset.ready = '1';
		}
	});

	if (sideRail) {
		sideRail.addEventListener('click', (event) => {
			if (
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}
			const target = event.target instanceof Element ? event.target : null;
			const anchor = target?.closest<HTMLAnchorElement>('a[href]');
			if (!anchor || !sideRail.contains(anchor)) return;
			if (anchor.closest('[data-liquid-nav]')) return;
			if (anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) return;
			const rawHref = anchor.getAttribute('href') ?? '';
			if (!rawHref || rawHref.startsWith('#')) return;
			const visibleState = railStates.find((s) => s.visible);
			if (visibleState) {
				saveRailPillState(visibleState);
			}
		});
	}

	window.addEventListener('pagehide', () => {
		const activeRailState =
			railStates.find((s) => s.lockedItem !== null) ??
			railStates.find((s) => s.visible);
		if (activeRailState) {
			saveRailPillState(activeRailState);
		}
	});

	window.addEventListener('pageshow', (event) => {
		if (!event.persisted) return;
		for (const state of states) {
			state.lockedItem = null;
			state.dirty = true;
			for (const item of state.items) {
				if (item instanceof HTMLAnchorElement) {
					if (item === state.initialActiveItem) {
						item.setAttribute('aria-current', 'page');
					} else {
						item.removeAttribute('aria-current');
					}
				}
			}
			const active = findActiveItem(state.items);
			targetItem(state, active, true);
		}
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

	// Software Launch multi-view optical stage tabs ([data-stage-tab])
	const stageTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-stage-tab]'));
	const stagePanes = Array.from(document.querySelectorAll<HTMLElement>('[data-stage-pane]'));

	if (stageTabs.length > 0 && stagePanes.length > 0) {
		const activateStage = (targetIndex: string, focusTab = false): void => {
			stageTabs.forEach((tab) => {
				const isMatch = tab.dataset.stageTab === targetIndex;
				tab.setAttribute('aria-selected', String(isMatch));
				tab.tabIndex = isMatch ? 0 : -1;
				if (isMatch && focusTab) tab.focus();
			});
			stagePanes.forEach((pane) => {
				pane.hidden = pane.dataset.stagePane !== targetIndex;
			});
		};

		stageTabs.forEach((tab, idx) => {
			tab.addEventListener('click', () => {
				activateStage(tab.dataset.stageTab ?? '0');
			});
			tab.addEventListener('keydown', (event) => {
				if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
				event.preventDefault();
				const nextIdx =
					event.key === 'ArrowRight'
						? (idx + 1) % stageTabs.length
						: (idx - 1 + stageTabs.length) % stageTabs.length;
				const nextTab = stageTabs[nextIdx];
				if (nextTab) {
					activateStage(nextTab.dataset.stageTab ?? String(nextIdx), true);
					nextTab.click();
				}
			});
		});
	}

	// On-demand pointer specular reflection for liquid glass rail & Bento cards (0% idle CPU)
	if (!reducedMotion) {
		const sheenTargets = document.querySelectorAll<HTMLElement>(
			'.studio-side-rail, .gallery-card, .launch-bento-card'
		);
		sheenTargets.forEach((surface) => {
			let sheenRaf = 0;
			let px = 0;
			let py = 0;
			surface.addEventListener(
				'pointermove',
				(e) => {
					px = e.clientX;
					py = e.clientY;
					if (sheenRaf) return;
					sheenRaf = requestAnimationFrame(() => {
						sheenRaf = 0;
						const rect = surface.getBoundingClientRect();
						surface.style.setProperty('--spot-x', `${(px - rect.left).toFixed(1)}px`);
						surface.style.setProperty('--spot-y', `${(py - rect.top).toFixed(1)}px`);
						surface.setAttribute('data-spot', '1');
					});
				},
				{ passive: true }
			);
			surface.addEventListener(
				'pointerleave',
				() => {
					if (sheenRaf) {
						cancelAnimationFrame(sheenRaf);
						sheenRaf = 0;
					}
					surface.removeAttribute('data-spot');
				},
				{ passive: true }
			);
		});
	}
}

initLiquidMotion();
