import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../services/slices/auth/slice'
import productsReducer from '../services/slices/products/slice'
import cartReducer from '../services/slices/cart/slice'
import {
	performanceMiddleware,
	memoryMiddleware,
} from '../performance/reduxMiddleware'
import { reduxMetrics } from '../performance/metrics'

const storeInitStart = performance.now()

export const store = configureStore({
	reducer: {
		auth: authReducer,
		products: productsReducer,
		cart: cartReducer,
	},
	middleware: getDefaultMiddleware =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: ['persist/PERSIST'],
			},
		})
			.concat(performanceMiddleware)
			.concat(memoryMiddleware),
})

const storeInitTime = performance.now() - storeInitStart
reduxMetrics.setStoreInitTime(storeInitTime)

console.log(`🚀 Redux Store ініціалізовано за ${storeInitTime.toFixed(3)} мс`)

reduxMetrics.measureStateSize(store.getState())
reduxMetrics.measureMemory()
