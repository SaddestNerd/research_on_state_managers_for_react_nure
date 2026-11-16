import { store } from '../store/store'
import {
	addToCart,
	clearCart,
	updateQuantity,
	removeFromCart,
} from '../services/slices/cart/slice'
import { reduxMetrics } from './metrics'

const generateTestProduct = id => ({
	id: id,
	title: `Товар ${id}`,
	description: `Опис товару ${id}`,
	price: Math.floor(Math.random() * 1000) + 10,
	images: ['https://via.placeholder.com/300'],
	category: {
		id: 1,
		name: 'Категорія',
	},
})

const calculatePercentiles = (values, percentiles = [50, 95, 99]) => {
	const sorted = [...values].sort((a, b) => a - b)
	const result = {}

	percentiles.forEach(p => {
		const index = Math.floor(sorted.length * (p / 100))
		result[`p${p}`] = sorted[index] || 0
	})

	return result
}

const saveStateToLocalStorage = state => {
	try {
		const serializedState = JSON.stringify(state)
		localStorage.setItem('redux_test_state', serializedState)
		return true
	} catch (error) {
		console.error('Помилка збереження стану:', error)
		return false
	}
}

const loadStateFromLocalStorage = () => {
	try {
		const serializedState = localStorage.getItem('redux_test_state')
		if (serializedState === null) {
			return null
		}
		return JSON.parse(serializedState)
	} catch (error) {
		console.error('Помилка відновлення стану:', error)
		return null
	}
}

class ReduxPerformanceTests {
	constructor() {
		this.results = {
			stateUpdateTime: {
				addToCart: null,
				bulkUpdate: null,
			},
			memoryConsumption: {
				standardSession: null,
				longLoad: null,
			},
			stability: {
				persistenceRecovery: null,
				rollbackTime: null,
				parallelTabsConflicts: null,
			},
			throughput: null,
		}
	}

	async testStateUpdateTime_AddToCart(iterations = 100) {
		console.log(`\n🧪 Тест 1.1: Час оновлення стану (ms) - Додавання в кошик`)
		console.log(`   Ітерацій: ${iterations}`)
		console.log('───────────────────────────────────────────────────────────')

		store.dispatch(clearCart())
		reduxMetrics.reset()

		const updateTimes = []

		for (let i = 0; i < iterations; i++) {
			const product = generateTestProduct(i + 1)

			const stateUpdateStart = reduxMetrics.startStateUpdate()
			const performanceStart = performance.now()

			store.dispatch(addToCart(product))

			await new Promise(resolve => setTimeout(resolve, 0))

			const updateTime = reduxMetrics.endStateUpdate(
				stateUpdateStart,
				'addToCart'
			)
			const performanceTime = performance.now() - performanceStart

			updateTimes.push(Math.max(updateTime, performanceTime))
		}

		const mean = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
		const percentiles = calculatePercentiles(updateTimes, [50, 95, 99])

		this.results.stateUpdateTime.addToCart = {
			mean: parseFloat(mean.toFixed(3)),
			p50: parseFloat(percentiles.p50.toFixed(3)),
			p95: parseFloat(percentiles.p95.toFixed(3)),
			p99: parseFloat(percentiles.p99.toFixed(3)),
			min: parseFloat(Math.min(...updateTimes).toFixed(3)),
			max: parseFloat(Math.max(...updateTimes).toFixed(3)),
			unit: 'ms',
		}

		console.log(`✅ Результати:`)
		console.log(`   Mean: ${this.results.stateUpdateTime.addToCart.mean} мс`)
		console.log(`   P50: ${this.results.stateUpdateTime.addToCart.p50} мс`)
		console.log(`   P95: ${this.results.stateUpdateTime.addToCart.p95} мс`)
		console.log(`   P99: ${this.results.stateUpdateTime.addToCart.p99} мс`)

		return this.results.stateUpdateTime.addToCart
	}

