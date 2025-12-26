import { reduxMetrics } from './metrics'

class ReportScheduler {
	constructor() {
		this.intervalId = null
		this.isRunning = false
	}

	start(intervalMs = 30000) {
		if (this.isRunning) {
			console.warn('⚠️ Планировщик отчетов уже запущен')
			return
		}

		console.log(
			`✅ Планировщик отчетов запущен (интервал: ${intervalMs / 1000} сек)`
		)

		this.isRunning = true
		this.intervalId = setInterval(() => {
			console.log('\n🔔 Автоматический отчет о производительности:')
			reduxMetrics.printReport()
		}, intervalMs)
	}

	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId)
			this.intervalId = null
			this.isRunning = false
			console.log('⏹️ Планировщик отчетов остановлен')
		}
	}

	getReportNow() {
		console.log('\n📊 Текущий отчет о производительности:')
		return reduxMetrics.printReport()
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
📊 СИСТЕМА ИЗМЕРЕНИЯ ПРОИЗВОДИТЕЛЬНОСТИ АКТИВИРОВАНА
═══════════════════════════════════════════════════════════

Доступные команды в консоли:

  🔹 window.getPerformanceReport()
     Получить текущий отчет о производительности Redux

  🔹 window.startPerformanceReports(interval)
     Запустить автоматический вывод отчетов
     interval - интервал в миллисекундах (по умолчанию 30000)
     Пример: window.startPerformanceReports(10000) 

  🔹 window.stopPerformanceReports()
     Остановить автоматический вывод отчетов

  🔹 window.reduxMetrics
     Прямой доступ к объекту метрик для ручного управления

═══════════════════════════════════════════════════════════
  `)
}

export default ReportScheduler
