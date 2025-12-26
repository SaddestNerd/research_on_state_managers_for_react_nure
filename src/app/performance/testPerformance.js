import { metrics } from './metrics'

class PerformanceTester {
	constructor() {
		this.testResults = []
	}

	async simulateActions(count = 100) {
		console.log(`\n🧪 Починаємо тестування: ${count} дій...`)

		for (let i = 0; i < count; i++) {
			const measureData = metrics.startActionMeasure(`test/action_${i}`)
			metrics.endActionMeasure(measureData)

			await new Promise(resolve => setTimeout(resolve, 10))
		}

		console.log(`✅ Тестування завершено: виконано ${count} дій`)
		return metrics.getReport()
	}

	async stressTest(count = 1000) {
		console.log(`\n⚡ Стрес-тест: ${count} швидких дій...`)

		const startTime = performance.now()

		for (let i = 0; i < count; i++) {
			const measureData = metrics.startActionMeasure(`stress/test_${i}`)
			metrics.endActionMeasure(measureData)
		}

		const totalTime = performance.now() - startTime

		console.log(`✅ Стрес-тест завершено за ${totalTime.toFixed(2)} мс`)
		console.log(
			`   Середня швидкість: ${(totalTime / count).toFixed(3)} мс на дію`
		)

		return {
			totalTime,
			averageTime: totalTime / count,
			actionsPerSecond: (count / totalTime) * 1000,
		}
	}

	async memoryTest() {
		console.log(`\n💾 Тест використання пам'яті...`)

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

		const mockState = {
			auth: { userData: null },
			products: { products: largeArray },
		}

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

		const stateSize = metrics.measureStateSize(mockState)
		console.log(`Розмір стану: ${stateSize.sizeInKB.toFixed(2)} КБ`)

		return {
			memoryBefore: before.usedJSHeapSize,
			memoryAfter: after.usedJSHeapSize,
			memoryDiff: after.usedJSHeapSize - before.usedJSHeapSize,
			stateSize: stateSize.sizeInKB,
		}
	}

	async runFullTest() {
		console.log('\n═══════════════════════════════════════════════════════════')
		console.log('🔬 ЗАПУСК ПОВНОГО ТЕСТУ ПРОДУКТИВНОСТІ')
		console.log('═══════════════════════════════════════════════════════════\n')

		metrics.reset()

		await this.simulateActions(50)

		const stressResults = await this.stressTest(500)

		const memoryResults = await this.memoryTest()

		console.log('\n📊 ФІНАЛЬНИЙ ЗВІТ:')
		const report = metrics.printReport()

		return {
			report,
			stressResults,
			memoryResults,
		}
	}

	async selectorBenchmark(count = 1000) {
		console.log(`\n🎯 Бенчмарк селекторів: ${count} циклів...`)
		const mockState = {
			auth: { userData: null },
			products: { products: [] },
		}
		const start = performance.now()
		for (let i = 0; i < count; i++) {
			metrics.measureSelector('benchmark.selectAuth', s => s.auth, mockState)
			metrics.measureSelector(
				'benchmark.selectProducts',
				s => s.products,
				mockState
			)
		}
		const total = performance.now() - start
		console.log(`✅ Бенчмарк завершено за ${total.toFixed(2)} мс`)
		return metrics.getReport()
	}

	exportResults(filename = 'context-performance-results.json') {
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

	console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🧪 УТИЛІТИ ТЕСТУВАННЯ ПРОДУКТИВНОСТІ                    ║
╚═══════════════════════════════════════════════════════════╝

Додаткові команди для тестування:

  🔹 window.runPerformanceTest()
     Запустити повний тест продуктивності
     (імітація дій, стрес-тест, тест пам'яті)

  🔹 window.exportPerformanceResults()
     Експортувати результати у JSON файл
     (для аналізу та порівняння з іншими state manager'ами)

  🔹 window.performanceTester.simulateActions(100)
     Імітувати 100 дій

  🔹 window.performanceTester.stressTest(1000)
     Стрес-тест: 1000 швидких дій

  🔹 window.performanceTester.memoryTest()
     Тест використання пам'яті

  🔹 window.selectorBenchmark(2000)
     Бенчмарк селекторів (виконати багаторазові виклики без dispatch)

═══════════════════════════════════════════════════════════
  `)
}

export default PerformanceTester