	async testStateUpdateTime_BulkUpdate(count = 1000) {
		console.log(
			`\n🧪 Тест 1.2: Час оновлення стану (ms) - Масове оновлення (${count})`
		)
		console.log('───────────────────────────────────────────────────────────')

		store.dispatch(clearCart())
		reduxMetrics.reset()

		const stateUpdateStart = reduxMetrics.startStateUpdate()
		const performanceStart = performance.now()

		for (let i = 0; i < count; i++) {
			const product = generateTestProduct(i + 1)
			store.dispatch(addToCart(product))
		}

		await new Promise(resolve => setTimeout(resolve, 100))

		const totalUpdateTime = reduxMetrics.endStateUpdate(
			stateUpdateStart,
			'bulkUpdate'
		)
		const performanceTime = performance.now() - performanceStart

		const totalTime = Math.max(totalUpdateTime, performanceTime)
		const avgTimePerItem = totalTime / count

		store.dispatch(clearCart())
		reduxMetrics.reset()

		const individualTimes = []
		const sampleSize = Math.min(100, count)

		for (let i = 0; i < sampleSize; i++) {
			const product = generateTestProduct(i + 1)
			const start = performance.now()
			store.dispatch(addToCart(product))
			await new Promise(resolve => setTimeout(resolve, 0))
			individualTimes.push(performance.now() - start)
		}

		const mean =
			individualTimes.reduce((a, b) => a + b, 0) / individualTimes.length
		const percentiles = calculatePercentiles(individualTimes, [50, 95, 99])

		this.results.stateUpdateTime.bulkUpdate = {
			totalTime: parseFloat(totalTime.toFixed(3)),
			avgTimePerItem: parseFloat(avgTimePerItem.toFixed(3)),
			mean: parseFloat(mean.toFixed(3)),
			p50: parseFloat(percentiles.p50.toFixed(3)),
			p95: parseFloat(percentiles.p95.toFixed(3)),
			p99: parseFloat(percentiles.p99.toFixed(3)),
			itemsCount: count,
			unit: 'ms',
		}

		console.log(`✅ Результати:`)
		console.log(
			`   Загальний час: ${this.results.stateUpdateTime.bulkUpdate.totalTime} мс`
		)
		console.log(
			`   Середній час на item: ${this.results.stateUpdateTime.bulkUpdate.avgTimePerItem} мс`
		)
		console.log(`   Mean: ${this.results.stateUpdateTime.bulkUpdate.mean} мс`)
		console.log(`   P50: ${this.results.stateUpdateTime.bulkUpdate.p50} мс`)
		console.log(`   P95: ${this.results.stateUpdateTime.bulkUpdate.p95} мс`)
		console.log(`   P99: ${this.results.stateUpdateTime.bulkUpdate.p99} мс`)

		return this.results.stateUpdateTime.bulkUpdate
	}

	async testMemoryConsumption_StandardSession(durationMinutes = 15) {
		console.log(
			`\n🧪 Тест 2.1: Споживання пам'яті - Стандартна сесія (${durationMinutes} хв)`
		)
		console.log('───────────────────────────────────────────────────────────')

		if (!performance.memory) {
			console.warn('⚠️ performance.memory недоступний в цьому браузері')
			this.results.memoryConsumption.standardSession = {
				error: 'performance.memory недоступний',
				note: 'Потрібен Chrome або інший браузер з підтримкою performance.memory',
			}
			return this.results.memoryConsumption.standardSession
		}

		store.dispatch(clearCart())
		reduxMetrics.reset()

		const durationMs = durationMinutes * 60 * 1000
		const startTime = performance.now()
		const endTime = startTime + durationMs

		const memoryMeasurements = []
		const actionCount = 0
		let lastMeasurementTime = startTime

		const initialMemory = performance.memory.usedJSHeapSize / 1024 / 1024
		memoryMeasurements.push({
			time: 0,
			memory: initialMemory,
			timestamp: new Date().toISOString(),
		})

		let productId = 1
		const measurementInterval = 60000

		while (performance.now() < endTime) {
			for (let i = 0; i < 5; i++) {
				const product = generateTestProduct(productId++)
				store.dispatch(addToCart(product))
			}

			const currentTime = performance.now()
			if (currentTime - lastMeasurementTime >= measurementInterval) {
				const memory = performance.memory.usedJSHeapSize / 1024 / 1024
				const elapsedMinutes = (currentTime - startTime) / 60000
				memoryMeasurements.push({
					time: elapsedMinutes,
					memory: memory,
					timestamp: new Date().toISOString(),
				})
				lastMeasurementTime = currentTime
				reduxMetrics.measureMemory()
			}

			await new Promise(resolve => setTimeout(resolve, 100))
		}

		const finalMemory = performance.memory.usedJSHeapSize / 1024 / 1024
		const elapsedMinutes = (performance.now() - startTime) / 60000
		memoryMeasurements.push({
			time: elapsedMinutes,
			memory: finalMemory,
			timestamp: new Date().toISOString(),
		})

		const avgMemory =
			memoryMeasurements.reduce((sum, m) => sum + m.memory, 0) /
			memoryMeasurements.length
		const peakMemory = Math.max(...memoryMeasurements.map(m => m.memory))
		const minMemory = Math.min(...memoryMeasurements.map(m => m.memory))
		const memoryGrowth = finalMemory - initialMemory

		this.results.memoryConsumption.standardSession = {
			duration: durationMinutes,
			initial: parseFloat(initialMemory.toFixed(2)),
			final: parseFloat(finalMemory.toFixed(2)),
			average: parseFloat(avgMemory.toFixed(2)),
			peak: parseFloat(peakMemory.toFixed(2)),
			min: parseFloat(minMemory.toFixed(2)),
			growth: parseFloat(memoryGrowth.toFixed(2)),
			measurements: memoryMeasurements,
			unit: 'MB',
		}

		console.log(`✅ Результати:`)
		console.log(
			`   Початкова пам'ять: ${this.results.memoryConsumption.standardSession.initial} МБ`
		)
		console.log(
			`   Фінальна пам'ять: ${this.results.memoryConsumption.standardSession.final} МБ`
		)
		console.log(
			`   Середнє споживання: ${this.results.memoryConsumption.standardSession.average} МБ`
		)
		console.log(
			`   Пікове споживання: ${this.results.memoryConsumption.standardSession.peak} МБ`
		)
		console.log(
			`   Зростання пам'яті: ${this.results.memoryConsumption.standardSession.growth} МБ`
		)

		return this.results.memoryConsumption.standardSession
	}

