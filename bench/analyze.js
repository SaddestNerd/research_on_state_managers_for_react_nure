/*
 * Processing of the benchmark results (no dependencies, Node.js 18+).
 *
 *   node analyze.js [results dir]          default: results
 *
 * Reads <dir>/*.jsonl (only accepted runs; for a repeated run the last
 * accepted attempt), reduces every run to a set of per-run metrics and
 * aggregates them per version. Writes into the same directory:
 *   summary.json        all statistics
 *   summary.csv         one row per metric and version
 *   memory-curves.csv   mean used JS heap per second of the memory sessions
 *   report.md           tables for the thesis
 * Statistics: median, quartiles, mean, standard deviation, 95 % confidence
 * interval of the mean (Student t), Kruskal-Wallis test across the versions
 * and pairwise Mann-Whitney tests with Holm correction.
 */
const fs = require('fs')
const path = require('path')

const DIR = path.resolve(__dirname, process.argv[2] || 'results')
const APPS = [
	{ name: 'redux', label: 'Redux Toolkit' },
	{ name: 'zustand', label: 'Zustand' },
	{ name: 'context', label: 'React Context' },
	{ name: 'mobx', label: 'MobX' },
	{ name: 'xstate', label: 'XState' },
	{ name: 'zustand-mobx', label: 'Zustand + MobX' },
]

// ---------------------------------------------------------------- stats
const clean = a => a.filter(x => typeof x === 'number' && Number.isFinite(x))
const sorted = a => clean(a).sort((x, y) => x - y)
function quantile(a, q) {
	const s = sorted(a)
	if (!s.length) return null
	const pos = (s.length - 1) * q
	const lo = Math.floor(pos)
	const hi = Math.ceil(pos)
	return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}
const median = a => quantile(a, 0.5)
const mean = a => {
	const c = clean(a)
	return c.length ? c.reduce((s, x) => s + x, 0) / c.length : null
}
function sd(a) {
	const c = clean(a)
	if (c.length < 2) return null
	const m = mean(c)
	return Math.sqrt(c.reduce((s, x) => s + (x - m) ** 2, 0) / (c.length - 1))
}
// two-sided 97.5 % quantile of Student's t distribution
function tQuantile(df) {
	const table = { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228, 15: 2.131, 20: 2.086, 25: 2.06, 29: 2.045, 30: 2.042, 40: 2.021, 60: 2.0, 120: 1.98 }
	const keys = Object.keys(table).map(Number)
	for (const k of keys) if (df <= k) return table[k]
	return 1.96
}
function describe(a) {
	const c = clean(a)
	const n = c.length
	const m = mean(c)
	const s = sd(c)
	return {
		n,
		median: median(c),
		q1: quantile(c, 0.25),
		q3: quantile(c, 0.75),
		min: n ? Math.min(...c) : null,
		max: n ? Math.max(...c) : null,
		mean: m,
		sd: s,
		ci95: s !== null ? (tQuantile(n - 1) * s) / Math.sqrt(n) : null,
		cv: s !== null && m ? s / Math.abs(m) : null,
	}
}

