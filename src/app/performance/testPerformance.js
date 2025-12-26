import { metrics } from './metrics'
import { authMachine } from '../store/machines/auth.machine'
import { productsMachine } from '../store/machines/products.machine'
import { createActor } from 'xstate'
import { xstateBenchmarks } from './xstateBenchmarks'

class PerformanceTester {
	constructor() {
		this.testResults = []

		this.authActor = null
		this.productsActor = null
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

	async simulateActions(count = 100) {
		console.log(`\n🧪 Починаємо тестування: ${count} подій xState...`)

		this.initActors()

		for (let i = 0; i < count; i++) {
			const measureData = metrics.startActionMeasure(`xstate/event_${i}`)

			const eventType = i % 3 === 0 ? 'GET_PRODUCTS' : 'CLEAR_ERROR'
			this.productsActor.send({ type: eventType, offset: 0, limit: 10 })

			metrics.endActionMeasure(measureData)

			await new Promise(resolve => setTimeout(resolve, 10))
		}

		console.log(`✅ Тестування завершено: виконано ${count} подій xState`)
		return metrics.getReport()
	}

	async stressTest(count = 1000) {
		console.log(`\n⚡ Стрес-тест: ${count} швидких подій xState...`)

		this.initActors()
		const startTime = performance.now()

		for (let i = 0; i < count; i++) {
			const measureData = metrics.startActionMeasure(`stress/xstate_${i}`)

			this.productsActor.send({ type: 'CLEAR_ERROR' })
			metrics.endActionMeasure(measureData)
		}

		const totalTime = performance.now() - startTime

		console.log(`✅ Стрес-тест завершено за ${totalTime.toFixed(2)} мс`)
		console.log(
			`   Середня швидкість: ${(totalTime / count).toFixed(3)} мс на подію`
		)

		return {
			totalTime,
			averageTime: totalTime / count,
			actionsPerSecond: (count / totalTime) * 1000,
		}
	}

	async memoryTest() {
		console.log(`\n💾 Тест використання пам'яті xState...`)

		this.initActors()
		const before = metrics.measureMemory()
		console.log(
			`Пам'ять до: ${(before.usedJSHeapSize / 1024 / 1024).toFixed(2)} МБ`
		)

		const largeArray = Array(10000)
			.fill(null)
			.map((_, i) => ({
				id: i,
				name: `Item ${i}`,
				description: `Description for item ${i}`,
				metadata: {
					created: Date.now(),
					updated: Date.now(),
				},
			}))

		const mockXStateContext = {
			auth: {
				userData: null,
				error: null,
				loading: false,
				success: false,
			},
			products: {
				products: largeArray,
				currentProduct: null,
				pagination: {
					offset: 0,
					limit: 10,
					total: largeArray.length,
					currentPage: 1,
				},
				error: null,
				loading: false,
			},
		}

		this.productsActor.send({
			type: 'GET_PRODUCTS',
			offset: 0,
			limit: largeArray.length,
		})

		await new Promise(resolve => setTimeout(resolve, 100))

		const after = metrics.measureMemory()
		console.log(
			`Пам'ять після: ${(after.usedJSHeapSize / 1024 / 1024).toFixed(2)} МБ`
		)
		console.log(
			`Різниця: ${(
				(after.usedJSHeapSize - before.usedJSHeapSize) /
				1024 /
				1024
			).toFixed(2)} МБ`
		)

		const stateSize = metrics.measureStateSize(mockXStateContext)
		console.log(`Розмір стану xState: ${stateSize.sizeInKB.toFixed(2)} КБ`)

		return {
			memoryBefore: before.usedJSHeapSize,
			memoryAfter: after.usedJSHeapSize,
			memoryDiff: after.usedJSHeapSize - before.usedJSHeapSize,
			stateSize: stateSize.sizeInKB,
		}
	}

	async runFullTest() {
		console.log('\n═══════════════════════════════════════════════════════════')
		console.log('🔬 ЗАПУСК ПОВНОГО ТЕСТУ ПРОДУКТИВНОСТІ XSTATE')
		console.log('═══════════════════════════════════════════════════════════\n')

		metrics.reset()

		await this.simulateActions(50)

		const stressResults = await this.stressTest(500)

		const memoryResults = await this.memoryTest()

		const transitionResults = await this.stateTransitionTest(50)

		console.log('\n📊 ФІНАЛЬНИЙ ЗВІТ:')
		const report = metrics.printReport()

		return {
			report,
			stressResults,
			memoryResults,
			transitionResults,
		}
	}

	async selectorBenchmark(count = 1000) {
		console.log(`\n🎯 Бенчмарк селекторів xState: ${count} циклів...`)

		this.initActors()
		const mockXStateContext = {
			auth: {
				userData: null,
				error: null,
				loading: false,
				success: false,
			},
			products: {
				products: [],
				currentProduct: null,
				pagination: { offset: 0, limit: 10, total: 0, currentPage: 1 },
				error: null,
				loading: false,
			},
		}

		const start = performance.now()
		for (let i = 0; i < count; i++) {
			metrics.measureSelector(
				'benchmark.selectAuth',
				s => s.auth,
				mockXStateContext
			)
			metrics.measureSelector(
				'benchmark.selectProducts',
				s => s.products,
				mockXStateContext
			)
		}
		const total = performance.now() - start
		console.log(`✅ Бенчмарк завершено за ${total.toFixed(2)} мс`)
		return metrics.getReport()
	}

	async stateTransitionTest(count = 100) {
		console.log(`\n🔄 Тест переходів станів xState: ${count} переходів...`)

		this.initActors()
		const transitions = []

		for (let i = 0; i < count; i++) {
			const startTime = performance.now()

			if (i % 3 === 0) {
				this.productsActor.send({ type: 'GET_PRODUCTS', offset: 0, limit: 10 })
			} else if (i % 3 === 1) {
				this.productsActor.send({ type: 'CLEAR_ERROR' })
			} else {
				this.productsActor.send({ type: 'RESET' })
			}

			const transitionTime = performance.now() - startTime
			transitions.push(transitionTime)

			await new Promise(resolve => setTimeout(resolve, 5))
		}

		const avgTransitionTime =
			transitions.reduce((a, b) => a + b, 0) / transitions.length
		const minTransitionTime = Math.min(...transitions)
		const maxTransitionTime = Math.max(...transitions)

		console.log(`✅ Тест переходів завершено:`)
		console.log(`   Середній час переходу: ${avgTransitionTime.toFixed(3)} мс`)
		console.log(
			`   Мін/Макс: ${minTransitionTime.toFixed(
				3
			)} / ${maxTransitionTime.toFixed(3)} мс`
		)

		return {
			avgTransitionTime,
			minTransitionTime,
			maxTransitionTime,
			transitions,
		}
	}

	exportResults(filename = 'xstate-performance-results.json') {
		const report = metrics.getReport()
		const json = JSON.stringify(report, null, 2)

		console.log('\n📄 Експорт результатів:')
		console.log('───────────────────────────────────────────────────────────')
		console.log(json)
		console.log('───────────────────────────────────────────────────────────')
		console.log(`\n💾 Збережіть це у файл: ${filename}`)

		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)

		console.log('✅ Файл завантажено!')

		return json
	}