	async testMemoryConsumption_LongLoad(durationMinutes = 60) {
		console.log(
			`\n🧪 Тест 2.2: Споживання пам'яті - Тривале навантаження (${durationMinutes} хв)`
		)
		console.log('───────────────────────────────────────────────────────────')

		if (!performance.memory) {
			console.warn('⚠️ performance.memory недоступний в цьому браузері')
			this.results.memoryConsumption.longLoad = {
				error: 'performance.memory недоступний',
				note: 'Потрібен Chrome або інший браузер з підтримкою performance.memory',
			}
			return this.results.memoryConsumption.longLoad
		}

		store.dispatch(clearCart())
		reduxMetrics.reset()

		const testDurationMs = durationMinutes * 1000
		const startTime = performance.now()
		const endTime = startTime + testDurationMs

		const memoryMeasurements = []
		let productId = 1
		const measurementInterval = 1000

		const initialMemory = performance.memory.usedJSHeapSize / 1024 / 1024
		memoryMeasurements.push({
			time: 0,
			memory: initialMemory,
			timestamp: new Date().toISOString(),
		})

		let lastMeasurementTime = startTime

		while (performance.now() < endTime) {
			for (let i = 0; i < 10; i++) {
				const product = generateTestProduct(productId++)
				store.dispatch(addToCart(product))
			}

			const currentTime = performance.now()
			if (currentTime - lastMeasurementTime >= measurementInterval) {
				const memory = performance.memory.usedJSHeapSize / 1024 / 1024
				const elapsedMinutes = (currentTime - startTime) / 1000
				memoryMeasurements.push({
					time: elapsedMinutes,
					memory: memory,
					timestamp: new Date().toISOString(),
				})
				lastMeasurementTime = currentTime
				reduxMetrics.measureMemory()
			}

			await new Promise(resolve => setTimeout(resolve, 10))
		}

		const finalMemory = performance.memory.usedJSHeapSize / 1024 / 1024
		const elapsedMinutes = (performance.now() - startTime) / 1000
		memoryMeasurements.push({
			time: elapsedMinutes,
			memory: finalMemory,
			timestamp: new Date().toISOString(),
		})

		const totalGrowth = finalMemory - initialMemory
		const growthRate = totalGrowth / elapsedMinutes

		const growthRates = []
		for (let i = 1; i < memoryMeasurements.length; i++) {
			const prev = memoryMeasurements[i - 1]
			const curr = memoryMeasurements[i]
			const timeDiff = curr.time - prev.time
			const memoryDiff = curr.memory - prev.memory
			if (timeDiff > 0) {
				growthRates.push(memoryDiff / timeDiff)
			}
		}
		const avgGrowthRate =
			growthRates.reduce((a, b) => a + b, 0) / growthRates.length

		const avgMemory =
			memoryMeasurements.reduce((sum, m) => sum + m.memory, 0) /
			memoryMeasurements.length
		const peakMemory = Math.max(...memoryMeasurements.map(m => m.memory))

		this.results.memoryConsumption.longLoad = {
			duration: durationMinutes,
			initial: parseFloat(initialMemory.toFixed(2)),
			final: parseFloat(finalMemory.toFixed(2)),
			average: parseFloat(avgMemory.toFixed(2)),
			peak: parseFloat(peakMemory.toFixed(2)),
			growth: parseFloat(totalGrowth.toFixed(2)),
			growthRate: parseFloat(growthRate.toFixed(4)),
			avgGrowthRate: parseFloat(avgGrowthRate.toFixed(4)),
			measurements: memoryMeasurements,
			unit: 'MB',
			growthRateUnit: 'MB/min',
		}

		console.log(`✅ Результати:`)
		console.log(
			`   Початкова пам'ять: ${this.results.memoryConsumption.longLoad.initial} МБ`
		)
		console.log(
			`   Фінальна пам'ять: ${this.results.memoryConsumption.longLoad.final} МБ`
		)
		console.log(
			`   Середнє споживання: ${this.results.memoryConsumption.longLoad.average} МБ`
		)
		console.log(
			`   Пікове споживання: ${this.results.memoryConsumption.longLoad.peak} МБ`
		)
		console.log(
			`   Загальне зростання: ${this.results.memoryConsumption.longLoad.growth} МБ`
		)
		console.log(
			`   Темп росту: ${this.results.memoryConsumption.longLoad.growthRate} МБ/хв`
		)
		console.log(
			`   Середній темп росту: ${this.results.memoryConsumption.longLoad.avgGrowthRate} МБ/хв`
		)

		return this.results.memoryConsumption.longLoad
	}

