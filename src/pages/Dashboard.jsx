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
          {/* Header Section */}
          <div className="dashboard-header-gradient">
            <div className="dash-container">
              <div className="dash-header-row">
                <div>
                  <h1 className="dash-title">Admin Dashboard</h1>
                  <p className="dash-subtitle">
                    Manage your student housing efficiently with real-time data.
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="btn-primary refresh-btn"
                >
                  {refreshing ? 'Refreshing...' : 'Refresh Data 🔄'}
                </button>
              </div>
            </div>
          </div>

          <div className="dash-container dash-content">
            {/* 📊 Stats Overview */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-info">
                  <p className="stat-label">Total Tenants</p>
                  <p className="stat-number">{stats.totalStudents}</p>
                </div>
                <div className="stat-icon">👥</div>
              </div>

              <div className="stat-card">
                <div className="stat-info">
                  <p className="stat-label">Occupancy Rate</p>
                  <p className="stat-number">
                    {stats.totalRooms > 0
                      ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="stat-icon">📊</div>
              </div>

              <div className="stat-card">
                <div className="stat-info">
                  <p className="stat-label">Unpaid Bills</p>
                  <p className="stat-number">{dashboardStats?.totalUnpaidBills || 0}</p>
                </div>
                <div className="stat-icon">⚠️</div>
              </div>

              <div className="stat-card">
                <div className="stat-info">
                  <p className="stat-label">Total Collected</p>
                  <p className="stat-number">
                    ₱{dashboardStats?.totalAmountCollected?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="stat-icon">💰</div>
              </div>
            </div>

            {/* 💰 Financial Overview & Lists */}
            {dashboardStats && (
              <div className="overview-grid">
                {/* Financial Overview Card */}
                <div className="overview-card">
                  <h3 className="overview-title">
                    <span>💰</span> Financial Overview
                  </h3>
                  <div className="overview-list">
                    <div className="overview-item">
                      <span>Total Outstanding:</span>
                      <span className="text-red">
                        ₱{dashboardStats?.totalOutstandingAmount?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="overview-item">
                      <span>Total Collected:</span>
                      <span className="text-green">
                        ₱{dashboardStats?.totalAmountCollected?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="overview-item">
                      <span>Unpaid Bills:</span>
                      <span className="text-orange">
                        {dashboardStats?.totalUnpaidBills || 0}
                      </span>
                    </div>

                    {/* Inline Progress Bar */}
                    <div className="progress-bar">
                      {(() => {
                        const collected = Number(dashboardStats?.totalAmountCollected || 0);
                        const outstanding = Number(dashboardStats?.totalOutstandingAmount || 0);
                        const total = collected + outstanding || 1;
                        const collectedPct = Math.round((collected / total) * 100);
                        const outstandingPct = 100 - collectedPct;
                        return (
                          <>
                            <div className="bar-container">
                              <div className="bar-collected" style={{ width: collectedPct + '%' }} />
                              <div className="bar-outstanding" style={{ width: outstandingPct + '%' }} />
                            </div>
                            <div className="bar-labels">
                              <span>Collected</span>
                              <span>Outstanding</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Recent Payments Card */}
                <div className="overview-card">
                  <h3 className="overview-title"><span>📊</span> Recent Payments</h3>
                  <div className="overview-list">
                    {dashboardStats?.recentPayments?.length > 0 ? (
                      dashboardStats.recentPayments.slice(0, 3).map(payment => (
                        <div key={payment.id} className="list-item">
                          <div>
                            <p className="item-name">{payment.tenantName}</p>
                            <p className="item-sub">Room {payment.roomNumber}</p>
                          </div>
                          <div className="item-right">
                            <p className="text-green">
                              ₱{payment.amount.toLocaleString()}
                            </p>
                            <p className="item-sub">
                              {new Date(payment.paymentDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="no-data">No recent payments</p>
                    )}
                  </div>
                </div>

                {/* Top Outstanding Card */}
                <div className="overview-card">
                  <h3 className="overview-title"><span>⚠️</span> Top Outstanding</h3>
                  <div className="overview-list">
                    {dashboardStats?.topOutstandingTenants?.length > 0 ? (
                      dashboardStats.topOutstandingTenants.slice(0, 3).map(tenant => (
                        <div key={tenant.id} className="list-item">
                          <div>
                            <p className="item-name">{tenant.name}</p>
                            <p className="item-sub">Room {tenant.roomNumber}</p>
                          </div>
                          <div className="item-right">
                            <span className="badge-red">
                              ₱{tenant.outstandingBalance.toLocaleString()}
                            </span>
                            <p className="item-sub">
                              {new Date(tenant.nextDueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="no-data">All tenants are up to date</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 🚀 Quick Actions */}
            <div className="quick-actions-card">
              <h3 className="quick-title">Quick Actions</h3>
              <div className="quick-grid">
                <button className="quick-btn blue" onClick={() => setActiveTab('rooms')}>
                  🏠 Manage Rooms
                </button>
                <button className="quick-btn green" onClick={() => setActiveTab('tenants')}>
                  👥 Manage Tenants
                </button>
                <button className="quick-btn purple" onClick={() => setActiveTab('accounting')}>
                  💰 View Accounting
                </button>
                <button className="quick-btn orange" onClick={() => setActiveTab('maintenance')}>
                  🔧 Maintenance
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
            <div className="logoo">
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