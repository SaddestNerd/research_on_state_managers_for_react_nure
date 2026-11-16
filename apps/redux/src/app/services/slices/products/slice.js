import { getProductsThunk, getProductByIdThunk } from './thunks'
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
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
}

const productsSlice = createSlice({
	name: 'products',
	initialState,
	reducers: {
		resetProductsState: state => {
			state.loading = false
			state.error = null
			state.products = []
			state.currentProduct = null
			state.pagination = {
				offset: 0,
				limit: 10,
				total: 0,
				currentPage: 1,
			}
		},
		clearError: state => {
			state.error = null
		},
		setPagination: (state, { payload }) => {
			state.pagination = {
				...state.pagination,
				...payload,
			}
		},
	},
	extraReducers: builder => {
		builder

			.addCase(getProductsThunk.pending, state => {
				state.loading = true
				state.error = null
			})
			.addCase(getProductsThunk.fulfilled, (state, { payload }) => {
				state.loading = false
				state.error = null
				state.products = payload.products
				state.pagination = {
					offset: payload.offset,
					limit: payload.limit,
					total: payload.products.length,
					currentPage: Math.floor(payload.offset / payload.limit) + 1,
				}
			})
			.addCase(getProductsThunk.rejected, (state, { payload }) => {
				state.loading = false
				state.error = payload
				state.products = []
			})

			.addCase(getProductByIdThunk.pending, state => {
				state.loading = true
				state.error = null
			})
			.addCase(getProductByIdThunk.fulfilled, (state, { payload }) => {
				state.loading = false
				state.error = null
				state.currentProduct = payload
			})
			.addCase(getProductByIdThunk.rejected, (state, { payload }) => {
				state.loading = false
				state.error = payload
				state.currentProduct = null
			})
	},
})

export const { resetProductsState, clearError, setPagination } =
	productsSlice.actions

export default productsSlice.reducer
