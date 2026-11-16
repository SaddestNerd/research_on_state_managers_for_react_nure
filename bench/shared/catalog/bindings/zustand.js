/*
 * Bindings of the catalog components (CatalogViews.jsx) to the Zustand stores.
 * Pattern recommended for Zustand: one atomic selector per value, so that a
 * component re-renders only when the value it selects changes.
 */
import { memo } from 'react'
import { useAuthStore, useProductsStore, useCartStore } from '../../app/store'

export const reactive = component => memo(component)

export const useUserData = () => useAuthStore(s => s.userData)

export const useCatalog = ({ actionsOnly = false } = {}) => {
	const getProducts = useProductsStore(s => s.getProducts)
	if (actionsOnly) return { getProducts }
	/* eslint-disable react-hooks/rules-of-hooks */
	const products = useProductsStore(s => s.products)
	const loading = useProductsStore(s => s.loading)
	const error = useProductsStore(s => s.error)
	const pagination = useProductsStore(s => s.pagination)
	/* eslint-enable react-hooks/rules-of-hooks */
	return { products, loading, error, pagination, getProducts }
}

export const useCartTotals = () => {
	const totalItems = useCartStore(s => s.totalItems)
	const totalPrice = useCartStore(s => s.totalPrice)
	return { totalItems, totalPrice }
}

export const useCartItems = () => useCartStore(s => s.items)

export const useItemQuantity = productId =>
	useCartStore(s => {
		const item = s.items.find(it => it.product.id === productId)
		return item ? item.quantity : 0
	})

export const useCartActions = () => {
	const addToCart = useCartStore(s => s.addToCart)
	const updateQuantity = useCartStore(s => s.updateQuantity)
	const removeFromCart = useCartStore(s => s.removeFromCart)
	const clearCart = useCartStore(s => s.clearCart)
	return { addToCart, updateQuantity, removeFromCart, clearCart }
}