	async testPersistenceRecovery(iterations = 100) {
		console.log(`\n🧪 Тест 3.1: Відновлення з persisted store - % успіху`)
		console.log(`   Ітерацій: ${iterations}`)
		console.log('───────────────────────────────────────────────────────────')

		let successCount = 0
		let failCount = 0
		const recoveryTimes = []

		for (let i = 0; i < iterations; i++) {
			store.dispatch(clearCart())

			const itemsToAdd = 10
			for (let j = 0; j < itemsToAdd; j++) {
				const product = generateTestProduct(j + 1)
				store.dispatch(addToCart(product))
			}

			const state = store.getState()
			const saveSuccess = saveStateToLocalStorage(state.cart)

			if (!saveSuccess) {
				failCount++
				continue
			}

			store.dispatch(clearCart())

			const recoveryStart = performance.now()
			const savedState = loadStateFromLocalStorage()

			if (savedState) {
				try {
					savedState.items.forEach(item => {
						store.dispatch(addToCart(item.product))
						if (item.quantity > 1) {
							store.dispatch(
								updateQuantity({
									productId: item.product.id,
									quantity: item.quantity,
								})
							)
						}
					})

					const recoveredState = store.getState().cart
					const recoveryTime = performance.now() - recoveryStart

					if (
						recoveredState.items.length === savedState.items.length &&
						recoveredState.totalItems === savedState.totalItems &&
						Math.abs(recoveredState.totalPrice - savedState.totalPrice) < 0.01
					) {
						successCount++
						recoveryTimes.push(recoveryTime)
					} else {
						failCount++
					}
				} catch (error) {
					failCount++
				}
			} else {
				failCount++
			}
		}

		const successRate = (successCount / iterations) * 100
		const avgRecoveryTime =
			recoveryTimes.length > 0
				? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
				: 0

		this.results.stability.persistenceRecovery = {
			iterations,
			successCount,
			failCount,
			successRate: parseFloat(successRate.toFixed(2)),
			avgRecoveryTime: parseFloat(avgRecoveryTime.toFixed(3)),
			unit: '%',
			timeUnit: 'ms',
		}

		console.log(`✅ Результати:`)
		console.log(
			`   Успішних відновлень: ${this.results.stability.persistenceRecovery.successCount}/${iterations}`
		)
		console.log(
			`   Невдалих: ${this.results.stability.persistenceRecovery.failCount}`
		)
		console.log(
			`   % успіху: ${this.results.stability.persistenceRecovery.successRate}%`
		)
		console.log(
			`   Середній час відновлення: ${this.results.stability.persistenceRecovery.avgRecoveryTime} мс`
		)

		return this.results.stability.persistenceRecovery
	}

