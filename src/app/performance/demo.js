import { metrics } from './metrics'
import { reportScheduler } from './reportScheduler'
import { performanceTester } from './testPerformance'
import { xstateBenchmarks } from './xstateBenchmarks'

class PerformanceDemo {
	constructor() {
		this.isRunning = false
	}

	async runFullDemo() {
		if (this.isRunning) {
			console.warn('⚠️ Демонстрацію вже запущено')
			return
		}

		this.isRunning = true

		console.clear()
		console.log('\n\n')
		console.log('╔═══════════════════════════════════════════════════════════╗')
		console.log('║                                                           ║')
		console.log(
			'║     🎬 ДЕМОНСТРАЦІЯ СИСТЕМИ ВИМІРЮВАННЯ ПРОДУКТИВНОСТІ     ║'
		)
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
		console.log('║        ✅ ДЕМОНСТРАЦІЮ ЗАВЕРШЕНО!                         ║')
		console.log('║                                                           ║')
		console.log('╚═══════════════════════════════════════════════════════════╝')
		console.log('\n')
		console.log('💡 Тепер ви можете використовувати команди самостійно:')
		console.log('   - window.getPerformanceReport()')
		console.log('   - window.runPerformanceTest()')
		console.log('   - window.exportPerformanceResults()')
		console.log('   - window.startPerformanceReports(30000)')
		console.log('\n')
	}

	async step1_InitialState() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 КРОК 1: Початковий стан системи')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')

		const report = metrics.getReport()

		console.log(
			`🚀 Час ініціалізації xState: ${
				report.storeInitTime?.toFixed(3) || 'N/A'
			} мс`
		)
		console.log(
			`📦 Початковий розмір стану: ${
				report.stateSize.latest?.sizeInKB.toFixed(2) || 'N/A'
			} КБ`
		)
		console.log(
			`💾 Використання пам'яті: ${
				report.memory.latest
					? (report.memory.latest.usedJSHeapSize / 1024 / 1024).toFixed(2)
					: 'N/A'
			} МБ`
		)
		console.log(`📊 Кількість вимірювань подій: ${report.actions.stats.count}`)

		console.log('\n✅ Система готова до роботи!\n')

		await this.wait(2000)
	}

	async step2_SimulateActions() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 КРОК 2: Імітація дій (actions)')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')
		console.log('⏳ Виконуємо 20 дій із затримкою...\n')

		await performanceTester.simulateActions(20)

		console.log('\n✅ Дії виконано!\n')

		await this.wait(2000)
	}

	async step3_ShowReport() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 КРОК 3: Проміжний звіт')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')

		const report = metrics.getReport()

		console.log('📊 Статистика після 20 подій xState:')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Кількість вимірювань: ${report.actions.stats.count}`)
		console.log(`   Середній час: ${report.actions.stats.avg.toFixed(3)} мс`)
		console.log(
			`   Мін/Макс: ${report.actions.stats.min.toFixed(
				3
			)} / ${report.actions.stats.max.toFixed(3)} мс`
		)
		console.log(
			`   Загальна кількість ре-рендерів: ${report.rerenders.totalRerenders}`
		)

		console.log('\n')

		await this.wait(2000)
	}

	async step4_StressTest() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 КРОК 4: Стрес-тест (1000 швидких подій xState)')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')
		console.log('⚡ Запускаємо стрес-тест...\n')

		const stressResults = await performanceTester.stressTest(1000)

		console.log('\n📊 Результати стрес-тесту:')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Загальний час: ${stressResults.totalTime.toFixed(2)} мс`)
		console.log(
			`   Середній час на подію: ${stressResults.averageTime.toFixed(3)} мс`
		)
		console.log(
			`   Подій за секунду: ${stressResults.actionsPerSecond.toFixed(0)}`
		)

		console.log('\n')

		await this.wait(2000)
	}

	async step5_MemoryTest() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log("📍 КРОК 5: Тест використання пам'яті xState")
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')
		console.log("💾 Перевіряємо використання пам'яті xState...\n")

		const memoryResults = await performanceTester.memoryTest()

		console.log("\n📊 Результати тесту пам'яті:")
		console.log('───────────────────────────────────────────────────────────')
		console.log(
			`   Пам\'ять до: ${(memoryResults.memoryBefore / 1024 / 1024).toFixed(
				2
			)} МБ`
		)
		console.log(
			`   Пам\'ять після: ${(memoryResults.memoryAfter / 1024 / 1024).toFixed(
				2
			)} МБ`
		)
		console.log(
			`   Різниця: ${(memoryResults.memoryDiff / 1024 / 1024).toFixed(2)} МБ`
		)
		console.log(
			`   Розмір стану xState: ${memoryResults.stateSize.toFixed(2)} КБ`
		)

		console.log('\n')

		await this.wait(2000)
	}

	async step6_FinalReport() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 КРОК 6: Фінальний звіт за всіма метриками')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')

		metrics.printReport()

		await this.wait(3000)
	}

	async step7_Export() {
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📍 КРОК 7: Експорт результатів')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')
		console.log('📄 JSON дані для дипломної роботи:')
		console.log('───────────────────────────────────────────────────────────')

		const json = metrics.exportToJSON()
		const preview = JSON.parse(json)

		console.log('\nОсновні метрики xState:')
		console.log(`  - State Manager: ${preview.stateManager}`)
		console.log(
			`  - Час ініціалізації: ${preview.storeInitTime?.toFixed(3) || 'N/A'} мс`
		)
		console.log(
			`  - Середній час події: ${preview.actions.stats.avg.toFixed(3)} мс`
		)
		console.log(`  - Всього ре-рендерів: ${preview.rerenders.totalRerenders}`)
		console.log(
			`  - Пам\'ять: ${
				preview.memory.latest
					? (preview.memory.latest.usedJSHeapSize / 1024 / 1024).toFixed(2)
					: 'N/A'
			} МБ`
		)

		console.log(
			'\n💡 Використовуйте window.exportPerformanceResults() для завантаження JSON файлу'
		)

		console.log('\n')

		await this.wait(2000)
	}

	wait(ms) {
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	async quickDemo() {
		console.clear()
		console.log('\n🎬 ШВИДКА ДЕМОНСТРАЦІЯ\n')

		console.log('1️⃣ Поточний звіт:')
		metrics.printReport()

		console.log('\n2️⃣ Запуск тесту продуктивності:')
		await performanceTester.runFullTest()

		console.log('\n✅ Швидку демонстрацію завершено!')
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
║     🎬 ДЕМОНСТРАЦІЯ ДОСТУПНА!                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

  🎥 Повна демонстрація (із затримками):
     window.runFullDemo()
     
  ⚡ Швидка демонстрація (без затримок):
     window.runQuickDemo()

Демонстрація покаже роботу всіх утиліт:
  ✅ Вимірювання часу ініціалізації
  ✅ Імітація дій
  ✅ Стрес-тест
  ✅ Тест пам'яті
  ✅ Генерація звітів
  ✅ Експорт даних

═══════════════════════════════════════════════════════════
  `)
}

export default PerformanceDemo
