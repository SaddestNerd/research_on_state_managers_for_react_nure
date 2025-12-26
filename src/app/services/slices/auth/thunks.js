import AuthService from "../../../api/axios/requests/auth/auth.service"
import { createAsyncThunk } from "@reduxjs/toolkit"

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await AuthService.login({ email, password })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Помилка входу')
    }
  }
)

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.logout()
      return true
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Помилка виходу')
    }
  }
)
