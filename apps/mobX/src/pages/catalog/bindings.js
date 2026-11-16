/*
 * Bindings of the catalog components (CatalogViews.jsx) to the MobX stores.
 * Pattern recommended for MobX: every component is an observer (which also
 * memoizes it) and dereferences observable values as late as possible; the
 * quantity of a product is read from an observable map keyed by product id,
 * so a card tracks only its own entry.
 */
import { useContext } from 'react'
import { observer, MobXProviderContext } from 'mobx-react'

const useStores = () => useContext(MobXProviderContext)

export const reactive = component => observer(component)

export const useUserData = () => useStores().authStore.userData

export const useCatalog = ({ actionsOnly = false } = {}) => {
	const { productsStore } = useStores()
	if (actionsOnly) return { getProducts: productsStore.getProducts }
	const { products, loading, error, pagination, getProducts } = productsStore
	return { products, loading, error, pagination, getProducts }
}

export const useCartTotals = () => {
	const { cartStore } = useStores()
	return { totalItems: cartStore.totalItems, totalPrice: cartStore.totalPrice }
}

export const useCartItems = () => useStores().cartStore.items

export const useItemQuantity = productId => useStores().cartStore.getItemQuantity(productId)

export const useCartActions = () => {
	const { cartStore } = useStores()
	return {
		addToCart: cartStore.addToCart,
		updateQuantity: cartStore.updateQuantity,
		removeFromCart: cartStore.removeFromCart,
		clearCart: cartStore.clearCart,
	}
}
