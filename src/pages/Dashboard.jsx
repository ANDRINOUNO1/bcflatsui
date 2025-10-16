import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { roomService } from '../services/roomService'
import { tenantService } from '../services/tenantService'
import { paymentService } from '../services/paymentService'
import RoomPage from './RoomPage'
import TenantPage from './TenantPage'
import PricingPage from './PricingPage'
import AdminMaintenancePage from './AdminMaintenancePage'
import AccountingPage from './AccountingPage'
import AddAccountPage from './AddAccountPage'
import '../components/Dashboard.css'


const Dashboard = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    totalStudents: 0,
    maintenanceRequests: 0
  })
  const [dashboardStats, setDashboardStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '', details: '' })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      console.log('🔐 Dashboard: Authentication status:', isAuthenticated)
      console.log('🔐 Dashboard: Token in localStorage:', !!localStorage.getItem('token'))
      

      if (!isAuthenticated) {
        console.log(' Dashboard: Not authenticated, skipping data fetch')
        setLoading(false)
        return
      }
      
      console.log(' Dashboard: Fetching statistics...')
      const [roomStats, tenantStats, paymentStats] = await Promise.all([
        roomService.getRoomStats().catch((e) => {
          setErrorModal({ open: true, title: 'Failed to load room stats', message: 'Some dashboard data may be incomplete.', details: e?.response?.data?.message || e.message })
          return { totalRooms: 0, fullyOccupiedRooms: 0, partiallyOccupiedRooms: 0, maintenanceRooms: 0 }
        }),
        tenantService.getTenantStats().catch((e) => {
          setErrorModal({ open: true, title: 'Failed to load tenant stats', message: 'Some dashboard data may be incomplete.', details: e?.response?.data?.message || e.message })
          return { activeTenants: 0 }
        }),
        paymentService.getDashboardStats().catch((e) => {
          setErrorModal({ open: true, title: 'Failed to load payment stats', message: 'Some dashboard data may be incomplete.', details: e?.response?.data?.message || e.message })
          return { totalUnpaidBills: 0, totalAmountCollected: 0, totalOutstandingAmount: 0, recentPayments: [], topOutstandingTenants: [] }
        })
      ])

      console.log('📊 Dashboard: Room stats:', roomStats)
      console.log('📊 Dashboard: Tenant stats:', tenantStats)
      console.log('📊 Dashboard: Payment stats:', paymentStats)

      setStats({
        totalRooms: Number(roomStats.totalRooms || 0),
        occupiedRooms: Number((roomStats.fullyOccupiedRooms || 0)) + Number((roomStats.partiallyOccupiedRooms || 0)),
        totalStudents: Number(tenantStats.activeTenants || 0),
        maintenanceRequests: Number(roomStats.maintenanceRooms || 0)
      })

      setDashboardStats(paymentStats)
    } catch (error) {
      console.error('❌ Dashboard: Failed to fetch stats:', error)
      if (error.response?.status === 401) {
        console.log('🔄 Dashboard: Auth error, showing empty stats')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  const handleLogout = () => {
    logout()
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'rooms', label: 'Rooms', icon: '🏠' },
    { id: 'tenants', label: 'Tenants', icon: '👥' },
    { id: 'accounting', label: 'Accounting', icon: '💰' },
    { id: 'pricing', label: 'Pricing', icon: '💵' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { id: 'add-account', label: 'Add Account', icon: '👤' },
    { id: 'account', label: 'Account', icon: '⚙️' },
    { id: 'users', label: 'Users', icon: '👨‍👩‍👧‍👦' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'help', label: 'Help', icon: '❓' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'rooms':
        return <RoomPage />
      case 'tenants':
        return <TenantPage />
      case 'accounting':
        return <AccountingPage />
      case 'pricing':
        return <PricingPage />
      case 'maintenance':
        return <AdminMaintenancePage />
      case 'add-account':
        return <AddAccountPage />
      case 'dashboard':
      default:
        return (
          <div className="dashboard-screen">
            {/* Header with Blue Gradient */}
            <div className="dashboard-header-gradient">
              <div className="dash-container">
                <div className="dash-header-row">
                  <div>
                    <h1 className="dash-title">Admin Dashboard</h1>
                    <p className="dash-subtitle">Manage your student housing efficiently with real-time data.</p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="btn-primary"
                  >
                    {refreshing ? (
                      'Refreshing...'
                    ) : (
                      'Refresh Data 🔄'
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="dash-container dash-content">
              {/* Stats Overview Grid */}
              <div className="dash-grid">
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="dash-label">Total Tenants</p>
                      <p className="dash-number">{stats.totalStudents}</p>
                    </div>
                    <div className="dash-icon">👥</div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="dash-label">Occupancy Rate</p>
                      <p className="dash-number">
                        {stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0}%
                      </p>
                    </div>
                    <div className="dash-icon">📊</div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="dash-label">Unpaid Bills</p>
                      <p className="dash-number">{dashboardStats?.totalUnpaidBills || 0}</p>
                    </div>
                    <div className="dash-icon">⚠️</div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="dash-label">Total Collected</p>
                      <p className="dash-number">
                        ₱{dashboardStats?.totalAmountCollected?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div className="dash-icon">💰</div>
                  </div>
                </div>
              </div>

              {/* Financial Overview */}
              {dashboardStats && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">💰</span>
                      Financial Overview
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Total Outstanding:</span>
                        <span className="font-bold text-red-600">
                           ₱{dashboardStats?.totalOutstandingAmount?.toLocaleString() || '0'}
                      </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Total Collected:</span>
                        <span className="font-bold text-green-600">
                          ₱{dashboardStats?.totalAmountCollected?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Unpaid Bills:</span>
                        <span className="font-bold text-orange-600">
                         {dashboardStats?.totalUnpaidBills || 0}
                        </span>
                      </div>
                      {/* Inline progress bar (no deps) */}
                      <div className="mt-4">
                        {(() => {
                          const collected = Number(dashboardStats?.totalAmountCollected || 0)
                          const outstanding = Number(dashboardStats?.totalOutstandingAmount || 0)
                          const total = collected + outstanding || 1
                          const collectedPct = Math.round((collected / total) * 100)
                          const outstandingPct = 100 - collectedPct
                          return (
                            <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden flex">
                              <div className="h-3 bg-green-500" style={{ width: collectedPct + '%' }}></div>
                              <div className="h-3 bg-red-400" style={{ width: outstandingPct + '%' }}></div>
                            </div>
                          )
                        })()}
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>Collected</span>
                          <span>Outstanding</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">📊</span>
                      Recent Payments
                    </h3>
                    <div className="space-y-3">
                      {dashboardStats?.recentPayments?.length > 0 ? (
                         dashboardStats.recentPayments.slice(0, 3).map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{payment.tenantName}</p>
                              <p className="text-xs text-gray-500">Room {payment.roomNumber}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-green-600">₱{payment.amount.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No recent payments</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">⚠️</span>
                      Top Outstanding
                    </h3>
                    <div className="space-y-3">
                     {dashboardStats?.topOutstandingTenants?.length > 0 ? (
                          dashboardStats.topOutstandingTenants.slice(0, 3).map((tenant) => (
                          <div key={tenant.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                              <p className="text-xs text-gray-500">Room {tenant.roomNumber}</p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">₱{tenant.outstandingBalance.toLocaleString()}</span>
                              <p className="text-xs text-gray-500">{new Date(tenant.nextDueDate).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">All tenants are up to date</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-xl transform hover:-translate-y-1"
                    onClick={() => setActiveTab('rooms')}
                  >
                    <span className="text-xl">🏠</span>
                    <span>Manage Rooms</span>
                  </button>
                  <button 
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-xl transform hover:-translate-y-1"
                    onClick={() => setActiveTab('tenants')}
                  >
                    <span className="text-xl">👥</span>
                    <span>Manage Tenants</span>
                  </button>
                  <button 
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-xl transform hover:-translate-y-1"
                    onClick={() => setActiveTab('accounting')}
                  >
                    <span className="text-xl">💰</span>
                    <span>View Accounting</span>
                  </button>
                  <button 
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-xl transform hover:-translate-y-1"
                    onClick={() => setActiveTab('maintenance')}
                  >
                    <span className="text-xl">🔧</span>
                    <span>Maintenance</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-layout">
      {errorModal.open && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}></div>
          <div className="error-modal">
            <div className="error-modal-header">
              <div className="error-modal-title-content">
                <span className="error-modal-icon">⚠️</span>
                <h3 className="error-modal-title">{errorModal.title || 'Something went wrong'}</h3>
              </div>
              <button aria-label="Close" className="error-modal-close" onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}>×</button>
            </div>
            <div className="error-modal-body">
              {errorModal.message && <p className="error-modal-message">{errorModal.message}</p>}
              {errorModal.details && <pre className="error-modal-details">{errorModal.details}</pre>}
              <div className="error-modal-actions">
                <button onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })} className="error-modal-button">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="mobile-menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <span className="hamburger-icon">☰</span>
            </button>
            <div className="logo">
              <span className="logo-icon">🏢</span>
              <span className="logo-text">BCFlats Management</span>
            </div>
          </div>
          <div className="profile-meta">
            <div className="email">{user?.email}</div>
          </div>
        </div>
      </header>

      <div className={`dashboard-body ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
        
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={handleLogout}>
              <span className="nav-icon">🚪</span>
              <span className="nav-label">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default Dashboard