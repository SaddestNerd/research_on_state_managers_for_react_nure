import { reduxMetrics } from './metrics'
import { reportScheduler } from './reportScheduler'
import { performanceTester } from './testPerformance'

class PerformanceDemo {
	constructor() {
		this.isRunning = false
	}

	async runFullDemo() {
		if (this.isRunning) {
			console.warn('⚠️ Демонстрация уже запущена')
			return
		}

		this.isRunning = true

		console.clear()
		console.log('\n\n')
		console.log('╔═══════════════════════════════════════════════════════════╗')
		console.log('║                                                           ║')
		console.log('║     🎬 ДЕМОНСТРАЦИЯ СИСТЕМЫ ИЗМЕРЕНИЯ ПРОИЗВОДИТЕЛЬНОСТИ  ║')
		console.log('║                                                           ║')
		console.log('╚═══════════════════════════════════════════════════════════╝')
		console.log('\n')

		await this.step1_InitialState()

		await this.step2_SimulateActions()

		await this.step3_ShowReport()

		await this.step4_StressTest()

		await this.step5_MemoryTest()

		await this.step6_FinalReport()

		await this.step7_Export()

		this.isRunning = false

		console.log('\n')
		console.log('╔═══════════════════════════════════════════════════════════╗')
		console.log('║                                                           ║')
		console.log('║        ✅ ДЕМОНСТРАЦИЯ ЗАВЕРШЕНА!                         ║')
		console.log('║                                                           ║')
		console.log('╚═══════════════════════════════════════════════════════════╝')
		console.log('\n')
		console.log('💡 Теперь вы можете использовать команды самостоятельно:')
		console.log('   - window.getPerformanceReport()')
		console.log('   - window.runPerformanceTest()')
		console.log('   - window.exportPerformanceResults()')
		console.log('   - window.startPerformanceReports(30000)')
		console.log('\n')
	}

