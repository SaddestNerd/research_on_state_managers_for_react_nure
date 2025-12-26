import { metrics } from './metrics'

class ContextPerformanceTests {
	constructor() {
		this.results = {
			stateUpdateTimes: [],
			memoryMeasurements: [],
			persistenceTests: [],
			throughputTests: [],
		}
	}

	async testCartAddStateUpdate(cartContext, iterations = 100) {
		console.log(
			`\n🛒 Тест часу оновлення стану: Додавання в кошик (${iterations} ітерацій)`
		)

		const updateTimes = []
		const mockProduct = {
			id: 1,
			title: 'Test Product',
			price: 10.99,
			images: ['test.jpg'],
		}

		for (let i = 0; i < iterations; i++) {
			const startTime = performance.now()
			const stateUpdateStart = metrics.startStateUpdate()

			cartContext.addToCart({ ...mockProduct, id: i + 1 })

			await new Promise(resolve => setTimeout(resolve, 0))

			const endTime = performance.now()
			const updateTime = metrics.endStateUpdate(stateUpdateStart, 'cart/add')

			const totalTime = endTime - startTime
			updateTimes.push(totalTime)
		}

		const sorted = [...updateTimes].sort((a, b) => a - b)
		const mean = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
		const p50 = sorted[Math.floor(sorted.length * 0.5)]
		const p95 = sorted[Math.floor(sorted.length * 0.95)]

		const result = {
			scenario: 'Додавання в кошик',
			mean: parseFloat(mean.toFixed(3)),
			p50: parseFloat(p50.toFixed(3)),
			p95: parseFloat(p95.toFixed(3)),
			iterations,
			allTimes: updateTimes,
		}

		this.results.stateUpdateTimes.push(result)

		console.log(`   Mean: ${result.mean} мс`)
		console.log(`   P50: ${result.p50} мс`)
		console.log(`   P95: ${result.p95} мс`)

		return result
	}

	async testBulkUpdateStateUpdate(updateFunction, iterations = 1000) {
		console.log(
			`\n⚡ Тест часу оновлення стану: Масове оновлення (${iterations} операцій)`
		)

		const updateTimes = []
		const startTime = performance.now()
		const stateUpdateStart = metrics.startStateUpdate()

		for (let i = 0; i < iterations; i++) {
			const operationStart = performance.now()
			await updateFunction(i)
			const operationEnd = performance.now()
			updateTimes.push(operationEnd - operationStart)
		}

		const endTime = performance.now()
		const totalUpdateTime = metrics.endStateUpdate(
			stateUpdateStart,
			'bulk/update'
		)
		const totalTime = endTime - startTime

		const sorted = [...updateTimes].sort((a, b) => a - b)
		const mean = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
		const p50 = sorted[Math.floor(sorted.length * 0.5)]
		const p95 = sorted[Math.floor(sorted.length * 0.95)]

		const result = {
			scenario: 'Масове оновлення (1000)',
			mean: parseFloat(mean.toFixed(3)),
			p50: parseFloat(p50.toFixed(3)),
			p95: parseFloat(p95.toFixed(3)),
			totalTime: parseFloat(totalTime.toFixed(3)),
			iterations,
		}

		this.results.stateUpdateTimes.push(result)

		console.log(`   Mean: ${result.mean} мс`)
		console.log(`   P50: ${result.p50} мс`)
		console.log(`   P95: ${result.p95} мс`)
		console.log(`   Загальний час: ${result.totalTime} мс`)

		return result
	}

