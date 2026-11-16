class PerformanceMetrics {
	constructor(stateManagerName = 'Redux') {
		this.stateManagerName = stateManagerName
		this.metrics = {
			actionExecutionTimes: [],

			componentRerenders: {},

			stateUpdateTimes: [],

			selectorExecutionTimes: [],

			memoryUsage: [],

			stateSizes: [],

			storeInitTime: null,

			subscribersCount: 0,
		}

		this.startTime = null
	}

	startActionMeasure(actionName) {
		return {
			actionName,
			startTime: performance.now(),
		}
	}

	endActionMeasure(measureData) {
		const endTime = performance.now()
		const executionTime = endTime - measureData.startTime

		this.metrics.actionExecutionTimes.push({
			action: measureData.actionName,
			time: executionTime,
			timestamp: new Date().toISOString(),
		})

		return executionTime
	}

	trackComponentRender(componentName) {
		if (!this.metrics.componentRerenders[componentName]) {
			this.metrics.componentRerenders[componentName] = 0
		}
		this.metrics.componentRerenders[componentName]++
	}
	startStateUpdate() {
		return performance.now()
	}

	endStateUpdate(startTime, updateType = 'generic') {
		const updateTime = performance.now() - startTime
		this.metrics.stateUpdateTimes.push({
			type: updateType,
			time: updateTime,
			timestamp: new Date().toISOString(),
		})
		return updateTime
	}

	measureSelector(selectorName, selectorFn, ...args) {
		const startTime = performance.now()
		const result = selectorFn(...args)
		const executionTime = performance.now() - startTime

		this.metrics.selectorExecutionTimes.push({
			selector: selectorName,
			time: executionTime,
			timestamp: new Date().toISOString(),
		})

		return result
	}

	measureMemory() {
		if (performance.memory) {
			const memoryData = {
				usedJSHeapSize: performance.memory.usedJSHeapSize,
				totalJSHeapSize: performance.memory.totalJSHeapSize,
				jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
				timestamp: new Date().toISOString(),
			}

			this.metrics.memoryUsage.push(memoryData)
			return memoryData
		}
		return null
	}

	measureStateSize(state) {
		const stateString = JSON.stringify(state)
		const sizeInBytes = new Blob([stateString]).size
		const sizeInKB = sizeInBytes / 1024

		this.metrics.stateSizes.push({
			sizeInBytes,
			sizeInKB,
			timestamp: new Date().toISOString(),
		})

		return { sizeInBytes, sizeInKB }
	}

	setStoreInitTime(time) {
		this.metrics.storeInitTime = time
	}

	setSubscribersCount(count) {
		this.metrics.subscribersCount = count
	}

	calculateStats(array, key = 'time') {
		if (!array || array.length === 0) {
			return {
				min: 0,
				max: 0,
				avg: 0,
				median: 0,
				total: 0,
				count: 0,
			}
		}

		const values = array.map(item =>
			typeof item === 'number' ? item : item[key]
		)
		const sorted = [...values].sort((a, b) => a - b)

		return {
			min: Math.min(...values),
			max: Math.max(...values),
			avg: values.reduce((a, b) => a + b, 0) / values.length,
			median: sorted[Math.floor(sorted.length / 2)],
			total: values.reduce((a, b) => a + b, 0),
			count: values.length,
		}
	}

	getReport() {
		const report = {
			stateManager: this.stateManagerName,
			timestamp: new Date().toISOString(),

			actions: {
				stats: this.calculateStats(this.metrics.actionExecutionTimes),
				details: this.metrics.actionExecutionTimes,
			},

			rerenders: {
				byComponent: this.metrics.componentRerenders,
				totalRerenders: Object.values(this.metrics.componentRerenders).reduce(
					(a, b) => a + b,
					0
				),
			},

			stateUpdates: {
				stats: this.calculateStats(this.metrics.stateUpdateTimes),
				details: this.metrics.stateUpdateTimes,
			},

			selectors: {
				stats: this.calculateStats(this.metrics.selectorExecutionTimes),
				details: this.metrics.selectorExecutionTimes,
			},

			memory: {
				measurements: this.metrics.memoryUsage,
				latest: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1],
			},

			stateSize: {
				measurements: this.metrics.stateSizes,
				latest: this.metrics.stateSizes[this.metrics.stateSizes.length - 1],
			},

			storeInitTime: this.metrics.storeInitTime,

			subscribersCount: this.metrics.subscribersCount,
		}

		return report
	}

	printReport() {
		const report = this.getReport()

		console.log('\n')
		console.log('═══════════════════════════════════════════════════════════')
		console.log(`📊 ЗВІТ ПРО ПРОДУКТИВНІСТЬ: ${this.stateManagerName}`)
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')

		console.log('🎯 1. ПРОДУКТИВНІСТЬ ДІЙ (Actions/Dispatch)')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Кількість вимірювань: ${report.actions.stats.count}`)
		console.log(`   Мінімальний час: ${report.actions.stats.min.toFixed(3)} мс`)
		console.log(
			`   Максимальний час: ${report.actions.stats.max.toFixed(3)} мс`
		)
		console.log(`   Середній час: ${report.actions.stats.avg.toFixed(3)} мс`)
		console.log(
			`   Медіанний час: ${report.actions.stats.median.toFixed(3)} мс`
		)
		console.log('\n')

		console.log('🔄 2. КІЛЬКІСТЬ РЕ-РЕНДЕРІВ КОМПОНЕНТІВ')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Всього ре-рендерів: ${report.rerenders.totalRerenders}`)
		console.log('   По компонентах:')
		Object.entries(report.rerenders.byComponent).forEach(([comp, count]) => {
			console.log(`      - ${comp}: ${count} раз(и)`)
		})
		console.log('\n')

		console.log('⚡ 3. ШВИДКІСТЬ ОНОВЛЕННЯ СТАНУ')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Кількість вимірювань: ${report.stateUpdates.stats.count}`)
		console.log(
			`   Мінімальний час: ${report.stateUpdates.stats.min.toFixed(3)} мс`
		)
		console.log(
			`   Максимальний час: ${report.stateUpdates.stats.max.toFixed(3)} мс`
		)
		console.log(
			`   Середній час: ${report.stateUpdates.stats.avg.toFixed(3)} мс`
		)
		console.log(
			`   Медіанний час: ${report.stateUpdates.stats.median.toFixed(3)} мс`
		)
		console.log('\n')

		console.log('🎯 4. ПРОДУКТИВНІСТЬ СЕЛЕКТОРІВ')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Кількість вимірювань: ${report.selectors.stats.count}`)
		console.log(
			`   Мінімальний час: ${report.selectors.stats.min.toFixed(3)} мс`
		)
		console.log(
			`   Максимальний час: ${report.selectors.stats.max.toFixed(3)} мс`
		)
		console.log(`   Середній час: ${report.selectors.stats.avg.toFixed(3)} мс`)
		console.log(
			`   Медіанний час: ${report.selectors.stats.median.toFixed(3)} мс`
		)
		console.log('\n')

		if (report.memory.latest) {
			console.log("💾 5. ВИКОРИСТАННЯ ПАМ'ЯТІ")
			console.log('───────────────────────────────────────────────────────────')
			console.log(
				`   Використовується: ${(
					report.memory.latest.usedJSHeapSize /
					1024 /
					1024
				).toFixed(2)} МБ`
			)
			console.log(
				`   Всього виділено: ${(
					report.memory.latest.totalJSHeapSize /
					1024 /
					1024
				).toFixed(2)} МБ`
			)
			console.log(
				`   Ліміт: ${(
					report.memory.latest.jsHeapSizeLimit /
					1024 /
					1024
				).toFixed(2)} МБ`
			)
			console.log('\n')
		}

		if (report.stateSize.latest) {
			console.log('📦 6. РОЗМІР СТАНУ (State Size)')
			console.log('───────────────────────────────────────────────────────────')
			console.log(
				`   Розмір: ${
					report.stateSize.latest.sizeInBytes
				} байт (${report.stateSize.latest.sizeInKB.toFixed(2)} КБ)`
			)
			console.log('\n')
		}

		if (report.storeInitTime) {
			console.log('🚀 7. ЧАС ІНІЦІАЛІЗАЦІЇ STORE')
			console.log('───────────────────────────────────────────────────────────')
			console.log(`   Час: ${report.storeInitTime.toFixed(3)} мс`)
			console.log('\n')
		}

		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')

		return report
	}

	exportToJSON() {
		const report = this.getReport()
		return JSON.stringify(report, null, 2)
	}

	reset() {
		this.metrics = {
			actionExecutionTimes: [],
			componentRerenders: {},
			stateUpdateTimes: [],
			selectorExecutionTimes: [],
			memoryUsage: [],
			stateSizes: [],
			storeInitTime: null,
			subscribersCount: 0,
		}
	}
}

export const metrics = new PerformanceMetrics('MobX')

if (typeof window !== 'undefined') {
	window.metrics = metrics
}

export default PerformanceMetrics
