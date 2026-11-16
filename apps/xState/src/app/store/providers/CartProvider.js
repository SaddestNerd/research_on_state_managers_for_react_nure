import React, { createContext, useContext, useState, useEffect } from 'react'
import { useActorRef, useSelector } from '@xstate/react'
import { cartMachine } from '../machines/cart.machine'

// The running cart actor is shared through context. Its reference is stable,
// so the context itself never changes; components read the values they need
// with useSelector (see pages/catalog/bindings.js).
const CartActorContext = createContext(null)

const loadSavedItems = () => {
	try {
		const savedCart = localStorage.getItem('cart')
		return savedCart ? JSON.parse(savedCart).items || [] : []
	} catch (error) {
		console.error('Помилка завантаження корзини з localStorage:', error)
		return []
	}
}

// Saves the cart once per committed change, as in the React Context version.
// Kept in a separate component so that the provider does not re-render.
function CartPersistence({ actorRef }) {
	const context = useSelector(actorRef, s => s.context)
	useEffect(() => {
		try {
			localStorage.setItem(
				'cart',
				JSON.stringify({
					items: context.items,
					totalItems: context.totalItems,
					totalPrice: context.totalPrice,
				})
			)
		} catch (error) {
			console.error('Помилка збереження корзини в localStorage:', error)
		}
	}, [context])
	return null
}

export const CartProvider = ({ children }) => {
	const [savedItems] = useState(loadSavedItems)
	const actorRef = useActorRef(cartMachine, { input: { items: savedItems } })

	return (
		<CartActorContext.Provider value={actorRef}>
			<CartPersistence actorRef={actorRef} />
			{children}
		</CartActorContext.Provider>
	)
}

export const useCartActor = () => {
	const actorRef = useContext(CartActorContext)
	if (!actorRef) {
		throw new Error('useCartActor must be used within CartProvider')
	}
	return actorRef
}

// Kept for the benchmark bridge (bench/adapter.js), which needs the actor.
export const useCart = () => ({ actorRef: useCartActor() })
