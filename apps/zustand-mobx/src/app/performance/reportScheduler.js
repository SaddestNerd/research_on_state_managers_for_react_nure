import { metrics } from './metrics'

class ReportScheduler {
	constructor() {
		this.intervalId = null
		this.isRunning = false
	}

	start(intervalMs = 30000) {
		if (this.isRunning) {
			console.warn('⚠️ Планувальник звітів вже запущено')
			return
		}

		console.log(
			`✅ Планувальник звітів запущено (інтервал: ${intervalMs / 1000} с)`
		)

		this.isRunning = true
		this.intervalId = setInterval(() => {
			console.log('\n🔔 Автоматичний звіт про продуктивність:')
			metrics.printReport()
		}, intervalMs)
	}

	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId)
			this.intervalId = null
			this.isRunning = false
			console.log('⏹️ Планувальник звітів зупинено')
		}
	}

	getReportNow() {
		console.log('\n📊 Поточний звіт про продуктивність:')
		return metrics.printReport()
	}
}

export const reportScheduler = new ReportScheduler()

if (typeof window !== 'undefined') {
	window.reportScheduler = reportScheduler

	window.getPerformanceReport = () => reportScheduler.getReportNow()
	window.startPerformanceReports = interval => reportScheduler.start(interval)
	window.stopPerformanceReports = () => reportScheduler.stop()

	console.log(`
═══════════════════════════════════════════════════════════
📊 СИСТЕМА ВИМІРЮВАННЯ ПРОДУКТИВНОСТІ АКТИВОВАНА
═══════════════════════════════════════════════════════════

Доступні команди в консолі:

  🔹 window.getPerformanceReport()
     Отримати поточний звіт про продуктивність Context API

  🔹 window.startPerformanceReports(interval)
     Запустити автоматичний вивід звітів
     interval - інтервал у мілісекундах (за замовчуванням 30000)
     Приклад: window.startPerformanceReports(10000) 

  🔹 window.stopPerformanceReports()
     Зупинити автоматичний вивід звітів

  🔹 window.metrics
     Прямий доступ до об'єкта метрик для ручного керування

═══════════════════════════════════════════════════════════
  `)
}

export default ReportScheduler
