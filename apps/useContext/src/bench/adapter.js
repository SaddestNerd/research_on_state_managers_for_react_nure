/* Benchmark adapter: maps the cart operations of this version onto the unified harness (benchCore.js). */
import { BENCH_MODE, hookMetrics, installBench } from './benchCore'
import { useCart } from '../app/context'
import { metrics } from '../app/performance/metrics'

hookMetrics(metrics)

// The cart lives in a React context, so its operations are only reachable from
// inside the component tree. This component renders nothing; it only keeps a
// reference to the current context value for the harness.
const cartRef = { current: null }

function Bridge() {
	cartRef.current = useCart()
	return null
}

export const BenchBridge = BENCH_MODE ? Bridge : () => null

installBench({
	name: 'context',
	addToCart: product => cartRef.current.addToCart(product),
	updateQuantity: (id, quantity) => cartRef.current.updateQuantity(id, quantity),
	removeFromCart: id => cartRef.current.removeFromCart(id),
	clearCart: () => cartRef.current.clearCart(),
	getItems: () => (cartRef.current ? cartRef.current.items : []),
})
