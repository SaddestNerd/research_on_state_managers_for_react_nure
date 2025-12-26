import { endpoints } from "../../endpoints/endpoints"
import api from "../../api"

const get = endpoints.general.products.get

const ProductsService = {
  getProducts: async ({ offset = 0, limit = 10 }) => {
    try {
      const response = await api.get(get.list, {
        params: { offset, limit }
      })
      return response
    } catch (error) {
      console.error("Get products error:", error)
      throw error
    }
  },

  getProductById: async (id) => {
    try {
      const response = await api.get(get.byId(id))
      return response
    } catch (error) {
      console.error("Get product by id error:", error)
      throw error
    }
  },
}

export default ProductsService

