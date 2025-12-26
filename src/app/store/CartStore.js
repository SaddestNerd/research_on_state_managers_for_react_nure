import { makeAutoObservable, runInAction } from 'mobx'

class CartStore {
  items = [] 
  totalItems = 0
  totalPrice = 0

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
    } else {
      this.items.push({
        product,
        quantity: 1
      })
    }
    
    this.updateTotals()
  }

  
  removeFromCart = (productId) => {
    this.items = this.items.filter(item => item.product.id !== productId)
    this.updateTotals()
  }

  
  updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      this.removeFromCart(productId)
    } else {
      const item = this.items.find(item => item.product.id === productId)
      if (item) {
        item.quantity = quantity
        this.updateTotals()
      }
    }
  }

  
  clearCart = () => {
    this.items = []
    this.totalItems = 0
    this.totalPrice = 0
    this.saveCartToStorage()
  }

  
  getItemQuantity = (productId) => {
    const item = this.items.find(item => item.product.id === productId)
    return item ? item.quantity : 0
  }
}

export default CartStore

