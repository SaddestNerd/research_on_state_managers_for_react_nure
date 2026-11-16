import { create } from 'zustand'
import AuthService from '../api/axios/requests/auth/auth.service'
import { TokenService } from '../services/localstorage/token.service'

export const useAuthStore = create((set, get) => ({
	loading: false,
	error: null,
	success: false,
	userData: null,
	isAuthenticated: false,

	init: () => {
		const token = TokenService.getLocalAccessToken()
		const currentState = get()

		if (token && !currentState.isAuthenticated) {
			set({
				userData: { email: 'john@mail.com', id: '1' },
				isAuthenticated: true,
				success: true,
			})
		} else if (!token && currentState.isAuthenticated) {
			set({
				userData: null,
				isAuthenticated: false,
				success: false,
			})
		}
	},

	login: async ({ email, password }) => {
		set({ loading: true, error: null, success: false })

		try {
			const response = await AuthService.login({ email, password })
			const user = response.data.user || response.data
			set({
				userData: user,
				isAuthenticated: true,
				success: true,
				loading: false,
			})
			return { user }
		} catch (err) {
			const errorMessage = err.response?.data?.message || 'Помилка входу'
			set({
				error: errorMessage,
				loading: false,
				success: false,
				isAuthenticated: false,
			})
			throw new Error(errorMessage)
		}
	},

	logout: async () => {
		set({ loading: true, error: null })

		try {
			await AuthService.logout()
			set({
				userData: null,
				isAuthenticated: false,
				success: false,
				loading: false,
			})
			return true
		} catch (err) {
			const errorMessage = err.response?.data?.message || 'Помилка виходу'
			set({
				error: errorMessage,
				loading: false,
				isAuthenticated: false,
			})
			throw new Error(errorMessage)
		}
	},

	resetAuthState: () => {
		set({
			loading: false,
			error: null,
			success: false,
			userData: null,
			isAuthenticated: false,
		})
	},

	clearError: () => {
		set({ error: null })
	},
}))
