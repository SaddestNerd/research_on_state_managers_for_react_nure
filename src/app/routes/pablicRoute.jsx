import React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context"

const PublicRoute = ({ element }) => {
  const { isAuthenticated } = useAuth()
  return !isAuthenticated ? element : <Navigate to="/dashboard" replace />
}

export default PublicRoute
