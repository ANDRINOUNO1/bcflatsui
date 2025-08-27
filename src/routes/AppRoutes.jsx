import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import Dashboard from '../pages/Dashboard'
import TenantDashboard from '../pages/TenantDashboard'
import MaintenancePage from '../pages/MaintenancePage'
import { useAuth } from '../context/AuthContext'

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth()


  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
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
      
      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes

