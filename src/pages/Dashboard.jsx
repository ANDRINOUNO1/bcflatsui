import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/apiService'
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const dashboardStats = await apiService.getDashboardStats()
        setStats(dashboardStats)
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
          <h1>BCFlats Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.name || 'Admin'}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

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
    </div>
  )
}

export default Dashboard

