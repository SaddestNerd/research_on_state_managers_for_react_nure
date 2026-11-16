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



export default ReportScheduler
