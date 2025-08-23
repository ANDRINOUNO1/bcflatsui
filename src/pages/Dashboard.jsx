import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/apiService'
import '../components/Dashboard.css'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState({
    totalRooms: 24,
    occupiedRooms: 18,
    totalStudents: 22,
    maintenanceRequests: 3
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Simulate loading
        setTimeout(() => {
          setLoading(false)
        }, 1000)
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
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
    { id: 'properties', label: 'Properties', icon: '🏠' },
    { id: 'tenants', label: 'Tenants', icon: '👥' },
    { id: 'account', label: 'Account', icon: '⚙️' },
    { id: 'users', label: 'Users', icon: '👨‍👩‍👧‍👦' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'help', label: 'Help', icon: '❓' }
  ]

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
              <span className="logo-text">bcflatsui</span>
            </div>
          </div>
          <div className="user-info">
            <span className="user-email">{user?.email || 'admin@example.com'}</span>
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
            <h3>Recent Activity</h3>
            <div className="activity-map">
              <span className="map-icon">🗺️</span>
              <p>No recent activity</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {activeTab === 'dashboard' && (
            <>
              {/* Stats Cards */}
              <section className="stats-section">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">🏠</div>
                    <div className="stat-content">
                      <h3>Total Rooms</h3>
                      <p className="stat-number">{stats.totalRooms}</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                      <h3>Total Students</h3>
                      <p className="stat-number">{stats.totalStudents}</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                      <h3>Occupied Rooms</h3>
                      <p className="stat-number">{stats.occupiedRooms}</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">🔧</div>
                    <div className="stat-content">
                      <h3>Maintenance Requests</h3>
                      <p className="stat-number">{stats.maintenanceRequests}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Quick Actions */}
              <section className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                  <button className="action-btn">
                    <span className="action-icon">➕</span>
                    <span>Add New Student</span>
                  </button>
                  <button className="action-btn">
                    <span className="action-icon">🏠</span>
                    <span>Manage Rooms</span>
                  </button>
                  <button className="action-btn">
                    <span className="action-icon">🔧</span>
                    <span>Maintenance</span>
                  </button>
                  <button className="action-btn">
                    <span className="action-icon">📊</span>
                    <span>View Reports</span>
                  </button>
                </div>
              </section>

              {/* Recent Activity */}
              <section className="recent-activity">
                <h2>Recent Activity</h2>
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon">👤</div>
                    <div className="activity-content">
                      <p>New student registered: John Doe</p>
                      <span className="activity-time">2 hours ago</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon">🏠</div>
                    <div className="activity-content">
                      <p>Room 101 assigned to student ID: 12345</p>
                      <span className="activity-time">4 hours ago</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon">🔧</div>
                    <div className="activity-content">
                      <p>Maintenance request submitted for Room 205</p>
                      <span className="activity-time">1 day ago</span>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'account' && (
            <div className="account-details">
              <h2>Account Details</h2>
              <p>Account management features coming soon...</p>
            </div>
          )}

          {activeTab !== 'dashboard' && activeTab !== 'account' && (
            <div className="coming-soon">
              <h2>{navigationItems.find(item => item.id === activeTab)?.label}</h2>
              <p>This feature is coming soon...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Dashboard

