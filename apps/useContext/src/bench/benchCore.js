/*
 * Unified benchmark harness. This file is IDENTICAL in every version of the
 * test application; only src/bench/adapter.js differs (it maps the five cart
 * operations onto the state manager of that version).
 *
 * It is inactive unless the page is opened with ?bench=<mode>&run=<n>.
 * Modes: fast   - update time, re-renders, mass update, throughput, rollback
 *        mem60  - memory, standard session (60 s)
 *        mem300 - memory, long-term load (300 s)
 */

const params = new URLSearchParams(window.location.search)
export const BENCH_MODE = params.get('bench')
const RUN = Number(params.get('run') || 0)
const QUICK = params.get('quick') === '1' // shortened protocol, smoke tests only
// Experimental conditions, set by bench-server.js and recorded with the result:
// CPU slowdown applied through the DevTools protocol (1 = none) and the number
// of products shown in the catalog.
const CPU_RATE = Number(params.get('cpu') || 1)
const CATALOG_SIZE = Number(params.get('catalog') || 10)

// Runs before any store module is evaluated (adapter.js imports this file
// first): every run starts from an empty storage and an authenticated session.
if (BENCH_MODE) {
	try {
		window.localStorage.clear()
		window.localStorage.setItem('accessToken', 'bench-token')
	} catch (e) {
		// ignore
	}
}

// ---------------------------------------------------------------- renders
let renderCount = 0
let dashboardRenders = 0
const rendersByComponent = {}
const renderListeners = new Set()

export function benchOnRender(name) {
	if (!BENCH_MODE) return
	renderCount += 1
	rendersByComponent[name] = (rendersByComponent[name] || 0) + 1
	if (name === 'DashboardPage') dashboardRenders += 1
	const t = performance.now()
	renderListeners.forEach(fn => fn(name, t))
}

// Replace the bookkeeping of the pre-existing metrics object by a plain
// render notification, so that the old instrumentation neither costs time
// nor accumulates memory while the benchmark is running.
export function hookMetrics(metrics) {
	if (!BENCH_MODE || !metrics) return
	metrics.trackComponentRender = name => benchOnRender(name)
	metrics.startActionMeasure = () => null
	metrics.endActionMeasure = () => 0
	metrics.startStateUpdate = () => 0
	metrics.endStateUpdate = () => 0
	metrics.measureSelector = (n, fn, ...args) => fn(...args)
	metrics.measureMemory = () => null
	metrics.measureStateSize = () => ({ sizeInBytes: 0, sizeInKB: 0 })
}

const now = () => performance.now()

// Snapshot of the per-component render counters; diff() gives the renders of
// every tracked component since the snapshot was taken.
function renderSnapshot() {
	const total = renderCount
	const by = { ...rendersByComponent }
	return {
		total: () => renderCount - total,
		diff: () => {
			const out = {}
			for (const k of Object.keys(rendersByComponent)) {
				const d = rendersByComponent[k] - (by[k] || 0)
				if (d) out[k] = d
			}
			return out
		},
	}
}

// ---------------------------------------------------------------- DOM
// The cart badge in the page header (<sup class="ant-scroll-number" title=N>)
// shows the number of items in the cart. A change of its title attribute is
// taken as the moment at which the new state has reached the DOM.
const badgeListeners = new Set()
let badgeObserver = null

function startBadgeObserver() {
	if (badgeObserver) return
	badgeObserver = new MutationObserver(records => {
		const t = performance.now()
		for (const r of records) {
			const el = r.target
			if (el.classList && el.classList.contains('ant-scroll-number')) {
				const value = el.getAttribute('title')
				badgeListeners.forEach(fn => fn(t, value))
				break
			}
		}
	})
	badgeObserver.observe(document.body, {
		subtree: true,
		attributes: true,
		attributeFilter: ['title'],
	})
}

// Resolves with the timestamp of the next badge update (null on timeout).
function nextBadgeUpdate(timeoutMs = 2000) {
	return new Promise(resolve => {
		let timer = null
		const fn = t => {
			badgeListeners.delete(fn)
			clearTimeout(timer)
			resolve(t)
		}
		timer = setTimeout(() => {
			badgeListeners.delete(fn)
			resolve(null)
		}, timeoutMs)
		badgeListeners.add(fn)
	})
}