// ranks with ties averaged
function ranks(values) {
	const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
	const r = new Array(values.length)
	for (let i = 0; i < idx.length; ) {
		let j = i
		while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++
		const avg = (i + j) / 2 + 1
		for (let k = i; k <= j; k++) r[idx[k][1]] = avg
		i = j + 1
	}
	return r
}
function tieCorrection(values) {
	const counts = {}
	values.forEach(v => (counts[v] = (counts[v] || 0) + 1))
	const n = values.length
	const t = Object.values(counts).reduce((s, c) => s + c ** 3 - c, 0)
	return 1 - t / (n ** 3 - n)
}
// regularized upper incomplete gamma Q(a, x)
function gammaln(x) {
	const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
	let y = x
	const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5)
	let ser = 1.000000000190015
	for (const ci of c) ser += ci / ++y
	return -tmp + Math.log((2.5066282746310005 * ser) / x)
}
function gammaQ(a, x) {
	if (x <= 0) return 1
	if (x < a + 1) {
		let sum = 1 / a
		let del = sum
		for (let n = 1; n < 500; n++) {
			del *= x / (a + n)
			sum += del
			if (Math.abs(del) < Math.abs(sum) * 1e-14) break
		}
		return 1 - sum * Math.exp(-x + a * Math.log(x) - gammaln(a))
	}
	let b = x + 1 - a
	let c = 1 / 1e-300
	let d = 1 / b
	let h = d
	for (let i = 1; i < 500; i++) {
		const an = -i * (i - a)
		b += 2
		d = an * d + b
		if (Math.abs(d) < 1e-300) d = 1e-300
		c = b + an / c
		if (Math.abs(c) < 1e-300) c = 1e-300
		d = 1 / d
		const del = d * c
		h *= del
		if (Math.abs(del - 1) < 1e-14) break
	}
	return Math.exp(-x + a * Math.log(x) - gammaln(a)) * h
}
const chi2Sf = (x, df) => gammaQ(df / 2, x / 2)
function normSf(z) {
	// complementary error function approximation (Abramowitz-Stegun 7.1.26)
	const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2))
	const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
	const erfc = y * Math.exp(-(z * z) / 2)
	return z >= 0 ? erfc / 2 : 1 - erfc / 2
}

function kruskalWallis(groups) {
	const gs = groups.map(clean).filter(g => g.length)
	if (gs.length < 2) return null
	const all = gs.flat()
	const n = all.length
	const r = ranks(all)
	let off = 0
	let h = 0
	for (const g of gs) {
		const rs = r.slice(off, off + g.length).reduce((s, x) => s + x, 0)
		h += rs ** 2 / g.length
		off += g.length
	}
	h = (12 / (n * (n + 1))) * h - 3 * (n + 1)
	const tc = tieCorrection(all)
	if (tc > 0) h /= tc
	const df = gs.length - 1
	return { H: h, df, p: chi2Sf(h, df), epsilon2: h / ((n * n - 1) / (n + 1)) }
}

function mannWhitney(a, b) {
	a = clean(a)
	b = clean(b)
	if (!a.length || !b.length) return null
	const all = [...a, ...b]
	const r = ranks(all)
	const r1 = r.slice(0, a.length).reduce((s, x) => s + x, 0)
	const u1 = r1 - (a.length * (a.length + 1)) / 2
	const n1 = a.length
	const n2 = b.length
	const mu = (n1 * n2) / 2
	const sigma = Math.sqrt(((n1 * n2 * (n1 + n2 + 1)) / 12) * tieCorrection(all))
	const z = sigma > 0 ? (u1 - mu - Math.sign(u1 - mu) * 0.5) / sigma : 0
	return { U: u1, z, p: sigma > 0 ? Math.min(1, 2 * normSf(Math.abs(z))) : 1, effectR: z / Math.sqrt(n1 + n2) }
}

function holm(ps) {
	const order = ps.map((p, i) => [p, i]).sort((x, y) => x[0] - y[0])
	const out = new Array(ps.length)
	let running = 0
	order.forEach(([p, i], k) => {
		running = Math.max(running, Math.min(1, p * (ps.length - k)))
		out[i] = running
	})
	return out
}

function slope(points) {
	// least squares slope of mb over t (per minute)
	const pts = points.filter(p => typeof p.mb === 'number')
	if (pts.length < 2) return null
	const xs = pts.map(p => p.t / 60000)
	const ys = pts.map(p => p.mb)
	const mx = mean(xs)
	const my = mean(ys)
	let num = 0
	let den = 0
	xs.forEach((x, i) => {
		num += (x - mx) * (ys[i] - my)
		den += (x - mx) ** 2
	})
	return den ? num / den : null
}

