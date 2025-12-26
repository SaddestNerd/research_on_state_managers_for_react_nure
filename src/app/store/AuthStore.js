import { makeAutoObservable, runInAction } from 'mobx'
import AuthService from '../api/axios/requests/auth/auth.service'
import { TokenService } from '../services/localstorage/token.service'

class AuthStore {
  loading = false
  error = null
  success = false
  userData = null
  isAuthenticated = false

  constructor() {
    makeAutoObservable(this)
    this.checkAuthOnInit()
  }

  checkAuthOnInit = () => {
    const token = TokenService.getLocalAccessToken()
    if (token && !this.isAuthenticated) {
      runInAction(() => {
        this.userData = { email: 'john@mail.com', id: '1' }
        this.isAuthenticated = true
        this.success = true
      })
    }
  }

  login = async ({ email, password }) => {
    this.loading = true
    this.error = null
    this.success = false
    
    try {
      const response = await AuthService.login({ email, password })
      const user = response.data.user || response.data
      
      runInAction(() => {
        this.userData = user
        this.isAuthenticated = true
        this.success = true
        this.loading = false
      })
      
      return { user }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Помилка входу'
      runInAction(() => {
        this.error = errorMessage
        this.loading = false
        this.success = false
        this.isAuthenticated = false
      })
      throw new Error(errorMessage)
    }
  }

  logout = async () => {
    this.loading = true
    this.error = null
    
    try {
      await AuthService.logout()
      runInAction(() => {
        this.userData = null
        this.isAuthenticated = false
        this.success = false
        this.loading = false
      })
      return true
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Помилка виходу'
      runInAction(() => {
        this.error = errorMessage
        this.loading = false
        this.isAuthenticated = false
      })
      throw new Error(errorMessage)
    }
  }

  resetAuthState = () => {
    this.loading = false
    this.error = null
    this.success = false
    this.userData = null
    this.isAuthenticated = false
  }

  clearError = () => {
    this.error = null
  }
}

export default AuthStore