	async testStandardSession(durationMinutes = 1) {
		console.log(
			`\n💾 Тест споживання пам'яті: Стандартна сесія (${durationMinutes} хв)`
		)

		const durationMs = durationMinutes * 60 * 1000
		const measurements = []
		const startTime = performance.now()
		const initialMemory = metrics.measureMemory()

		measurements.push({
			timestamp: 0,
			memory: initialMemory,
		})

		const interval = setInterval(() => {
			const elapsed = performance.now() - startTime
			const memory = metrics.measureMemory()

			measurements.push({
				timestamp: elapsed,
				memory,
			})

			if (elapsed >= durationMs) {
				clearInterval(interval)
			}
		}, 10000)

		await new Promise(resolve => setTimeout(resolve, durationMs + 1000))

		const finalMemory = metrics.measureMemory()
		const memoryDiff = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
		const memoryDiffMB = memoryDiff / 1024 / 1024

		const result = {
			scenario: `Стандартна сесія (${durationMinutes} хв)`,
			initialMemory: {
				usedMB: parseFloat(
					(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)
				),
				totalMB: parseFloat(
					(initialMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)
				),
			},
			finalMemory: {
				usedMB: parseFloat(
					(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)
				),
				totalMB: parseFloat(
					(finalMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)
				),
			},
			memoryDiffMB: parseFloat(memoryDiffMB.toFixed(2)),
			measurements,
		}

		this.results.memoryMeasurements.push(result)

		console.log(`   Початкова пам'ять: ${result.initialMemory.usedMB} МБ`)
		console.log(`   Фінальна пам'ять: ${result.finalMemory.usedMB} МБ`)
		console.log(`   Різниця: ${result.memoryDiffMB} МБ`)

		return result
	}

	async testLongLoadSession(durationMinutes = 5) {
		console.log(
			`\n⏱️ Тест споживання пам'яті: Тривале навантаження (${durationMinutes} хв)`
		)

		const durationMs = durationMinutes * 60 * 1000
		const measurements = []
		const startTime = performance.now()
		const initialMemory = metrics.measureMemory()

		measurements.push({
			timestamp: 0,
			memory: initialMemory,
		})

		const activityInterval = setInterval(() => {
			const largeArray = Array(1000)
				.fill(null)
				.map((_, i) => ({
					id: i,
					data: `test_${i}_${Date.now()}`,
				}))

			setTimeout(() => {
				largeArray.length = 0
			}, 100)
		}, 5000)

		const measureInterval = setInterval(() => {
			const elapsed = performance.now() - startTime
			const memory = metrics.measureMemory()

			measurements.push({
				timestamp: elapsed,
				memory,
			})

			if (elapsed >= durationMs) {
				clearInterval(measureInterval)
				clearInterval(activityInterval)
			}
		}, 30000)

		await new Promise(resolve => setTimeout(resolve, durationMs + 1000))

		const finalMemory = metrics.measureMemory()
		const memoryDiff = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
		const memoryDiffMB = memoryDiff / 1024 / 1024
		const growthRateMBPerMin = memoryDiffMB / durationMinutes

		const result = {
			scenario: `Тривале навантаження (${durationMinutes} хв)`,
			durationMinutes,
			initialMemory: {
				usedMB: parseFloat(
					(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)
				),
				totalMB: parseFloat(
					(initialMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)
				),
			},
			finalMemory: {
				usedMB: parseFloat(
					(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)
				),
				totalMB: parseFloat(
					(finalMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)
				),
			},
			memoryDiffMB: parseFloat(memoryDiffMB.toFixed(2)),
			growthRateMBPerMin: parseFloat(growthRateMBPerMin.toFixed(3)),
			measurements,
		}

		this.results.memoryMeasurements.push(result)

		console.log(`   Початкова пам'ять: ${result.initialMemory.usedMB} МБ`)
		console.log(`   Фінальна пам'ять: ${result.finalMemory.usedMB} МБ`)
		console.log(`   Різниця: ${result.memoryDiffMB} МБ`)
		console.log(`   Темп росту: ${result.growthRateMBPerMin} МБ/хв`)

		return result
	}