// ---------------------------------------------------------------- metrics
// lowerIsBetter: direction used for the ranking
const METRICS = {
	fast: [
		{ key: 'add.sync', title: 'Додавання: тривалість дії (медіана)', unit: 'мс', lower: true, get: t => median(t.addToCart.sync) },
		{ key: 'add.dom', title: 'Додавання: дія → оновлення DOM (медіана)', unit: 'мс', lower: true, get: t => median(t.addToCart.dom) },
		{ key: 'add.domP95', title: 'Додавання: дія → оновлення DOM (95-й перцентиль)', unit: 'мс', lower: true, get: t => quantile(t.addToCart.dom, 0.95) },
		{ key: 'add.effect', title: 'Додавання: дія → ефект після відмальовки (медіана)', unit: 'мс', lower: true, get: t => median(t.addToCart.effect) },
		{ key: 'add.renders', title: 'Додавання: ре-рендерів на одну дію', unit: 'шт.', lower: true, get: t => mean(t.addToCart.renders) },
		{ key: 'add.cards', title: 'Додавання (товар поза каталогом): ре-рендерів карток товарів на одну дію', unit: 'шт.', lower: true, get: t => t.addToCart.rendersByComponent.ProductCard || 0 },
		{ key: 'vis.dom', title: 'Додавання товару з каталогу: дія → оновлення DOM (медіана)', unit: 'мс', lower: true, get: t => median(t.addVisible.dom) },
		{ key: 'vis.renders', title: 'Додавання товару з каталогу: ре-рендерів на одну дію', unit: 'шт.', lower: true, get: t => mean(t.addVisible.renders) },
		{ key: 'vis.cards', title: 'Додавання товару з каталогу: ре-рендерів карток на одну дію', unit: 'шт.', lower: true, get: t => t.addVisible.rendersByComponent.ProductCard || 0 },
		{ key: 'mass.sync', title: 'Масове оновлення (1000 дій): виконання дій', unit: 'мс', lower: true, get: t => t.massUpdate.syncTotalMs },
		{ key: 'mass.dom', title: 'Масове оновлення (1000 дій): до оновлення DOM', unit: 'мс', lower: true, get: t => t.massUpdate.domTotalMs },
		{ key: 'mass.renders', title: 'Масове оновлення: кількість ре-рендерів', unit: 'шт.', lower: true, get: t => t.massUpdate.renders },
		{ key: 'massY.ms', title: 'Масове оновлення з поверненням у цикл подій (1000 дій): загальний час', unit: 'мс', lower: true, get: t => t.massUpdateYield.totalMs },
		{ key: 'massY.renders', title: 'Масове оновлення з поверненням у цикл подій: ре-рендерів усього', unit: 'шт.', lower: true, get: t => t.massUpdateYield.renders },
		{ key: 'massV.ms', title: 'Масове оновлення товарів каталогу (1000 дій, з поверненням у цикл подій): загальний час', unit: 'мс', lower: true, get: t => t.massUpdateVisible.totalMs },
		{ key: 'massV.renders', title: 'Масове оновлення товарів каталогу: ре-рендерів усього', unit: 'шт.', lower: true, get: t => t.massUpdateVisible.renders },
		{ key: 'massV.cards', title: 'Масове оновлення товарів каталогу: ре-рендерів карток', unit: 'шт.', lower: true, get: t => t.massUpdateVisible.rendersByComponent.ProductCard || 0 },
		{ key: 'thr.sync', title: 'Пропускна здатність (10 000 дій): стор', unit: 'дій/с', lower: false, get: t => t.throughput.syncPerSec },
		{ key: 'thr.dom', title: 'Пропускна здатність (10 000 дій): до DOM', unit: 'дій/с', lower: false, get: t => t.throughput.domPerSec },
		{ key: 'rb.sync', title: 'Відкат стану: виконання (медіана)', unit: 'мс', lower: true, get: t => median(t.rollback.sync) },
		{ key: 'rb.applied', title: 'Відкат стану: до спостережуваного стану (медіана)', unit: 'мс', lower: true, get: t => median(t.rollback.applied) },
		{ key: 'rb.failures', title: 'Відкат стану: невдалих спроб', unit: 'шт.', lower: true, get: t => t.rollback.failures },
	],
	mem: [
		{ key: 'heap.start', title: 'Heap на початку сесії (середнє перших 5 с)', unit: 'МБ', lower: true, get: m => mean(m.samples.slice(0, 5).map(s => s.mb)) },
		{ key: 'heap.end', title: 'Heap наприкінці сесії (середнє останніх 5 с)', unit: 'МБ', lower: true, get: m => mean(m.samples.slice(-5).map(s => s.mb)) },
		{ key: 'heap.mean', title: 'Heap, середнє за сесію', unit: 'МБ', lower: true, get: m => mean(m.samples.map(s => s.mb)) },
		{ key: 'heap.peak', title: 'Heap, пікове значення', unit: 'МБ', lower: true, get: m => Math.max(...clean(m.samples.map(s => s.mb))) },
		{ key: 'heap.slope', title: 'Тренд heap (нахил регресії)', unit: 'МБ/хв', lower: true, get: m => slope(m.samples) },
		{ key: 'heap.precise', title: 'Пам’ять після GC наприкінці (measureUserAgentSpecificMemory)', unit: 'МБ', lower: true, get: m => m.preciseEnd },
		{ key: 'actions', title: 'Виконано дій за сесію', unit: 'шт.', lower: false, get: m => m.actions },
	],
}

