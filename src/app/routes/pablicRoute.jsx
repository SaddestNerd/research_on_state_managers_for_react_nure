import React from "react"
import { observer, inject } from "mobx-react"
import { Navigate } from "react-router-dom"

const PublicRoute = observer(({ element, authStore }) => {
  const { isAuthenticated } = authStore
  return !isAuthenticated ? element : <Navigate to="/dashboard" replace />
})

export default inject('authStore')(PublicRoute)