// Records the last badge update while a burst of actions is processed.
function trackBadge() {
	const state = { t: null, value: null }
	const fn = (t, value) => {
		state.t = t
		state.value = value
	}
	badgeListeners.add(fn)
	state.stop = () => badgeListeners.delete(fn)
	return state
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Resolves with the timestamp of the next render of the named component, or
// of any tracked component when name is null (null on timeout).
function nextRender(name, timeoutMs = 2000) {
	return new Promise(resolve => {
		let timer = null
		const fn = (n, t) => {
			if (name && n !== name) return
			renderListeners.delete(fn)
			clearTimeout(timer)
			resolve(t)
		}
		timer = setTimeout(() => {
			renderListeners.delete(fn)
			resolve(null)
		}, timeoutMs)
		renderListeners.add(fn)
	})
}

// Resolves when no tracked component has rendered for quietMs.
function settle(quietMs = 30, maxMs = 5000) {
	return new Promise(resolve => {
		const start = now()
		let last = now()
		const fn = (name, t) => {
			last = t
		}
		renderListeners.add(fn)
		const check = () => {
			const t = now()
			if (t - last >= quietMs || t - start >= maxMs) {
				renderListeners.delete(fn)
				resolve(t - start >= maxMs && t - last < quietMs ? 'timeout' : 'ok')
			} else {
				setTimeout(check, Math.max(1, quietMs - (t - last)))
			}
		}
		setTimeout(check, quietMs)
	})
}

// Waits until cond() holds, re-checking after every render. Returns the
// timestamp at which the condition was first observed (null on timeout).
async function untilApplied(cond, timeoutMs = 5000) {
	const start = now()
	while (!cond()) {
		if (now() - start > timeoutMs) return null
		await Promise.race([nextRender(null, 250), sleep(250)])
	}
	return now()
}

// ---------------------------------------------------------------- data
const makeProduct = id => ({
	id,
	title: `Товар ${id}`,
	description: `Опис товару ${id}`,
	price: 10 + ((id * 37) % 990),
	images: ['https://via.placeholder.com/300'],
	category: { id: 1, name: 'Категорія' },
})

// Deterministic pseudo-random generator (mulberry32), seeded by the run number.
function prng(seed) {
	let a = seed >>> 0
	return () => {
		a |= 0
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// ---------------------------------------------------------------- tests
async function clearAndSettle(a) {
	a.clearCart()
	await untilApplied(() => a.getItems().length === 0)
	await settle(50)
}

// T1 + T2: add-to-cart. For every action:
//   sync    - duration of the action call itself (state manager only)
//   dom     - time from the call until the cart badge in the DOM is updated
//   effect  - time from the call until the render-tracking effect of
//             CartButton (the cart badge) has run, i.e. after the commit
//   renders - number of renders of tracked components caused by the action
// products: the products to add (by default new products that are not shown
// in the catalog, so that only the cart badge depends on them).
async function testAddToCart(a, n, products = null) {
	await clearAndSettle(a)
	const sync = []
	const dom = []
	const effect = []
	const renders = []
	const byComponent = {}
	for (let i = 0; i < n; i++) {
		const product = products ? products[i % products.length] : makeProduct(100000 + i)
		const snap = renderSnapshot()
		const r0 = renderCount
		const rendered = nextRender('CartButton', 2000)
		const badge = nextBadgeUpdate(2000)
		const t0 = now()
		a.addToCart(product)
		const t1 = now()
		const tD = await badge
		const tR = await rendered
		sync.push(t1 - t0)
		dom.push(tD === null ? null : tD - t0)
		effect.push(tR === null ? null : tR - t0)
		await settle(30, 1000)
		renders.push(renderCount - r0)
		const d = snap.diff()
		for (const k of Object.keys(d)) byComponent[k] = (byComponent[k] || 0) + d[k]
	}
	for (const k of Object.keys(byComponent)) byComponent[k] /= n
	return { n, sync, dom, effect, renders, rendersByComponent: byComponent, items: a.getItems().length }
}

// T3: mass update - n consecutive add-to-cart actions without yielding.
async function testMassUpdate(a, n) {
	await clearAndSettle(a)
	const snap = renderSnapshot()
	const r0 = renderCount
	let lastRender = null
	const fn = (name, t) => {
		lastRender = t
	}
	renderListeners.add(fn)
	const badge = trackBadge()
	const t0 = now()
	for (let i = 0; i < n; i++) a.addToCart(makeProduct(100000 + i))
	const t1 = now()
	const applied = await untilApplied(() => a.getItems().length === n, 60000)
	const settled = await settle(100, 30000)
	renderListeners.delete(fn)
	badge.stop()
	return {
		n,
		syncTotalMs: t1 - t0,
		appliedMs: applied === null ? null : applied - t0,
		domTotalMs: badge.t !== null && badge.value === String(n) ? badge.t - t0 : null,
		effectTotalMs: lastRender === null ? null : lastRender - t0,
		renders: renderCount - r0,
		rendersByComponent: snap.diff(),
		items: a.getItems().length,
		settled,
	}
}

// Yields to the event loop (a macrotask), so that React commits the pending
// update before the next action; unlike setTimeout it is not clamped to 4 ms.
const channel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null
const yieldQueue = []
if (channel) channel.port1.onmessage = () => yieldQueue.shift()()
const yieldToEventLoop = () =>
	new Promise(resolve => {
		if (!channel) return setTimeout(resolve, 0)
		yieldQueue.push(resolve)
		channel.port2.postMessage(0)
	})

// T3b: mass update with yielding - n consecutive add-to-cart actions, each
// followed by a yield to the event loop, so that the updates are not batched
// into one render (as with a stream of separate user or server events).
// products: by default new products that are not shown in the catalog; with
// the catalog products the actions change the quantities of visible cards.
async function testMassUpdateYield(a, n, products = null) {
	await clearAndSettle(a)
	const snap = renderSnapshot()
	const t0 = now()
	for (let i = 0; i < n; i++) {
		a.addToCart(products ? products[i % products.length] : makeProduct(100000 + i))
		await yieldToEventLoop()
	}
	const t1 = now()
	await settle(100, 30000)
	return {
		n,
		totalMs: t1 - t0,
		renders: snap.total(),
		rendersByComponent: snap.diff(),
		items: a.getItems().length,
	}
}

// Products shown in the catalog (the same response the page has rendered).
async function catalogProducts() {
	try {
		const r = await fetch('/api/v1/products?offset=0&limit=10')
		const data = await r.json()
		return Array.isArray(data) && data.length ? data : null
	} catch (e) {
		return null
	}
}

// A fixed amount of JavaScript work; its duration shows the effective CPU
// speed of the run (and therefore whether the CPU slowdown was applied).
function calibrate() {
	const t0 = now()
	let x = 0
	for (let i = 0; i < 3e6; i++) x = (x * 31 + i) % 1000003
	const ms = now() - t0
	return x < 0 ? -1 : ms
}

// T4: throughput - n add-to-cart actions cycling over a pool of 100 products
// (the cart therefore stays at 100 items); the clock stops when the final
// state is observable in the store and rendered.
async function testThroughput(a, n) {
	await clearAndSettle(a)
	const pool = []
	for (let i = 0; i < 100; i++) pool.push(makeProduct(i + 1))
	const total = () => a.getItems().reduce((s, it) => s + it.quantity, 0)
	let lastRender = null
	const fn = (name, t) => {
		lastRender = t
	}
	renderListeners.add(fn)
	const badge = trackBadge()
	const t0 = now()
	for (let i = 0; i < n; i++) a.addToCart(pool[i % 100])
	const t1 = now()
	const applied = await untilApplied(() => total() === n, 120000)
	await settle(100, 30000)
	renderListeners.delete(fn)
	badge.stop()
	const syncMs = t1 - t0
	const appliedMs = applied === null ? null : applied - t0
	const domMs = badge.t !== null && badge.value === String(n) ? badge.t - t0 : null
	return {
		n,
		syncMs,
		appliedMs,
		domMs,
		effectMs: lastRender === null ? null : Math.max(lastRender, t1) - t0,
		syncPerSec: (n / syncMs) * 1000,
		domPerSec: domMs ? (n / domMs) * 1000 : null,
		totalQuantity: total(),
	}
}

// T5: rollback - the cart holds 5 items, a snapshot is taken, 5 more items
// are added, then the cart is returned to the snapshot.
//   sync    - duration of the rollback calls
//   applied - time until the restored state is observable in the store
async function testRollback(a, iterations) {
	const sync = []
	const applied = []
	let failures = 0
	for (let i = 0; i < iterations; i++) {
		a.clearCart()
		for (let j = 0; j < 5; j++) a.addToCart(makeProduct(j + 1))
		await untilApplied(() => a.getItems().length === 5)
		const snapshot = JSON.parse(JSON.stringify(a.getItems()))
		for (let j = 5; j < 10; j++) a.addToCart(makeProduct(j + 1))
		await untilApplied(() => a.getItems().length === 10)
		await settle(20, 500)

		const t0 = now()
		a.clearCart()
		snapshot.forEach(item => {
			a.addToCart(item.product)
			if (item.quantity > 1) a.updateQuantity(item.product.id, item.quantity)
		})
		const t1 = now()
		const tA = await untilApplied(() => {
			const items = a.getItems()
			return items.length === 5 && items[4].product.id === 5
		})
		sync.push(t1 - t0)
		applied.push(tA === null ? null : tA - t0)
		if (tA === null) failures += 1
	}
	return { iterations, sync, applied, failures }
}

function heapMB() {
	return performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null
}

async function preciseMemory(timeoutMs = 15000) {
	if (typeof performance.measureUserAgentSpecificMemory !== 'function') return null
	try {
		const r = await Promise.race([
			performance.measureUserAgentSpecificMemory(),
			sleep(timeoutMs).then(() => null),
		])
		return r ? r.bytes / 1048576 : null
	} catch (e) {
		return null
	}
}

// T6: memory. A simulated session issues one cart action every intervalMs
// (70 % add, 20 % change quantity, 10 % remove, over a pool of 100 products);
// the used JS heap is sampled once per second.
async function testMemory(a, durationMs, intervalMs, seed) {
	await clearAndSettle(a)
	const rand = prng(seed)
	const pool = []
	for (let i = 0; i < 100; i++) pool.push(makeProduct(i + 1))
	const samples = []
	let actions = 0
	const preciseStart = await preciseMemory()
	const t0 = now()
	samples.push({ t: 0, mb: heapMB() })
	let nextSample = 1000
	let nextAction = 0
	while (now() - t0 < durationMs) {
		const t = now() - t0
		if (t >= nextAction) {
			const r = rand()
			const items = a.getItems()
			if (r < 0.7 || items.length === 0) {
				a.addToCart(pool[Math.floor(rand() * 100)])
			} else if (r < 0.9) {
				const it = items[Math.floor(rand() * items.length)]
				a.updateQuantity(it.product.id, it.quantity + 1)
			} else {
				const it = items[Math.floor(rand() * items.length)]
				a.removeFromCart(it.product.id)
			}
			actions += 1
			nextAction += intervalMs
		}
		if (t >= nextSample) {
			samples.push({ t: Math.round(t), mb: heapMB() })
			nextSample += 1000
		}
		await sleep(Math.max(1, Math.min(nextAction, nextSample) - (now() - t0)))
	}
	const preciseEnd = await preciseMemory()
	return { durationMs, intervalMs, actions, samples, preciseStart, preciseEnd }
}

// ---------------------------------------------------------------- runner
function banner(text, color) {
	let el = document.getElementById('__bench_banner')
	if (!el) {
		el = document.createElement('div')
		el.id = '__bench_banner'
		el.style.cssText =
			'position:fixed;left:0;bottom:0;z-index:99999;padding:6px 12px;font:13px monospace;color:#fff;'
		document.body.appendChild(el)
	}
	el.style.background = color || '#1f3a5f'
	el.textContent = text
}

async function waitForDashboard() {
	// The app first routes through /login and then back to /dashboard.
	const start = now()
	while (dashboardRenders === 0 && now() - start < 20000) await sleep(100)
	const seen = dashboardRenders > 0
	if (!seen) return false
	await sleep(QUICK ? 500 : 2500) // let the catalog request finish
	await settle(300, 10000)
	return true
}

async function run(adapter) {
	const result = {
		app: adapter.name,
		mode: BENCH_MODE,
		run: RUN,
		quick: QUICK,
		startedAt: new Date().toISOString(),
		userAgent: navigator.userAgent,
		crossOriginIsolated: window.crossOriginIsolated === true,
		cpuRate: CPU_RATE,
		catalogSize: CATALOG_SIZE,
		hardwareConcurrency: navigator.hardwareConcurrency,
		hiddenDuringRun: document.visibilityState !== 'visible',
		tests: {},
	}
	const onVis = () => {
		if (document.visibilityState !== 'visible') result.hiddenDuringRun = true
	}
	document.addEventListener('visibilitychange', onVis)
	try {
		banner(`BENCH ${adapter.name} ${BENCH_MODE} #${RUN}: waiting for the app`)
		const ready = await waitForDashboard()
		if (!ready) throw new Error('DashboardPage did not render')
		result.catalogCards = document.querySelectorAll('.ant-card').length
		result.calibrationMs = calibrate()
		const catalog = await catalogProducts()
		result.catalogProducts = catalog ? catalog.length : 0
		result.badgeFound = !!document.querySelector('sup.ant-scroll-number')
		startBadgeObserver()

		// warm-up (not recorded)
		for (let i = 0; i < 30; i++) adapter.addToCart(makeProduct(i + 1))
		await untilApplied(() => adapter.getItems().length === 30)
		await clearAndSettle(adapter)

		const step = async (name, fn) => {
			banner(`BENCH ${adapter.name} ${BENCH_MODE} #${RUN}: ${name}`)
			await sleep(50)
			result.tests[name] = await fn()
		}
		if (BENCH_MODE === 'fast') {
			await step('addToCart', () => testAddToCart(adapter, QUICK ? 10 : 100))
			if (catalog) await step('addVisible', () => testAddToCart(adapter, QUICK ? 10 : 100, catalog))
			await step('massUpdate', () => testMassUpdate(adapter, 1000))
			await step('massUpdateYield', () => testMassUpdateYield(adapter, QUICK ? 200 : 1000))
			if (catalog) await step('massUpdateVisible', () => testMassUpdateYield(adapter, QUICK ? 200 : 1000, catalog))
			await step('throughput', () => testThroughput(adapter, QUICK ? 1000 : 10000))
			await step('rollback', () => testRollback(adapter, QUICK ? 5 : 100))
		} else if (BENCH_MODE === 'mem60') {
			await step('memory', () => testMemory(adapter, QUICK ? 5000 : 60000, 500, 1000 + RUN))
		} else if (BENCH_MODE === 'mem300') {
			await step('memory', () => testMemory(adapter, QUICK ? 5000 : 300000, 50, 2000 + RUN))
		} else {
			throw new Error(`unknown mode ${BENCH_MODE}`)
		}
	} catch (e) {
		result.error = String((e && e.stack) || e)
	}
	document.removeEventListener('visibilitychange', onVis)
	result.finishedAt = new Date().toISOString()
	window.__benchResult = result

	if (params.get('report') === '0') {
		banner(`BENCH ${adapter.name} ${BENCH_MODE} #${RUN}: finished (not reported)`, '#2e7d32')
		return
	}
	try {
		banner(`BENCH ${adapter.name} ${BENCH_MODE} #${RUN}: saving`)
		await fetch('/__bench/result', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(result),
		})
		const next = await fetch('/__bench/next').then(r => r.json())
		if (next && next.url) {
			window.location.replace(next.url)
		} else {
			banner('BENCH: ALL RUNS FINISHED', '#2e7d32')
		}
	} catch (e) {
		banner(`BENCH: could not save the result (${e})`, '#b71c1c')
	}
}

let started = false
export function installBench(adapter) {
	if (!BENCH_MODE || started) return
	started = true
	window.__benchAdapter = adapter
	// Start after the application has mounted.
	setTimeout(() => run(adapter), 0)
}
