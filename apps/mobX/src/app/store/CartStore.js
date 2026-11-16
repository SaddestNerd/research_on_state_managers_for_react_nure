import { makeAutoObservable, runInAction } from 'mobx'

class CartStore {
  items = [] 
  totalItems = 0
  totalPrice = 0
  // Quantity of every product in the cart, keyed by product id. Reading one
  // entry of an observable map tracks only that entry, so a product card
  // re-renders only when its own quantity changes.
  quantities = new Map()

  constructor() {
    makeAutoObservable(this)
    this.loadCartFromStorage()
  }

  
  loadCartFromStorage = () => {
    try {
      const savedCart = localStorage.getItem('cart')
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        runInAction(() => {
          this.items = parsedCart.items || []
          this.items.forEach(item => this.quantities.set(item.product.id, item.quantity))
          this.updateTotals()
        })
      }
    } catch (error) {
      console.error('Помилка завантаження корзини з localStorage:', error)
    }
  }

  
  saveCartToStorage = () => {
    try {
      localStorage.setItem('cart', JSON.stringify({
        items: this.items,
        totalItems: this.totalItems,
        totalPrice: this.totalPrice
      }))
    } catch (error) {
      console.error('Помилка збереження корзини в localStorage:', error)
    }
  }

  
  updateTotals = () => {
    this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0)
    this.totalPrice = this.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    this.saveCartToStorage()
  }

  
  addToCart = (product) => {
    const existingItem = this.items.find(item => item.product.id === product.id)
    
    if (existingItem) {
      existingItem.quantity += 1
      this.quantities.set(product.id, existingItem.quantity)
    } else {
      this.items.push({
        product,
        quantity: 1
      })
      this.quantities.set(product.id, 1)
    }
    
    this.updateTotals()
  }

  
  removeFromCart = (productId) => {
    this.items = this.items.filter(item => item.product.id !== productId)
    this.quantities.delete(productId)
    this.updateTotals()
  }

  
  updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      this.removeFromCart(productId)
    } else {
      const item = this.items.find(item => item.product.id === productId)
      if (item) {
        item.quantity = quantity
        this.quantities.set(productId, quantity)
        this.updateTotals()
      }
    }
  }

  
  clearCart = () => {
    this.items = []
    this.quantities.clear()
    this.totalItems = 0
    this.totalPrice = 0
    this.saveCartToStorage()
  }

  
  getItemQuantity = (productId) => {
    return this.quantities.get(productId) || 0
  }
}

export default CartStore

