import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { roomService } from '../services/roomService'
import { tenantService } from '../services/tenantService'
import { paymentService } from '../services/paymentService'
import { notificationService } from '../services/notificationService'
import { fetchTenantsWithBillingInfo, fetchPaymentStats, formatCurrency, formatDate, getDueDateStatus } from '../functions/accounting'
import RoomPage from './RoomPage'
import TenantPage from './TenantPage'
import PricingPage from './PricingPage'
import AdminMaintenancePage from './AdminMaintenancePage'
import AddAccountPage from './AddAccountPage'
import ArchivedTenantsPage from './ArchivedTenantsPage'
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
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  
  // Announcements state
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementMessage, setAnnouncementMessage] = useState('')
  const [announcementRoles, setAnnouncementRoles] = useState(['Admin', 'SuperAdmin', 'Accounting', 'Tenant'])
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
  const [announcementError, setAnnouncementError] = useState('')

  // Accounting View state
  const [accountingTenants, setAccountingTenants] = useState([])
  const [accountingStats, setAccountingStats] = useState(null)
  const [accountingLoading, setAccountingLoading] = useState(false)
  const [accountingError, setAccountingError] = useState('')

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      console.log('🔐 Dashboard: Authentication status:', isAuthenticated)
      console.log('🔐 Dashboard: Token in sessionStorage:', !!sessionStorage.getItem('token'))
      

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    let id
    const loadNotifs = async () => {
      try {
        const data = await notificationService.fetchMyNotifications(25)
        // Filter out suspended announcements (system_announcement type with isRead: true)
        const filteredNotifications = (data || []).filter(n => 
          !(n.type === 'system_announcement' && n.isRead)
        )
        setNotifications(filteredNotifications)
        setUnread(filteredNotifications.filter(n => !n.isRead).length)
      } catch {
        // Silently fail - notifications are not critical
      }
    }
    if (isAuthenticated) {
      loadNotifs()
      id = setInterval(loadNotifs, 15000)
    }
    return () => id && clearInterval(id)
  }, [isAuthenticated])

  // Fetch announcements when announcements tab is active
  useEffect(() => {
    if (activeTab === 'announcements' && isAuthenticated) {
      fetchAnnouncements()
    }
  }, [activeTab, isAuthenticated])

  // Fetch accounting data when accounting-view tab is active
  useEffect(() => {
    if (activeTab === 'accounting-view' && isAuthenticated) {
      fetchAccountingData()
    }
  }, [activeTab, isAuthenticated])

  const fetchAccountingData = async () => {
    try {
      setAccountingLoading(true)
      setAccountingError('')
      
      const errorModal = { open: false, title: '', message: '', details: '' }
      await Promise.all([
        fetchTenantsWithBillingInfo(setAccountingLoading, setAccountingTenants, () => setAccountingError('Failed to load tenant data')),
        fetchPaymentStats(setAccountingStats, () => setAccountingError('Failed to load payment stats'))
      ])
    } catch (error) {
      console.error('Failed to fetch accounting data:', error)
      setAccountingError('Failed to load accounting data')
    } finally {
      setAccountingLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  const handleLogout = () => {
    logout()
  }

  // Announcement handlers
  const handleSendAnnouncement = async (e) => {
    e.preventDefault()
    if (!announcementTitle || !announcementMessage) {
      alert('Please fill in both title and message')
      return
    }
    setSendingAnnouncement(true)
    try {
      await notificationService.broadcastAnnouncement(
        announcementTitle,
        announcementMessage,
        announcementRoles
      )
      setAnnouncementTitle('')
      setAnnouncementMessage('')
      setAnnouncementRoles(['Admin', 'SuperAdmin', 'Accounting', 'Tenant'])
      alert('Announcement sent successfully to all selected roles!')
      // Refresh announcements list
      fetchAnnouncements()
    } catch (error) {
      setError(error?.message || 'Failed to send announcement')
    } finally {
      setSendingAnnouncement(false)
    }
  }

  const toggleAnnouncementRole = (role) => {
    setAnnouncementRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true)
      setAnnouncementError('')
      const data = await notificationService.getAllAnnouncements()
      setAnnouncements(data)
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
      setAnnouncementError('Failed to load announcements')
    } finally {
      setLoadingAnnouncements(false)
    }
  }

  // Delete announcement
  const handleDeleteAnnouncement = async (id) => {
    try {
      await notificationService.deleteAnnouncement(id)
      setAnnouncements(prev => prev.filter(ann => ann.id !== id))
    } catch (error) {
      console.error('Failed to delete announcement:', error)
      alert('Failed to delete announcement')
    }
  }

  // Suspend announcement
  const handleSuspendAnnouncement = async (id) => {
    try {
      await notificationService.suspendAnnouncement(id)
      setAnnouncements(prev => prev.map(ann => 
        ann.id === id ? { ...ann, isRead: true } : ann
      ))
    } catch (error) {
      console.error('Failed to suspend announcement:', error)
      alert('Failed to suspend announcement')
    }
  }

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'rooms', label: 'Rooms', icon: '🏠' },
    { id: 'tenants', label: 'Tenants', icon: '👥' },
    { id: 'accounting-view', label: 'Accounting View', icon: '💰' },
    { id: 'pricing', label: 'Pricing', icon: '💵' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { id: 'announcements', label: 'Announcements', icon: '📢' },
    { id: 'archives', label: 'Archives', icon: '📦' },
    { id: 'add-account', label: 'Add Account', icon: '👤' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'rooms':
        return <RoomPage />
      case 'tenants':
        return <TenantPage />
      case 'accounting-view':
        return (
          <div className="dashboard-screen">
            <div className="dashboard-header-gradient">
              <div className="dash-container">
                <div className="dash-header-row">
                  <div>
                    <h1 className="dash-title">💰 Accounting View</h1>
                    <p className="dash-subtitle">
                      Comprehensive financial overview and tenant payment status.
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.href = '/accounting'}
                    className="btn-primary refresh-btn"
                  >
                    Go to Accounting Dashboard →
                  </button>
                </div>
              </div>
            </div>

            <div className="dash-container dash-content">
              {/* Financial Overview */}
              <div className="overview-card">
                <h3 className="overview-title">
                  <span>💰</span> Financial Overview
                </h3>
                <div className="overview-list">
                  {accountingError && (
                    <div className="form-error" style={{ marginBottom: '15px' }}>
                      {accountingError}
                    </div>
                  )}
                  
                  {accountingLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      Loading financial data...
                    </div>
                  ) : (
                    <>
                      <div className="financial-summary">
                        <div className="summary-item">
                          <span className="summary-label">Total Collected This Month:</span>
                          <span className="summary-value text-green">
                            {formatCurrency(accountingStats?.totalCollectedThisMonth || 0)}
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Outstanding Balances:</span>
                          <span className="summary-value text-red">
                            {formatCurrency(accountingStats?.totalOutstanding || 0)}
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Payment Collection Rate:</span>
                          <span className="summary-value">
                            {accountingStats?.collectionRate || 0}%
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Overdue Accounts:</span>
                          <span className="summary-value text-orange">
                            {accountingStats?.overdueCount || 0}
                          </span>
                        </div>
                      </div>

                      <div className="view-actions">
                        <button
                          onClick={() => window.location.href = '/accounting'}
                          className="btn-primary"
                        >
                          📊 Open Accounting Dashboard
                        </button>
                        <button
                          onClick={fetchAccountingData}
                          disabled={accountingLoading}
                          className="btn-secondary"
                        >
                          {accountingLoading ? 'Refreshing...' : '🔄 Refresh Data'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tenant List with Financial Status */}
              <div className="overview-card">
                <h3 className="overview-title">
                  <span>👥</span> Tenant Financial Status
                </h3>
                <div className="overview-list">
                  {accountingLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      Loading tenant data...
                    </div>
                  ) : accountingTenants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      No tenant data available
                    </div>
                  ) : (
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                        <thead>
                          <tr>
                            <th style={{ background: '#f8fafc', color: '#374151', fontWeight: 600, textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tenant</th>
                            <th style={{ background: '#f8fafc', color: '#374151', fontWeight: 600, textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Room</th>
                            <th style={{ background: '#f8fafc', color: '#374151', fontWeight: 600, textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance</th>
                            <th style={{ background: '#f8fafc', color: '#374151', fontWeight: 600, textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                            <th style={{ background: '#f8fafc', color: '#374151', fontWeight: 600, textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Payment</th>
                            <th style={{ background: '#f8fafc', color: '#374151', fontWeight: 600, textAlign: 'left', padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accountingTenants.map((tenant) => {
                            const dueDateStatus = getDueDateStatus(tenant.nextDueDate)
                            const isPaid = parseFloat(tenant.outstandingBalance || 0) <= 0
                            const statusColor = isPaid ? '#10b981' : '#ef4444'
                            const statusText = isPaid ? 'Paid' : 'Unpaid'
                            
                            return (
                              <tr key={tenant.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                                  <div style={{ fontWeight: 600 }}>{tenant.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{tenant.email}</div>
                                </td>
                                <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                                  <div style={{ fontWeight: 600 }}>Room {tenant.roomNumber}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Floor {tenant.floor}</div>
                                </td>
                                <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                                  <span style={{ 
                                    background: isPaid ? '#dcfce7' : '#fee2e2', 
                                    color: isPaid ? '#166534' : '#991b1b', 
                                    padding: '0.25rem 0.5rem', 
                                    borderRadius: '0.375rem', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600 
                                  }}>
                                    {formatCurrency(tenant.outstandingBalance || 0)}
                                  </span>
                                </td>
                                <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                                  <span style={{ 
                                    background: isPaid ? '#dcfce7' : '#fee2e2', 
                                    color: statusColor, 
                                    padding: '0.25rem 0.5rem', 
                                    borderRadius: '0.375rem', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600 
                                  }}>
                                    {statusText}
                                  </span>
                                </td>
                                <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                                  {tenant.lastPaymentDate ? formatDate(tenant.lastPaymentDate) : 'No payments yet'}
                                </td>
                                <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                                  {tenant.nextDueDate ? (
                                    <div style={{ color: dueDateStatus.color, fontWeight: 600 }}>
                                      {formatDate(tenant.nextDueDate)}
                                    </div>
                                  ) : (
                                    <div>Not set</div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      case 'pricing':
        return <PricingPage />
      case 'maintenance':
        return <AdminMaintenancePage />
      case 'announcements':
        return (
          <div className="dashboard-screen">
            <div className="dashboard-header-gradient">
              <div className="dash-container">
                <div className="dash-header-row">
                  <div>
                    <h1 className="dash-title">📢 Announcements</h1>
                    <p className="dash-subtitle">
                      Send important messages to tenants and staff members.
                    </p>
                  </div>
                  <button
                    onClick={fetchAnnouncements}
                    disabled={loadingAnnouncements}
                    className="btn-primary refresh-btn"
                  >
                    {loadingAnnouncements ? 'Refreshing...' : 'Refresh List 🔄'}
                  </button>
                </div>
              </div>
            </div>

            <div className="dash-container dash-content">
              <div className="overview-grid">
                {/* Send Announcement Card */}
                <div className="overview-card">
                  <h3 className="overview-title">
                    <span>📢</span> Send Announcement
                  </h3>
                  <div className="overview-list">
                    <p style={{ marginBottom: '20px', color: '#666' }}>
                      <strong>📢 Broadcast Announcement:</strong> Send important messages to all users or specific roles across the system.
                    </p>
                    
                    <form onSubmit={handleSendAnnouncement} className="account-form">
                      <div className="form-group">
                        <label htmlFor="announcementTitle">Announcement Title</label>
                        <input
                          type="text"
                          id="announcementTitle"
                          value={announcementTitle}
                          onChange={(e) => setAnnouncementTitle(e.target.value)}
                          className="form-input"
                          placeholder="Enter announcement title..."
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="announcementMessage">Message</label>
                        <textarea
                          id="announcementMessage"
                          value={announcementMessage}
                          onChange={(e) => setAnnouncementMessage(e.target.value)}
                          className="form-textarea"
                          rows="4"
                          placeholder="Enter your announcement message..."
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Target Roles</label>
                        <div className="checkbox-group">
                          {['Admin', 'SuperAdmin', 'Accounting', 'Tenant'].map(role => (
                            <label key={role} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={announcementRoles.includes(role)}
                                onChange={() => toggleAnnouncementRole(role)}
                              />
                              <span className="checkbox-text">{role}</span>
                            </label>
                          ))}
                        </div>
                        {announcementRoles.length === 0 && (
                          <p className="form-error">Please select at least one role</p>
                        )}
                      </div>

                      <div className="form-actions">
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={sendingAnnouncement || announcementRoles.length === 0}
                        >
                          {sendingAnnouncement ? '📤 Sending...' : '📢 Send Announcement'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setAnnouncementTitle('')
                            setAnnouncementMessage('')
                            setAnnouncementRoles(['Admin', 'SuperAdmin', 'Accounting', 'Tenant'])
                          }}
                        >
                          Clear Form
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Announcements List Card */}
                <div className="overview-card">
                  <h3 className="overview-title">
                    <span>📋</span> Announcements List
                  </h3>
                  <div className="overview-list">
                    {announcementError && (
                      <div className="form-error" style={{ marginBottom: '15px' }}>
                        {announcementError}
                      </div>
                    )}
                    
                    {loadingAnnouncements ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        Loading announcements...
                      </div>
                    ) : announcements.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        No announcements found
                      </div>
                    ) : (
                      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {(() => {
                          // Group announcements by title and message
                          const groupedAnnouncements = announcements.reduce((groups, announcement) => {
                            const key = `${announcement.title}|${announcement.message}|${announcement.createdAt}`;
                            if (!groups[key]) {
                              groups[key] = {
                                title: announcement.title,
                                message: announcement.message,
                                createdAt: announcement.createdAt,
                                roles: [],
                                ids: [],
                                isRead: announcement.isRead
                              };
                            }
                            groups[key].roles.push(announcement.recipientRole);
                            groups[key].ids.push(announcement.id);
                            // If any announcement in the group is not read, mark the group as not read
                            if (!announcement.isRead) {
                              groups[key].isRead = false;
                            }
                            return groups;
                          }, {});

                          return Object.values(groupedAnnouncements).map((group, index) => (
                            <div key={index} className="list-item" style={{ 
                              border: '1px solid #e0e0e0', 
                              borderRadius: '8px', 
                              padding: '15px', 
                              marginBottom: '10px',
                              background: group.isRead ? '#f9f9f9' : '#fff'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                                      {group.title}
                                    </h4>
                                    {group.isRead && (
                                      <span style={{ 
                                        background: '#e0e0e0', 
                                        color: '#666', 
                                        padding: '2px 8px', 
                                        borderRadius: '12px', 
                                        fontSize: '12px' 
                                      }}>
                                        Suspended
                                      </span>
                                    )}
                                  </div>
                                  <p style={{ 
                                    margin: '0 0 8px 0', 
                                    color: '#555', 
                                    fontSize: '14px',
                                    lineHeight: '1.4'
                                  }}>
                                    {group.message}
                                  </p>
                                  <div style={{ fontSize: '12px', color: '#888' }}>
                                    <div>Target: {group.roles.join(', ')}</div>
                                    <div>Sent: {new Date(group.createdAt).toLocaleString()}</div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginLeft: '15px' }}>
                                  {!group.isRead && (
                                    <button
                                      onClick={() => {
                                        // Suspend all announcements in this group
                                        group.ids.forEach(id => handleSuspendAnnouncement(id));
                                      }}
                                      className="btn-secondary"
                                      style={{ fontSize: '12px', padding: '6px 12px' }}
                                    >
                                      ⏸️ Suspend
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      // Delete all announcements in this group
                                      if (confirm('Are you sure you want to delete this announcement? This will remove it from all target roles.')) {
                                        group.ids.forEach(id => handleDeleteAnnouncement(id));
                                      }
                                    }}
                                    className="btn-danger"
                                    style={{ fontSize: '12px', padding: '6px 12px' }}
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'archives':
        return <ArchivedTenantsPage />
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
                <button className="quick-btn purple" onClick={() => setActiveTab('accounting-view')}>
                  💰 Accounting View
                </button>
                <button className="quick-btn orange" onClick={() => setActiveTab('maintenance')}>
                  🔧 Maintenance
                </button>
                <button className="quick-btn red" onClick={() => setActiveTab('announcements')}>
                  📢 Announcements
                </button>
                <button className="quick-btn teal" onClick={() => setActiveTab('archives')}>
                  📦 Archives
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
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-layout">
      {errorModal.open && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setErrorModal({ open: false, title: '', message: '', details: '' });
          }
        }}>
          <div className="modal-container error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header error-modal-header">
              <div className="modal-title-content error-modal-title-content">
                <span className="modal-icon error-modal-icon">⚠️</span>
                <h3 className="modal-title error-modal-title">{errorModal.title || 'Something went wrong'}</h3>
              </div>
              <button 
                aria-label="Close" 
                className="modal-close error-modal-close" 
                onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}
              >
                ×
              </button>
            </div>
            <div className="modal-body error-modal-body">
              {errorModal.message && <p className="error-modal-message">{errorModal.message}</p>}
              {errorModal.details && <pre className="error-modal-details">{errorModal.details}</pre>}
            </div>
            <div className="modal-footer error-modal-actions">
              <button 
                onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })} 
                className="modal-btn modal-btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="dashboard-header-top">
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
              <span className="logo-text">Admin Dashboard</span>
            </div>
          </div>
          <div className="profile-meta">
            <div style={{ position: 'relative', marginRight: 12 }}>
              <button className="refresh-btn" onClick={() => setShowNotif(p => !p)} aria-label="Notifications">
                🔔{unread > 0 && <span className="pending-badge">{unread}</span>}
              </button>
              {showNotif && (
                <>
                  <div 
                    style={{ 
                      position: 'fixed', 
                      inset: 0, 
                      zIndex: 10 
                    }}
                    onClick={() => setShowNotif(false)}
                  />
                  <div className="notification-dropdown">
                    <div className="notification-header">
                      <span>Notifications</span>
                      {unread > 0 && <span className="notification-count">{unread}</span>}
                    </div>
                    <div className="notification-content">
                      {notifications.length === 0 ? (
                        <div className="notification-empty">No notifications</div>
                      ) : notifications.map(n => (
                        <div key={n.id} className={`notification-item ${!n.isRead ? 'unread' : ''}`}>
                          <div className="notification-title">{n.title}</div>
                          <div className="notification-message">{n.message}</div>
                          <div className="notification-time">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="email">{user?.email}</div>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <div className={`dashboard-body ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
        
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          {/* BCFLATS Branding */}
          <div className="sidebar-brand">
            <div className="brand-logo">BCFLATS</div>
          </div>

          {/* Navigation */}
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

          {/* User Profile */}
          <div className="sidebar-profile">
            <div className="profile-avatar">
              <div className="avatar-icon">👤</div>
              <div className="avatar-status"></div>
            </div>
            <div className="profile-info">
              <div className="profile-name">Admin User</div>
              <div className="profile-role">ADMIN</div>
              <div className="profile-email">{user?.email}</div>
            </div>
            <div className="profile-dropdown">▼</div>
          </div>

          {/* Footer Actions */}
          <div className="sidebar-footer">
            <button className="theme-toggle-btn">
              <span className="nav-icon">🌙</span>
              <span className="nav-label">Light</span>
            </button>
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