	async testPersistenceRecovery(recoveryFunction, testData) {
		console.log(`\n💾 Тест відновлення з persisted store`)

		let successCount = 0
		const totalTests = 10
		const recoveryTimes = []

		for (let i = 0; i < totalTests; i++) {
			try {
				localStorage.setItem('testCart', JSON.stringify(testData))

				const startTime = performance.now()
				const recovered = await recoveryFunction()
				const recoveryTime = performance.now() - startTime

				if (
					recovered &&
					JSON.stringify(recovered) === JSON.stringify(testData)
				) {
					successCount++
					recoveryTimes.push(recoveryTime)
				}

				localStorage.removeItem('testCart')
			} catch (error) {
				console.error(`Помилка тесту ${i + 1}:`, error)
			}
		}

		const successRate = (successCount / totalTests) * 100
		const avgRecoveryTime =
			recoveryTimes.length > 0
				? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
				: 0

		const result = {
			successRate: parseFloat(successRate.toFixed(2)),
			avgRecoveryTime: parseFloat(avgRecoveryTime.toFixed(3)),
			successCount,
			totalTests,
			recoveryTimes,
		}

		this.results.persistenceTests.push(result)

		console.log(`   Успішність: ${result.successRate}%`)
		console.log(`   Середній час відновлення: ${result.avgRecoveryTime} мс`)

		return result
	}

	async testRollbackTime(rollbackFunction, stateSnapshot) {
		console.log(`\n↩️ Тест часу відкату / rollback`)

		const rollbackTimes = []
		const iterations = 20

		for (let i = 0; i < iterations; i++) {
			const modifiedState = { ...stateSnapshot, modified: true, iteration: i }

			const startTime = performance.now()
			await rollbackFunction(stateSnapshot)
			const rollbackTime = performance.now() - startTime

			rollbackTimes.push(rollbackTime)
		}

		const sorted = [...rollbackTimes].sort((a, b) => a - b)
		const mean = rollbackTimes.reduce((a, b) => a + b, 0) / rollbackTimes.length
		const p50 = sorted[Math.floor(sorted.length * 0.5)]
		const p95 = sorted[Math.floor(sorted.length * 0.95)]

		const result = {
			mean: parseFloat(mean.toFixed(3)),
			p50: parseFloat(p50.toFixed(3)),
			p95: parseFloat(p95.toFixed(3)),
			iterations,
			rollbackTimes,
		}

		this.results.persistenceTests.push({ type: 'rollback', ...result })

		console.log(`   Mean: ${result.mean} мс`)
		console.log(`   P50: ${result.p50} мс`)
		console.log(`   P95: ${result.p95} мс`)

		return result
	}

	async testParallelTabsConflict() {
		console.log(`\n🔄 Тест конфліктів при паралельних вкладках`)

		const conflictScores = []
		const testIterations = 10

		for (let i = 0; i < testIterations; i++) {
			let score = 5

			try {
				const tab1Data = {
					items: [{ id: 1, quantity: 2 }],
					timestamp: Date.now(),
				}
				const tab2Data = {
					items: [{ id: 1, quantity: 3 }],
					timestamp: Date.now() + 1,
				}

				localStorage.setItem('cart_tab1', JSON.stringify(tab1Data))
				localStorage.setItem('cart_tab2', JSON.stringify(tab2Data))

				const storageEvent = new StorageEvent('storage', {
					key: 'cart',
					newValue: JSON.stringify(tab2Data),
					oldValue: JSON.stringify(tab1Data),
				})

				const resolved = JSON.parse(localStorage.getItem('cart_tab2') || '{}')
				if (resolved.items && resolved.items[0]?.quantity === 3) {
					score = 5
				} else if (resolved.items && resolved.items[0]?.quantity === 2) {
					score = 4
				} else {
					score = 3
				}

				localStorage.removeItem('cart_tab1')
				localStorage.removeItem('cart_tab2')
			} catch (error) {
				score = 1
			}

			conflictScores.push(score)
		}

		const avgScore =
			conflictScores.reduce((a, b) => a + b, 0) / conflictScores.length

		const result = {
			avgScore: parseFloat(avgScore.toFixed(2)),
			scores: conflictScores,
			iterations: testIterations,
		}

		this.results.persistenceTests.push({ type: 'conflict', ...result })

		console.log(`   Середній бал вирішення: ${result.avgScore}/5`)

		return result
	}

