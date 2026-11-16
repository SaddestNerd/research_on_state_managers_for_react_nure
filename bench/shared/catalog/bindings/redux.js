/*
 * Bindings of the catalog components (CatalogViews.jsx) to the Redux Toolkit
 * store. Pattern recommended for React-Redux: useSelector with selectors that
 * return primitive values or existing references, so that a component
 * re-renders only when the selected value changes.
 */
import { memo, useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getProductsThunk } from '../../app/services/slices/products/thunks'
import {
	addToCart,
	removeFromCart,
	updateQuantity,
	clearCart,
} from '../../app/services/slices/cart/slice'

export const reactive = component => memo(component)

export const useUserData = () => useSelector(s => s.auth.userData)

export const useCatalog = ({ actionsOnly = false } = {}) => {
	const dispatch = useDispatch()
	const getProducts = useCallback(args => dispatch(getProductsThunk(args)), [dispatch])
	if (actionsOnly) return { getProducts }
	/* eslint-disable react-hooks/rules-of-hooks */
	const products = useSelector(s => s.products.products)
	const loading = useSelector(s => s.products.loading)
	const error = useSelector(s => s.products.error)
	const pagination = useSelector(s => s.products.pagination)
	/* eslint-enable react-hooks/rules-of-hooks */
	return { products, loading, error, pagination, getProducts }
}

export const useCartTotals = () => {
	const totalItems = useSelector(s => s.cart.totalItems)
	const totalPrice = useSelector(s => s.cart.totalPrice)
	return { totalItems, totalPrice }
}

export const useCartItems = () => useSelector(s => s.cart.items)

export const useItemQuantity = productId =>
	useSelector(s => {
		const item = s.cart.items.find(it => it.product.id === productId)
		return item ? item.quantity : 0
	})

export const useCartActions = () => {
	const dispatch = useDispatch()
	return useMemo(
		() => ({
			addToCart: product => dispatch(addToCart(product)),
			updateQuantity: (productId, quantity) => dispatch(updateQuantity({ productId, quantity })),
			removeFromCart: productId => dispatch(removeFromCart(productId)),
			clearCart: () => dispatch(clearCart()),
		}),
		[dispatch]
	)
}
