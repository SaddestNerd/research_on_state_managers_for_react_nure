import { create } from 'zustand'
import ProductsService from '../api/axios/requests/products/products.service'

export const useProductsStore = create((set, get) => ({
	loading: false,
	error: null,
	products: [],
	currentProduct: null,
	pagination: {
		offset: 0,
		limit: 10,
		total: 0,
		currentPage: 1,
	},

	getProducts: async ({ offset = 0, limit = 10 } = {}) => {
		set({ loading: true, error: null })

		try {
			const response = await ProductsService.getProducts({ offset, limit })
			const productsData = response.data
			set({
				products: productsData,
				pagination: {
					offset,
					limit,
					total: productsData.length,
					currentPage: Math.floor(offset / limit) + 1,
				},
				loading: false,
			})
			return {
				products: productsData,
				offset,
				limit,
			}
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || 'Помилка завантаження товарів'
			set({
				error: errorMessage,
				products: [],
				loading: false,
			})
			throw new Error(errorMessage)
		}
	},

	getProductById: async id => {
		set({ loading: true, error: null })

		try {
			const response = await ProductsService.getProductById(id)
			const product = response.data
			set({
				currentProduct: product,
				loading: false,
			})
			return product
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || 'Помилка завантаження товару'
			set({
				error: errorMessage,
				currentProduct: null,
				loading: false,
			})
			throw new Error(errorMessage)
		}
	},

	resetProductsState: () => {
		set({
			loading: false,
			error: null,
			products: [],
			currentProduct: null,
			pagination: {
				offset: 0,
				limit: 10,
				total: 0,
				currentPage: 1,
			},
		})
	},

	clearError: () => {
		set({ error: null })
	},

	updatePagination: newPagination => {
		set(state => ({
			pagination: {
				...state.pagination,
				...newPagination,
			},
		}))
	},
}))
