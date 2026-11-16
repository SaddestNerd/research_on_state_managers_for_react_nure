import { store } from '../store/store'
import {
	addToCart,
	removeFromCart,
	updateQuantity,
	clearCart,
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

class CartPerformanceTests {
	constructor() {
		this.results = {
			stateUpdateTime: null,
			rerenderFrequency: null,
			memoryConsumption: null,
			throughput: null,
			scalability: null,
			stability: null,
			recovery: null,
			persistence: null,
		}
	}

	async testStateUpdateTime(iterations = 100) {
		console.log(
			`\n🧪 Тест 1: Час оновлення стану (ms) — Додавання в кошик (single item)`
		)
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

		const sorted = [...updateTimes].sort((a, b) => a - b)
		const p50 = sorted[Math.floor(sorted.length * 0.5)]
		const p95 = sorted[Math.floor(sorted.length * 0.95)]
		const p99 = sorted[Math.floor(sorted.length * 0.99)]
		const mean = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length

		this.results.stateUpdateTime = {
			mean: mean.toFixed(3),
			p50: p50.toFixed(3),
			p95: p95.toFixed(3),
			p99: p99.toFixed(3),
			min: Math.min(...updateTimes).toFixed(3),
			max: Math.max(...updateTimes).toFixed(3),
			unit: 'ms',
		}

		console.log(`✅ Результати:`)
		console.log(`   Середнє (Mean): ${this.results.stateUpdateTime.mean} мс`)
		console.log(`   Медіана (P50): ${this.results.stateUpdateTime.p50} мс`)
		console.log(`   P95: ${this.results.stateUpdateTime.p95} мс`)
		console.log(`   P99: ${this.results.stateUpdateTime.p99} мс`)
		console.log(`   Мін: ${this.results.stateUpdateTime.min} мс`)
		console.log(`   Макс: ${this.results.stateUpdateTime.max} мс`)

		return this.results.stateUpdateTime
	}

	async testRerenderFrequency(iterations = 50) {
		console.log(`\n🧪 Тест 2: Частота ререндерингів (на 1 дію)`)
		console.log(`   Ітерацій: ${iterations}`)
		console.log('───────────────────────────────────────────────────────────')

		store.dispatch(clearCart())
		reduxMetrics.reset()

		const rerendersPerAction = []

		for (let i = 0; i < iterations; i++) {
			const beforeRenders = reduxMetrics.getReport().rerenders.totalRerenders

			const product = generateTestProduct(i + 1)
			store.dispatch(addToCart(product))

			await new Promise(resolve => setTimeout(resolve, 10))

			const afterRenders = reduxMetrics.getReport().rerenders.totalRerenders
			const rendersForAction = afterRenders - beforeRenders

			rerendersPerAction.push(rendersForAction)
		}

		const avgRenders =
			rerendersPerAction.reduce((a, b) => a + b, 0) / rerendersPerAction.length
		const minRenders = Math.min(...rerendersPerAction)
		const maxRenders = Math.max(...rerendersPerAction)
		const unnecessaryRenders = Math.max(0, avgRenders - 1)
		const unnecessaryPercent =
			avgRenders > 0 ? (unnecessaryRenders / avgRenders) * 100 : 0

		this.results.rerenderFrequency = {
			avgPerAction: avgRenders.toFixed(2),
			minPerAction: minRenders,
			maxPerAction: maxRenders,
			unnecessaryRenders: unnecessaryRenders.toFixed(2),
			unnecessaryPercent: unnecessaryPercent.toFixed(2),
			unit: 'renders per action',
		}

		console.log(`✅ Результати:`)
		console.log(
			`   Середня кількість рендерів на 1 дію: ${this.results.rerenderFrequency.avgPerAction}`
		)
		console.log(`   Мінімум: ${this.results.rerenderFrequency.minPerAction}`)
		console.log(`   Максимум: ${this.results.rerenderFrequency.maxPerAction}`)
		console.log(
			`   Непотрібних рендерів: ${this.results.rerenderFrequency.unnecessaryRenders}`
		)
		console.log(
			`   % непотрібних рендерів: ${this.results.rerenderFrequency.unnecessaryPercent}%`
		)

		return this.results.rerenderFrequency
	}

	async testMemoryConsumption(iterations = 100) {
		console.log(
			`\n🧪 Тест 3: Споживання пам'яті (JS heap) — середнє / пік (MB)`
		)
		console.log(`   Ітерацій: ${iterations}`)
		console.log('───────────────────────────────────────────────────────────')

		if (!performance.memory) {
			console.warn('⚠️ performance.memory недоступний в цьому браузері')
			this.results.memoryConsumption = {
				error: 'performance.memory недоступний',
				note: 'Потрібен Chrome або інший браузер з підтримкою performance.memory',
			}
			return this.results.memoryConsumption
		}

		store.dispatch(clearCart())
		reduxMetrics.reset()

		const initialMemory = performance.memory.usedJSHeapSize / 1024 / 1024
		reduxMetrics.measureMemory()

		const memoryMeasurements = [initialMemory]

		for (let i = 0; i < iterations; i++) {
			const product = generateTestProduct(i + 1)
			store.dispatch(addToCart(product))

			if (i % 10 === 0 || i === iterations - 1) {
				const memory = performance.memory.usedJSHeapSize / 1024 / 1024
				memoryMeasurements.push(memory)
				reduxMetrics.measureMemory()
			}
		}

		const finalMemory = performance.memory.usedJSHeapSize / 1024 / 1024
		memoryMeasurements.push(finalMemory)

		const avgMemory =
			memoryMeasurements.reduce((a, b) => a + b, 0) / memoryMeasurements.length
		const peakMemory = Math.max(...memoryMeasurements)
		const minMemory = Math.min(...memoryMeasurements)
		const memoryGrowth = finalMemory - initialMemory

		this.results.memoryConsumption = {
			initial: initialMemory.toFixed(2),
			final: finalMemory.toFixed(2),
			average: avgMemory.toFixed(2),
			peak: peakMemory.toFixed(2),
			min: minMemory.toFixed(2),
			growth: memoryGrowth.toFixed(2),
			unit: 'MB',
		}

		console.log(`✅ Результати:`)
		console.log(
			`   Початкова пам'ять: ${this.results.memoryConsumption.initial} МБ`
		)
		console.log(
			`   Фінальна пам'ять: ${this.results.memoryConsumption.final} МБ`
		)
		console.log(
			`   Середнє споживання: ${this.results.memoryConsumption.average} МБ`
		)
		console.log(
			`   Пікове споживання: ${this.results.memoryConsumption.peak} МБ`
		)
		console.log(
			`   Мінімальне споживання: ${this.results.memoryConsumption.min} МБ`
		)
		console.log(
			`   Зростання пам'яті: ${this.results.memoryConsumption.growth} МБ`
		)

		return this.results.memoryConsumption
	}

	async testThroughputAndScalability() {
		console.log(`\n🧪 Тест 4: Пропускна здатність / масштабованість`)
		console.log('───────────────────────────────────────────────────────────')

		console.log(`\n   📊 4.1. Пропускна здатність (actions/sec)`)
		store.dispatch(clearCart())
		reduxMetrics.reset()

		const durationSeconds = 5
		let actionsCount = 0
		const startTime = performance.now()
		const endTime = startTime + durationSeconds * 1000

		while (performance.now() < endTime) {
			const product = generateTestProduct(actionsCount + 1)
			store.dispatch(addToCart(product))
			actionsCount++
		}

		const actualDuration = (performance.now() - startTime) / 1000
		const throughput = actionsCount / actualDuration

		this.results.throughput = {
			actionsCount,
			duration: actualDuration.toFixed(2),
			throughput: throughput.toFixed(2),
			unit: 'actions/sec',
		}

		console.log(`   ✅ Виконано дій: ${this.results.throughput.actionsCount}`)
		console.log(`   ✅ Час: ${this.results.throughput.duration} сек`)
		console.log(
			`   ✅ Пропускна здатність: ${this.results.throughput.throughput} actions/sec`
		)

		console.log(
			`\n   📊 4.2. Масштабованість (продуктивність при різних обсягах)`
		)

		const scalabilityResults = []
		const testSizes = [10, 50, 100, 500, 1000]

		for (const size of testSizes) {
			store.dispatch(clearCart())
			reduxMetrics.reset()

			const startTime = performance.now()

			for (let i = 0; i < size; i++) {
				const product = generateTestProduct(i + 1)
				store.dispatch(addToCart(product))
			}

			await new Promise(resolve => setTimeout(resolve, 50))

			const endTime = performance.now()
			const totalTime = endTime - startTime
			const avgTimePerItem = totalTime / size

			scalabilityResults.push({
				items: size,
				totalTime: totalTime.toFixed(2),
				avgTimePerItem: avgTimePerItem.toFixed(3),
				throughput: (size / (totalTime / 1000)).toFixed(2),
			})
		}

		this.results.scalability = {
			results: scalabilityResults,
			unit: 'ms per item',
		}

		console.log(`   ✅ Результати масштабованості:`)
		console.log(`   | Кількість | Загальний час | Час на item | Throughput |`)
		console.log(`   | --------- | ------------- | ----------- | ---------- |`)
		scalabilityResults.forEach(r => {
			console.log(
				`   | ${String(r.items).padEnd(9)} | ${String(
					r.totalTime + ' мс'
				).padEnd(13)} | ${String(r.avgTimePerItem + ' мс').padEnd(
					11
				)} | ${String(r.throughput + ' items/sec').padEnd(10)} |`
			)
		})

		return {
			throughput: this.results.throughput,
			scalability: this.results.scalability,
		}
	}

	async testStabilityRecoveryPersistence(iterations = 100) {
		console.log(`\n🧪 Тест 5: Стійкість / відновлюваність / персистентність`)
		console.log(`   Ітерацій: ${iterations}`)
		console.log('───────────────────────────────────────────────────────────')

		console.log(
			`\n   📊 5.1. Стійкість (стабільність при багаторазових операціях)`
		)
		store.dispatch(clearCart())
		reduxMetrics.reset()

		const stabilityTimes = []
		let errorCount = 0

		for (let i = 0; i < iterations; i++) {
			try {
				const product = generateTestProduct(i + 1)
				const startTime = performance.now()

				store.dispatch(addToCart(product))

				const state = store.getState()
				if (!state.cart || !state.cart.items) {
					errorCount++
					continue
				}

				const endTime = performance.now()
				stabilityTimes.push(endTime - startTime)
			} catch (error) {
				errorCount++
				console.warn(`   ⚠️ Помилка на ітерації ${i}:`, error)
			}
		}

		const avgTime =
			stabilityTimes.reduce((a, b) => a + b, 0) / stabilityTimes.length
		const successRate = ((iterations - errorCount) / iterations) * 100

		this.results.stability = {
			iterations,
			successCount: iterations - errorCount,
			errorCount,
			successRate: successRate.toFixed(2),
			avgTime: avgTime.toFixed(3),
			unit: 'ms',
		}

		console.log(
			`   ✅ Успішних операцій: ${this.results.stability.successCount}/${iterations}`
		)
		console.log(`   ✅ Помилок: ${this.results.stability.errorCount}`)
		console.log(`   ✅ % успіху: ${this.results.stability.successRate}%`)
		console.log(
			`   ✅ Середній час операції: ${this.results.stability.avgTime} мс`
		)

		console.log(`\n   📊 5.2. Відновлюваність (відновлення після помилок)`)

		store.dispatch(clearCart())

		for (let i = 0; i < 10; i++) {
			const product = generateTestProduct(i + 1)
			store.dispatch(addToCart(product))
		}

		const initialState = JSON.parse(JSON.stringify(store.getState().cart))
		let recoverySuccessCount = 0
		const recoveryTimes = []

		for (let i = 0; i < 50; i++) {
			store.dispatch(clearCart())

			const startTime = performance.now()

			try {
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

				const recoveredState = store.getState().cart
				if (
					recoveredState.items.length === initialState.items.length &&
					recoveredState.totalItems === initialState.totalItems
				) {
					recoverySuccessCount++
				}

				const endTime = performance.now()
				recoveryTimes.push(endTime - startTime)
			} catch (error) {
				console.warn(`   ⚠️ Помилка відновлення на ітерації ${i}:`, error)
			}
		}

		const avgRecoveryTime =
			recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
		const recoverySuccessRate = (recoverySuccessCount / 50) * 100

		this.results.recovery = {
			iterations: 50,
			successCount: recoverySuccessCount,
			successRate: recoverySuccessRate.toFixed(2),
			avgRecoveryTime: avgRecoveryTime.toFixed(3),
			unit: 'ms',
		}

		console.log(
			`   ✅ Успішних відновлень: ${this.results.recovery.successCount}/50`
		)
		console.log(
			`   ✅ % успіху відновлення: ${this.results.recovery.successRate}%`
		)
		console.log(
			`   ✅ Середній час відновлення: ${this.results.recovery.avgRecoveryTime} мс`
		)

		console.log(
			`\n   📊 5.3. Персистентність (збереження та відновлення стану)`
		)

		let persistenceSuccessCount = 0
		let persistenceFailCount = 0
		const persistenceTimes = []

		for (let i = 0; i < iterations; i++) {
			store.dispatch(clearCart())

			for (let j = 0; j < 10; j++) {
				const product = generateTestProduct(j + 1)
				store.dispatch(addToCart(product))
			}

			const startTime = performance.now()
			const state = store.getState()
			const cartState = JSON.stringify(state.cart)

			try {
				const restoredCart = JSON.parse(cartState)

				if (
					restoredCart.items &&
					restoredCart.items.length === 10 &&
					restoredCart.totalItems === 10 &&
					restoredCart.totalPrice > 0
				) {
					persistenceSuccessCount++
				} else {
					persistenceFailCount++
				}

				const endTime = performance.now()
				persistenceTimes.push(endTime - startTime)
			} catch (error) {
				persistenceFailCount++
			}
		}

		const persistenceSuccessRate = (persistenceSuccessCount / iterations) * 100
		const avgPersistenceTime =
			persistenceTimes.reduce((a, b) => a + b, 0) / persistenceTimes.length

		this.results.persistence = {
			iterations,
			successCount: persistenceSuccessCount,
			failCount: persistenceFailCount,
			successRate: persistenceSuccessRate.toFixed(2),
			avgTime: avgPersistenceTime.toFixed(3),
			unit: 'ms',
		}

		console.log(
			`   ✅ Успішних відновлень: ${this.results.persistence.successCount}/${iterations}`
		)
		console.log(`   ✅ Невдалих: ${this.results.persistence.failCount}`)
		console.log(`   ✅ % успіху: ${this.results.persistence.successRate}%`)
		console.log(
			`   ✅ Середній час операції: ${this.results.persistence.avgTime} мс`
		)

		return {
			stability: this.results.stability,
			recovery: this.results.recovery,
			persistence: this.results.persistence,
		}
	}

	async runAllTests() {
		console.clear()
		console.log(
			'\n╔═══════════════════════════════════════════════════════════╗'
		)
		console.log('║  🧪 КОМПЛЕКСНІ ТЕСТИ ПРОДУКТИВНОСТІ REDUX КОРЗИНИ        ║')
		console.log(
			'╚═══════════════════════════════════════════════════════════╝\n'
		)

		const startTime = performance.now()
		reduxMetrics.reset()

		try {
			await this.testStateUpdateTime(100)

			await this.testRerenderFrequency(50)

			await this.testMemoryConsumption(100)

			await this.testThroughputAndScalability()

			await this.testStabilityRecoveryPersistence(100)

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

		console.log(
			'1️⃣  Час оновлення стану (ms) — Додавання в кошик (single item)'
		)
		console.log('───────────────────────────────────────────────────────────')
		if (this.results.stateUpdateTime) {
			console.log(`   Середнє (Mean): ${this.results.stateUpdateTime.mean} мс`)
			console.log(`   Медіана (P50): ${this.results.stateUpdateTime.p50} мс`)
			console.log(`   P95: ${this.results.stateUpdateTime.p95} мс`)
			console.log(`   P99: ${this.results.stateUpdateTime.p99} мс`)
		}
		console.log('')

		console.log('2️⃣  Частота ререндерингів (на 1 дію)')
		console.log('───────────────────────────────────────────────────────────')
		if (this.results.rerenderFrequency) {
			console.log(
				`   Середня кількість рендерів на 1 дію: ${this.results.rerenderFrequency.avgPerAction}`
			)
			console.log(
				`   Непотрібних рендерів: ${this.results.rerenderFrequency.unnecessaryRenders}`
			)
			console.log(
				`   % непотрібних рендерів: ${this.results.rerenderFrequency.unnecessaryPercent}%`
			)
		}
		console.log('')

		console.log('3️⃣  Споживання памяті (JS heap) — середнє / пік (MB)')
		console.log('───────────────────────────────────────────────────────────')
		if (this.results.memoryConsumption) {
			if (this.results.memoryConsumption.error) {
				console.log(`   ⚠️ ${this.results.memoryConsumption.error}`)
			} else {
				console.log(
					`   Середнє споживання: ${this.results.memoryConsumption.average} МБ`
				)
				console.log(
					`   Пікове споживання: ${this.results.memoryConsumption.peak} МБ`
				)
				console.log(
					`   Зростання пам'яті: ${this.results.memoryConsumption.growth} МБ`
				)
			}
		}
		console.log('')

		console.log('4️⃣  Пропускна здатність / масштабованість')
		console.log('───────────────────────────────────────────────────────────')
		if (this.results.throughput) {
			console.log(
				`   Пропускна здатність: ${this.results.throughput.throughput} actions/sec`
			)
		}
		if (this.results.scalability && this.results.scalability.results) {
			console.log(`   Масштабованість (середній час на item):`)
			this.results.scalability.results.forEach(r => {
				console.log(`     - ${r.items} items: ${r.avgTimePerItem} мс/item`)
			})
		}
		console.log('')

		console.log('5️⃣  Стійкість / відновлюваність / персистентність')
		console.log('───────────────────────────────────────────────────────────')
		if (this.results.stability) {
			console.log(`   Стійкість: ${this.results.stability.successRate}% успіху`)
		}
		if (this.results.recovery) {
			console.log(
				`   Відновлюваність: ${this.results.recovery.successRate}% успіху`
			)
		}
		if (this.results.persistence) {
			console.log(
				`   Персистентність: ${this.results.persistence.successRate}% успіху`
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
		a.download = `redux-cart-performance-${Date.now()}.json`
		a.click()
		URL.revokeObjectURL(url)

		console.log('✅ Файл завантажено!')

		return json
	}
}

export const cartPerformanceTests = new CartPerformanceTests()

if (typeof window !== 'undefined') {
	window.cartTests = cartPerformanceTests

	window.runCartTests = () => cartPerformanceTests.runAllTests()

	window.testStateUpdateTime = () => cartPerformanceTests.testStateUpdateTime()
	window.testRerenderFrequency = () =>
		cartPerformanceTests.testRerenderFrequency()
	window.testMemoryConsumption = () =>
		cartPerformanceTests.testMemoryConsumption()
	window.testThroughputAndScalability = () =>
		cartPerformanceTests.testThroughputAndScalability()
	window.testStabilityRecoveryPersistence = () =>
		cartPerformanceTests.testStabilityRecoveryPersistence()

	window.exportCartResults = () => cartPerformanceTests.exportResults()

}

export default CartPerformanceTests
