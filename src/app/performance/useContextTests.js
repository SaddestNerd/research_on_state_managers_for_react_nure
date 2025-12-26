import { useEffect } from 'react'
import { contextTestRunner } from './runContextTests'

export const useContextTests = (
	cartContext,
	productsContext = null,
	authContext = null
) => {
	useEffect(() => {
		if (cartContext) {
			contextTestRunner.initialize(cartContext, productsContext, authContext)

			if (process.env.NODE_ENV === 'development') {
				console.log('✅ Тести продуктивності Context API ініціалізовано')
				console.log(
					'   Використайте window.contextTestRunner для запуску тестів'
				)
			}
		}
	}, [cartContext, productsContext, authContext])

	return {
		runAllTests: () => contextTestRunner.runAllTests(),
		runQuickTests: () => contextTestRunner.runQuickTests(),
		testStateUpdateTimes: () => contextTestRunner.testStateUpdateTimes(),
		testMemoryConsumption: () => contextTestRunner.testMemoryConsumption(),
		testPersistence: () => contextTestRunner.testPersistence(),
	}
}

export default useContextTests
