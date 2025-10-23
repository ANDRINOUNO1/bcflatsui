import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../components/LoginPage.css'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, user } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Logging in...')

  // Loading message cycling effect
  useEffect(() => {
    if (!isLoading) return

    const messages = [
      'Logging in...',
      'Verifying credentials...',
      'Accessing your account...',
      'Almost there...'
    ]
    
    let messageIndex = 0
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length
      setLoadingMessage(messages[messageIndex])
    }, 1500)

    return () => clearInterval(interval)
  }, [isLoading])

  // Helper functions for error handling
  const getErrorType = (errorMessage) => {
    if (errorMessage.includes('Account not found')) return 'not-found'
    if (errorMessage.includes('Wrong credentials')) return 'wrong-credentials'
    if (errorMessage.includes('Account pending approval')) return 'pending'
    if (errorMessage.includes('Account suspended')) return 'suspended'
    if (errorMessage.includes('Account rejected')) return 'rejected'
    if (errorMessage.includes('Account deleted')) return 'deleted'
    return 'general'
  }

  const getErrorIcon = (errorMessage) => {
    if (errorMessage.includes('Account not found')) return '🔍'
    if (errorMessage.includes('Wrong credentials')) return '🔒'
    if (errorMessage.includes('Account pending approval')) return '⏳'
    if (errorMessage.includes('Account suspended')) return '🚫'
    if (errorMessage.includes('Account rejected')) return '❌'
    if (errorMessage.includes('Account deleted')) return '🗑️'
    return '⚠️'
  }

  const getErrorTitle = (errorMessage) => {
    if (errorMessage.includes('Account not found')) return 'Account Not Found'
    if (errorMessage.includes('Wrong credentials')) return 'Wrong Credentials'
    if (errorMessage.includes('Account pending approval')) return 'Account Pending Approval'
    if (errorMessage.includes('Account suspended')) return 'Account Suspended'
    if (errorMessage.includes('Account rejected')) return 'Account Rejected'
    if (errorMessage.includes('Account deleted')) return 'Account Deleted'
    return 'Login Failed'
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({}) // Clear previous errors
    
    try {
      const result = await login(formData.email, formData.password)
      
      if (result.success) {
        // Use the user data returned from the login function
        const userData = result.user
        if (userData?.role === 'HeadAdmin') {
          navigate('/dashboard')
        } else if (userData?.role === 'SuperAdmin') {
          navigate('/super-admin')
        } else if (userData?.role === 'Admin') {
          navigate('/dashboard')
        } else if (userData?.role === 'Accounting') {
          navigate('/accounting')
        } else if (userData?.role === 'Tenant') {
          navigate('/tenant')
        } else {
          navigate('/') 
        }
      } else {
        // Handle different error types properly
        let errorMessage = 'Login failed. Please try again.'
        
        if (typeof result.error === 'string') {
          errorMessage = result.error
        } else if (typeof result.error === 'object' && result.error !== null) {
          // Handle object errors from backend
          if (result.error.message) {
            errorMessage = result.error.message
          } else if (result.error.error) {
            errorMessage = result.error.error
          } else if (result.error.details) {
            errorMessage = result.error.details
          } else {
            errorMessage = 'Invalid credentials. Please check your email and password.'
          }
        }

        if (result.status === 'Pending') {
          setErrors({ 
            general: errorMessage,
            pending: true 
          })
        } else {
          setErrors({ general: errorMessage })
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      let errorMessage = 'Login failed. Please try again.'
      
      if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }
      
      setErrors({ general: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Login Form */}
        <div className="login-form-container">
          {/* Back Link - Repositioned to avoid overlap */}
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>
          
          <div className="login-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your BCFlats account</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {isLoading && (
              <div className="loading-overlay">
                <div className="loading-content">
                  <div className="loading-spinner-large">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                  </div>
                  <div className="loading-status">
                    <h3>Please wait...</h3>
                    <p>{loadingMessage}</p>
                  </div>
                </div>
              </div>
            )}
            {errors.general && (
              <div className={`error-message general ${errors.pending ? 'pending' : ''} ${getErrorType(errors.general)}`}>
                <div className="error-icon">
                  {getErrorIcon(errors.general)}
                </div>
                <div className="error-content">
                  <div className="error-title">
                    {getErrorTitle(errors.general)}
                  </div>
                  <div className="error-text">
                    {errors.general}
                  </div>
                  {errors.pending && (
                    <div className="pending-info">
                      <p>Your account has been created but is waiting for superadmin approval.</p>
                      <p>You will be able to log in once your account is approved.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className={errors.password ? 'error' : ''}
              />
              {errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input type="checkbox" />
                <span className="checkmark"></span>
                Remember me
              </label>
              <Link to="/forgot-password" className="forgot-password">
                Forgot Password?
              </Link>
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading">
                  <span className="spinner"></span>
                  <span className="loading-text">{loadingMessage}</span>
                </span>
              ) : (
                'Log In'
              )}
            </button>
          </form>
        </div>

        {/* Decorative Side */}
        <div className="login-decoration">
          <div className="decoration-content">
            <h2>BCFlats</h2>
            <p>Your Home Away From Home</p>
            <div className="decoration-features">
              <div className="feature">
                <span className="feature-icon">🏠</span>
                <span>Comfortable Living</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🔒</span>
                <span>Secure Environment</span>
              </div>
              <div className="feature">
                <span className="feature-icon">👥</span>
                <span>Community Feel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