// ---------------------------------------------------------------- load
if (!fs.existsSync(DIR)) {
	console.error(`No results directory: ${DIR}`)
	process.exit(1)
}
const runs = {}
let rejected = 0
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.jsonl'))) {
	for (const line of fs.readFileSync(path.join(DIR, f), 'utf8').split('\n')) {
		if (!line.trim()) continue
		const r = JSON.parse(line)
		if (!r.accepted) {
			rejected++
			continue
		}
		runs[r.jobId] = r
	}
}
const byMode = { fast: {}, mem60: {}, mem300: {} }
for (const r of Object.values(runs)) {
	if (!byMode[r.mode]) continue
	;(byMode[r.mode][r.app] = byMode[r.mode][r.app] || []).push(r)
}
const anyRun = Object.values(runs)[0]
if (!anyRun) {
	console.error('No accepted runs found.')
	process.exit(1)
}

// ---------------------------------------------------------------- analyse
const summary = {
	generatedAt: new Date().toISOString(),
	resultsDir: DIR,
	environment: {
		userAgent: anyRun.userAgent,
		hardwareConcurrency: anyRun.hardwareConcurrency,
		crossOriginIsolated: anyRun.crossOriginIsolated,
		quick: anyRun.quick,
		cpuRate: anyRun.cpuRate || 1,
		catalogSize: anyRun.catalogSize || 10,
		catalogCards: anyRun.catalogCards,
		calibrationMsMedian: median(Object.values(runs).map(r => r.calibrationMs)),
	},
	runs: {},
	rejectedAttempts: rejected,
	modes: {},
}
const csv = [['mode', 'metric', 'unit', 'app', 'n', 'median', 'q1', 'q3', 'mean', 'sd', 'ci95', 'min', 'max'].join(',')]

for (const mode of Object.keys(byMode)) {
	const defs = mode === 'fast' ? METRICS.fast : METRICS.mem
	const out = {}
	summary.runs[mode] = Object.fromEntries(APPS.map(a => [a.name, (byMode[mode][a.name] || []).length]))
	for (const def of defs) {
		const values = {}
		for (const app of APPS) {
			values[app.name] = (byMode[mode][app.name] || [])
				.map(r => {
					try {
						return def.get(mode === 'fast' ? r.tests : r.tests.memory)
					} catch (e) {
						return null
					}
				})
				.filter(v => typeof v === 'number' && Number.isFinite(v))
		}
		const stats = Object.fromEntries(APPS.map(a => [a.name, describe(values[a.name])]))
		const present = APPS.filter(a => stats[a.name].n > 0)
		if (!present.length) continue
		const kw = kruskalWallis(present.map(a => values[a.name]))
		// pairwise comparisons
		const pairs = []
		for (let i = 0; i < present.length; i++)
			for (let j = i + 1; j < present.length; j++) {
				const mw = mannWhitney(values[present[i].name], values[present[j].name])
				if (mw) pairs.push({ a: present[i].name, b: present[j].name, ...mw })
			}
		const adj = holm(pairs.map(p => p.p))
		pairs.forEach((p, i) => (p.pHolm = adj[i]))
		// ranking by median
		const ranking = present
			.slice()
			.sort((x, y) => (def.lower ? 1 : -1) * (stats[x.name].median - stats[y.name].median))
			.map(a => a.name)
		const best = stats[ranking[0]].median
		const relative = Object.fromEntries(
			present.map(a => [a.name, best ? (def.lower ? stats[a.name].median / best : best / stats[a.name].median) : null])
		)
		out[def.key] = { title: def.title, unit: def.unit, lowerIsBetter: def.lower, stats, kruskalWallis: kw, pairwise: pairs, ranking, relativeToBest: relative, values }
		for (const a of present) {
			const s = stats[a.name]
			csv.push([mode, def.key, def.unit, a.name, s.n, s.median, s.q1, s.q3, s.mean, s.sd, s.ci95, s.min, s.max].map(v => (v === null ? '' : v)).join(','))
		}
	}
	summary.modes[mode] = out
}