	async step1_InitialState() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 ШАГ 1: Начальное состояние системы')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')

		const report = reduxMetrics.getReport()

		console.log(
			`🚀 Время инициализации Redux Store: ${
				report.storeInitTime?.toFixed(3) || 'N/A'
			} мс`
		)
		console.log(
			`📦 Начальный размер состояния: ${
				report.stateSize.latest?.sizeInKB.toFixed(2) || 'N/A'
			} КБ`
		)
		console.log(
			`💾 Использование памяти: ${
				report.memory.latest
					? (report.memory.latest.usedJSHeapSize / 1024 / 1024).toFixed(2)
					: 'N/A'
			} МБ`
		)
		console.log(
			`📊 Количество измерений действий: ${report.actions.stats.count}`
		)

		console.log('\n✅ Система готова к работе!\n')

		await this.wait(2000)
	}

	async step2_SimulateActions() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 ШАГ 2: Симуляция действий (actions)')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')
		console.log('⏳ Выполняем 20 действий с задержкой...\n')

		await performanceTester.simulateActions(20)

		console.log('\n✅ Действия выполнены!\n')

		await this.wait(2000)
	}

	async step3_ShowReport() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 ШАГ 3: Промежуточный отчет')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')

		const report = reduxMetrics.getReport()

		console.log('📊 Статистика после 20 действий:')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Количество измерений: ${report.actions.stats.count}`)
		console.log(`   Среднее время: ${report.actions.stats.avg.toFixed(3)} мс`)
		console.log(
			`   Мин/Макс: ${report.actions.stats.min.toFixed(
				3
			)} / ${report.actions.stats.max.toFixed(3)} мс`
		)
		console.log(
			`   Общее количество ре-рендеров: ${report.rerenders.totalRerenders}`
		)

		console.log('\n')

		await this.wait(2000)
	}

	async step4_StressTest() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 ШАГ 4: Стресс-тест (1000 быстрых действий)')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')
		console.log('⚡ Запускаем стресс-тест...\n')

		const stressResults = await performanceTester.stressTest(1000)

		console.log('\n📊 Результаты стресс-теста:')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Общее время: ${stressResults.totalTime.toFixed(2)} мс`)
		console.log(
			`   Среднее время на действие: ${stressResults.averageTime.toFixed(3)} мс`
		)
		console.log(
			`   Действий в секунду: ${stressResults.actionsPerSecond.toFixed(0)}`
		)

		console.log('\n')

		await this.wait(2000)
	}

	async step5_MemoryTest() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 ШАГ 5: Тест использования памяти')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')
		console.log('💾 Проверяем использование памяти...\n')

		const memoryResults = await performanceTester.memoryTest()

		console.log('\n📊 Результаты теста памяти:')
		console.log('───────────────────────────────────────────────────────────')
		console.log(
			`   Память до: ${(memoryResults.memoryBefore / 1024 / 1024).toFixed(
				2
			)} МБ`
		)
		console.log(
			`   Память после: ${(memoryResults.memoryAfter / 1024 / 1024).toFixed(
				2
			)} МБ`
		)
		console.log(
			`   Разница: ${(memoryResults.memoryDiff / 1024 / 1024).toFixed(2)} МБ`
		)
		console.log(`   Размер состояния: ${memoryResults.stateSize.toFixed(2)} КБ`)

		console.log('\n')

		await this.wait(2000)
	}

	async step6_FinalReport() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 ШАГ 6: Финальный отчет по всем метрикам')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')

		reduxMetrics.printReport()

		await this.wait(3000)
	}

	async step7_Export() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 ШАГ 7: Экспорт результатов')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')
		console.log('📄 JSON данные для дипломной работы:')
		console.log('───────────────────────────────────────────────────────────')

		const json = reduxMetrics.exportToJSON()
		const preview = JSON.parse(json)

		console.log('\nОсновные метрики:')
		console.log(`  - State Manager: ${preview.stateManager}`)
		console.log(
			`  - Время инициализации: ${preview.storeInitTime.toFixed(3)} мс`
		)
		console.log(
			`  - Среднее время action: ${preview.actions.stats.avg.toFixed(3)} мс`
		)
		console.log(`  - Всего ре-рендеров: ${preview.rerenders.totalRerenders}`)
		console.log(
			`  - Память: ${
				preview.memory.latest
					? (preview.memory.latest.usedJSHeapSize / 1024 / 1024).toFixed(2)
					: 'N/A'
			} МБ`
		)

		console.log(
			'\n💡 Используйте window.exportPerformanceResults() для скачивания JSON файла'
		)

		console.log('\n')

		await this.wait(2000)
	}

	wait(ms) {
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	async quickDemo() {
		console.clear()
		console.log('\n🎬 БЫСТРАЯ ДЕМОНСТРАЦИЯ\n')

		console.log('1️⃣ Текущий отчет:')
		reduxMetrics.printReport()

		console.log('\n2️⃣ Запуск теста производительности:')
		await performanceTester.runFullTest()

		console.log('\n✅ Быстрая демонстрация завершена!')
	}
}

export const performanceDemo = new PerformanceDemo()

if (typeof window !== 'undefined') {
	window.performanceDemo = performanceDemo
	window.runFullDemo = () => performanceDemo.runFullDemo()
	window.runQuickDemo = () => performanceDemo.quickDemo()

	console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🎬 ДЕМОНСТРАЦИЯ ДОСТУПНА!                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

  🎥 Полная демонстрация (с задержками):
     window.runFullDemo()
     
  ⚡ Быстрая демонстрация (без задержек):
     window.runQuickDemo()

Демонстрация покажет работу всех утилит:
  ✅ Измерение времени инициализации
  ✅ Симуляция действий
  ✅ Стресс-тест
  ✅ Тест памяти
  ✅ Генерация отчетов
  ✅ Экспорт данных

═══════════════════════════════════════════════════════════
  `)
}

export default PerformanceDemo
