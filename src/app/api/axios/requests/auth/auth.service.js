import { endpoints } from '../../endpoints/endpoints'
import api from '../../api'
import { TokenService } from '../../../../services/localstorage/token.service'

const post = endpoints.general.auth.post
const patch = endpoints.general.auth.patch

const AuthService = {
	login: async ({ email, password }) => {
		console.log('🔵 AuthService.login вызван', { email, password: '***' })
		console.log('📤 Отправляем axios запрос на:', post.login)
		try {
			const response = await api.post(post.login, { email, password })
			console.log('✅ Axios запрос успешен', response.data)

			const token = response.data.access_token || response.data.accessToken
			if (token) {
				TokenService.setLocalAccessToken(token)
			} else {
				console.warn('Token not found in response:', response.data)
			}
			return response
		} catch (error) {
			console.error('❌ Login error в AuthService:', error)
			console.error('Error details:', error.response?.data || error.message)
			throw error
		}
	},

	logout: async () => {
		try {
			TokenService.removeLocalAccessToken()

			return true
		} catch (error) {
			console.error('Logout error:', error)

			TokenService.removeLocalAccessToken()
			throw error
		}
	},
}

export default AuthService
