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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '', details: '' })

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
          <div className="min-h-screen bg-gray-50">
            {/* Header with Blue Gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-8">
                  <div>
                    <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-blue-100 mt-2 text-lg">Manage your student housing efficiently with real-time data.</p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="bg-white hover:bg-gray-50 disabled:bg-gray-200 text-blue-600 font-semibold py-3 px-6 rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    {refreshing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        Refresh Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Stats Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Tenants</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                      <div className="text-2xl">👥</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Occupancy Rate</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0}%
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <div className="text-2xl">📊</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border-l-4 border-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Unpaid Bills</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardStats?.totalUnpaidBills || 0}</p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-full">
                      <div className="text-2xl">⚠️</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Collected</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        ₱{dashboardStats?.totalAmountCollected?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-full">
                      <div className="text-2xl">💰</div>
                    </div>
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
                          ₱{dashboardStats.totalOutstandingAmount?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Total Collected:</span>
                        <span className="font-bold text-green-600">
                          ₱{dashboardStats.totalAmountCollected?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Unpaid Bills:</span>
                        <span className="font-bold text-orange-600">
                          {dashboardStats.totalUnpaidBills || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">📊</span>
                      Recent Payments
                    </h3>
                    <div className="space-y-3">
                      {dashboardStats.recentPayments?.length > 0 ? (
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
                      {dashboardStats.topOutstandingTenants?.length > 0 ? (
                        dashboardStats.topOutstandingTenants.slice(0, 3).map((tenant) => (
                          <div key={tenant.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                              <p className="text-xs text-gray-500">Room {tenant.roomNumber}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-red-600">₱{tenant.outstandingBalance.toLocaleString()}</p>
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
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-full transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    onClick={() => setActiveTab('rooms')}
                  >
                    <span className="text-xl">🏠</span>
                    <span>Manage Rooms</span>
                  </button>
                  <button 
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-full transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    onClick={() => setActiveTab('tenants')}
                  >
                    <span className="text-xl">👥</span>
                    <span>Manage Tenants</span>
                  </button>
                  <button 
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-full transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    onClick={() => setActiveTab('accounting')}
                  >
                    <span className="text-xl">💰</span>
                    <span>View Accounting</span>
                  </button>
                  <button 
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-6 rounded-full transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
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
    <div className={`dashboard ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {errorModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}></div>
          <div className="relative bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <h3 className="text-lg font-semibold">{errorModal.title || 'Something went wrong'}</h3>
                </div>
                <button aria-label="Close" className="text-white/90 hover:text-white text-xl leading-none" onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}>×</button>
              </div>
            </div>
            <div className="p-6">
              {errorModal.message && <p className="text-gray-800 mb-2">{errorModal.message}</p>}
              {errorModal.details && <pre className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{errorModal.details}</pre>}
              <div className="mt-6 flex justify-end">
                <button onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow">Close</button>
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
              className="sidebar-toggle"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              ☰
            </button>
            <div className="logo">
              <span className="logo-icon">🏢</span>
              <span className="logo-text">BCFlats Management</span>
            </div>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="sidebar-profile">
            <div className="avatar">👤</div>
            <div className="profile-meta">
              <div className="name">{user?.email?.split('@')[0] || 'User'}</div>
              <div className="email">{user?.email}</div>
            </div>
            <button className="logout-btn small" onClick={handleLogout}>Logout</button>
          </div>
          <nav className="sidebar-nav">
            {navigationItems.filter(i => i.id !== 'help').map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
            <div className="sidebar-footer">
              {navigationItems.filter(i => i.id === 'help').map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
        )}

                 {/* Main Content */}
         <main className="dashboard-main-content">
           {renderContent()}
         </main>
      </div>
    </div>
  )
}

export default Dashboard


