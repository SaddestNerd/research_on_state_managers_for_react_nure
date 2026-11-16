import { setup, assign } from 'xstate'

const withTotals = items => ({
	items,
	totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
	totalPrice: items.reduce(
		(sum, item) => sum + item.product.price * item.quantity,
		0
	),
})

export const cartMachine = setup({
	actions: {
		addItem: assign(({ context, event }) => {
			const { product } = event
			const existingItem = context.items.find(
				item => item.product.id === product.id
			)
			const items = existingItem
				? context.items.map(item =>
						item.product.id === product.id
							? { ...item, quantity: item.quantity + 1 }
							: item
				  )
				: [...context.items, { product, quantity: 1 }]
			return withTotals(items)
		}),
		removeItem: assign(({ context, event }) =>
			withTotals(
				context.items.filter(item => item.product.id !== event.productId)
			)
		),
		updateQuantity: assign(({ context, event }) => {
			const { productId, quantity } = event
			const items =
				quantity <= 0
					? context.items.filter(item => item.product.id !== productId)
					: context.items.map(item =>
							item.product.id === productId ? { ...item, quantity } : item
					  )
			return withTotals(items)
		}),
		clear: assign(() => withTotals([])),
	},
}).createMachine({
	id: 'cart',
	initial: 'active',
	context: ({ input }) => withTotals((input && input.items) || []),
	states: {
		active: {
			on: {
				ADD_ITEM: { actions: 'addItem' },
				REMOVE_ITEM: { actions: 'removeItem' },
				UPDATE_QUANTITY: { actions: 'updateQuantity' },
				CLEAR: { actions: 'clear' },
			},
		},
	},
})