// mean heap curves
const curves = ['mode,app,t_s,mean_mb,runs']
for (const mode of ['mem60', 'mem300']) {
	for (const app of APPS) {
		const rs = byMode[mode][app.name] || []
		const bySec = {}
		for (const r of rs)
			for (const s of r.tests.memory.samples) {
				const sec = Math.round(s.t / 1000)
				if (typeof s.mb === 'number') (bySec[sec] = bySec[sec] || []).push(s.mb)
			}
		for (const sec of Object.keys(bySec).map(Number).sort((a, b) => a - b))
			curves.push([mode, app.name, sec, mean(bySec[sec]).toFixed(3), bySec[sec].length].join(','))
	}
}

// ---------------------------------------------------------------- report
const label = name => APPS.find(a => a.name === name).label
const fmt = v => {
	if (v === null || v === undefined || !Number.isFinite(v)) return '—'
	const a = Math.abs(v)
	if (a >= 1000) return v.toFixed(0)
	if (a >= 100) return v.toFixed(1)
	if (a >= 1) return v.toFixed(2)
	return v.toFixed(3)
}
const fmtP = p => (p === null || p === undefined ? '—' : p < 0.001 ? '< 0.001' : p.toFixed(3))
const md = []
md.push('# Результати тестування менеджерів стану')
md.push('')
md.push(`Сформовано: ${summary.generatedAt}`)
md.push('')
md.push(`Середовище: ${summary.environment.userAgent}; логічних ядер: ${summary.environment.hardwareConcurrency}; cross-origin isolation: ${summary.environment.crossOriginIsolated ? 'так' : 'ні'}; уповільнення CPU: ${summary.environment.cpuRate}×; товарів у каталозі: ${summary.environment.catalogSize}; калібрувальний цикл (медіана): ${fmt(summary.environment.calibrationMsMedian)} мс${summary.environment.quick ? '; **скорочений протокол (smoke test)**' : ''}.`)
md.push('')
md.push('Прийнято прогонів:')
md.push('')
md.push('| Режим | ' + APPS.map(a => a.label).join(' | ') + ' |')
md.push('|---|' + APPS.map(() => '---:').join('|') + '|')
for (const mode of Object.keys(summary.runs)) md.push(`| ${mode} | ` + APPS.map(a => summary.runs[mode][a.name]).join(' | ') + ' |')
md.push('')
md.push(`Відхилених спроб (помилка або прихована вкладка): ${rejected}.`)
md.push('')
md.push('У таблицях: медіана по прогонах [Q1; Q3], середнє ± півширина 95 % довірчого інтервалу. «×» — у скільки разів гірше за найкращий результат. p — критерій Краскела–Уоллиса між усіма версіями.')

