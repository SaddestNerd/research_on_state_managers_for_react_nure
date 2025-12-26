import { reduxMetrics } from './metrics'
import { store } from '../store/store'

class PerformanceTester {
	constructor() {
		this.testResults = []
	}

	async simulateActions(count = 100) {
		console.log(`\n🧪 Начинаем тестирование: ${count} действий...`)

		for (let i = 0; i < count; i++) {
			store.dispatch({
				type: 'test/action',
				payload: { index: i, timestamp: Date.now() },
			})

			await new Promise(resolve => setTimeout(resolve, 10))
		}

		console.log(`✅ Тестирование завершено: ${count} действий выполнено`)
		return reduxMetrics.getReport()
	}

	async stressTest(count = 1000) {
		console.log(`\n⚡ Стресс-тест: ${count} быстрых действий...`)

		const startTime = performance.now()

		for (let i = 0; i < count; i++) {
			store.dispatch({
				type: 'stress/test',
				payload: { index: i },
			})
		}

		const totalTime = performance.now() - startTime

		console.log(`✅ Стресс-тест завершен за ${totalTime.toFixed(2)} мс`)
		console.log(
			`   Средняя скорость: ${(totalTime / count).toFixed(3)} мс на действие`
		)

		return {
			totalTime,
			averageTime: totalTime / count,
			actionsPerSecond: (count / totalTime) * 1000,
		}
	}

	async memoryTest() {
		console.log(`\n💾 Тест использования памяти...`)

		const before = reduxMetrics.measureMemory()
		console.log(
			`Память до: ${(before.usedJSHeapSize / 1024 / 1024).toFixed(2)} МБ`
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

		store.dispatch({
			type: 'test/setLargeData',
			payload: largeArray,
		})

		await new Promise(resolve => setTimeout(resolve, 100))

		const after = reduxMetrics.measureMemory()
		console.log(
			`Память после: ${(after.usedJSHeapSize / 1024 / 1024).toFixed(2)} МБ`
		)
		console.log(
			`Разница: ${(
				(after.usedJSHeapSize - before.usedJSHeapSize) /
				1024 /
				1024
			).toFixed(2)} МБ`
		)

		const stateSize = reduxMetrics.measureStateSize(store.getState())
		console.log(`Размер состояния: ${stateSize.sizeInKB.toFixed(2)} КБ`)

		return {
			memoryBefore: before.usedJSHeapSize,
			memoryAfter: after.usedJSHeapSize,
			memoryDiff: after.usedJSHeapSize - before.usedJSHeapSize,
			stateSize: stateSize.sizeInKB,
		}
	}

	async runFullTest() {
		console.log('\n═══════════════════════════════════════════════════════════')
		console.log('🔬 ЗАПУСК ПОЛНОГО ТЕСТА ПРОИЗВОДИТЕЛЬНОСТИ')
		console.log('═══════════════════════════════════════════════════════════\n')

		reduxMetrics.reset()

		await this.simulateActions(50)

		const stressResults = await this.stressTest(500)

		const memoryResults = await this.memoryTest()

		console.log('\n📊 ФИНАЛЬНЫЙ ОТЧЕТ:')
		const report = reduxMetrics.printReport()

		return {
			report,
			stressResults,
			memoryResults,
		}
	}

	exportResults(filename = 'redux-performance-results.json') {
		const report = reduxMetrics.getReport()
		const json = JSON.stringify(report, null, 2)

		console.log('\n📄 Экспорт результатов:')
		console.log('───────────────────────────────────────────────────────────')
		console.log(json)
		console.log('───────────────────────────────────────────────────────────')
		console.log(`\n💾 Сохраните это в файл: ${filename}`)

		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)

		console.log('✅ Файл скачан!')

		return json
	}

	compareWithBaseline(baselineReport) {
		const currentReport = reduxMetrics.getReport()

		console.log('\n🔄 СРАВНЕНИЕ С ЭТАЛОНОМ:')
		console.log('═══════════════════════════════════════════════════════════')

		const actionDiff = (
			((currentReport.actions.stats.avg - baselineReport.actions.stats.avg) /
				baselineReport.actions.stats.avg) *
			100
		).toFixed(2)
		console.log(`\n⚡ Действия (Actions):`)
		console.log(`   Эталон: ${baselineReport.actions.stats.avg.toFixed(3)} мс`)
		console.log(`   Текущий: ${currentReport.actions.stats.avg.toFixed(3)} мс`)
		console.log(`   Разница: ${actionDiff > 0 ? '+' : ''}${actionDiff}%`)

		console.log(`\n🔄 Ре-рендеры:`)
		console.log(`   Эталон: ${baselineReport.rerenders.totalRerenders}`)
		console.log(`   Текущий: ${currentReport.rerenders.totalRerenders}`)
		console.log(
			`   Разница: ${
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
			console.log(`\n💾 Память:`)
			console.log(
				`   Эталон: ${(
					baselineReport.memory.latest.usedJSHeapSize /
					1024 /
					1024
				).toFixed(2)} МБ`
			)
			console.log(
				`   Текущий: ${(
					currentReport.memory.latest.usedJSHeapSize /
					1024 /
					1024
				).toFixed(2)} МБ`
			)
			console.log(`   Разница: ${memoryDiff > 0 ? '+' : ''}${memoryDiff} МБ`)
		}

		console.log('═══════════════════════════════════════════════════════════\n')
	}
}

export const performanceTester = new PerformanceTester()

if (typeof window !== 'undefined') {
	window.performanceTester = performanceTester

	window.runPerformanceTest = () => performanceTester.runFullTest()
	window.exportPerformanceResults = () => performanceTester.exportResults()

	console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🧪 УТИЛИТЫ ТЕСТИРОВАНИЯ ПРОИЗВОДИТЕЛЬНОСТИ              ║
╚═══════════════════════════════════════════════════════════╝

Дополнительные команды для тестирования:

  🔹 window.runPerformanceTest()
     Запустить полный тест производительности
     (симуляция действий, стресс-тест, тест памяти)

  🔹 window.exportPerformanceResults()
     Экспортировать результаты в JSON файл
     (для анализа и сравнения с другими state manager'ами)

  🔹 window.performanceTester.simulateActions(100)
     Симулировать 100 действий

  🔹 window.performanceTester.stressTest(1000)
     Стресс-тест: 1000 быстрых действий

  🔹 window.performanceTester.memoryTest()
     Тест использования памяти

═══════════════════════════════════════════════════════════
  `)
}

export default PerformanceTester
