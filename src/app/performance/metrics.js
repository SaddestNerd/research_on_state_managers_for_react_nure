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
		console.log(`📊 ОТЧЕТ ПО ПРОИЗВОДИТЕЛЬНОСТИ: ${this.stateManagerName}`)
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')

		console.log('🎯 1. ПРОИЗВОДИТЕЛЬНОСТЬ ДЕЙСТВИЙ (Actions/Dispatch)')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Количество измерений: ${report.actions.stats.count}`)
		console.log(
			`   Минимальное время: ${report.actions.stats.min.toFixed(3)} мс`
		)
		console.log(
			`   Максимальное время: ${report.actions.stats.max.toFixed(3)} мс`
		)
		console.log(`   Среднее время: ${report.actions.stats.avg.toFixed(3)} мс`)
		console.log(
			`   Медианное время: ${report.actions.stats.median.toFixed(3)} мс`
		)
		console.log('\n')

		console.log('🔄 2. КОЛИЧЕСТВО РЕ-РЕНДЕРОВ КОМПОНЕНТОВ')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Всего ре-рендеров: ${report.rerenders.totalRerenders}`)
		console.log('   По компонентам:')
		Object.entries(report.rerenders.byComponent).forEach(([comp, count]) => {
			console.log(`      - ${comp}: ${count} раз(а)`)
		})
		console.log('\n')

		console.log('⚡ 3. СКОРОСТЬ ОБНОВЛЕНИЯ СОСТОЯНИЯ')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Количество измерений: ${report.stateUpdates.stats.count}`)
		console.log(
			`   Минимальное время: ${report.stateUpdates.stats.min.toFixed(3)} мс`
		)
		console.log(
			`   Максимальное время: ${report.stateUpdates.stats.max.toFixed(3)} мс`
		)
		console.log(
			`   Среднее время: ${report.stateUpdates.stats.avg.toFixed(3)} мс`
		)
		console.log(
			`   Медианное время: ${report.stateUpdates.stats.median.toFixed(3)} мс`
		)
		console.log('\n')

		console.log('🎯 4. ПРОИЗВОДИТЕЛЬНОСТЬ СЕЛЕКТОРОВ')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Количество измерений: ${report.selectors.stats.count}`)
		console.log(
			`   Минимальное время: ${report.selectors.stats.min.toFixed(3)} мс`
		)
		console.log(
			`   Максимальное время: ${report.selectors.stats.max.toFixed(3)} мс`
		)
		console.log(`   Среднее время: ${report.selectors.stats.avg.toFixed(3)} мс`)
		console.log(
			`   Медианное время: ${report.selectors.stats.median.toFixed(3)} мс`
		)
		console.log('\n')

		if (report.memory.latest) {
			console.log('💾 5. ИСПОЛЬЗОВАНИЕ ПАМЯТИ')
			console.log('───────────────────────────────────────────────────────────')
			console.log(
				`   Используется: ${(
					report.memory.latest.usedJSHeapSize /
					1024 /
					1024
				).toFixed(2)} МБ`
			)
			console.log(
				`   Всего выделено: ${(
					report.memory.latest.totalJSHeapSize /
					1024 /
					1024
				).toFixed(2)} МБ`
			)
			console.log(
				`   Лимит: ${(
					report.memory.latest.jsHeapSizeLimit /
					1024 /
					1024
				).toFixed(2)} МБ`
			)
			console.log('\n')
		}

		if (report.stateSize.latest) {
			console.log('📦 6. РАЗМЕР СОСТОЯНИЯ (State Size)')
			console.log('───────────────────────────────────────────────────────────')
			console.log(
				`   Размер: ${
					report.stateSize.latest.sizeInBytes
				} байт (${report.stateSize.latest.sizeInKB.toFixed(2)} КБ)`
			)
			console.log('\n')
		}

		if (report.storeInitTime) {
			console.log('🚀 7. ВРЕМЯ ИНИЦИАЛИЗАЦИИ STORE')
			console.log('───────────────────────────────────────────────────────────')
			console.log(`   Время: ${report.storeInitTime.toFixed(3)} мс`)
			console.log('\n')
		}

		console.log('👥 8. КОЛИЧЕСТВО ПОДПИСЧИКОВ (Subscribers)')
		console.log('───────────────────────────────────────────────────────────')
		console.log(`   Количество: ${report.subscribersCount}`)
		console.log('\n')

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

export const reduxMetrics = new PerformanceMetrics('Redux Toolkit')

if (typeof window !== 'undefined') {
	window.reduxMetrics = reduxMetrics
}

export default PerformanceMetrics
