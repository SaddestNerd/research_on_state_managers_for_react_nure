import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from 'react'
import AuthService from '../api/axios/requests/auth/auth.service'
import { TokenService } from '../services/localstorage/token.service'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [success, setSuccess] = useState(false)
	const [userData, setUserData] = useState(null)
	const [isAuthenticated, setIsAuthenticated] = useState(false)

	useEffect(() => {
		const token = TokenService.getLocalAccessToken()
		if (token && !isAuthenticated) {
			setUserData({ email: 'john@mail.com', id: '1' })
			setIsAuthenticated(true)
			setSuccess(true)
		}
	}, [])

	useEffect(() => {
		const token = TokenService.getLocalAccessToken()
		if (!token && isAuthenticated) {
			setUserData(null)
			setIsAuthenticated(false)
			setSuccess(false)
		}
	}, [isAuthenticated])

	const login = useCallback(async ({ email, password }) => {
		setLoading(true)
		setError(null)
		setSuccess(false)

		try {
			const response = await AuthService.login({ email, password })
			const user = response.data.user || response.data
			setUserData(user)
			setIsAuthenticated(true)
			setSuccess(true)
			setLoading(false)
			return { user }
		} catch (err) {
			const errorMessage = err.response?.data?.message || 'Помилка входу'
			setError(errorMessage)
			setLoading(false)
			setSuccess(false)
			setIsAuthenticated(false)
			throw new Error(errorMessage)
		}
	}, [])

	const logout = useCallback(async () => {
		setLoading(true)
		setError(null)

		try {
			await AuthService.logout()
			setUserData(null)
			setIsAuthenticated(false)
			setSuccess(false)
			setLoading(false)
			return true
		} catch (err) {
			const errorMessage = err.response?.data?.message || 'Помилка виходу'
			setError(errorMessage)
			setLoading(false)
			setIsAuthenticated(false)
			throw new Error(errorMessage)
		}
	}, [])

	const resetAuthState = useCallback(() => {
		setLoading(false)
		setError(null)
		setSuccess(false)
		setUserData(null)
		setIsAuthenticated(false)
	}, [])

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const value = {
		loading,
		error,
		success,
		userData,
		isAuthenticated,
		login,
		logout,
		resetAuthState,
		clearError,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within AuthProvider')
	}
	return context
}