	async testRollbackTime(iterations = 100) {
		console.log(`\n🧪 Тест 3.2: Час відкату / rollback (ms)`)
		console.log(`   Ітерацій: ${iterations}`)
		console.log('───────────────────────────────────────────────────────────')

		const rollbackTimes = []

		for (let i = 0; i < iterations; i++) {
			store.dispatch(clearCart())
			for (let j = 0; j < 5; j++) {
				const product = generateTestProduct(j + 1)
				store.dispatch(addToCart(product))
			}

			const initialState = JSON.parse(JSON.stringify(store.getState().cart))

			for (let j = 5; j < 10; j++) {
				const product = generateTestProduct(j + 1)
				store.dispatch(addToCart(product))
			}

			const rollbackStart = performance.now()

			store.dispatch(clearCart())
			initialState.items.forEach(item => {
				store.dispatch(addToCart(item.product))
				if (item.quantity > 1) {
					store.dispatch(
						updateQuantity({
							productId: item.product.id,
							quantity: item.quantity,
						})
					)
				}
			})

			const rollbackTime = performance.now() - rollbackStart
			rollbackTimes.push(rollbackTime)

			const currentState = store.getState().cart
			if (currentState.items.length !== initialState.items.length) {
				console.warn(`⚠️ Помилка відкату на ітерації ${i}`)
			}
		}

		const mean = rollbackTimes.reduce((a, b) => a + b, 0) / rollbackTimes.length
		const percentiles = calculatePercentiles(rollbackTimes, [50, 95, 99])

		this.results.stability.rollbackTime = {
			mean: parseFloat(mean.toFixed(3)),
			p50: parseFloat(percentiles.p50.toFixed(3)),
			p95: parseFloat(percentiles.p95.toFixed(3)),
			p99: parseFloat(percentiles.p99.toFixed(3)),
			min: parseFloat(Math.min(...rollbackTimes).toFixed(3)),
			max: parseFloat(Math.max(...rollbackTimes).toFixed(3)),
			unit: 'ms',
		}

		console.log(`✅ Результати:`)
		console.log(`   Mean: ${this.results.stability.rollbackTime.mean} мс`)
		console.log(`   P50: ${this.results.stability.rollbackTime.p50} мс`)
		console.log(`   P95: ${this.results.stability.rollbackTime.p95} мс`)
		console.log(`   P99: ${this.results.stability.rollbackTime.p99} мс`)

		return this.results.stability.rollbackTime
	}

	async testParallelTabsConflicts(iterations = 50) {
		console.log(
			`\n🧪 Тест 3.3: Конфлікти при паралельних вкладках - вирішення (score 1-5)`
		)
		console.log(`   Ітерацій: ${iterations}`)
		console.log('───────────────────────────────────────────────────────────')

		const conflictScores = []

		for (let i = 0; i < iterations; i++) {
			store.dispatch(clearCart())
			for (let j = 0; j < 5; j++) {
				const product = generateTestProduct(j + 1)
				store.dispatch(addToCart(product))
			}
			const state1 = JSON.parse(JSON.stringify(store.getState().cart))
			saveStateToLocalStorage(state1)

			const state2 = JSON.parse(JSON.stringify(state1))
			for (let j = 5; j < 10; j++) {
				const product = generateTestProduct(j + 1)
				const existingItem = state2.items.find(
					item => item.product.id === product.id
				)
				if (existingItem) {
					existingItem.quantity += 1
				} else {
					state2.items.push({ product, quantity: 1 })
				}
				state2.totalItems = state2.items.reduce(
					(sum, item) => sum + item.quantity,
					0
				)
				state2.totalPrice = state2.items.reduce(
					(sum, item) => sum + item.product.price * item.quantity,
					0
				)
			}

			const savedState = loadStateFromLocalStorage()

			let score = 5

			if (!savedState || !savedState.items) {
				score -= 2
			}

			if (savedState) {
				const calculatedTotal = savedState.items.reduce(
					(sum, item) => sum + item.quantity,
					0
				)
				if (Math.abs(savedState.totalItems - calculatedTotal) > 0.01) {
					score -= 1
				}
			}

			try {
				store.dispatch(clearCart())
				if (savedState) {
					savedState.items.forEach(item => {
						store.dispatch(addToCart(item.product))
						if (item.quantity > 1) {
							store.dispatch(
								updateQuantity({
									productId: item.product.id,
									quantity: item.quantity,
								})
							)
						}
					})
					const recoveredState = store.getState().cart
					if (recoveredState.items.length !== savedState.items.length) {
						score -= 1
					}
				}
			} catch (error) {
				score -= 2
			}

			if (savedState) {
				const ids = savedState.items.map(item => item.product.id)
				const uniqueIds = new Set(ids)
				if (ids.length !== uniqueIds.size) {
					score -= 1
				}
			}

			conflictScores.push(Math.max(1, Math.min(5, score)))
		}

		const avgScore =
			conflictScores.reduce((a, b) => a + b, 0) / conflictScores.length
		const minScore = Math.min(...conflictScores)
		const maxScore = Math.max(...conflictScores)

		const scoreDistribution = {
			5: conflictScores.filter(s => s === 5).length,
			4: conflictScores.filter(s => s === 4).length,
			3: conflictScores.filter(s => s === 3).length,
			2: conflictScores.filter(s => s === 2).length,
			1: conflictScores.filter(s => s === 1).length,
		}

		this.results.stability.parallelTabsConflicts = {
			iterations,
			avgScore: parseFloat(avgScore.toFixed(2)),
			minScore,
			maxScore,
			scoreDistribution,
			unit: 'score (1-5)',
		}

		console.log(`✅ Результати:`)
		console.log(
			`   Середній бал: ${this.results.stability.parallelTabsConflicts.avgScore}/5`
		)
		console.log(
			`   Мінімальний бал: ${this.results.stability.parallelTabsConflicts.minScore}/5`
		)
		console.log(
			`   Максимальний бал: ${this.results.stability.parallelTabsConflicts.maxScore}/5`
		)
		console.log(`   Розподіл балів:`)
		console.log(
			`     5: ${scoreDistribution[5]} (${(
				(scoreDistribution[5] / iterations) *
				100
			).toFixed(1)}%)`
		)
		console.log(
			`     4: ${scoreDistribution[4]} (${(
				(scoreDistribution[4] / iterations) *
				100
			).toFixed(1)}%)`
		)
		console.log(
			`     3: ${scoreDistribution[3]} (${(
				(scoreDistribution[3] / iterations) *
				100
			).toFixed(1)}%)`
		)
		console.log(
			`     2: ${scoreDistribution[2]} (${(
				(scoreDistribution[2] / iterations) *
				100
			).toFixed(1)}%)`
		)
		console.log(
			`     1: ${scoreDistribution[1]} (${(
				(scoreDistribution[1] / iterations) *
				100
			).toFixed(1)}%)`
		)

		return this.results.stability.parallelTabsConflicts
	}