const modeTitles = {
	fast: 'Швидкодія (режим fast)',
	mem60: 'Пам’ять: стандартна сесія, 60 с, дія кожні 500 мс (режим mem60)',
	mem300: 'Пам’ять: тривале навантаження, 300 с, дія кожні 50 мс (режим mem300)',
}
for (const mode of Object.keys(summary.modes)) {
	const out = summary.modes[mode]
	if (!Object.keys(out).length) continue
	md.push('')
	md.push(`## ${modeTitles[mode]}`)
	for (const key of Object.keys(out)) {
		const m = out[key]
		md.push('')
		md.push(`### ${m.title}, ${m.unit} (${m.lowerIsBetter ? 'менше — краще' : 'більше — краще'})`)
		md.push('')
		md.push('| Місце | Версія | n | Медіана [Q1; Q3] | Середнє ± 95 % ДІ | × |')
		md.push('|---:|---|---:|---|---|---:|')
		m.ranking.forEach((name, i) => {
			const s = m.stats[name]
			md.push(`| ${i + 1} | ${label(name)} | ${s.n} | ${fmt(s.median)} [${fmt(s.q1)}; ${fmt(s.q3)}] | ${fmt(s.mean)} ± ${fmt(s.ci95)} | ${fmt(m.relativeToBest[name])} |`)
		})
		if (m.kruskalWallis) {
			const kw = m.kruskalWallis
			md.push('')
			md.push(`Краскел–Уолліс: H = ${fmt(kw.H)}, df = ${kw.df}, p = ${fmtP(kw.p)}, ε² = ${fmt(kw.epsilon2)}.`)
			// neighbouring places that do not differ significantly
			const same = []
			for (let i = 0; i + 1 < m.ranking.length; i++) {
				const a = m.ranking[i]
				const b = m.ranking[i + 1]
				const pr = m.pairwise.find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a))
				if (pr && pr.pHolm >= 0.05) same.push(`${label(a)} ≈ ${label(b)} (p = ${fmtP(pr.pHolm)})`)
			}
			if (same.length) md.push(`Без статистично значущої різниці (Манн–Уітні, поправка Холма): ${same.join('; ')}.`)
		}
	}
}

// overall ranking: mean place over the key metrics
const KEY = [
	['fast', 'add.dom'],
	['fast', 'add.renders'],
	['fast', 'vis.renders'],
	['fast', 'massV.renders'],
	['fast', 'mass.dom'],
	['fast', 'thr.dom'],
	['fast', 'rb.applied'],
	['mem60', 'heap.mean'],
	['mem300', 'heap.mean'],
	['mem300', 'heap.slope'],
]
const places = {}
for (const [mode, key] of KEY) {
	const m = summary.modes[mode] && summary.modes[mode][key]
	if (!m) continue
	// tied medians share a place
	m.ranking.forEach(name => {
		const med = m.stats[name].median
		const place = 1 + m.ranking.filter(o => (m.lowerIsBetter ? m.stats[o].median < med : m.stats[o].median > med)).length
		;(places[name] = places[name] || []).push(place)
	})
}
const overall = Object.entries(places)
	.map(([name, ps]) => ({ name, mean: mean(ps), places: ps }))
	.sort((a, b) => a.mean - b.mean)
summary.overall = { metrics: KEY.map(k => k.join(':')), ranking: overall }
if (overall.length) {
	md.push('')
	md.push('## Зведений рейтинг')
	md.push('')
	md.push('Середнє місце за ключовими показниками: ' + KEY.map(([m, k]) => `${m}:${k}`).join(', ') + '.')
	md.push('')
	md.push('| Місце | Версія | Середнє місце | Місця за показниками |')
	md.push('|---:|---|---:|---|')
	overall.forEach((o, i) => md.push(`| ${i + 1} | ${label(o.name)} | ${fmt(o.mean)} | ${o.places.join(', ')} |`))
}

fs.writeFileSync(path.join(DIR, 'summary.json'), JSON.stringify(summary, null, 1))
fs.writeFileSync(path.join(DIR, 'summary.csv'), '﻿' + csv.join('\n') + '\n')
fs.writeFileSync(path.join(DIR, 'memory-curves.csv'), curves.join('\n') + '\n')
fs.writeFileSync(path.join(DIR, 'report.md'), md.join('\n') + '\n')
console.log(`Accepted runs: ${Object.keys(runs).length}, rejected attempts: ${rejected}`)
console.log(`Written: summary.json, summary.csv, memory-curves.csv, report.md in ${DIR}`)
