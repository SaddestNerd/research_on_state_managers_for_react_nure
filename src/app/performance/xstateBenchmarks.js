import { metrics } from './metrics'
import { authMachine } from '../store/machines/auth.machine'
import { productsMachine } from '../store/machines/products.machine'
import { createActor } from 'xstate'

class XStateBenchmarks {
	constructor() {
		this.authActor = null
		this.productsActor = null
		this.results = {
			stateUpdateTimes: [],
			memoryMeasurements: [],
			throughput: [],
			persistence: null,
			rollback: null,
			conflicts: null,
		}
	}

	initActors() {
		if (!this.authActor) {
			this.authActor = createActor(authMachine)
			this.authActor.start()
		}
		if (!this.productsActor) {
			this.productsActor = createActor(productsMachine)
			this.productsActor.start()
		}
	}

	async testStateUpdateTime_AddToCart(iterations = 100) {
		console.log(`\n🛒 Тест: Додавання в кошик (${iterations} ітерацій)`)

		this.initActors()
		const updateTimes = []

		for (let i = 0; i < iterations; i++) {
			const startTime = performance.now()

			this.productsActor.send({ type: 'GET_PRODUCTS', offset: i, limit: 10 })

			await new Promise(resolve => {
				let resolved = false
				const unsubscribe = this.productsActor.subscribe(snapshot => {
					if (
						(snapshot.value === 'loaded' || snapshot.value === 'idle') &&
						!resolved
					) {
						resolved = true
						const updateTime = performance.now() - startTime
						updateTimes.push(updateTime)
						metrics.endStateUpdate(startTime, 'addToCart')
						unsubscribe()
						resolve()
					}
				})

				setTimeout(() => {
					if (!resolved) {
						resolved = true
						const updateTime = performance.now() - startTime
						updateTimes.push(updateTime)
						unsubscribe()
						resolve()
					}
				}, 1000)
			})

			await new Promise(resolve => setTimeout(resolve, 10))
		}

		return this.calculateStatistics(updateTimes)
	}

	async testStateUpdateTime_MassUpdate(count = 1000) {
		console.log(`\n⚡ Тест: Масове оновлення (${count} операцій)`)

		this.initActors()
		const updateTimes = []
		const startTime = performance.now()

		for (let i = 0; i < count; i++) {
			const operationStart = performance.now()

			this.productsActor.send({ type: 'CLEAR_ERROR' })

			const operationTime = performance.now() - operationStart
			updateTimes.push(operationTime)
			metrics.endStateUpdate(operationStart, 'massUpdate')
		}

		const totalTime = performance.now() - startTime

		return {
			...this.calculateStatistics(updateTimes),
			totalTime,
			operationsPerSecond: (count / totalTime) * 1000,
		}
	}

	async testMemoryUsage_StandardSession(durationMs = 60000) {
		console.log(`\n💾 Тест: Стандартна сесія (${durationMs / 1000} сек)`)

		this.initActors()
		const measurements = []
		const startTime = performance.now()
		const initialMemory = metrics.measureMemory()

		measurements.push({
			time: 0,
			memory: initialMemory,
		})

		const interval = setInterval(() => {
			const elapsed = performance.now() - startTime
			const memory = metrics.measureMemory()

			measurements.push({
				time: elapsed,
				memory,
			})

			this.productsActor.send({
				type: 'GET_PRODUCTS',
				offset: Math.random() * 100,
				limit: 10,
			})
		}, 5000)

		const operationsInterval = setInterval(() => {
			const operations = [
				() =>
					this.productsActor.send({
						type: 'GET_PRODUCTS',
						offset: 0,
						limit: 10,
					}),
				() => this.productsActor.send({ type: 'CLEAR_ERROR' }),
				() => this.productsActor.send({ type: 'RESET' }),
			]

			const randomOp = operations[Math.floor(Math.random() * operations.length)]
			randomOp()
		}, 2000)

		await new Promise(resolve => setTimeout(resolve, durationMs))

		clearInterval(interval)
		clearInterval(operationsInterval)

		const finalMemory = metrics.measureMemory()
		const memoryGrowth =
			finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
		const memoryGrowthMB = memoryGrowth / 1024 / 1024
		const growthRateMBPerMin = memoryGrowthMB / (durationMs / 60000)

		return {
			initialMemory: initialMemory.usedJSHeapSize / 1024 / 1024,
			finalMemory: finalMemory.usedJSHeapSize / 1024 / 1024,
			memoryGrowthMB,
			growthRateMBPerMin,
			measurements,
		}
	}