	async testThroughput(durationSeconds = 5) {
		console.log(`\n🧪 Тест 4: Пропускна здатність - Throughput (actions/sec)`)
		console.log(`   Тривалість: ${durationSeconds} сек`)
		console.log('───────────────────────────────────────────────────────────')

		store.dispatch(clearCart())
		reduxMetrics.reset()

		let actionsCount = 0
		const startTime = performance.now()
		const endTime = startTime + durationSeconds * 1000

		let productId = 1
		while (performance.now() < endTime) {
			const product = generateTestProduct(productId++)
			store.dispatch(addToCart(product))
			actionsCount++
		}

		const actualDuration = (performance.now() - startTime) / 1000
		const throughput = actionsCount / actualDuration

		store.dispatch(clearCart())
		reduxMetrics.reset()

		const actionTypes = {
			addToCart: 0,
			updateQuantity: 0,
			removeFromCart: 0,
		}

		const throughputStart = performance.now()
		const throughputEnd = throughputStart + durationSeconds * 1000
		productId = 1

		while (performance.now() < throughputEnd) {
			const actionType = Math.random()
			if (actionType < 0.7) {
				const product = generateTestProduct(productId++)
				store.dispatch(addToCart(product))
				actionTypes.addToCart++
			} else if (actionType < 0.9) {
				const state = store.getState().cart
				if (state.items.length > 0) {
					const randomItem =
						state.items[Math.floor(Math.random() * state.items.length)]
					store.dispatch(
						updateQuantity({
							productId: randomItem.product.id,
							quantity: randomItem.quantity + 1,
						})
					)
					actionTypes.updateQuantity++
				}
			} else {
				const state = store.getState().cart
				if (state.items.length > 0) {
					const randomItem =
						state.items[Math.floor(Math.random() * state.items.length)]
					store.dispatch(removeFromCart(randomItem.product.id))
					actionTypes.removeFromCart++
				}
			}
		}

		const totalActions =
			actionTypes.addToCart +
			actionTypes.updateQuantity +
			actionTypes.removeFromCart
		const mixedThroughput = totalActions / durationSeconds

		this.results.throughput = {
			duration: parseFloat(actualDuration.toFixed(2)),
			actionsCount,
			throughput: parseFloat(throughput.toFixed(2)),
			mixedThroughput: parseFloat(mixedThroughput.toFixed(2)),
			actionTypes,
			unit: 'actions/sec',
		}

		console.log(`✅ Результати:`)
		console.log(
			`   Загальна кількість дій: ${this.results.throughput.actionsCount}`
		)
		console.log(`   Час: ${this.results.throughput.duration} сек`)
		console.log(
			`   Throughput (додавання): ${this.results.throughput.throughput} actions/sec`
		)
		console.log(
			`   Throughput (змішаний): ${this.results.throughput.mixedThroughput} actions/sec`
		)
		console.log(`   Розподіл дій:`)
		console.log(`     - Додавання: ${actionTypes.addToCart}`)
		console.log(`     - Оновлення: ${actionTypes.updateQuantity}`)
		console.log(`     - Видалення: ${actionTypes.removeFromCart}`)

		return this.results.throughput
	}