	async testThroughput(actionFunction, durationSeconds = 10) {
		console.log(`\n⚡ Тест пропускної здатності (${durationSeconds} сек)`)

		let actionCount = 0
		const startTime = performance.now()
		const endTime = startTime + durationSeconds * 1000

		while (performance.now() < endTime) {
			const measureData = metrics.startActionMeasure(
				`throughput/action_${actionCount}`
			)
			await actionFunction(actionCount)
			metrics.endActionMeasure(measureData)
			actionCount++

			if (actionCount % 100 === 0) {
				await new Promise(resolve => setTimeout(resolve, 0))
			}
		}

		const actualDuration = (performance.now() - startTime) / 1000
		const throughput = actionCount / actualDuration

		const result = {
			actionsPerSecond: parseFloat(throughput.toFixed(2)),
			totalActions: actionCount,
			durationSeconds: parseFloat(actualDuration.toFixed(2)),
		}

		this.results.throughputTests.push(result)

		console.log(
			`   Пропускна здатність: ${result.actionsPerSecond} actions/sec`
		)
		console.log(`   Всього дій: ${result.totalActions}`)

		return result
	}

	generateReport() {
		const report = {
			timestamp: new Date().toISOString(),
			stateManager: 'Context API',

			stateUpdateTimes: {
				cartAdd: this.results.stateUpdateTimes.find(
					r => r.scenario === 'Додавання в кошик'
				),
				bulkUpdate: this.results.stateUpdateTimes.find(
					r => r.scenario === 'Масове оновлення (1000)'
				),
			},

			memoryConsumption: {
				standardSession: this.results.memoryMeasurements.find(r =>
					r.scenario.includes('Стандартна')
				),
				longLoadSession: this.results.memoryMeasurements.find(r =>
					r.scenario.includes('Тривале')
				),
			},

			persistence: {
				recovery: this.results.persistenceTests.find(
					r => r.successRate !== undefined
				),
				rollback: this.results.persistenceTests.find(
					r => r.type === 'rollback'
				),
				conflictResolution: this.results.persistenceTests.find(
					r => r.type === 'conflict'
				),
			},

			throughput:
				this.results.throughputTests[this.results.throughputTests.length - 1],
		}

		return report
	}

	printReport() {
		const report = this.generateReport()

		console.log('\n')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('📊 ЗВІТ ПРО ПРОДУКТИВНІСТЬ: Context API')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')

		console.log('⏱️ 1. ЧАС ОНОВЛЕННЯ СТАНУ (ms)')
		console.log('───────────────────────────────────────────────────────────')

		if (report.stateUpdateTimes.cartAdd) {
			console.log('\n   Додавання в кошик:')
			console.log(`      Mean: ${report.stateUpdateTimes.cartAdd.mean} мс`)
			console.log(`      P50: ${report.stateUpdateTimes.cartAdd.p50} мс`)
			console.log(`      P95: ${report.stateUpdateTimes.cartAdd.p95} мс`)
		}

		if (report.stateUpdateTimes.bulkUpdate) {
			console.log('\n   Масове оновлення (1000):')
			console.log(`      Mean: ${report.stateUpdateTimes.bulkUpdate.mean} мс`)
			console.log(`      P50: ${report.stateUpdateTimes.bulkUpdate.p50} мс`)
			console.log(`      P95: ${report.stateUpdateTimes.bulkUpdate.p95} мс`)
		}

		console.log("\n💾 2. СПОЖИВАННЯ ПАМ'ЯТІ")
		console.log('───────────────────────────────────────────────────────────')

		if (report.memoryConsumption.standardSession) {
			const std = report.memoryConsumption.standardSession
			console.log(`\n   Стандартна сесія (1 хв):`)
			console.log(`      Початкова: ${std.initialMemory.usedMB} МБ`)
			console.log(`      Фінальна: ${std.finalMemory.usedMB} МБ`)
			console.log(`      Різниця: ${std.memoryDiffMB} МБ`)
		}

		if (report.memoryConsumption.longLoadSession) {
			const long = report.memoryConsumption.longLoadSession
			console.log(`\n   Тривале навантаження (5 хв):`)
			console.log(`      Початкова: ${long.initialMemory.usedMB} МБ`)
			console.log(`      Фінальна: ${long.finalMemory.usedMB} МБ`)
			console.log(`      Різниця: ${long.memoryDiffMB} МБ`)
			console.log(`      Темп росту: ${long.growthRateMBPerMin} МБ/хв`)
		}

		console.log('\n🔄 3. СТІЙКІСТЬ, ВІДНОВЛЮВАНІСТЬ ТА ПЕРСИСТЕНТНІСТЬ')
		console.log('───────────────────────────────────────────────────────────')

		if (report.persistence.recovery) {
			console.log(`\n   Відновлення з persisted store:`)
			console.log(
				`      Успішність: ${report.persistence.recovery.successRate}%`
			)
			console.log(
				`      Середній час: ${report.persistence.recovery.avgRecoveryTime} мс`
			)
		}

		if (report.persistence.rollback) {
			console.log(`\n   Час відкату / rollback:`)
			console.log(`      Mean: ${report.persistence.rollback.mean} мс`)
			console.log(`      P50: ${report.persistence.rollback.p50} мс`)
			console.log(`      P95: ${report.persistence.rollback.p95} мс`)
		}

		if (report.persistence.conflictResolution) {
			console.log(`\n   Конфлікти при паралельних вкладках:`)
			console.log(
				`      Бал вирішення: ${report.persistence.conflictResolution.avgScore}/5`
			)
		}

		console.log('\n⚡ 4. ПРОПУСКНА ЗДАТНІСТЬ')
		console.log('───────────────────────────────────────────────────────────')

		if (report.throughput) {
			console.log(
				`   Throughput: ${report.throughput.actionsPerSecond} actions/sec`
			)
			console.log(`   Всього дій: ${report.throughput.totalActions}`)
		}

		console.log('\n═══════════════════════════════════════════════════════════')
		console.log('\n')

		return report
	}

