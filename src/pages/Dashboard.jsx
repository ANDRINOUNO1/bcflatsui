import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { roomService } from '../services/roomService'
import { tenantService } from '../services/tenantService'
import { maintenanceService } from '../services/maintenanceService'
import RoomPage from './RoomPage'
import TenantPage from './TenantPage'
import '../components/Dashboard.css'

const Dashboard = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    totalStudents: 0,
    maintenanceRequests: 0,
    occupancyRate: 0,
    availableRooms: 0
  })
  const [maintenanceStats, setMaintenanceStats] = useState({
    pending: 0,
    inProgress: 0,
    resolved: 0,
    total: 0
  })
  const [maintenanceRequests, setMaintenanceRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [maintenanceFilter, setMaintenanceFilter] = useState('all')

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
        const [roomStats, tenantStats, maintenanceStatsData] = await Promise.all([
          roomService.getRoomStats(),
          tenantService.getTenantStats(),
          maintenanceService.getStats()
        ])

        console.log('📊 Dashboard: Room stats:', roomStats)
        console.log('📊 Dashboard: Tenant stats:', tenantStats)
        console.log('📊 Dashboard: Maintenance stats:', maintenanceStatsData)

        setStats({
          totalRooms: roomStats.totalRooms,
          occupiedRooms: roomStats.fullyOccupiedRooms + roomStats.partiallyOccupiedRooms,
          totalStudents: tenantStats.activeTenants,
          maintenanceRequests: roomStats.maintenanceRooms,
          occupancyRate: roomStats.occupancyRate,
          availableRooms: roomStats.availableRooms
        })

        setMaintenanceStats(maintenanceStatsData)
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

  useEffect(() => {
    const fetchMaintenanceRequests = async () => {
      if (activeTab === 'maintenance' && isAuthenticated) {
        try {
          const requests = await maintenanceService.list()
          setMaintenanceRequests(requests)
        } catch (error) {
          console.error('Error fetching maintenance requests:', error)
          setMaintenanceRequests([])
        }
      }
    }

    fetchMaintenanceRequests()
  }, [activeTab, isAuthenticated])

  const handleLogout = () => {
    logout()
  }

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      await maintenanceService.updateStatus(requestId, newStatus)
      // Refresh the maintenance requests
      const requests = await maintenanceService.list()
      setMaintenanceRequests(requests)
      
      // Refresh stats
      const stats = await maintenanceService.getStats()
      setMaintenanceStats(stats)
      
      alert('Status updated successfully!')
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return '#FF9800'
      case 'In Progress': return '#2196F3'
      case 'Resolved': return '#4CAF50'
      default: return '#757575'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#F44336'
      case 'Medium': return '#FF9800'
      case 'Low': return '#4CAF50'
      default: return '#757575'
    }
  }

  const filteredMaintenanceRequests = maintenanceFilter === 'all' 
    ? maintenanceRequests 
    : maintenanceRequests.filter(req => req.status === maintenanceFilter)

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'rooms', label: 'Rooms', icon: '🏠' },
    { id: 'tenants', label: 'Tenants', icon: '👥' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
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
      case 'maintenance':
        return (
          <div className="maintenance-requests-container">
            <div className="maintenance-header">
              <h2>🔧 Maintenance Management</h2>
              <p className="maintenance-subtitle">Manage and track all maintenance requests across the building</p>
            </div>
            
            {/* Statistics Overview - Moved to top for better visibility */}
            <div className="maintenance-overview">
              <div className="overview-stats">
                <div className="stat-item total">
                  <div className="stat-number">{maintenanceStats.total}</div>
                  <div className="stat-label">Total Requests</div>
                </div>
                <div className="stat-item pending">
                  <div className="stat-number">{maintenanceStats.pending}</div>
                  <div className="stat-label">Pending</div>
                </div>
                <div className="stat-item in-progress">
                  <div className="stat-number">{maintenanceStats.inProgress}</div>
                  <div className="stat-label">In Progress</div>
                </div>
                <div className="stat-item resolved">
                  <div className="stat-number">{maintenanceStats.resolved}</div>
                  <div className="stat-label">Resolved</div>
                </div>
              </div>
            </div>

            {/* Active Requests Container */}
            <div className="maintenance-section active-section">
              <div className="section-header">
                <h3>🔄 Active Requests</h3>
                <span className="request-count">
                  {filteredMaintenanceRequests.filter(request => request.status === 'Open' || request.status === 'In Progress').length} requests
                </span>
              </div>
              
              <div className="requests-list">
                {filteredMaintenanceRequests
                  .filter(request => request.status === 'Open' || request.status === 'In Progress')
                  .map((request) => (
                    <div key={request.id} className="request-item active">
                      <div className="request-main">
                        <div className="request-info">
                          <div className="request-header">
                            <h4 className="request-title">{request.title}</h4>
                            <div className="request-meta">
                              <span className="request-id">#{request.id}</span>
                              <span className={`status-badge ${request.status.toLowerCase().replace(' ', '-')}`}>
                                {request.status}
                              </span>
                            </div>
                          </div>
                          <p className="request-description">{request.description}</p>
                          <div className="request-details">
                            <div className="detail-item">
                              <span className="detail-label">Room:</span>
                              <span className="detail-value">{request.roomId}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Tenant:</span>
                              <span className="detail-value">{request.tenantId}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Priority:</span>
                              <span className={`priority-badge ${request.priority.toLowerCase()}`}>
                                {request.priority}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Submitted:</span>
                              <span className="detail-value">{new Date(request.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="request-actions">
                          {request.status === 'Open' && (
                            <>
                              <button
                                className="action-btn start-work"
                                onClick={() => handleStatusUpdate(request.id, 'In Progress')}
                              >
                                🚀 Start Work
                              </button>
                              <button
                                className="action-btn resolve"
                                onClick={() => handleStatusUpdate(request.id, 'Resolved')}
                              >
                                ✅ Mark Resolved
                              </button>
                            </>
                          )}
                          {request.status === 'In Progress' && (
                            <button
                              className="action-btn resolve"
                              onClick={() => handleStatusUpdate(request.id, 'Resolved')}
                            >
                              ✅ Mark Resolved
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {filteredMaintenanceRequests.filter(request => request.status === 'Open' || request.status === 'In Progress').length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">🎉</div>
                    <h4>No Active Requests</h4>
                    <p>All maintenance requests are currently resolved!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Resolved Requests Container */}
            <div className="maintenance-section resolved-section">
              <div className="section-header">
                <h3>✅ Resolved Requests</h3>
                <span className="request-count">
                  {filteredMaintenanceRequests.filter(request => request.status === 'Resolved').length} requests
                </span>
              </div>
              
              <div className="requests-list">
                {filteredMaintenanceRequests
                  .filter(request => request.status === 'Resolved')
                  .map((request) => (
                    <div key={request.id} className="request-item resolved">
                      <div className="request-main">
                        <div className="request-info">
                          <div className="request-header">
                            <h4 className="request-title">{request.title}</h4>
                            <div className="request-meta">
                              <span className="request-id">#{request.id}</span>
                              <span className="status-badge resolved">Resolved</span>
                            </div>
                          </div>
                          <p className="request-description">{request.description}</p>
                          <div className="request-details">
                            <div className="detail-item">
                              <span className="detail-label">Room:</span>
                              <span className="detail-value">{request.roomId}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Tenant:</span>
                              <span className="detail-value">{request.tenantId}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Priority:</span>
                              <span className={`priority-badge ${request.priority.toLowerCase()}`}>
                                {request.priority}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Submitted:</span>
                              <span className="detail-value">{new Date(request.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Resolved:</span>
                              <span className="detail-value">{new Date(request.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {filteredMaintenanceRequests.filter(request => request.status === 'Resolved').length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h4>No Resolved Requests</h4>
                    <p>Resolved requests will appear here once maintenance is completed.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
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
                  <div className="stat-subtitle">8 floors × 9 rooms</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalStudents}</div>
                  <div className="stat-label">Active Students</div>
                  <div className="stat-subtitle">Current tenants</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.occupiedRooms}</div>
                  <div className="stat-label">Occupied Rooms</div>
                  <div className="stat-subtitle">{stats.occupancyRate}% occupancy</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔧</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.maintenanceRequests}</div>
                  <div className="stat-label">Maintenance</div>
                  <div className="stat-subtitle">Rooms under repair</div>
                </div>
              </div>
            </div>

            <div className="welcome-section">
              <h2>Welcome to BCFlats Management System</h2>
              <p>Manage your 8-floor student housing complex with 72 rooms efficiently.</p>
              
              <div className="building-overview">
                <h3>🏢 Building Overview</h3>
                <div className="overview-grid">
                  <div className="overview-item">
                    <span className="overview-label">Floors:</span>
                    <span className="overview-value">2nd - 9th Floor</span>
                  </div>
                  <div className="overview-item">
                    <span className="overview-label">Rooms per Floor:</span>
                    <span className="overview-value">9 rooms</span>
                  </div>
                  <div className="overview-item">
                    <span className="overview-label">Total Rooms:</span>
                    <span className="overview-value">72 rooms</span>
                  </div>
                  <div className="overview-item">
                    <span className="overview-label">Beds per Room:</span>
                    <span className="overview-value">4 beds</span>
                  </div>
                  <div className="overview-item">
                    <span className="overview-label">Total Capacity:</span>
                    <span className="overview-value">288 students</span>
                  </div>
                  <div className="overview-item">
                    <span className="overview-label">Rent Range (per bed):</span>
                    <span className="overview-value">₱7,000 - ₱11,250</span>
                  </div>
                  <div className="overview-item">
                    <span className="overview-label">Utilities Range (per bed):</span>
                    <span className="overview-value">₱975 - ₱1,550</span>
                  </div>
                </div>
              </div>
              
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