	compareWithBaseline(baselineReport) {
		const currentReport = metrics.getReport()

		console.log('\n🔄 ПОРІВНЯННЯ З ЕТАЛОНОМ:')
		console.log('═══════════════════════════════════════════════════════════')

		const actionDiff = (
			((currentReport.actions.stats.avg - baselineReport.actions.stats.avg) /
				baselineReport.actions.stats.avg) *
			100
		).toFixed(2)
		console.log(`\n⚡ Дії (Actions):`)
		console.log(`   Еталон: ${baselineReport.actions.stats.avg.toFixed(3)} мс`)
		console.log(`   Поточний: ${currentReport.actions.stats.avg.toFixed(3)} мс`)
		console.log(`   Різниця: ${actionDiff > 0 ? '+' : ''}${actionDiff}%`)

		console.log(`\n🔄 Ре-рендери:`)
		console.log(`   Еталон: ${baselineReport.rerenders.totalRerenders}`)
		console.log(`   Поточний: ${currentReport.rerenders.totalRerenders}`)
		console.log(
			`   Різниця: ${
				currentReport.rerenders.totalRerenders -
				baselineReport.rerenders.totalRerenders
			}`
		)

		if (currentReport.memory.latest && baselineReport.memory.latest) {
			const memoryDiff = (
				(currentReport.memory.latest.usedJSHeapSize -
					baselineReport.memory.latest.usedJSHeapSize) /
				1024 /
				1024
			).toFixed(2)
			console.log(`\n💾 Пам'ять:`)
			console.log(
				`   Еталон: ${(
					baselineReport.memory.latest.usedJSHeapSize /
					1024 /
					1024
				).toFixed(2)} МБ`
			)
			console.log(
				`   Поточний: ${(
					currentReport.memory.latest.usedJSHeapSize /
					1024 /
					1024
				).toFixed(2)} МБ`
			)
			console.log(`   Різниця: ${memoryDiff > 0 ? '+' : ''}${memoryDiff} МБ`)
		}

		console.log('═══════════════════════════════════════════════════════════\n')
	}
}

export const performanceTester = new PerformanceTester()

if (typeof window !== 'undefined') {
	window.performanceTester = performanceTester

	window.runPerformanceTest = () => performanceTester.runFullTest()
	window.exportPerformanceResults = () => performanceTester.exportResults()
	window.selectorBenchmark = count => performanceTester.selectorBenchmark(count)
	window.stateTransitionTest = count =>
		performanceTester.stateTransitionTest(count)

	console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🧪 УТИЛІТИ ТЕСТУВАННЯ ПРОДУКТИВНОСТІ XSTATE             ║
╚═══════════════════════════════════════════════════════════╝

Додаткові команди для тестування:

  🔹 window.runPerformanceTest()
     Запустити повний тест продуктивності xState
     (імітація подій, стрес-тест, тест пам'яті, переходи станів)

  🔹 window.exportPerformanceResults()
     Експортувати результати у JSON файл
     (для аналізу та порівняння з іншими state manager'ами)

  🔹 window.performanceTester.simulateActions(100)
     Імітувати 100 подій xState

  🔹 window.performanceTester.stressTest(1000)
     Стрес-тест: 1000 швидких подій xState

  🔹 window.performanceTester.memoryTest()
     Тест використання пам'яті xState

  🔹 window.selectorBenchmark(2000)
     Бенчмарк селекторів xState

  🔹 window.stateTransitionTest(100)
     Тест переходів станів xState машини

═══════════════════════════════════════════════════════════
  `)
}

export default PerformanceTester
