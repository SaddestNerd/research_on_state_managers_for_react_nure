/*
 * Bindings of the catalog components (CatalogViews.jsx) to XState.
 * Pattern recommended for @xstate/react: the running cart actor is shared
 * through context (its reference is stable) and every component reads the
 * values it needs with useSelector, so it re-renders only when they change.
 */
import { memo, useMemo } from 'react'
import { useSelector } from '@xstate/react'
import { useAuth, useProducts, useCartActor } from '../../app/context'

export const reactive = component => memo(component)

export const useUserData = () => useAuth().userData

export const useCatalog = () => {
	const { products, loading, error, pagination, getProducts } = useProducts()
	return { products, loading, error, pagination, getProducts }
}

export const useCartTotals = () => {
	const actor = useCartActor()
	const totalItems = useSelector(actor, s => s.context.totalItems)
	const totalPrice = useSelector(actor, s => s.context.totalPrice)
	return { totalItems, totalPrice }
}

export const useCartItems = () => useSelector(useCartActor(), s => s.context.items)

export const useItemQuantity = productId =>
	useSelector(useCartActor(), s => {
		const item = s.context.items.find(it => it.product.id === productId)
		return item ? item.quantity : 0
	})

export const useCartActions = () => {
	const actor = useCartActor()
	return useMemo(
		() => ({
			addToCart: product => actor.send({ type: 'ADD_ITEM', product }),
			updateQuantity: (productId, quantity) => actor.send({ type: 'UPDATE_QUANTITY', productId, quantity }),
			removeFromCart: productId => actor.send({ type: 'REMOVE_ITEM', productId }),
			clearCart: () => actor.send({ type: 'CLEAR' }),
		}),
		[actor]
	)
}
