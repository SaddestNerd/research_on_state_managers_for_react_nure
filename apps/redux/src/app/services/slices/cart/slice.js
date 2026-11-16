import { createSlice } from '@reduxjs/toolkit'

const initialState = {
	items: [],
	totalItems: 0,
	totalPrice: 0,
}

const cartSlice = createSlice({
	name: 'cart',
	initialState,
	reducers: {
		addToCart: (state, { payload }) => {
			const existingItem = state.items.find(
				item => item.product.id === payload.id
			)

			if (existingItem) {
				existingItem.quantity += 1
			} else {
				state.items.push({
					product: payload,
					quantity: 1,
				})
			}

			state.totalItems = state.items.reduce(
				(sum, item) => sum + item.quantity,
				0
			)
			state.totalPrice = state.items.reduce(
				(sum, item) => sum + item.product.price * item.quantity,
				0
			)
		},
		removeFromCart: (state, { payload }) => {
			state.items = state.items.filter(item => item.product.id !== payload)

			state.totalItems = state.items.reduce(
				(sum, item) => sum + item.quantity,
				0
			)
			state.totalPrice = state.items.reduce(
				(sum, item) => sum + item.product.price * item.quantity,
				0
			)
		},
		updateQuantity: (state, { payload }) => {
			const { productId, quantity } = payload
			const item = state.items.find(item => item.product.id === productId)

			if (item) {
				if (quantity <= 0) {
					state.items = state.items.filter(
						item => item.product.id !== productId
					)
				} else {
					item.quantity = quantity
				}
			}

			state.totalItems = state.items.reduce(
				(sum, item) => sum + item.quantity,
				0
			)
			state.totalPrice = state.items.reduce(
				(sum, item) => sum + item.product.price * item.quantity,
				0
			)
		},
		clearCart: state => {
			state.items = []
			state.totalItems = 0
			state.totalPrice = 0
		},
	},
})

export const { addToCart, removeFromCart, updateQuantity, clearCart } =
	cartSlice.actions

export default cartSlice.reducer
