/*
 * Benchmark server (no dependencies, Node.js 18+).
 *
 *   node bench-server.js                 full protocol
 *   node bench-server.js --quick         shortened protocol (smoke test)
 *
 * It serves the production build of every version of the test application on
 * its own port, mirrors the catalog API from a local snapshot, hands out the
 * schedule of runs and stores every result in results/*.jsonl.
 * Start the series by opening http://localhost:4100/start in Google Chrome.
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const args = process.argv.slice(2)
const flag = (name, def) => {
	const i = args.indexOf('--' + name)
	return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def
}
const QUICK = args.includes('--quick')
const HOST = flag('host', 'localhost')
const RUNS = {
	fast: Number(flag('fast', QUICK ? 2 : 30)),
	mem60: Number(flag('mem60', QUICK ? 1 : 5)),
	mem300: Number(flag('mem300', QUICK ? 1 : 5)),
}
// Experimental conditions: CPU slowdown (applied by run-headless.js through the
// DevTools protocol; here only passed on to the page and recorded), number of
// products in the catalog, and the modes to run.
const CPU = Number(flag('cpu', 1))
const CATALOG = Number(flag('catalog', 10))
const MODES = flag('modes', 'fast,mem60,mem300').split(',')
const RESULTS = path.join(ROOT, flag('out', QUICK ? 'results-quick' : 'results'))
const CACHE = path.join(ROOT, 'cache')
const UPSTREAM = 'https://api.escuelajs.co'
const CONTROL_PORT = 4100
const APPS = [
	{ name: 'redux', port: 4101 },
	{ name: 'zustand', port: 4102 },
	{ name: 'context', port: 4103, dir: 'useContext' },
	{ name: 'mobx', port: 4104, dir: 'mobX' },
	{ name: 'xstate', port: 4105, dir: 'xState' },
	{ name: 'zustand-mobx', port: 4106 },
].map(a => ({ ...a, dir: path.join(ROOT, 'builds', a.dir || a.name) }))

fs.mkdirSync(RESULTS, { recursive: true })
fs.mkdirSync(CACHE, { recursive: true })

// ---- schedule: modes in sequence, runs interleaved across the versions,
// with the starting version rotated from run to run.
const jobs = []
for (const mode of MODES) {
	for (let run = 1; run <= RUNS[mode]; run++) {
		for (let k = 0; k < APPS.length; k++) {
			const app = APPS[(k + run - 1) % APPS.length]
			jobs.push({ id: `${mode}:${app.name}:${run}`, mode, run, app })
		}
	}
}
const stateFile = path.join(RESULTS, 'state.json')
let state = { done: {}, attempts: {} }
try {
	state = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
} catch (e) {
	// fresh start
}
const saveState = () => fs.writeFileSync(stateFile, JSON.stringify(state))
const nextJob = () => jobs.find(j => !state.done[j.id])
const jobUrl = j =>
	`http://${HOST}:${j.app.port}/dashboard?bench=${j.mode}&run=${j.run}&cpu=${CPU}&catalog=${CATALOG}${QUICK ? '&quick=1' : ''}`

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.svg': 'image/svg+xml',
	'.txt': 'text/plain',
	'.map': 'application/json',
	'.woff2': 'font/woff2',
}
// Cross-origin isolation gives 5-microsecond timer resolution and precise,
// uncached performance.memory readings.
const HEADERS = {
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Embedder-Policy': 'credentialless',
	'Cache-Control': 'no-store',
}
const send = (res, code, body, type) => {
	res.writeHead(code, { ...HEADERS, 'Content-Type': type || 'application/json' })
	res.end(body)
}
const readBody = req =>
	new Promise(resolve => {
		const chunks = []
		req.on('data', c => chunks.push(c))
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
	})

// With --catalog N (N != 10) every catalog request returns N products built
// from the 10 products of the cached snapshot (same fields, new ids/titles).
let bigCatalog = null
function syntheticCatalog() {
	if (bigCatalog) return bigCatalog
	const base = JSON.parse(fs.readFileSync(path.join(CACHE, 'products-0-10.json'), 'utf8'))
	const list = []
	for (let i = 0; i < CATALOG; i++) {
		const p = base[i % base.length]
		list.push({ ...p, id: 1000 + i, title: `${p.title} #${i + 1}`, slug: `${p.slug}-${i + 1}` })
	}
	bigCatalog = JSON.stringify(list)
	return bigCatalog
}

async function products(url, res) {
	if (CATALOG !== 10) return send(res, 200, syntheticCatalog())
	const offset = url.searchParams.get('offset') || '0'
	const limit = url.searchParams.get('limit') || '10'
	const file = path.join(CACHE, `products-${offset}-${limit}.json`)
	if (!fs.existsSync(file)) {
		try {
			const r = await fetch(`${UPSTREAM}/api/v1/products?offset=${offset}&limit=${limit}`)
			if (!r.ok) throw new Error('HTTP ' + r.status)
			fs.writeFileSync(file, await r.text())
			console.log(`catalog snapshot saved: ${path.basename(file)}`)
		} catch (e) {
			return send(res, 502, JSON.stringify({ message: 'catalog upstream unavailable: ' + e.message }))
		}
	}
	send(res, 200, fs.readFileSync(file))
}

function appHandler(app) {
	return async (req, res) => {
		const url = new URL(req.url, `http://${HOST}:${app.port}`)
		const p = decodeURIComponent(url.pathname)
		try {
			if (p === '/__bench/result' && req.method === 'POST') {
				const body = await readBody(req)
				const r = JSON.parse(body)
				const id = `${r.mode}:${app.name}:${r.run}`
				state.attempts[id] = (state.attempts[id] || 0) + 1
				const bad = !!r.error || r.hiddenDuringRun
				r.jobId = id
				r.attempt = state.attempts[id]
				r.accepted = !bad
				fs.appendFileSync(path.join(RESULTS, `${r.mode}-${app.name}.jsonl`), JSON.stringify(r) + '\n')
				// a failed or hidden-tab run is repeated (at most three attempts)
				if (!bad || state.attempts[id] >= 3) state.done[id] = bad ? 'failed' : 'ok'
				saveState()
				const total = jobs.length
				const finished = Object.keys(state.done).length
				console.log(`${new Date().toLocaleTimeString()}  ${id}  ${bad ? 'REPEAT/FAILED ' + (r.error || 'tab hidden') : 'ok'}  [${finished}/${total}]`)
				return send(res, 200, '{"ok":true}')
			}
			if (p === '/__bench/next') {
				const j = nextJob()
				return send(res, 200, JSON.stringify(j ? { url: jobUrl(j) } : { done: true }))
			}
			if (p === '/api/v1/products') return products(url, res)
			if (p === '/api/v1/auth/profile') return send(res, 200, JSON.stringify({ id: 1, email: 'john@mail.com', name: 'Bench' }))
			if (p.startsWith('/api/')) return send(res, 404, JSON.stringify({ message: 'not mirrored' }))
			let file = path.join(app.dir, p)
			if (!file.startsWith(app.dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
				file = path.join(app.dir, 'index.html')
			}
			send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream')
		} catch (e) {
			send(res, 500, JSON.stringify({ message: String(e) }))
		}
	}
}

for (const app of APPS) {
	if (!fs.existsSync(path.join(app.dir, 'index.html'))) {
		console.error(`Build not found: ${app.dir}`)
		process.exit(1)
	}
	http.createServer(appHandler(app)).listen(app.port)
}
http
	.createServer((req, res) => {
		const j = nextJob()
		// used by run-headless.js when a run hangs repeatedly
		if (req.url.startsWith('/fail?')) {
			const id = new URL(req.url, 'http://x').searchParams.get('id')
			if (id && !state.done[id]) {
				state.done[id] = 'failed'
				saveState()
				console.log(`${new Date().toLocaleTimeString()}  ${id}  FAILED (no result, skipped by the runner)`)
			}
			return send(res, 200, '{"ok":true}')
		}
		if (req.url.startsWith('/status')) {
			return send(res, 200, JSON.stringify({ total: jobs.length, finished: Object.keys(state.done).length, next: j ? j.id : null, failed: Object.keys(state.done).filter(k => state.done[k] === 'failed') }))
		}
		if (!j) return send(res, 200, '<h1>All runs are finished</h1>', 'text/html')
		res.writeHead(302, { Location: jobUrl(j) })
		res.end()
	})
	.listen(CONTROL_PORT)

console.log(`Benchmark server is running${QUICK ? ' (QUICK mode)' : ''}.`)
console.log(`Schedule: ${jobs.length} runs (${RUNS.fast} fast, ${RUNS.mem60} x 60 s memory, ${RUNS.mem300} x 300 s memory per version).`)
console.log(`Finished so far: ${Object.keys(state.done).length}. Results: ${RESULTS}`)
console.log(`Open http://${HOST}:${CONTROL_PORT}/start in Google Chrome and keep that tab visible.`)
