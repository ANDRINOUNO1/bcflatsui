import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import Dashboard from '../pages/Dashboard'
import TenantDashboard from '../pages/TenantDashboard'
import MaintenancePage from '../pages/MaintenancePage'
import AdminMaintenancePage from '../pages/AdminMaintenancePage'
import PricingPage from '../pages/PricingPage'
import AccountingDashboard from '../pages/AccountingDashboard'
import SuperAdminPage from '../pages/SuperAdminPage'
import ArchivedTenantsPage from '../pages/ArchivedTenantsPage'
import NotFoundPage from '../pages/NotFoundPage'
import { useAuth } from '../context/AuthContext'

const AppRoutes = () => {
  const { isAuthenticated, loading, user } = useAuth()

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
        element={
          isAuthenticated
            ? (
                user?.role === 'Admin' ? (
                  <Dashboard />
                ) : user?.role === 'SuperAdmin' ? (
                  <SuperAdminPage />
                ) : (
                  <Navigate to={user?.role === 'Accounting' ? '/accounting' : '/tenant'} replace />
                )
              )
            : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/super-admin" 
        element={
          isAuthenticated
            ? (user?.role === 'SuperAdmin' ? <SuperAdminPage /> : <Navigate to="/" replace />)
            : <Navigate to="/login" replace />
        }
      />
      <Route 
        path="/accounting" 
        element={
          isAuthenticated
            ? (user?.role === 'Accounting' || user?.role === 'Admin' || user?.role === 'SuperAdmin'
                ? <AccountingDashboard />
                : <Navigate to="/tenant" replace />)
            : <Navigate to="/login" replace />
        } 
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
      <Route 
        path="/archived-tenants" 
        element={
          isAuthenticated
            ? (user?.role === 'Admin' || user?.role === 'SuperAdmin'
                ? <ArchivedTenantsPage />
                : <Navigate to="/" replace />)
            : <Navigate to="/login" replace />
        } 
      />
      
      {/* 404 Not Found Route */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes

