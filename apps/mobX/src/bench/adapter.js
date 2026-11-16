/* Benchmark adapter: maps the cart operations of this version onto the unified harness (benchCore.js). */
import { hookMetrics, installBench } from './benchCore'
import { metrics } from '../app/performance/metrics'

hookMetrics(metrics)

export function registerBenchStores(rootStore) {
	const cart = rootStore.cartStore
	installBench({
		name: 'mobx',
		addToCart: product => cart.addToCart(product),
		updateQuantity: (id, quantity) => cart.updateQuantity(id, quantity),
		removeFromCart: id => cart.removeFromCart(id),
		clearCart: () => cart.clearCart(),
		getItems: () => cart.items,
	})
}