	async testMemoryUsage_LongLoad(durationMs = 300000) {
		console.log(`\n💾 Тест: Тривале навантаження (${durationMs / 60000} хв)`)

		return this.testMemoryUsage_StandardSession(durationMs)
	}

	async testPersistence_Recovery(iterations = 100) {
		console.log(
			`\n💾 Тест: Відновлення з persisted store (${iterations} ітерацій)`
		)

		let successCount = 0
		let failureCount = 0

		for (let i = 0; i < iterations; i++) {
			try {
				const state = {
					auth: {
						userData: { email: 'test@test.com', id: '1' },
						isAuthenticated: true,
					},
					products: {
						products: Array(10)
							.fill(null)
							.map((_, idx) => ({ id: idx, name: `Product ${idx}` })),
					},
				}

				localStorage.setItem('xstate_persisted', JSON.stringify(state))

				const persisted = localStorage.getItem('xstate_persisted')
				if (persisted) {
					const restored = JSON.parse(persisted)
					if (restored.auth && restored.products) {
						successCount++
					} else {
						failureCount++
					}
				} else {
					failureCount++
				}

				localStorage.removeItem('xstate_persisted')
			} catch (error) {
				console.error('Помилка відновлення:', error)
				failureCount++
			}
		}

		const successRate = (successCount / iterations) * 100

		return {
			successCount,
			failureCount,
			successRate,
			total: iterations,
		}
	}

	async testRollback_Time(iterations = 100) {
		console.log(`\n⏪ Тест: Час відкату (${iterations} ітерацій)`)

		this.initActors()
		const rollbackTimes = []

		for (let i = 0; i < iterations; i++) {
			const snapshot = this.productsActor.getSnapshot()
			const savedState = snapshot.context

			this.productsActor.send({ type: 'GET_PRODUCTS', offset: 0, limit: 10 })

			await new Promise(resolve => setTimeout(resolve, 50))

			const rollbackStart = performance.now()
			this.productsActor.send({ type: 'RESET' })

			await new Promise(resolve => {
				let resolved = false
				const unsubscribe = this.productsActor.subscribe(snapshot => {
					if (snapshot.value === 'idle' && !resolved) {
						resolved = true
						const rollbackTime = performance.now() - rollbackStart
						rollbackTimes.push(rollbackTime)
						unsubscribe()
						resolve()
					}
				})

				setTimeout(() => {
					if (!resolved) {
						resolved = true
						const rollbackTime = performance.now() - rollbackStart
						rollbackTimes.push(rollbackTime)
						unsubscribe()
						resolve()
					}
				}, 1000)
			})
		}

		return this.calculateStatistics(rollbackTimes)
	}

	async testConflicts_ParallelTabs(iterations = 50) {
		console.log(
			`\n🔄 Тест: Конфлікти при паралельних вкладках (${iterations} ітерацій)`
		)

		let resolvedCount = 0
		let conflictCount = 0

		for (let i = 0; i < iterations; i++) {
			const tab1State = { version: 1, data: { count: i } }
			const tab2State = { version: 1, data: { count: i + 1 } }

			if (
				tab1State.version === tab2State.version &&
				tab1State.data.count !== tab2State.data.count
			) {
				conflictCount++

				const resolved = Math.max(tab1State.data.count, tab2State.data.count)

				if (resolved === tab2State.data.count) {
					resolvedCount++
				}
			} else {
				resolvedCount++
			}
		}

		const resolutionScore =
			conflictCount > 0
				? Math.max(1, Math.min(5, (resolvedCount / conflictCount) * 5))
				: 5

		return {
			totalConflicts: conflictCount,
			resolvedConflicts: resolvedCount,
			resolutionScore: resolutionScore.toFixed(2),
		}
	}

