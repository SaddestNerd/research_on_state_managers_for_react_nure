import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	useMemo,
} from 'react'

const CartContext = createContext(null)
const CartStateContext = createContext(null)
const CartActionsContext = createContext(null)

export const CartProvider = ({ children }) => {
	const [items, setItems] = useState([])
	const [totalItems, setTotalItems] = useState(0)
	const [totalPrice, setTotalPrice] = useState(0)

	const updateTotals = useCallback(cartItems => {
		const total = cartItems.reduce((sum, item) => sum + item.quantity, 0)
		const price = cartItems.reduce(
			(sum, item) => sum + item.product.price * item.quantity,
			0
		)
		setTotalItems(total)
		setTotalPrice(price)
	}, [])

	useEffect(() => {
		try {
			const savedCart = localStorage.getItem('cart')
			if (savedCart) {
				const parsedCart = JSON.parse(savedCart)
				setItems(parsedCart.items || [])
				updateTotals(parsedCart.items || [])
			}
		} catch (error) {
			console.error('Помилка завантаження корзини з localStorage:', error)
		}
	}, [updateTotals])

	useEffect(() => {
		try {
			localStorage.setItem(
				'cart',
				JSON.stringify({ items, totalItems, totalPrice })
			)
		} catch (error) {
			console.error('Помилка збереження корзини в localStorage:', error)
		}
	}, [items, totalItems, totalPrice])

	const addToCart = useCallback(
		product => {
			setItems(prevItems => {
				const existingItem = prevItems.find(
					item => item.product.id === product.id
				)

				let newItems
				if (existingItem) {
					newItems = prevItems.map(item =>
						item.product.id === product.id
							? { ...item, quantity: item.quantity + 1 }
							: item
					)
				} else {
					newItems = [...prevItems, { product, quantity: 1 }]
				}

				updateTotals(newItems)
				return newItems
			})
		},
		[updateTotals]
	)

	const removeFromCart = useCallback(
		productId => {
			setItems(prevItems => {
				const newItems = prevItems.filter(item => item.product.id !== productId)
				updateTotals(newItems)
				return newItems
			})
		},
		[updateTotals]
	)

	const updateQuantity = useCallback(
		(productId, quantity) => {
			setItems(prevItems => {
				let newItems
				if (quantity <= 0) {
					newItems = prevItems.filter(item => item.product.id !== productId)
				} else {
					newItems = prevItems.map(item =>
						item.product.id === productId ? { ...item, quantity } : item
					)
				}

				updateTotals(newItems)
				return newItems
			})
		},
		[updateTotals]
	)

	const clearCart = useCallback(() => {
		setItems([])
		setTotalItems(0)
		setTotalPrice(0)
	}, [])

	// The state and the actions are provided by separate contexts: the actions
	// object is stable, so components that only dispatch actions do not
	// re-render when the cart changes.
	const state = useMemo(
		() => ({ items, totalItems, totalPrice }),
		[items, totalItems, totalPrice]
	)
	const actions = useMemo(
		() => ({ addToCart, removeFromCart, updateQuantity, clearCart }),
		[addToCart, removeFromCart, updateQuantity, clearCart]
	)
	const value = useMemo(() => ({ ...state, ...actions }), [state, actions])

	return (
		<CartActionsContext.Provider value={actions}>
			<CartStateContext.Provider value={state}>
				<CartContext.Provider value={value}>{children}</CartContext.Provider>
			</CartStateContext.Provider>
		</CartActionsContext.Provider>
	)
}

export const useCart = () => {
	const context = useContext(CartContext)
	if (!context) {
		throw new Error('useCart must be used within CartProvider')
	}
	return context
}

export const useCartState = () => {
	const context = useContext(CartStateContext)
	if (!context) {
		throw new Error('useCartState must be used within CartProvider')
	}
	return context
}

export const useCartActions = () => {
	const context = useContext(CartActionsContext)
	if (!context) {
		throw new Error('useCartActions must be used within CartProvider')
	}
	return context
}
