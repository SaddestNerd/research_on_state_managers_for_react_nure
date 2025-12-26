import React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context"

const PrivateRoute = ({ element }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? element : element
}

export default PrivateRoute