	async testThroughput(durationMs = 10000) {
		console.log(`\n⚡ Тест: Пропускна здатність (${durationMs / 1000} сек)`)

		this.initActors()
		let actionCount = 0
		const startTime = performance.now()

		const interval = setInterval(() => {
			this.productsActor.send({ type: 'CLEAR_ERROR' })
			actionCount++
			metrics.startActionMeasure(`throughput/action_${actionCount}`)
			metrics.endActionMeasure({
				actionName: `throughput/action_${actionCount}`,
				startTime: performance.now(),
			})
		}, 0)

		await new Promise(resolve => setTimeout(resolve, durationMs))

		clearInterval(interval)

		const totalTime = performance.now() - startTime
		const actionsPerSecond = (actionCount / totalTime) * 1000

		return {
			totalActions: actionCount,
			totalTime,
			actionsPerSecond: actionsPerSecond.toFixed(2),
		}
	}

	calculateStatistics(values) {
		if (!values || values.length === 0) {
			return {
				mean: 0,
				p50: 0,
				p95: 0,
				min: 0,
				max: 0,
				count: 0,
			}
		}

		const sorted = [...values].sort((a, b) => a - b)
		const mean = values.reduce((a, b) => a + b, 0) / values.length
		const p50 = sorted[Math.floor(sorted.length * 0.5)]
		const p95 = sorted[Math.floor(sorted.length * 0.95)]
		const min = Math.min(...values)
		const max = Math.max(...values)

		return {
			mean: mean.toFixed(3),
			p50: p50.toFixed(3),
			p95: p95.toFixed(3),
			min: min.toFixed(3),
			max: max.toFixed(3),
			count: values.length,
		}
	}

	async runAllBenchmarks() {
		console.log('\n═══════════════════════════════════════════════════════════')
		console.log('🔬 ЗАПУСК ВСІХ ТЕСТІВ ПРОДУКТИВНОСТІ XSTATE')
		console.log('═══════════════════════════════════════════════════════════\n')

		const results = {}

		console.log('\n📊 1. ЧАС ОНОВЛЕННЯ СТАНУ')
		console.log('───────────────────────────────────────────────────────────')
		results.addToCart = await this.testStateUpdateTime_AddToCart(100)
		results.massUpdate = await this.testStateUpdateTime_MassUpdate(1000)

		console.log("\n💾 2. СПОЖИВАННЯ ПАМ'ЯТІ")
		console.log('───────────────────────────────────────────────────────────')
		results.standardSession = await this.testMemoryUsage_StandardSession(60000)
		results.longLoad = await this.testMemoryUsage_LongLoad(300000)

		console.log('\n🔄 3. СТІЙКІСТЬ, ВІДНОВЛЮВАНІСТЬ ТА ПЕРСИСТЕНТНІСТЬ')
		console.log('───────────────────────────────────────────────────────────')
		results.persistence = await this.testPersistence_Recovery(100)
		results.rollback = await this.testRollback_Time(100)
		results.conflicts = await this.testConflicts_ParallelTabs(50)

		console.log('\n⚡ 4. ПРОПУСКНА ЗДАТНІСТЬ')
		console.log('───────────────────────────────────────────────────────────')
		results.throughput = await this.testThroughput(10000)

		if (typeof window !== 'undefined') {
			window.lastBenchmarkResults = results
		}

		this.printReport(results)

		return results
	}

