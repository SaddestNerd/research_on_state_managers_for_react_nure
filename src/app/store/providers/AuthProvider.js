import React, { createContext, useContext, useEffect, useRef } from 'react'
import { useMachine } from '@xstate/react'
import { authMachine } from '../machines/auth.machine'
import { TokenService } from '../../services/localstorage/token.service'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
	const [state, send, actor] = useMachine(authMachine)
	const pendingOperationsRef = useRef(new Map())

	useEffect(() => {
		send({ type: 'CHECK_TOKEN' })
	}, [send])

	useEffect(() => {
		const token = TokenService.getLocalAccessToken()
		if (!token && state.value === 'authenticated') {
			send({ type: 'CHECK_TOKEN' })
		}
	}, [state.value, send])

	const previousStateRef = useRef(state.value)

	useEffect(() => {
		const subscription = actor.subscribe(snapshot => {
			const currentValue = snapshot.value
			const previousValue = previousStateRef.current
			const context = snapshot.context

			if (currentValue === 'authenticated' && previousValue === 'loggingIn') {
				const pending = pendingOperationsRef.current.get('LOGIN')
				if (pending && context.userData) {
					pending.resolve({ user: context.userData })
					pendingOperationsRef.current.delete('LOGIN')
				}
			}

			if (currentValue === 'unauthenticated' && previousValue === 'loggingIn') {
				const pendingLogin = pendingOperationsRef.current.get('LOGIN')
				if (pendingLogin) {
					pendingLogin.reject(new Error(context.error || 'Помилка входу'))
					pendingOperationsRef.current.delete('LOGIN')
				}
			}

			if (
				currentValue === 'unauthenticated' &&
				previousValue === 'loggingOut'
			) {
				const pendingLogout = pendingOperationsRef.current.get('LOGOUT')
				if (pendingLogout) {
					if (context.error) {
						pendingLogout.reject(new Error(context.error || 'Помилка виходу'))
					} else {
						pendingLogout.resolve(true)
					}
					pendingOperationsRef.current.delete('LOGOUT')
				}
			}

			previousStateRef.current = currentValue
		})

		return () => subscription.unsubscribe()
	}, [actor])

	useEffect(() => {
		previousStateRef.current = state.value
	}, [state.value])

	const login = async ({ email, password }) => {
		console.log('🔵 AuthProvider.login викликано', {
			email,
			currentState: state.value,
		})

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				const pending = pendingOperationsRef.current.get('LOGIN')
				if (pending) {
					console.error('❌ Таймаут логіну')
					pending.reject(new Error('Час очікування вичерпано'))
					pendingOperationsRef.current.delete('LOGIN')
				}
			}, 30000)

			pendingOperationsRef.current.set('LOGIN', {
				resolve: value => {
					console.log('✅ Логін успішний', value)
					clearTimeout(timeout)
					resolve(value)
				},
				reject: error => {
					console.error('❌ Помилка логіну', error)
					clearTimeout(timeout)
					reject(error)
				},
			})

			previousStateRef.current = state.value

			console.log('📤 Відправляємо подію LOGIN в машину', {
				email,
				password: '***',
			})
			console.log('📤 Поточний стан машини:', state.value)

			const loginEvent = { type: 'LOGIN', email, password }
			console.log('📤 Подія для відправки:', loginEvent)
			send(loginEvent)
		})
	}

	const logout = async () => {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				const pending = pendingOperationsRef.current.get('LOGOUT')
				if (pending) {
					pending.reject(new Error('Час очікування вичерпано'))
					pendingOperationsRef.current.delete('LOGOUT')
				}
			}, 30000)

			pendingOperationsRef.current.set('LOGOUT', {
				resolve: value => {
					clearTimeout(timeout)
					resolve(value)
				},
				reject: error => {
					clearTimeout(timeout)
					reject(error)
				},
			})
			send({ type: 'LOGOUT' })
		})
	}

	const resetAuthState = () => {
		send({ type: 'RESET' })
	}

	const clearError = () => {
		send({ type: 'CLEAR_ERROR' })
	}

	const value = {
		loading: state.context.loading,
		error: state.context.error,
		success: state.context.success,
		userData: state.context.userData,
		isAuthenticated: state.value === 'authenticated',
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
