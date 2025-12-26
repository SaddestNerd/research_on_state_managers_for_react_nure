import { contextPerformanceTests } from './contextPerformanceTests'
import { metrics } from './metrics'

class ContextTestRunner {
	constructor() {
		this.cartContext = null
		this.productsContext = null
		this.authContext = null
	}

	initialize(cartContext, productsContext = null, authContext = null) {
		this.cartContext = cartContext
		this.productsContext = productsContext
		this.authContext = authContext
	}

	async runAllTests() {
		console.log('\n')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('🚀 ЗАПУСК ВСІХ ТЕСТІВ ПРОДУКТИВНОСТІ CONTEXT API')
		console.log('═══════════════════════════════════════════════════════════')
		console.log('\n')

		if (!this.cartContext) {
			console.error('❌ Помилка: CartContext не ініціалізовано')
			console.log(
				'   Використайте: window.contextTestRunner.initialize(cartContext)'
			)
			return
		}

		metrics.reset()
		contextPerformanceTests.reset()

		try {
			await contextPerformanceTests.testCartAddStateUpdate(
				this.cartContext,
				100
			)

			const bulkUpdateFunction = async index => {
				const mockProduct = {
					id: index,
					title: `Product ${index}`,
					price: Math.random() * 100,
					images: ['test.jpg'],
				}
				this.cartContext.addToCart(mockProduct)
			}
			await contextPerformanceTests.testBulkUpdateStateUpdate(
				bulkUpdateFunction,
				1000
			)

			console.log('\n⏳ Запуск тесту стандартної сесії (1 хв)...')
			await contextPerformanceTests.testStandardSession(1)

			console.log('\n⏳ Запуск тесту тривалого навантаження (5 хв)...')
			await contextPerformanceTests.testLongLoadSession(5)

			const testCartData = {
				items: [
					{ product: { id: 1, title: 'Test', price: 10 }, quantity: 2 },
					{ product: { id: 2, title: 'Test 2', price: 20 }, quantity: 1 },
				],
				totalItems: 3,
				totalPrice: 40,
			}

			const recoveryFunction = async () => {
				try {
					const saved = localStorage.getItem('cart')
					return saved ? JSON.parse(saved) : null
				} catch (error) {
					return null
				}
			}

			await contextPerformanceTests.testPersistenceRecovery(
				recoveryFunction,
				testCartData
			)

			const stateSnapshot = { items: [], totalItems: 0, totalPrice: 0 }
			const rollbackFunction = async snapshot => {
				this.cartContext.clearCart()

				snapshot.items.forEach(item => {
					for (let i = 0; i < item.quantity; i++) {
						this.cartContext.addToCart(item.product)
					}
				})
			}

			await contextPerformanceTests.testRollbackTime(
				rollbackFunction,
				stateSnapshot
			)

			await contextPerformanceTests.testParallelTabsConflict()

			const actionFunction = async index => {
				const mockProduct = {
					id: index,
					title: `Product ${index}`,
					price: 10,
					images: ['test.jpg'],
				}
				this.cartContext.addToCart(mockProduct)
			}

			await contextPerformanceTests.testThroughput(actionFunction, 10)

			console.log('\n')
			contextPerformanceTests.printReport()

			console.log('✅ Всі тести завершено успішно!')
		} catch (error) {
			console.error('❌ Помилка під час виконання тестів:', error)
		}
	}

	async runQuickTests() {
		console.log('\n⚡ Запуск швидких тестів...\n')

		if (!this.cartContext) {
			console.error('❌ Помилка: CartContext не ініціалізовано')
			return
		}

		metrics.reset()
		contextPerformanceTests.reset()

		try {
			await contextPerformanceTests.testCartAddStateUpdate(this.cartContext, 50)

			const actionFunction = async index => {
				const mockProduct = {
					id: index,
					title: `Product ${index}`,
					price: 10,
					images: ['test.jpg'],
				}
				this.cartContext.addToCart(mockProduct)
			}

			await contextPerformanceTests.testThroughput(actionFunction, 5)

			contextPerformanceTests.printReport()
		} catch (error) {
			console.error('❌ Помилка під час виконання тестів:', error)
		}
	}

