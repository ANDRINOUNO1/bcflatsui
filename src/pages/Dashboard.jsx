import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { roomService } from '../services/roomService'
import { tenantService } from '../services/tenantService'
import RoomPage from './RoomPage'
import TenantPage from './TenantPage'
import '../components/Dashboard.css'

const Dashboard = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    totalStudents: 0,
    maintenanceRequests: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
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
        const [roomStats, tenantStats] = await Promise.all([
          roomService.getRoomStats(),
          tenantService.getTenantStats()
        ])

        console.log('📊 Dashboard: Room stats:', roomStats)
        console.log('📊 Dashboard: Tenant stats:', tenantStats)

        setStats({
          totalRooms: roomStats.totalRooms,
          occupiedRooms: roomStats.fullyOccupiedRooms + roomStats.partiallyOccupiedRooms,
          totalStudents: tenantStats.activeTenants,
          maintenanceRequests: roomStats.maintenanceRooms
        })
      } catch (error) {
        console.error('❌ Dashboard: Failed to fetch stats:', error)
        if (error.response?.status === 401) {
          console.log('🔄 Dashboard: Auth error, showing empty stats')
        }
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchDashboardData()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'rooms', label: 'Rooms', icon: '🏠' },
    { id: 'tenants', label: 'Tenants', icon: '👥' },
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
      case 'dashboard':
      default:
        return (
          <div className="dashboard-main">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🏠</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalRooms}</div>
                  <div className="stat-label">Total Rooms</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalStudents}</div>
                  <div className="stat-label">Active Students</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.occupiedRooms}</div>
                  <div className="stat-label">Occupied Rooms</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔧</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.maintenanceRequests}</div>
                  <div className="stat-label">Maintenance</div>
                </div>
              </div>
            </div>

            <div className="welcome-section">
              <h2>Welcome to BCFlats Management System</h2>
              <p>Manage your student housing efficiently with our comprehensive dashboard.</p>
              
              <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="action-buttons">
                  <button 
                    className="action-btn primary"
                    onClick={() => setActiveTab('rooms')}
                  >
                    🏠 Manage Rooms
                  </button>
                  <button 
                    className="action-btn secondary"
                    onClick={() => setActiveTab('tenants')}
                  >
                    👥 Manage Tenants
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
      <div className="dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="dashboard">
        <div className="loading">Redirecting to login...</div>
      </div>
    )
  }

  return (
    <div className={`dashboard ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
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
          <div className="user-info header-user-info">
            <span className="user-email">{user?.email}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
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


