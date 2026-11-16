/*
 * Bindings of the catalog components (CatalogViews.jsx) to React Context.
 * Pattern recommended for Context: the cart state and the cart actions are
 * provided by two separate contexts (the actions object is stable), and the
 * components are memoized. Context has no selectors, so every consumer of the
 * cart state context re-renders when any part of the cart changes.
 */
import { memo } from 'react'
import { useAuth, useProducts, useCartState, useCartActions as useActions } from '../../app/context'

export const reactive = component => memo(component)

export const useUserData = () => useAuth().userData

export const useCatalog = () => {
	const { products, loading, error, pagination, getProducts } = useProducts()
	return { products, loading, error, pagination, getProducts }
}

export const useCartTotals = () => {
	const { totalItems, totalPrice } = useCartState()
	return { totalItems, totalPrice }
}

export const useCartItems = () => useCartState().items

export const useItemQuantity = productId => {
	const item = useCartState().items.find(it => it.product.id === productId)
	return item ? item.quantity : 0
}

export const useCartActions = () => useActions()
