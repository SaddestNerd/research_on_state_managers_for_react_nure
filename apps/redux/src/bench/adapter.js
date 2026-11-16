/* Benchmark adapter: maps the cart operations of this version onto the unified harness (benchCore.js). */
import { hookMetrics, installBench } from './benchCore'
import { store } from '../app/store/store'
import {
	addToCart,
	removeFromCart,
	updateQuantity,
	clearCart,
} from '../app/services/slices/cart/slice'
import { reduxMetrics } from '../app/performance/metrics'

hookMetrics(reduxMetrics)

installBench({
	name: 'redux',
	addToCart: product => store.dispatch(addToCart(product)),
	updateQuantity: (productId, quantity) => store.dispatch(updateQuantity({ productId, quantity })),
	removeFromCart: id => store.dispatch(removeFromCart(id)),
	clearCart: () => store.dispatch(clearCart()),
	getItems: () => store.getState().cart.items,
})
