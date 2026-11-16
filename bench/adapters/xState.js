/* Benchmark adapter: maps the cart operations of this version onto the unified harness (benchCore.js). */
import { BENCH_MODE, hookMetrics, installBench } from './benchCore'
import { useCart } from '../app/context'
import { metrics } from '../app/performance/metrics'

hookMetrics(metrics)

// The cart machine is started by CartProvider inside the component tree. This
// component renders nothing; it only keeps a reference to the running actor,
// whose snapshot is then read directly (like the store of the Redux, Zustand
// and MobX versions).
const actorRef = { current: null }

function Bridge() {
	actorRef.current = useCart().actorRef
	return null
}

export const BenchBridge = BENCH_MODE ? Bridge : () => null

installBench({
	name: 'xstate',
	addToCart: product => actorRef.current.send({ type: 'ADD_ITEM', product }),
	updateQuantity: (productId, quantity) =>
		actorRef.current.send({ type: 'UPDATE_QUANTITY', productId, quantity }),
	removeFromCart: productId => actorRef.current.send({ type: 'REMOVE_ITEM', productId }),
	clearCart: () => actorRef.current.send({ type: 'CLEAR' }),
	getItems: () => (actorRef.current ? actorRef.current.getSnapshot().context.items : []),
})
