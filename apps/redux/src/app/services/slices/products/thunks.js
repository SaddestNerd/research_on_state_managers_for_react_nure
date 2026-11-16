import ProductsService from "../../../api/axios/requests/products/products.service"
import { createAsyncThunk } from "@reduxjs/toolkit"

export const getProductsThunk = createAsyncThunk(
  'products/getProducts',
  async ({ offset = 0, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await ProductsService.getProducts({ offset, limit })
      return {
        products: response.data,
        offset,
        limit
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Помилка завантаження товарів')
    }
  }
)

export const getProductByIdThunk = createAsyncThunk(
  'products/getProductById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await ProductsService.getProductById(id)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Помилка завантаження товару')
    }
  }
)

