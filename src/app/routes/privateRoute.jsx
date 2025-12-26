import React from "react"
import { observer, inject } from "mobx-react"
import { Navigate } from "react-router-dom"

const PrivateRoute = observer(({ element, authStore }) => {
  const { isAuthenticated } = authStore
  return isAuthenticated ? element : <Navigate to="/login" replace />
})

export default inject('authStore')(PrivateRoute)
