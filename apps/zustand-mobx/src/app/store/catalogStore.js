import { makeAutoObservable, runInAction } from 'mobx'
import ProductsService from '../api/axios/requests/products/products.service'

// Catalog model of the combined version: the product list and its pagination
// are kept in a MobX observable store, while authorization and the cart stay
// in Zustand (authStore.js, cartStore.js).
class CatalogStore {
	loading = false
	error = null
	products = []
	currentProduct = null
	pagination = {
		offset: 0,
		limit: 10,
		total: 0,
		currentPage: 1,
	}

	constructor() {
		makeAutoObservable(this)
	}

	getProducts = async ({ offset = 0, limit = 10 } = {}) => {
		this.loading = true
		this.error = null

		try {
			const response = await ProductsService.getProducts({ offset, limit })
			const productsData = response.data

			runInAction(() => {
				this.products = productsData
				this.pagination = {
					offset,
					limit,
					total: productsData.length,
					currentPage: Math.floor(offset / limit) + 1,
				}
				this.loading = false
			})

			return { products: productsData, offset, limit }
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || 'Помилка завантаження товарів'
			runInAction(() => {
				this.error = errorMessage
				this.products = []
				this.loading = false
			})
			throw new Error(errorMessage)
		}
	}

	getProductById = async id => {
		this.loading = true
		this.error = null

		try {
			const response = await ProductsService.getProductById(id)
			runInAction(() => {
				this.currentProduct = response.data
				this.loading = false
			})
			return response.data
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || 'Помилка завантаження товару'
			runInAction(() => {
				this.error = errorMessage
				this.currentProduct = null
				this.loading = false
			})
			throw new Error(errorMessage)
		}
	}

	resetProductsState = () => {
		this.loading = false
		this.error = null
		this.products = []
		this.currentProduct = null
		this.pagination = { offset: 0, limit: 10, total: 0, currentPage: 1 }
	}

	clearError = () => {
		this.error = null
	}
}

export const catalogStore = new CatalogStore()
