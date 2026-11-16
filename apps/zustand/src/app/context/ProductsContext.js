import React, { createContext, useContext, useState, useCallback } from 'react'
import ProductsService from '../api/axios/requests/products/products.service'

const ProductsContext = createContext(null)

export const ProductsProvider = ({ children }) => {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [products, setProducts] = useState([])
	const [currentProduct, setCurrentProduct] = useState(null)
	const [pagination, setPagination] = useState({
		offset: 0,
		limit: 10,
		total: 0,
		currentPage: 1,
	})

	const getProducts = useCallback(async ({ offset = 0, limit = 10 } = {}) => {
		setLoading(true)
		setError(null)

		try {
			const response = await ProductsService.getProducts({ offset, limit })
			const productsData = response.data
			setProducts(productsData)
			setPagination({
				offset,
				limit,
				total: productsData.length,
				currentPage: Math.floor(offset / limit) + 1,
			})
			setLoading(false)
			return {
				products: productsData,
				offset,
				limit,
			}
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || 'Помилка завантаження товарів'
			setError(errorMessage)
			setProducts([])
			setLoading(false)
			throw new Error(errorMessage)
		}
	}, [])

	const getProductById = useCallback(async id => {
		setLoading(true)
		setError(null)

		try {
			const response = await ProductsService.getProductById(id)
			const product = response.data
			setCurrentProduct(product)
			setLoading(false)
			return product
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || 'Помилка завантаження товару'
			setError(errorMessage)
			setCurrentProduct(null)
			setLoading(false)
			throw new Error(errorMessage)
		}
	}, [])

	const resetProductsState = useCallback(() => {
		setLoading(false)
		setError(null)
		setProducts([])
		setCurrentProduct(null)
		setPagination({
			offset: 0,
			limit: 10,
			total: 0,
			currentPage: 1,
		})
	}, [])

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const updatePagination = useCallback(newPagination => {
		setPagination(prev => ({
			...prev,
			...newPagination,
		}))
	}, [])

	const value = {
		loading,
		error,
		products,
		currentProduct,
		pagination,
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
