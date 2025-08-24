import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { roomService } from '../services/roomService'
import { tenantService } from '../services/tenantService'
import RoomPage from './RoomPage'
import TenantPage from './TenantPage'
import '../components/Dashboard.css'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    totalStudents: 0,
    maintenanceRequests: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // Fetch room and tenant statistics
        const [roomStats, tenantStats] = await Promise.all([
          roomService.getRoomStats(),
          tenantService.getTenantStats()
        ])

        setStats({
          totalRooms: roomStats.totalRooms,
          occupiedRooms: roomStats.fullyOccupiedRooms + roomStats.partiallyOccupiedRooms,
          totalStudents: tenantStats.activeTenants,
          maintenanceRequests: roomStats.maintenanceRooms
        })
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

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

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo">
              <span className="logo-icon">🏢</span>
              <span className="logo-text">BCFlats Management</span>
            </div>
          </div>
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
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
          
          <div className="recent-activity-sidebar">
            <h3>System Status</h3>
            <div className="status-indicators">
              <div className="status-item">
                <span className="status-dot online"></span>
                <span>Backend Connected</span>
              </div>
              <div className="status-item">
                <span className="status-dot online"></span>
                <span>Database Active</span>
              </div>
              <div className="status-item">
                <span className="status-dot online"></span>
                <span>Authentication Ready</span>
              </div>
            </div>
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