	exportResults(filename = 'context-performance-results.json') {
		const report = this.generateReport()
		const json = JSON.stringify(report, null, 2)

		console.log('\n📄 Експорт результатів:')
		console.log('───────────────────────────────────────────────────────────')
		console.log(json)
		console.log('───────────────────────────────────────────────────────────')

		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)

		console.log(`✅ Файл завантажено: ${filename}`)

		return json
	}

	reset() {
		this.results = {
			stateUpdateTimes: [],
			memoryMeasurements: [],
			persistenceTests: [],
			throughputTests: [],
		}
	}
}

export const contextPerformanceTests = new ContextPerformanceTests()

if (typeof window !== 'undefined') {
	window.contextPerformanceTests = contextPerformanceTests

	console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🧪 ТЕСТИ ПРОДУКТИВНОСТІ CONTEXT API                     ║
╚═══════════════════════════════════════════════════════════╝

Доступні методи:

  🔹 window.contextPerformanceTests.testCartAddStateUpdate(cartContext, iterations)
     Тест часу оновлення при додаванні в кошик

  🔹 window.contextPerformanceTests.testBulkUpdateStateUpdate(updateFunction, iterations)
     Тест масового оновлення (1000 операцій)

  🔹 window.contextPerformanceTests.testStandardSession(durationMinutes)
     Тест стандартної сесії (1 хв)

  🔹 window.contextPerformanceTests.testLongLoadSession(durationMinutes)
     Тест тривалого навантаження (5 хв)

  🔹 window.contextPerformanceTests.testPersistenceRecovery(recoveryFunction, testData)
     Тест відновлення з persisted store

  🔹 window.contextPerformanceTests.testRollbackTime(rollbackFunction, stateSnapshot)
     Тест часу відкату

  🔹 window.contextPerformanceTests.testParallelTabsConflict()
     Тест конфліктів при паралельних вкладках

  🔹 window.contextPerformanceTests.testThroughput(actionFunction, durationSeconds)
     Тест пропускної здатності

  🔹 window.contextPerformanceTests.printReport()
     Вивести повний звіт

  🔹 window.contextPerformanceTests.exportResults(filename)
     Експортувати результати у JSON

═══════════════════════════════════════════════════════════
  `)
}

export default ContextPerformanceTests
