/* Benchmark adapter: maps the cart operations of this version onto the unified harness (benchCore.js). */
import { hookMetrics, installBench } from './benchCore'
import { useCartStore } from '../app/store'
import { metrics } from '../app/performance/metrics'

hookMetrics(metrics)

installBench({
	name: 'zustand',
	addToCart: product => useCartStore.getState().addToCart(product),
	updateQuantity: (id, quantity) => useCartStore.getState().updateQuantity(id, quantity),
	removeFromCart: id => useCartStore.getState().removeFromCart(id),
	clearCart: () => useCartStore.getState().clearCart(),
	getItems: () => useCartStore.getState().items,
})
