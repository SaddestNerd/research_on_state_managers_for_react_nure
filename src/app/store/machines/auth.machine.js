import { setup, assign } from 'xstate'
import AuthService from '../../api/axios/requests/auth/auth.service'
import { TokenService } from '../../services/localstorage/token.service'

export const authMachine = setup({
  guards: {
    hasToken: () => {
      const token = TokenService.getLocalAccessToken()
      return !!token
    },
  },
  actors: {
    loginUser: async ({ input }) => {
      console.log('🔵 Актор loginUser вызван с input:', input)
      console.log('🔵 Тип input:', typeof input, 'Содержимое:', JSON.stringify(input))
      
      if (!input || !input.email || !input.password) {
        console.error('❌ Ошибка: input некорректный', input)
        throw new Error('Недостаточно данных для логина')
      }
      
      try {
        console.log('📤 Вызываем AuthService.login с параметрами:', { email: input.email, password: '***' })
        const response = await AuthService.login(input)
        console.log('✅ AuthService.login успешен', response.data)
        const user = response.data.user || { email: input.email, id: '1' }
        console.log('✅ Возвращаем пользователя:', user)
        return user
      } catch (error) {
        console.error('❌ Ошибка в акторе loginUser', error)
        console.error('❌ Детали ошибки:', error.response || error.message)
        throw error
      }
    },
    logoutUser: async () => {
      await AuthService.logout()
      return true
    },
    checkToken: async () => {
      const token = TokenService.getLocalAccessToken()
      if (token) {
        return { email: 'john@mail.com', id: '1' }
      }
      throw new Error('No token')
    },
  },
}).createMachine({
  id: 'auth',
  initial: 'checking',
  context: {
    userData: null,
    error: null,
    loading: false,
    success: false,
    loginEmail: null,
    loginPassword: null,
  },
  states: {
    checking: {
      entry: assign({ loading: true }),
      invoke: {
        id: 'checkToken',
        src: 'checkToken',
        onDone: {
          target: 'authenticated',
          actions: [
            assign({
              userData: ({ event }) => event.output,
              success: true,
              loading: false,
            }),
          ],
        },
        onError: {
          target: 'unauthenticated',
          actions: assign({
            loading: false,
            success: false,
          }),
        },
      },
      on: {
        LOGIN: {
          target: 'loggingIn',
          actions: assign({
            loginEmail: ({ event }) => event.email,
            loginPassword: ({ event }) => event.password,
          }),
        },
      },
    },
    authenticated: {
      entry: assign({ success: true }),
      on: {
        LOGOUT: {
          target: 'loggingOut',
        },
        CHECK_TOKEN: {
          target: 'checking',
        },
      },
    },
    unauthenticated: {
      entry: assign({ success: false }),
      on: {
        LOGIN: {
          target: 'loggingIn',
          actions: assign({
            loginEmail: ({ event }) => event.email,
            loginPassword: ({ event }) => event.password,
          }),
        },
        CHECK_TOKEN: {
          target: 'checking',
        },
      },
    },
    loggingIn: {
      entry: [
        assign({ loading: true, error: null, success: false }),
      ],
      invoke: {
        id: 'loginUser',
        src: 'loginUser',
        input: ({ context }) => {
          console.log('📥 Input для актора loginUser, context:', context)
          console.log('🟢 Переход в состояние loggingIn')
          
          const inputData = {
            email: context.loginEmail,
            password: context.loginPassword,
          }
          
          console.log('📥 Input данные:', { email: inputData.email, password: '***' })
          
          if (!inputData.email || !inputData.password) {
            console.error('❌ Ошибка: отсутствуют email или password в context:', context)
            throw new Error('Email и password обязательны для логина')
          }
          
          return inputData
        },
        onDone: {
          target: 'authenticated',
          actions: [
            assign({
              userData: ({ event }) => event.output,
              success: true,
              loading: false,
              loginEmail: null,
              loginPassword: null,
            }),
          ],
        },
        onError: {
          target: 'unauthenticated',
          actions: [
            assign({
              error: ({ event }) =>
                event.error?.response?.data?.message || 'Помилка входу',
              loading: false,
              success: false,
              loginEmail: null,
              loginPassword: null,
            }),
          ],
        },
      },
    },
    loggingOut: {
      entry: [
        assign({ loading: true, error: null }),
      ],
      invoke: {
        id: 'logoutUser',
        src: 'logoutUser',
        onDone: {
          target: 'unauthenticated',
          actions: [
            assign({
              userData: null,
              success: false,
              loading: false,
            }),
          ],
        },
        onError: {
          target: 'unauthenticated',
          actions: [
            assign({
              error: ({ event }) =>
                event.error?.response?.data?.message || 'Помилка виходу',
              userData: null,
              success: false,
              loading: false,
            }),
          ],
        },
      },
    },
  },
  on: {
    RESET: {
      target: '.unauthenticated',
      actions: [
        assign({
          userData: null,
          error: null,
          success: false,
          loading: false,
        }),
      ],
    },
    CLEAR_ERROR: {
      actions: [assign({ error: null })],
    },
  },
})

