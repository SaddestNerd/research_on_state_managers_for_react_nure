/*
 * Unattended runner (no dependencies, Node.js 18+).
 *
 *   node run-headless.js [--headed] [--chrome <path>] [bench-server options]
 *
 * Starts bench-server.js and a separate Chrome instance (headless by default,
 * own temporary profile) that works through the whole schedule. A headless
 * page is always "visible", so no run is rejected because the tab was
 * hidden. A watchdog restarts Chrome when a run produces no result in time;
 * after three restarts the run is marked as failed and the series goes on.
 * All other options (--quick, --fast N, --mem60 N, --mem300 N, --out DIR)
 * are passed on to bench-server.js.
 */
const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const args = process.argv.slice(2)
const take = (name, hasValue) => {
	const i = args.indexOf('--' + name)
	if (i < 0) return undefined
	const v = hasValue ? args[i + 1] : true
	args.splice(i, hasValue ? 2 : 1)
	return v
}
const HEADED = take('headed', false)
const CHROME =
	take('chrome', true) ||
	[
		process.env.CHROME_PATH,
		'C:/Program Files/Google/Chrome/Application/chrome.exe',
		'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
		path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/usr/bin/google-chrome',
	].find(p => p && fs.existsSync(p))
const QUICK = args.includes('--quick')
// --cpu N slows the CPU of the page down N times (DevTools protocol,
// Emulation.setCPUThrottlingRate). The option is also passed on to
// bench-server.js, which records it with every result.
const CPU = (() => {
	const i = args.indexOf('--cpu')
	return i >= 0 ? Number(args[i + 1]) : 1
})()
const DEBUG_PORT = 9333
const CONTROL = 'http://localhost:4100'
// time a single run may take before Chrome is restarted
const LIMIT_MS = QUICK
	? { fast: 120e3, mem60: 120e3, mem300: 120e3 }
	: { fast: 300e3, mem60: 240e3, mem300: 600e3 }

if (!CHROME) {
	console.error('Google Chrome not found, pass --chrome <path>')
	process.exit(1)
}

const server = spawn(process.execPath, [path.join(__dirname, 'bench-server.js'), ...args], {
	stdio: 'inherit',
})
let finishing = false
server.on('exit', code => {
	if (finishing) return
	console.error(`bench-server exited (${code})`)
	stopChrome()
	process.exit(code || 1)
})

let chrome = null
let profile = null
function startChrome() {
	profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-chrome-'))
	const flags = [
		`--user-data-dir=${profile}`,
		'--no-first-run',
		'--no-default-browser-check',
		'--disable-extensions',
		'--disable-component-update',
		'--disable-sync',
		'--disable-background-networking',
		'--disable-background-timer-throttling',
		'--disable-renderer-backgrounding',
		'--disable-backgrounding-occluded-windows',
		'--enable-precise-memory-info',
		'--window-size=1366,900',
	]
	if (CPU > 1) flags.push(`--remote-debugging-port=${DEBUG_PORT}`, '--remote-allow-origins=*')
	if (!HEADED) flags.push('--headless=new')
	chrome = spawn(CHROME, [...flags, `${CONTROL}/start`], { stdio: 'ignore' })
	chrome.on('exit', () => {
		chrome = null
	})
}
// CPU throttling. The emulation lasts only while a DevTools session is
// attached, so one WebSocket per page target is kept open; the rate is sent
// again whenever the page navigates to the next run.
const sessions = new Map() // target id -> { ws, url, msgId }
async function applyThrottle() {
	if (CPU <= 1 || !chrome) return
	let targets
	try {
		targets = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then(r => r.json())
	} catch (e) {
		return
	}
	for (const t of targets) {
		if (t.type !== 'page' || !t.webSocketDebuggerUrl) continue
		let s = sessions.get(t.id)
		if (!s) {
			s = { ws: new WebSocket(t.webSocketDebuggerUrl), url: null, msgId: 0, open: false }
			s.ws.onopen = () => {
				s.open = true
			}
			s.ws.onclose = () => sessions.delete(t.id)
			s.ws.onerror = () => sessions.delete(t.id)
			sessions.set(t.id, s)
		}
		if (s.open && s.url !== t.url) {
			s.msgId += 1
			s.ws.send(JSON.stringify({ id: s.msgId, method: 'Emulation.setCPUThrottlingRate', params: { rate: CPU } }))
			s.url = t.url
		}
	}
}
setInterval(() => applyThrottle().catch(() => {}), 500)

function stopChrome() {
	for (const s of sessions.values()) {
		try {
			s.ws.close()
		} catch (e) {
			// ignore
		}
	}
	sessions.clear()
	if (chrome) {
		chrome.kill()
		chrome = null
	}
	if (profile) {
		const dir = profile
		profile = null
		// Chrome may still hold files for a moment
		setTimeout(() => fs.rm(dir, { recursive: true, force: true }, () => {}), 3000)
	}
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const status = () => fetch(`${CONTROL}/status`).then(r => r.json())

async function main() {
	// wait for the server
	for (let i = 0; ; i++) {
		try {
			await status()
			break
		} catch (e) {
			if (i > 50) throw new Error('bench-server did not start')
			await sleep(200)
		}
	}
	let s = await status()
	if (!s.next) {
		console.log('Nothing to do: all runs are finished.')
		return
	}
	startChrome()
	let lastFinished = s.finished
	let lastNext = s.next
	let since = Date.now()
	let restarts = 0
	while (true) {
		await sleep(5000)
		s = await status()
		if (!s.next) break
		if (s.finished !== lastFinished || s.next !== lastNext) {
			lastFinished = s.finished
			lastNext = s.next
			since = Date.now()
			restarts = 0
			if (!chrome) startChrome()
			continue
		}
		const mode = s.next.split(':')[0]
		if (Date.now() - since > LIMIT_MS[mode] || !chrome) {
			stopChrome()
			restarts += 1
			if (restarts > 3) {
				console.log(`runner: ${s.next} gave no result after 3 restarts, skipping it`)
				await fetch(`${CONTROL}/fail?id=${encodeURIComponent(s.next)}`)
				restarts = 0
			} else {
				console.log(`runner: no result for ${s.next}, restarting Chrome (${restarts}/3)`)
			}
			await sleep(2000)
			since = Date.now()
			startChrome()
		}
	}
	console.log(`Series finished: ${s.finished}/${s.total} runs, failed: ${s.failed.length ? s.failed.join(', ') : 'none'}`)
}

main()
	.catch(e => {
		console.error(e)
		process.exitCode = 1
	})
	.finally(() => {
		finishing = true
		stopChrome()
		server.kill()
		setTimeout(() => process.exit(), 3500)
	})
process.on('SIGINT', () => {
	stopChrome()
	server.kill()
	process.exit(130)
})
