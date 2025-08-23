// Mock Authentication Service with seeded admin account
// This simulates authentication without requiring a backend

// TODO: Uncomment this section when connecting to your backend
// const API_BASE_URL = 'http://localhost:3001/api' // Update with your backend URL

// Create axios instance with default config
// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// })

// Add token to requests if available
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('token')
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`
//   }
//   return config
// })

// Handle token expiration
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('token')
//       window.location.href = '/login'
//     }
//     return Promise.reject(error)
//   }
// )

// Seeded admin user
const ADMIN_USER = {
  id: 1,
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  avatar: '👨‍💼'
}

// Simulate API delay
const simulateApiCall = (delay = 500) => {
  return new Promise(resolve => setTimeout(resolve, delay))
}

export const authService = {
  // Login user
  async login(email, password) {
    await simulateApiCall()
    
    // Check against seeded admin account
    if (email === 'admin@example.com' && password === 'admin123') {
      const token = 'mock-jwt-token-' + Date.now()
      return {
        token,
        user: ADMIN_USER
      }
    }
    
    throw new Error('Invalid email or password')
  },

  // Register new user (mock implementation)
  async register(userData) {
    await simulateApiCall()
    // For demo purposes, just return success
    return { message: 'User registered successfully' }
  },

  // Validate JWT token (mock implementation)
  async validateToken(token) {
    await simulateApiCall(200)
    
    // Check if token exists in localStorage
    const storedToken = localStorage.getItem('token')
    if (storedToken && storedToken === token) {
      return ADMIN_USER
    }
    
    throw new Error('Invalid token')
  },

  // Update user profile (mock implementation)
  async updateProfile(profileData) {
    await simulateApiCall()
    const updatedUser = { ...ADMIN_USER, ...profileData }
    return updatedUser
  },

  // Forgot password (mock implementation)
  async forgotPassword(email) {
    await simulateApiCall()
    return { message: 'Password reset email sent' }
  },

  // Reset password (mock implementation)
  async resetPassword(token, newPassword) {
    await simulateApiCall()
    return { message: 'Password reset successfully' }
  }
}

