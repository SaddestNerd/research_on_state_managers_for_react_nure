export const endpoints = {
  general: {
    auth: {
      post: {
        login: "/api/v1/auth/login",
        teamOwnersSignUp: "/api/v1/auth/team-owners-sign-up",
        checkTeamOwnersSignUp: "/api/v1/auth/check-team-owners-sign-up",
        signIn: "/api/v1/auth/sign-in",
        refreshTokenAccess: "/api/v1/auth/refresh-token-access",
        logout: "/api/v1/auth/logout",
        emailVerificationSend: "/api/v1/auth/email-verification-send",
        emailVerificationVerify: "/api/v1/auth/email-verification-verify",
      },
      get: {
        profile: "/api/v1/auth/profile",
      },
      patch: {
        changePassword: "/api/v1/auth/change-password",
      },
    },
    products: {
      get: {
        list: "/api/v1/products",
        byId: (id) => `/api/v1/products/${id}`,
      },
      post: {
        create: "/api/v1/products",
      },
      put: {
        update: (id) => `/api/v1/products/${id}`,
      },
      delete: {
        remove: (id) => `/api/v1/products/${id}`,
      },
    },
  }
}