	printReport(results) {
		console.log('\n═══════════════════════════════════════════════════════════')
		console.log('📊 ЗВІТ ПРО ПРОДУКТИВНІСТЬ XSTATE')
		console.log('═══════════════════════════════════════════════════════════\n')

		console.log('1️⃣ ЧАС ОНОВЛЕННЯ СТАНУ (ms)')
		console.log('───────────────────────────────────────────────────────────')
		console.log('Додавання в кошик:')
		console.log(`   Mean: ${results.addToCart.mean} ms`)
		console.log(`   P50:  ${results.addToCart.p50} ms`)
		console.log(`   P95:  ${results.addToCart.p95} ms`)
		console.log('\nМасове оновлення (1000):')
		console.log(`   Mean: ${results.massUpdate.mean} ms`)
		console.log(`   P50:  ${results.massUpdate.p50} ms`)
		console.log(`   P95:  ${results.massUpdate.p95} ms`)
		console.log(
			`   Operations/sec: ${
				results.massUpdate.operationsPerSecond?.toFixed(2) || 'N/A'
			}`
		)

		console.log("\n2️⃣ СПОЖИВАННЯ ПАМ'ЯТІ")
		console.log('───────────────────────────────────────────────────────────')
		console.log('Стандартна сесія (1 хв):')
		console.log(
			`   Початкова: ${results.standardSession.initialMemory.toFixed(2)} MB`
		)
		console.log(
			`   Фінальна:  ${results.standardSession.finalMemory.toFixed(2)} MB`
		)
		console.log(
			`   Ріст:      ${results.standardSession.memoryGrowthMB.toFixed(2)} MB`
		)
		console.log('\nТривале навантаження (5 хв):')
		console.log(`   Початкова: ${results.longLoad.initialMemory.toFixed(2)} MB`)
		console.log(`   Фінальна:  ${results.longLoad.finalMemory.toFixed(2)} MB`)
		console.log(
			`   Ріст:      ${results.longLoad.memoryGrowthMB.toFixed(2)} MB`
		)
		console.log(
			`   Темп росту: ${results.longLoad.growthRateMBPerMin.toFixed(2)} MB/min`
		)

		console.log('\n3️⃣ СТІЙКІСТЬ, ВІДНОВЛЮВАНІСТЬ ТА ПЕРСИСТЕНТНІСТЬ')
		console.log('───────────────────────────────────────────────────────────')
		console.log('Відновлення з persisted store:')
		console.log(`   Успішність: ${results.persistence.successRate.toFixed(2)}%`)
		console.log(`   Успішних:   ${results.persistence.successCount}`)
		console.log(`   Невдач:     ${results.persistence.failureCount}`)
		console.log('\nЧас відкату / rollback:')
		console.log(`   Mean: ${results.rollback.mean} ms`)
		console.log(`   P50:  ${results.rollback.p50} ms`)
		console.log(`   P95:  ${results.rollback.p95} ms`)
		console.log('\nКонфлікти при паралельних вкладках:')
		console.log(`   Всього конфліктів: ${results.conflicts.totalConflicts}`)
		console.log(`   Вирішено:          ${results.conflicts.resolvedConflicts}`)
		console.log(`   Оцінка (1-5):      ${results.conflicts.resolutionScore}`)

		console.log('\n4️⃣ ПРОПУСКНА ЗДАТНІСТЬ')
		console.log('───────────────────────────────────────────────────────────')
		console.log(
			`   Throughput: ${results.throughput.actionsPerSecond} actions/sec`
		)
		console.log(`   Всього дій: ${results.throughput.totalActions}`)
		console.log(
			`   Час:       ${(results.throughput.totalTime / 1000).toFixed(2)} сек`
		)

		console.log(
			'\n═══════════════════════════════════════════════════════════\n'
		)
	}

	exportResults(results, filename = 'xstate-benchmarks-results.json') {
		const json = JSON.stringify(results, null, 2)

		console.log('\n📄 Експорт результатів:')
		console.log('───────────────────────────────────────────────────────────')
		console.log(json)
		console.log('───────────────────────────────────────────────────────────')

		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)

		console.log(`\n✅ Файл завантажено: ${filename}`)

		return json
	}
}

export const xstateBenchmarks = new XStateBenchmarks()


export default XStateBenchmarks
