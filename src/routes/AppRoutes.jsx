import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import Dashboard from '../pages/Dashboard'
import TenantDashboard from '../pages/TenantDashboard'
import MaintenancePage from '../pages/MaintenancePage'
import AdminMaintenancePage from '../pages/AdminMaintenancePage'
import PricingPage from '../pages/PricingPage'
import { useAuth } from '../context/AuthContext'

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected Routes - Only redirect to login if not authenticated */}
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/tenant" 
        element={isAuthenticated ? <TenantDashboard /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/tenant/maintenance" 
        element={isAuthenticated ? <MaintenancePage /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/admin/maintenance" 
        element={isAuthenticated ? <AdminMaintenancePage /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/admin/pricing" 
        element={isAuthenticated ? <PricingPage /> : <Navigate to="/login" replace />} 
      />
      
      {/* Fallback Route - Redirect to landing page instead of login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes

