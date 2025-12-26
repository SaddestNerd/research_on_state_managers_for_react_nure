import {
  loginThunk,
  logoutThunk,
} from "./thunks"
import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  loading: false,
  error: null,
  success: false,
  userData: null,
  isAuthenticated: false,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    resetAuthState: (state) => {
      state.loading = false
      state.error = null
      state.success = false
      state.userData = null
      state.isAuthenticated = false
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true
        state.error = null
        state.success = false
      })
      .addCase(loginThunk.fulfilled, (state, { payload }) => {
        state.loading = false
        state.error = null
        state.success = true
        state.userData = payload.user || payload
        state.isAuthenticated = true
      })
      .addCase(loginThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error = payload
        state.success = false
        state.isAuthenticated = false
      })
      .addCase(logoutThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.loading = false
        state.error = null
        state.success = false
        state.userData = null
        state.isAuthenticated = false
      })
      .addCase(logoutThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error = payload
        state.isAuthenticated = false
      })
  },
})

export const { resetAuthState, clearError } = authSlice.actions

export default authSlice.reducer
