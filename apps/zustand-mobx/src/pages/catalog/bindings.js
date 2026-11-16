/*
 * Bindings of the catalog components (CatalogViews.jsx) for the combined
 * version: the catalog is a MobX observable model (catalogStore), the cart
 * and authorization are Zustand stores. Components are MobX observers (which
 * also memoizes them), so they track exactly the catalog fields they read;
 * cart values are read through atomic Zustand selectors.
 */
import { observer } from 'mobx-react'
import { useAuthStore, useCartStore, catalogStore } from '../../app/store'

export const reactive = component => observer(component)

export const useUserData = () => useAuthStore(s => s.userData)

export const useCatalog = ({ actionsOnly = false } = {}) => {
	if (actionsOnly) return { getProducts: catalogStore.getProducts }
	const { products, loading, error, pagination, getProducts } = catalogStore
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
