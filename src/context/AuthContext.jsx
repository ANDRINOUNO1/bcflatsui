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
  const token = sessionStorage.getItem('token')
  if (token) {
    authService.validateToken(token)
      .then(userData => {
        if (userData) {
          setUser(userData)
          setIsAuthenticated(true)
        } else {
          sessionStorage.removeItem('token')
          setUser(null)
          setIsAuthenticated(false)
        }
      })
      .catch((error) => {
        console.error('Token validation failed:', error)
        sessionStorage.removeItem('token')
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
    

    if (userData.status && userData.status !== 'Active') {
      let errorMessage = 'Login failed'
      switch (userData.status) {
        case 'Pending':
          errorMessage = 'Your account is pending approval. Please wait for a superadmin to approve your account.'
          break
        case 'Suspended':
          errorMessage = 'Your account has been suspended. Please contact support.'
          break
        case 'Rejected':
          errorMessage = 'Your account has been rejected. Please contact support for more information.'
          break
        default:
          errorMessage = 'Your account is not active. Please contact support.'
      }
      return { 
        success: false, 
        error: errorMessage,
        status: userData.status
      }
    }
    
    sessionStorage.setItem('token', token)
    setUser(userData)
    setIsAuthenticated(true)
    
    return { success: true }
  } catch (error) {
    // Parse specific error messages from backend
    let errorMessage = 'Login failed. Please try again.'
    
    if (error.message) {
      // Handle specific error messages from backend
      if (error.message.includes('Account not found')) {
        errorMessage = 'Account not found. Please check your email address.'
      } else if (error.message.includes('Wrong credentials')) {
        errorMessage = 'Wrong credentials. Please check your password.'
      } else if (error.message.includes('Account pending approval')) {
        errorMessage = 'Account pending approval. Please wait for superadmin approval.'
        return { 
          success: false, 
          error: errorMessage,
          status: 'Pending'
        }
      } else if (error.message.includes('Account suspended')) {
        errorMessage = 'Account suspended. Please contact support for assistance.'
      } else if (error.message.includes('Account rejected')) {
        errorMessage = 'Account rejected. Please contact support for more information.'
      } else if (error.message.includes('Account deleted')) {
        errorMessage = 'Account deleted. Please contact support for assistance.'
      } else if (error.message.includes('Account not active')) {
        errorMessage = 'Account not active. Please contact support.'
      } else {
        errorMessage = error.message
      }
    }
    
    return { 
      success: false, 
      error: errorMessage 
    }
  }
}

const logout = () => {
  sessionStorage.removeItem('token')
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
    const token = sessionStorage.getItem('token')
    if (token) {
      try {
        const userData = await authService.validateToken(token)
        if (userData) {
          setUser(userData)
          setIsAuthenticated(true)
          return true
        } else {
          sessionStorage.removeItem('token')
          setUser(null)
          setIsAuthenticated(false)
          return false
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
        sessionStorage.removeItem('token')
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

