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
  const [permissions, setPermissions] = useState([])
  const [roles, setRoles] = useState([])

  useEffect(() => {
  const token = sessionStorage.getItem('token')
  if (token) {
    authService.validateToken(token)
      .then(userData => {
        if (userData) {
          setUser(userData)
          setIsAuthenticated(true)
          setPermissions(userData.permissions || [])
          setRoles(userData.roles || [])
        } else {
          sessionStorage.removeItem('token')
          setUser(null)
          setIsAuthenticated(false)
          setPermissions([])
          setRoles([])
        }
      })
      .catch((error) => {
        console.error('Token validation failed:', error)
        sessionStorage.removeItem('token')
        setUser(null)
        setIsAuthenticated(false)
        setPermissions([])
        setRoles([])
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
    setPermissions(userData.permissions || [])
    setRoles(userData.roles || [])
    
    return { success: true, user: userData }
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
  setPermissions([])
  setRoles([])
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
          setPermissions(userData.permissions || [])
          setRoles(userData.roles || [])
          return true
        } else {
          sessionStorage.removeItem('token')
          setUser(null)
          setIsAuthenticated(false)
          setPermissions([])
          setRoles([])
          return false
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
        sessionStorage.removeItem('token')
        setUser(null)
        setIsAuthenticated(false)
        setPermissions([])
        setRoles([])
        return false
      }
    }
    return false
  }

  const refreshPermissions = async () => {
    const token = sessionStorage.getItem('token')
    if (token) {
      try {
        // Call the backend directly to get fresh user data with permissions
        const response = await fetch('http://localhost:3000/api/test-auth', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const userData = data.user
          
          if (userData) {
            console.log('🔄 Refreshing permissions with fresh data:', userData)
            setUser(userData)
            setPermissions(userData.permissions || [])
            setRoles(userData.roles || [])
            console.log('✅ Permissions refreshed successfully')
            return { success: true }
          } else {
            console.error('❌ Failed to refresh permissions: No user data')
            return { success: false, error: 'No user data' }
          }
        } else {
          console.error('❌ Failed to refresh permissions: Invalid response')
          return { success: false, error: 'Invalid response' }
        }
      } catch (error) {
        console.error('❌ Failed to refresh permissions:', error)
        return { success: false, error: error.message }
      }
    } else {
      console.error('❌ No token found for permission refresh')
      return { success: false, error: 'No authentication token' }
    }
  }

  // Permission checking functions
  const hasPermission = (resource, action) => {
    if (!permissions || permissions.length === 0) return false;
    
    // Check direct permissions
    const hasDirectPermission = permissions.some(p => 
      p.resource === resource && p.action === action
    );
    
    if (hasDirectPermission) return true;
    
    // Check role-based permissions
    const hasHeadAdminRole = roles.some(r => r.name === 'HeadAdmin');
    if (hasHeadAdminRole) return true; // Head Admin has all permissions
    
    const hasSuperAdminRole = roles.some(r => r.name === 'SuperAdmin');
    if (hasSuperAdminRole && resource !== 'admin_management') {
      return true; // Super Admin has most permissions except admin management
    }
    
    // Check navigation permissions specifically
    if (resource === 'navigation') {
      const hasNavigationPermission = permissions.some(p => 
        p.resource === 'navigation' && p.action === action
      );
      if (hasNavigationPermission) return true;
    }
    
    // Check specific role permissions
    const rolePermissions = {
      'Admin': ['dashboard', 'rooms', 'tenants', 'maintenance', 'announcements', 'archives'],
      'Accounting': ['dashboard', 'accounting', 'tenants'],
      'Tenant': ['dashboard']
    };
    
    for (const role of roles) {
      if (rolePermissions[role.name] && rolePermissions[role.name].includes(resource)) {
        return true;
      }
    }
    
    return false;
  };

  const hasRole = (roleName) => {
    return roles.some(r => r.name === roleName);
  };

  const hasAnyRole = (roleNames) => {
    return roles.some(r => roleNames.includes(r.name));
  };

  const canManageAccount = (targetUserId) => {
    // Head Admin can manage all accounts
    if (hasRole('HeadAdmin')) return true;
    
    // Super Admin can manage non-Head Admin accounts
    if (hasRole('SuperAdmin')) {
      // This would need to be checked against the target user's roles
      // For now, return true for Super Admin
      return true;
    }
    
    return false;
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    permissions,
    roles,
    login,
    logout,
    register,
    updateProfile,
    refreshAuth,
    refreshPermissions,
    hasPermission,
    hasRole,
    hasAnyRole,
    canManageAccount
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

