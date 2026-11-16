import React from "react"
import { Navigate } from "react-router-dom"
import { useAuthStore } from "../store"

const PublicRoute = ({ element }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return !isAuthenticated ? element : <Navigate to="/dashboard" replace />
}

export default PublicRoute