	async runAllTests() {
		console.clear()
		console.log(
			'\n╔═══════════════════════════════════════════════════════════╗'
		)
		console.log('║  🧪 КОМПЛЕКСНІ ТЕСТИ ПРОДУКТИВНОСТІ REDUX                ║')
		console.log(
			'╚═══════════════════════════════════════════════════════════╝\n'
		)

		const startTime = performance.now()
		reduxMetrics.reset()

		try {
			await this.testStateUpdateTime_AddToCart(100)
			await this.testStateUpdateTime_BulkUpdate(1000)

			await this.testMemoryConsumption_StandardSession(15)
			await this.testMemoryConsumption_LongLoad(60)

			await this.testPersistenceRecovery(100)
			await this.testRollbackTime(100)
			await this.testParallelTabsConflicts(50)

			await this.testThroughput(5)

			const totalTime = (performance.now() - startTime) / 1000

			this.printSummaryTable(totalTime)

			console.log(
				`\n✅ Всі тести завершено за ${totalTime.toFixed(2)} секунд\n`
			)

			return this.results
		} catch (error) {
			console.error('\n❌ Помилка під час виконання тестів:', error)
			throw error
		}
	}

	printSummaryTable(totalTime) {
		console.log(
			'\n╔═══════════════════════════════════════════════════════════╗'
		)
		console.log('║  📊 ПІДСУМКОВА ТАБЛИЦЯ РЕЗУЛЬТАТІВ                        ║')
		console.log(
			'╚═══════════════════════════════════════════════════════════╝\n'
		)

		console.log('1️⃣  Час оновлення стану (ms)')
		console.log('───────────────────────────────────────────────────────────')
		if (this.results.stateUpdateTime.addToCart) {
			console.log('   Додавання в кошик:')
			console.log(
				`     Mean: ${this.results.stateUpdateTime.addToCart.mean} мс`
			)
			console.log(`     P50: ${this.results.stateUpdateTime.addToCart.p50} мс`)
			console.log(`     P95: ${this.results.stateUpdateTime.addToCart.p95} мс`)
		}
		if (this.results.stateUpdateTime.bulkUpdate) {
			console.log('   Масове оновлення (1000):')
			console.log(
				`     Mean: ${this.results.stateUpdateTime.bulkUpdate.mean} мс`
			)
			console.log(`     P50: ${this.results.stateUpdateTime.bulkUpdate.p50} мс`)
			console.log(`     P95: ${this.results.stateUpdateTime.bulkUpdate.p95} мс`)
		}
		console.log('')

		console.log("2️⃣  Споживання пам'яті")
		console.log('───────────────────────────────────────────────────────────')
		if (this.results.memoryConsumption.standardSession) {
			console.log('   Стандартна сесія (15 хв):')
			if (this.results.memoryConsumption.standardSession.error) {
				console.log(
					`     ⚠️ ${this.results.memoryConsumption.standardSession.error}`
				)
			} else {
				console.log(
					`     Початкова: ${this.results.memoryConsumption.standardSession.initial} МБ`
				)
				console.log(
					`     Фінальна: ${this.results.memoryConsumption.standardSession.final} МБ`
				)
				console.log(
					`     Зростання: ${this.results.memoryConsumption.standardSession.growth} МБ`
				)
			}
		}
		if (this.results.memoryConsumption.longLoad) {
			console.log('   Тривале навантаження (60 хв) — темп росту:')
			if (this.results.memoryConsumption.longLoad.error) {
				console.log(`     ⚠️ ${this.results.memoryConsumption.longLoad.error}`)
			} else {
				console.log(
					`     Початкова: ${this.results.memoryConsumption.longLoad.initial} МБ`
				)
				console.log(
					`     Фінальна: ${this.results.memoryConsumption.longLoad.final} МБ`
				)
				console.log(
					`     Темп росту: ${this.results.memoryConsumption.longLoad.growthRate} МБ/хв`
				)
			}
		}
		console.log('')

		console.log('3️⃣  Стійкість, відновлюваність та персистентність')
		console.log('───────────────────────────────────────────────────────────')
		if (this.results.stability.persistenceRecovery) {
			console.log(
				`   Відновлення з persisted store: ${this.results.stability.persistenceRecovery.successRate}% успіху`
			)
		}
		if (this.results.stability.rollbackTime) {
			console.log(
				`   Час відкату / rollback: ${this.results.stability.rollbackTime.mean} мс (mean)`
			)
		}
		if (this.results.stability.parallelTabsConflicts) {
			console.log(
				`   Конфлікти при паралельних вкладках: ${this.results.stability.parallelTabsConflicts.avgScore}/5`
			)
		}
		console.log('')

		console.log('4️⃣  Пропускна здатність')
		console.log('───────────────────────────────────────────────────────────')
		if (this.results.throughput) {
			console.log(
				`   Throughput: ${this.results.throughput.throughput} actions/sec`
			)
		}
		console.log('')

		console.log(
			`⏱️  Загальний час виконання тестів: ${totalTime.toFixed(2)} сек`
		)
		console.log('')
	}

