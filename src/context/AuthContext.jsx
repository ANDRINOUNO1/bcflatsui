import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in on app start
    const token = localStorage.getItem('token')
    if (token) {
      authService.validateToken(token)
        .then(userData => {
          setUser(userData)
          setIsAuthenticated(true)
        })
        .catch((error) => {
          console.error('Token validation failed:', error)
          localStorage.removeItem('token')
          setUser(null)
          setIsAuthenticated(false)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password)
      const { token, user: userData } = response
      
      localStorage.setItem('token', token)
      setUser(userData)
      setIsAuthenticated(true)
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setIsAuthenticated(false)
  }

  const register = async (userData) => {
    try {
      const response = await authService.register(userData)
      return { success: true, data: response }
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Registration failed' 
      }
    }
  }

  const updateProfile = async (profileData) => {
    try {
      const updatedUser = await authService.updateProfile(profileData)
      setUser(updatedUser)
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Profile update failed' 
      }
    }
  }

  const refreshAuth = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const userData = await authService.validateToken(token)
        setUser(userData)
        setIsAuthenticated(true)
        return true
      } catch (error) {
        console.error('Token refresh failed:', error)
        localStorage.removeItem('token')
        setUser(null)
        setIsAuthenticated(false)
        return false
      }
    }
    return false
  }

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    register,
    updateProfile,
    refreshAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