	async testStateUpdateTimes() {
		console.log('\n⏱️ Тест часу оновлення стану...\n')

		if (!this.cartContext) {
			console.error('❌ Помилка: CartContext не ініціалізовано')
			return
		}

		contextPerformanceTests.reset()

		await contextPerformanceTests.testCartAddStateUpdate(this.cartContext, 100)

		const bulkUpdateFunction = async index => {
			const mockProduct = {
				id: index,
				title: `Product ${index}`,
				price: Math.random() * 100,
				images: ['test.jpg'],
			}
			this.cartContext.addToCart(mockProduct)
		}

		await contextPerformanceTests.testBulkUpdateStateUpdate(
			bulkUpdateFunction,
			1000
		)

		const report = contextPerformanceTests.generateReport()
		console.log('\n📊 Результати тесту часу оновлення стану:')
		console.log(JSON.stringify(report.stateUpdateTimes, null, 2))
	}

	async testMemoryConsumption() {
		console.log("\n💾 Тест споживання пам'яті...\n")

		contextPerformanceTests.reset()

		console.log('⏳ Стандартна сесія (1 хв)...')
		await contextPerformanceTests.testStandardSession(1)

		console.log('\n⏳ Тривале навантаження (5 хв)...')
		await contextPerformanceTests.testLongLoadSession(5)

		const report = contextPerformanceTests.generateReport()
		console.log("\n📊 Результати тесту споживання пам'яті:")
		console.log(JSON.stringify(report.memoryConsumption, null, 2))
	}

	async testPersistence() {
		console.log('\n🔄 Тест персистентності...\n')

		if (!this.cartContext) {
			console.error('❌ Помилка: CartContext не ініціалізовано')
			return
		}

		contextPerformanceTests.reset()

		const testCartData = {
			items: [{ product: { id: 1, title: 'Test', price: 10 }, quantity: 2 }],
			totalItems: 2,
			totalPrice: 20,
		}

		const recoveryFunction = async () => {
			try {
				const saved = localStorage.getItem('cart')
				return saved ? JSON.parse(saved) : null
			} catch (error) {
				return null
			}
		}

		await contextPerformanceTests.testPersistenceRecovery(
			recoveryFunction,
			testCartData
		)
		await contextPerformanceTests.testParallelTabsConflict()

		const report = contextPerformanceTests.generateReport()
		console.log('\n📊 Результати тесту персистентності:')
		console.log(JSON.stringify(report.persistence, null, 2))
	}
}

export const contextTestRunner = new ContextTestRunner()

if (typeof window !== 'undefined') {
	window.contextTestRunner = contextTestRunner

	console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🚀 ЗАПУСК ТЕСТІВ ПРОДУКТИВНОСТІ CONTEXT API             ║
╚═══════════════════════════════════════════════════════════╝

Інструкція:

1. Отримайте доступ до Context через хук:
   const { addToCart } = useCart();
   window.contextTestRunner.initialize({ addToCart, ... });

2. Запустіть тести:
   🔹 window.contextTestRunner.runAllTests()
      Запустити всі тести (триває ~6 хв)

   🔹 window.contextTestRunner.runQuickTests()
      Швидкі тести (основні метрики)

   🔹 window.contextTestRunner.testStateUpdateTimes()
      Тільки тест часу оновлення стану

   🔹 window.contextTestRunner.testMemoryConsumption()
      Тільки тест споживання пам'яті

   🔹 window.contextTestRunner.testPersistence()
      Тільки тест персистентності

3. Переглянути результати:
   🔹 window.contextPerformanceTests.printReport()
   🔹 window.contextPerformanceTests.exportResults()

═══════════════════════════════════════════════════════════
  `)
}

export default ContextTestRunner