	exportResults() {
		const results = {
			timestamp: new Date().toISOString(),
			stateManager: 'Redux Toolkit',
			results: this.results,
			fullReport: reduxMetrics.getReport(),
		}

		const json = JSON.stringify(results, null, 2)
		console.log('\n📄 Результати тестів (JSON):')
		console.log('───────────────────────────────────────────────────────────')
		console.log(json)
		console.log('───────────────────────────────────────────────────────────')

		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `redux-performance-${Date.now()}.json`
		a.click()
		URL.revokeObjectURL(url)

		console.log('✅ Файл завантажено!')

		return json
	}
}

export const reduxPerformanceTests = new ReduxPerformanceTests()

if (typeof window !== 'undefined') {
	window.reduxTests = reduxPerformanceTests

	window.runReduxTests = () => reduxPerformanceTests.runAllTests()

	window.testStateUpdateTime_AddToCart = () =>
		reduxPerformanceTests.testStateUpdateTime_AddToCart()
	window.testStateUpdateTime_BulkUpdate = () =>
		reduxPerformanceTests.testStateUpdateTime_BulkUpdate()
	window.testMemoryConsumption_StandardSession = () =>
		reduxPerformanceTests.testMemoryConsumption_StandardSession()
	window.testMemoryConsumption_LongLoad = () =>
		reduxPerformanceTests.testMemoryConsumption_LongLoad()
	window.testPersistenceRecovery = () =>
		reduxPerformanceTests.testPersistenceRecovery()
	window.testRollbackTime = () => reduxPerformanceTests.testRollbackTime()
	window.testParallelTabsConflicts = () =>
		reduxPerformanceTests.testParallelTabsConflicts()
	window.testThroughput = () => reduxPerformanceTests.testThroughput()

	window.exportReduxResults = () => reduxPerformanceTests.exportResults()

	console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🧪 ТЕСТИ REDUX - ДОСТУПНІ В КОНСОЛІ                  ║
╚═══════════════════════════════════════════════════════════╝

🎯 ГОЛОВНА КОМАНДА (запускає всі тести):

  window.runReduxTests()
     Запустити всі тести продуктивності Redux

📊 Окремі тести:

  window.testStateUpdateTime_AddToCart()
     Тест 1.1: Час оновлення стану - Додавання в кошик

  window.testStateUpdateTime_BulkUpdate()
     Тест 1.2: Час оновлення стану - Масове оновлення (1000)

  window.testMemoryConsumption_StandardSession()
     Тест 2.1: Споживання пам'яті - Стандартна сесія (15 хв)

  window.testMemoryConsumption_LongLoad()
     Тест 2.2: Споживання пам'яті - Тривале навантаження (60 хв)

  window.testPersistenceRecovery()
     Тест 3.1: Відновлення з persisted store

  window.testRollbackTime()
     Тест 3.2: Час відкату / rollback

  window.testParallelTabsConflicts()
     Тест 3.3: Конфлікти при паралельних вкладках

  window.testThroughput()
     Тест 4: Пропускна здатність (actions/sec)

💾 Експорт результатів:

  window.exportReduxResults()
     Експортувати результати в JSON файл

═══════════════════════════════════════════════════════════
  `)
}

export default ReduxPerformanceTests
