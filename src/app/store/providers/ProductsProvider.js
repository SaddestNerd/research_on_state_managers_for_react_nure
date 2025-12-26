import React, { createContext, useContext, useEffect, useRef } from 'react'
import { useMachine } from '@xstate/react'
import { productsMachine } from '../machines/products.machine'

const ProductsContext = createContext(null)

export const ProductsProvider = ({ children }) => {
	const [state, send, actor] = useMachine(productsMachine)
	const pendingOperationsRef = useRef(new Map())

	useEffect(() => {
		const subscription = actor.subscribe(snapshot => {
			if (snapshot.value === 'loaded' && snapshot.previousValue === 'loading') {
				const pending = pendingOperationsRef.current.get('GET_PRODUCTS')
				if (pending) {
					pending.resolve({
						products: snapshot.context.products,
						offset: snapshot.context.pagination.offset,
						limit: snapshot.context.pagination.limit,
					})
					pendingOperationsRef.current.delete('GET_PRODUCTS')
				}
			} else if (
				snapshot.value === 'error' &&
				snapshot.previousValue === 'loading'
			) {
				const pending = pendingOperationsRef.current.get('GET_PRODUCTS')
				if (pending) {
					pending.reject(
						new Error(snapshot.context.error || 'Помилка завантаження товарів')
					)
					pendingOperationsRef.current.delete('GET_PRODUCTS')
				}
			}

			if (
				snapshot.value === 'idle' &&
				snapshot.previousValue === 'loadingProduct'
			) {
				const pending = pendingOperationsRef.current.get('GET_PRODUCT_BY_ID')
				if (pending) {
					pending.resolve(snapshot.context.currentProduct)
					pendingOperationsRef.current.delete('GET_PRODUCT_BY_ID')
				}
			} else if (
				snapshot.value === 'error' &&
				snapshot.previousValue === 'loadingProduct'
			) {
				const pending = pendingOperationsRef.current.get('GET_PRODUCT_BY_ID')
				if (pending) {
					pending.reject(
						new Error(snapshot.context.error || 'Помилка завантаження товару')
					)
					pendingOperationsRef.current.delete('GET_PRODUCT_BY_ID')
				}
			}
		})

		return () => subscription.unsubscribe()
	}, [actor])

	const getProducts = async ({ offset = 0, limit = 10 } = {}) => {
		return new Promise((resolve, reject) => {
			pendingOperationsRef.current.set('GET_PRODUCTS', { resolve, reject })
			send({ type: 'GET_PRODUCTS', offset, limit })
		})
	}

	const getProductById = async id => {
		return new Promise((resolve, reject) => {
			pendingOperationsRef.current.set('GET_PRODUCT_BY_ID', { resolve, reject })
			send({ type: 'GET_PRODUCT_BY_ID', id })
		})
	}

	const resetProductsState = () => {
		send({ type: 'RESET' })
	}

	const clearError = () => {
		send({ type: 'CLEAR_ERROR' })
	}

	const updatePagination = newPagination => {
		send({ type: 'UPDATE_PAGINATION', pagination: newPagination })
	}

	const value = {
		loading: state.context.loading,
		error: state.context.error,
		products: state.context.products,
		currentProduct: state.context.currentProduct,
		pagination: state.context.pagination,
		getProducts,
		getProductById,
		resetProductsState,
		clearError,
		setPagination: updatePagination,
	}

	return (
		<ProductsContext.Provider value={value}>
			{children}
		</ProductsContext.Provider>
	)
}

export const useProducts = () => {
	const context = useContext(ProductsContext)
	if (!context) {
		throw new Error('useProducts must be used within ProductsProvider')
	}
	return context
}
