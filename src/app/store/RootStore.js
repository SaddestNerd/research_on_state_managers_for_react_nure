import AuthStore from './AuthStore'
import ProductsStore from './ProductsStore'
import CartStore from './CartStore'

class RootStore {
  constructor() {
    this.authStore = new AuthStore()
    this.productsStore = new ProductsStore()
    this.cartStore = new CartStore()
  }
}

export default RootStore


