import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
	persist(
		(set, get) => {
			const updateTotals = () => {
				const state = get()
				const total = state.items.reduce((sum, item) => sum + item.quantity, 0)
				const price = state.items.reduce(
					(sum, item) => sum + item.product.price * item.quantity,
					0
				)
				set({ totalItems: total, totalPrice: price })
			}

			return {
				items: [],
				totalItems: 0,
				totalPrice: 0,

				updateTotals,

				addToCart: product => {
					const state = get()
					const existingItem = state.items.find(
						item => item.product.id === product.id
					)

					let newItems
					if (existingItem) {
						newItems = state.items.map(item =>
							item.product.id === product.id
								? { ...item, quantity: item.quantity + 1 }
								: item
						)
					} else {
						newItems = [...state.items, { product, quantity: 1 }]
					}

					set({ items: newItems })
					updateTotals()
				},

				removeFromCart: productId => {
					const state = get()
					const newItems = state.items.filter(
						item => item.product.id !== productId
					)
					set({ items: newItems })
					updateTotals()
				},

				updateQuantity: (productId, quantity) => {
					const state = get()
					let newItems

					if (quantity <= 0) {
						newItems = state.items.filter(item => item.product.id !== productId)
					} else {
						newItems = state.items.map(item =>
							item.product.id === productId ? { ...item, quantity } : item
						)
					}

					set({ items: newItems })
					updateTotals()
				},

				clearCart: () => {
					set({ items: [], totalItems: 0, totalPrice: 0 })
				},

				getItemQuantity: productId => {
					const state = get()
					const item = state.items.find(item => item.product.id === productId)
					return item ? item.quantity : 0
				},
			}
		},
		{
			name: 'cart-storage',
			onRehydrateStorage: () => state => {
				if (state) {
					state.updateTotals()
				}
			},
		}
	)
)
