import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { roomService } from '../services/roomService'
import { tenantService } from '../services/tenantService'
import { paymentService } from '../services/paymentService'
import { notificationService } from '../services/notificationService'
import { navigationControlService } from '../services/navigationControlService'
import { overduePaymentService } from '../services/overduePaymentService'
import { fetchTenantsWithBillingInfo, fetchPaymentStats, formatCurrency, formatDate, getDueDateStatus } from '../functions/accounting'
import RoomPage from './RoomPage'
import TenantPage from './TenantPage'
import PricingPage from './PricingPage'
import AdminMaintenancePage from './AdminMaintenancePage'
import AddAccountPage from './AddAccountPage'
import ArchivedTenantsPage from './ArchivedTenantsPage'
import NotificationButton from '../components/NotificationButton'
import NotificationDropdown from '../components/NotificationDropdown'
import '../components/Dashboard.css'
import '../components/NotificationStyles.css'


const Dashboard = () => {
  const { user, logout, isAuthenticated, hasPermission, refreshPermissions, permissions, roles } = useAuth()
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
  const [markingAsRead, setMarkingAsRead] = useState(false)
  
  // Announcements state
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementMessage, setAnnouncementMessage] = useState('')
  const [announcementRoles, setAnnouncementRoles] = useState(['HeadAdmin', 'Admin', 'SuperAdmin', 'Accounting', 'Tenant'])
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
  const [announcementError, setAnnouncementError] = useState('')

  // Accounting View state
  const [accountingTenants, setAccountingTenants] = useState([])
  const [accountingStats, setAccountingStats] = useState(null)
  const [accountingLoading, setAccountingLoading] = useState(false)
  const [accountingError, setAccountingError] = useState('')

  // HeadAdmin state (Navigation Control)
  const [admins, setAdmins] = useState([])
  const [navigationPermissions, setNavigationPermissions] = useState([])
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showNavigationModal, setShowNavigationModal] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [selectedNavigationItems, setSelectedNavigationItems] = useState([])
  const [adminForm, setAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  })
  const [adminSearchTerm, setAdminSearchTerm] = useState('')

  // Overdue Payment state
  const [overdueTenants, setOverdueTenants] = useState([])
  const [overdueStats, setOverdueStats] = useState(null)
  const [loadingOverdue, setLoadingOverdue] = useState(false)
  const [overdueError, setOverdueError] = useState('')

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      console.log('🔐 Dashboard: Authentication status:', isAuthenticated)
      console.log('🔐 Dashboard: Token in sessionStorage:', !!sessionStorage.getItem('token'))
      console.log('👤 Dashboard: User data:', user)
      console.log('🔑 Dashboard: User role:', user?.role)
      console.log('📋 Dashboard: Permissions:', permissions)
      console.log('🎭 Dashboard: Roles:', roles)

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

  // Load navigation permissions from Navigation Control system
  const loadNavigationPermissions = async () => {
    try {
      console.log('🔄 Dashboard: Loading navigation permissions from Navigation Control')
      const navPermissions = await navigationControlService.getNavigationPermissions()
      console.log('📋 Dashboard: Navigation permissions loaded:', navPermissions)
      return navPermissions
    } catch (error) {
      console.error('❌ Dashboard: Failed to load navigation permissions:', error)
      return []
    }
  }

  // Check current user's navigation access
  const checkUserNavigationAccess = async () => {
    try {
      if (!user?.id) return;
      
      console.log('🔍 Dashboard: Checking navigation access for user:', user.id)
      const userNavAccess = await navigationControlService.getCurrentUserNavigationAccess()
      console.log('📋 Dashboard: User navigation access:', userNavAccess)
      return userNavAccess
    } catch (error) {
      console.error('❌ Dashboard: Failed to check user navigation access:', error)
      return null
    }
  }

  // Refresh permissions on component mount to ensure permissions are loaded
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log(`🔄 Dashboard: Refreshing permissions for ${user?.role}`)
      // Force refresh permissions to ensure they're loaded
      setTimeout(async () => {
        try {
          await refreshPermissions()
          console.log('✅ Dashboard: Permissions refreshed successfully')
          
          // Load navigation permissions and check user access
          await loadNavigationPermissions()
          await checkUserNavigationAccess()
        } catch (error) {
          console.error('❌ Dashboard: Failed to refresh permissions:', error)
        }
      }, 1000)
    }
  }, [isAuthenticated, user?.role, refreshPermissions])

  useEffect(() => {
    let id
    const loadNotifs = async () => {
      try {
        const data = await notificationService.fetchMyNotifications(25)
        // Keep all notifications, including read ones - don't filter out read SYSTEM notifications
        setNotifications(data || [])
        setUnread((data || []).filter(n => !n.isRead).length)
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

  // HeadAdmin and SuperAdmin functions (Navigation Control)
  const loadHeadAdminData = useCallback(async () => {
    if (!['HeadAdmin', 'SuperAdmin'].includes(user?.role)) return
    
    try {
      setLoadingAdmins(true)
      const [adminsData, permissionsData] = await Promise.all([
        navigationControlService.getAllAdmins(),
        navigationControlService.getNavigationPermissions()
      ])
      
      setAdmins(adminsData)
      setNavigationPermissions(permissionsData)
    } catch (error) {
      console.error('Failed to load HeadAdmin/SuperAdmin data:', error)
    } finally {
      setLoadingAdmins(false)
    }
  }, [user?.role])

  // Load HeadAdmin/SuperAdmin data when user is HeadAdmin or SuperAdmin
  useEffect(() => {
    if (isAuthenticated && ['HeadAdmin', 'SuperAdmin'].includes(user?.role)) {
      loadHeadAdminData()
    }
  }, [isAuthenticated, user?.role, loadHeadAdminData])

  const fetchAccountingData = async () => {
    try {
      setAccountingLoading(true)
      setAccountingError('')
      
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

  // Fetch overdue payment data
  const fetchOverdueData = async () => {
    try {
      setLoadingOverdue(true)
      setOverdueError('')
      
      const [overdueTenantsData, overdueStatsData] = await Promise.all([
        overduePaymentService.getOverdueTenants(),
        overduePaymentService.getOverdueStats()
      ])
      
      setOverdueTenants(overdueTenantsData)
      setOverdueStats(overdueStatsData)
    } catch (error) {
      console.error('Failed to fetch overdue data:', error)
      setOverdueError('Failed to load overdue payment data')
    } finally {
      setLoadingOverdue(false)
    }
  }

  // Manually check for overdue payments and send notifications
  const handleCheckOverduePayments = async () => {
    try {
      setLoadingOverdue(true)
      const result = await overduePaymentService.checkOverduePayments()
      
      // Refresh overdue data after checking
      await fetchOverdueData()
      
      alert(`Overdue payment check completed!\n\nChecked: ${result.checked} tenants\nNotifications sent: ${result.overdue}`)
    } catch (error) {
      console.error('Failed to check overdue payments:', error)
      alert('Failed to check overdue payments: ' + error.message)
    } finally {
      setLoadingOverdue(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  const handleLogout = () => {
    logout()
  }

  // HeadAdmin handler functions
  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    try {
      await navigationControlService.createAdmin(adminForm)
      await loadHeadAdminData()
      setShowAdminModal(false)
      setAdminForm({ firstName: '', lastName: '', email: '', password: '' })
      alert('Admin created successfully!')
    } catch (error) {
      alert('Failed to create admin: ' + error.message)
    }
  }

  const handleUpdateNavigationPermissions = async () => {
    if (!selectedAdmin) return

    try {
      await navigationControlService.updateAdminNavigationPermissions(selectedAdmin.id, selectedNavigationItems)
      await loadHeadAdminData()
      setShowNavigationModal(false)
      setSelectedAdmin(null)
      setSelectedNavigationItems([])
      alert('Navigation permissions updated successfully! Admin should refresh their access to see changes.')
    } catch (error) {
      alert('Failed to update navigation permissions: ' + error.message)
    }
  }

  const handleDeactivateAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to deactivate this admin?')) return

    try {
      await navigationControlService.deactivateAdmin(adminId)
      await loadHeadAdminData()
      alert('Admin deactivated successfully!')
    } catch (error) {
      alert('Failed to deactivate admin: ' + error.message)
    }
  }

  const handleDeleteAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) return

    try {
      await navigationControlService.deleteAdmin(adminId)
      await loadHeadAdminData()
      alert('Admin deleted successfully!')
    } catch (error) {
      alert('Failed to delete admin: ' + error.message)
    }
  }

  const openNavigationModal = async (admin) => {
    setSelectedAdmin(admin)
    setSelectedNavigationItems(admin.permissions.map(p => p.id))
    setShowNavigationModal(true)
  }

  // Filter admins based on search term
  const filteredAdmins = admins.filter(admin => {
    if (!adminSearchTerm) return true
    const searchLower = adminSearchTerm.toLowerCase()
    return (
      admin.email.toLowerCase().includes(searchLower) ||
      admin.firstName.toLowerCase().includes(searchLower) ||
      admin.lastName.toLowerCase().includes(searchLower) ||
      `${admin.firstName} ${admin.lastName}`.toLowerCase().includes(searchLower)
    )
  })

  // Announcement handlers
  const handleSendAnnouncement = async (e) => {
    e.preventDefault()
    if (!announcementTitle || !announcementMessage) {
      setAnnouncementError('Please fill in both title and message')
      return
    }
    if (announcementRoles.length === 0) {
      setAnnouncementError('Please select at least one target role')
      return
    }
    
    setSendingAnnouncement(true)
    setAnnouncementError('')
    
    try {
      await notificationService.broadcastAnnouncement(
        announcementTitle,
        announcementMessage,
        announcementRoles
      )
      setAnnouncementTitle('')
      setAnnouncementMessage('')
      setAnnouncementRoles(['HeadAdmin', 'Admin', 'SuperAdmin', 'Accounting', 'Tenant'])
      setAnnouncementError('')
      alert('Announcement sent successfully to all selected roles!')
      // Refresh announcements list
      fetchAnnouncements()
    } catch (error) {
      console.error('Failed to send announcement:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to send announcement'
      setAnnouncementError(errorMessage)
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

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      setMarkingAsRead(true)
      await notificationService.markAsRead(notificationId)
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ))
      setUnread(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    } finally {
      setMarkingAsRead(false)
    }
  }

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAsRead(true)
      await notificationService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnread(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    } finally {
      setMarkingAsRead(false)
    }
  }

      const navigationItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', permission: { resource: 'navigation', action: 'dashboard' } },
        { id: 'rooms', label: 'Rooms', icon: '🏠', permission: { resource: 'navigation', action: 'rooms' } },
        { id: 'tenants', label: 'Tenants', icon: '👥', permission: { resource: 'navigation', action: 'tenants' } },
        { id: 'accounting-view', label: 'Accounting View', icon: '💰', permission: { resource: 'navigation', action: 'accounting' } },
        { id: 'overdue-payments', label: 'Overdue Payments', icon: '⚠️', permission: { resource: 'navigation', action: 'overdue_payments' } },
        { id: 'pricing', label: 'Pricing', icon: '💵', permission: { resource: 'navigation', action: 'pricing' } },
        { id: 'maintenance', label: 'Maintenance', icon: '🔧', permission: { resource: 'navigation', action: 'maintenance' } },
        { id: 'announcements', label: 'Announcements', icon: '📢', permission: { resource: 'navigation', action: 'announcements' } },
        { id: 'archives', label: 'Archives', icon: '📦', permission: { resource: 'navigation', action: 'archives' } },
        { id: 'add-account', label: 'Add Account', icon: '👤', permission: { resource: 'navigation', action: 'add_account' } },
        // SuperAdmin and HeadAdmin specific tabs
        ...(['SuperAdmin', 'HeadAdmin'].includes(user?.role) ? [
          { id: 'admin-management', label: 'Admin Management', icon: '👑', permission: null },
          { id: 'navigation-control', label: 'Navigation Control', icon: '🧭', permission: null }
        ] : [])
      ]

  // HeadAdmin render functions
  const renderAdminManagement = () => (
    <div className="dashboard-screen">
      <div className="dashboard-header-gradient">
        <div className="dash-container">
          <div className="dash-header-row">
            <div>
              <h1 className="dash-title">👑 Admin Management</h1>
              <p className="dash-subtitle">Manage admin accounts and their permissions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-container dash-content">
        <div className="overview-grid admin-management-container">
          {loadingAdmins ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading admins...</div>
          ) : (
            <div className="admin-management-grid">
              {filteredAdmins.filter(admin => admin.role === 'Admin').map(admin => (
                <div key={admin.id} className="admin-card">
                  <div className="admin-header">
                    <div className="admin-info">
                      <h3>{admin.firstName} {admin.lastName}</h3>
                      <p className="admin-email">{admin.email}</p>
                      <div className="admin-badges">
                        <span className="role-badge admin">ADMIN</span>
                        <span className={`status-badge ${admin.status === 'Active' ? 'active' : 'inactive'}`}>
                          {admin.status === 'Active' ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="admin-details">
                    <div className="detail-item">
                      <span className="detail-label">Roles:</span>
                      <span className="detail-value">{admin.role} (Level {admin.roleLevel || 50})</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Permissions:</span>
                      <span className="detail-value">{admin.permissions?.length || 0} permissions</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">{new Date(admin.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="admin-actions">
                    <button 
                      className="btn-secondary"
                      onClick={() => openNavigationModal(admin)}
                    >
                      🧭 Manage Navigation
                    </button>
                    <button 
                      className="btn-warning"
                      onClick={() => handleDeactivateAdmin(admin.id)}
                    >
                      ⏸️ Deactivate
                    </button>
                    <button 
                      className="btn-danger"
                      onClick={() => handleDeleteAdmin(admin.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderNavigationControl = () => (
    <div className="dashboard-screen">
      <div className="dashboard-header-gradient">
        <div className="dash-container">
          <div className="dash-header-row">
            <div>
              <h1 className="dash-title">🧭 Navigation Control</h1>
              <p className="dash-subtitle">Control which navigation items each Admin can access in their dashboard</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-container dash-content">
        {/* Admin Search Bar */}
        <div className="admin-search-section">
          <div className="search-card">
            <div className="search-header">
              <h3>🔍 Search Admins</h3>
              <p>Search by name or email to find specific admin accounts</p>
            </div>
            <div className="search-input-container">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={adminSearchTerm}
                onChange={(e) => setAdminSearchTerm(e.target.value)}
                className="admin-search-input"
              />
              <div className="search-icon">🔍</div>
            </div>
            {adminSearchTerm && (
              <div className="search-results-info">
                Found {filteredAdmins.filter(admin => admin.role === 'Admin').length} admin(s) matching "{adminSearchTerm}"
              </div>
            )}
          </div>
        </div>

        <div className="overview-grid navigation-control-container">
          <div className="navigation-control-grid">
            {loadingAdmins ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading admin accounts...</p>
              </div>
            ) : filteredAdmins.filter(admin => admin.role === 'Admin').length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No Admin Accounts Found</h3>
                <p>No admin accounts are currently available for navigation management</p>
              </div>
            ) : (
              filteredAdmins.filter(admin => admin.role === 'Admin').map(admin => (
                <div key={admin.id} className="admin-navigation-card">
                  <div className="admin-header">
                    <div className="admin-info">
                      <h3>{admin.firstName} {admin.lastName}</h3>
                      <p className="admin-email">{admin.email}</p>
                      <div className="admin-badges">
                        <span className="role-badge admin">ADMIN</span>
                        <span className={`status-badge ${admin.status === 'Active' ? 'active' : 'inactive'}`}>
                          {admin.status === 'Active' ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="navigation-items">
                    <h4>📋 Navigation Access Control</h4>
                    <p className="nav-description">Click "Manage Navigation" to control which items this Admin can access</p>
                    
                    <div className="nav-items-grid">
                      {navigationPermissions.map(navItem => {
                        const hasPermission = admin.permissions?.some(p => p.id === navItem.id);
                        
                        return (
                          <div 
                            key={navItem.id} 
                            className={`nav-item-control ${hasPermission ? 'enabled' : 'disabled'}`}
                          >
                            <div className="nav-item-info">
                              <span className="nav-icon">📄</span>
                              <div className="nav-details">
                                <span className="nav-label">{navItem.name}</span>
                                <span className="nav-description">{navItem.description}</span>
                              </div>
                            </div>
                            <div className="nav-status">
                              <span className={`status-badge ${hasPermission ? 'enabled' : 'disabled'}`}>
                                {hasPermission ? '✅ Enabled' : '❌ Disabled'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="admin-actions">
                    <button 
                      className="btn-primary"
                      onClick={() => openNavigationModal(admin)}
                    >
                      🔧 Manage Navigation Access
                    </button>
                    <div className="refresh-status">
                      <span className="refresh-info">
                        💡 Admin should use "Refresh Access" button to see changes immediately
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )

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
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📢</span>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Send Announcement</h3>
                  </div>
                  <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
                    <p style={{ margin: 0, color: '#0c4a6e', fontSize: '0.875rem' }}>
                      <strong>📢 Broadcast Announcement:</strong> Send important messages to all users or specific roles across the system.
                    </p>
                  </div>
                  
                  <form onSubmit={handleSendAnnouncement}>
                    {announcementError && (
                      <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#dc2626', fontSize: '0.875rem' }}>
                        {announcementError}
                      </div>
                    )}
                    <div style={{ marginBottom: '1rem' }}>
                      <label htmlFor="announcementTitle" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Announcement Title</label>
                      <input
                        type="text"
                        id="announcementTitle"
                        value={announcementTitle}
                        onChange={(e) => setAnnouncementTitle(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.75rem', border: '2px solid #dc2626', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                        placeholder="Enter announcement title..."
                      />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label htmlFor="announcementMessage" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Message</label>
                      <textarea
                        id="announcementMessage"
                        value={announcementMessage}
                        onChange={(e) => setAnnouncementMessage(e.target.value)}
                        required
                        rows="6"
                        style={{ width: '100%', padding: '0.75rem', border: '2px solid #dc2626', borderRadius: '0.5rem', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }}
                        placeholder="Enter your announcement message..."
                      />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Target Recipients</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                        {['Admin', 'SuperAdmin', 'Accounting', 'Tenant'].map(role => (
                          <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={announcementRoles.includes(role)}
                              onChange={() => toggleAnnouncementRole(role)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{role}</span>
                          </label>
                        ))}
                      </div>
                      {announcementRoles.length === 0 && (
                        <small style={{ color: '#dc2626', marginTop: '0.5rem', display: 'block' }}>
                          Please select at least one recipient role
                        </small>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button 
                        type="submit" 
                        style={{ 
                          padding: '0.75rem 1.5rem', 
                          background: '#dc2626', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '0.5rem', 
                          fontWeight: 600,
                          cursor: sendingAnnouncement || announcementRoles.length === 0 ? 'not-allowed' : 'pointer',
                          opacity: sendingAnnouncement || announcementRoles.length === 0 ? 0.6 : 1
                        }}
                        disabled={sendingAnnouncement || announcementRoles.length === 0}
                      >
                        {sendingAnnouncement ? '📤 Sending...' : '📢 Send Announcement'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setAnnouncementTitle('')
                          setAnnouncementMessage('')
                          setAnnouncementRoles(['Admin', 'SuperAdmin', 'Accounting', 'Tenant'])
                        }}
                        style={{ 
                          padding: '0.75rem 1.5rem', 
                          background: '#6b7280', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '0.5rem', 
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </form>
                </div>

                {/* Announcements List Card */}
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📋</span>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Announcements List</h3>
                  </div>
                  <div className="overview-list">
                    {announcementError && (
                      <div className="form-error" style={{ marginBottom: '15px' }}>
                        {announcementError}
                      </div>
                    )}
                    
                    {loadingAnnouncements ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading announcements...</div>
                    ) : announcements.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No announcements found</div>
                    ) : (
                      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {(() => {
                          // Group announcements by announcementId if available, otherwise by title/message/time
                          const groupedAnnouncements = announcements.reduce((groups, announcement) => {
                            let key;
                            
                            // Use announcementId if available for better grouping
                            if (announcement.metadata?.announcementId) {
                              key = announcement.metadata.announcementId;
                            } else {
                              // Fallback to title/message/time grouping
                              const createdAt = new Date(announcement.createdAt);
                              const roundedTime = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate(), createdAt.getHours(), createdAt.getMinutes());
                              key = `${announcement.title}|${announcement.message}|${roundedTime.getTime()}`;
                            }
                            
                            if (!groups[key]) {
                              groups[key] = {
                                title: announcement.title,
                                message: announcement.message,
                                createdAt: announcement.createdAt,
                                roles: new Set(),
                                ids: [],
                                isRead: announcement.isRead
                              };
                            }
                            
                            // Use Set to avoid duplicate roles
                            groups[key].roles.add(announcement.recipientRole);
                            groups[key].ids.push(announcement.id);
                            
                            // If any announcement in the group is not read, mark the group as not read
                            if (!announcement.isRead) {
                              groups[key].isRead = false;
                            }
                            return groups;
                          }, {});

                          return Object.values(groupedAnnouncements).map((group, index) => (
                            <div key={index} className="announcement-card" data-status={group.isRead ? 'suspended' : 'active'}>
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
                                    <div>Target: {Array.from(group.roles).join(', ')}</div>
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
      case 'admin-management':
        return renderAdminManagement()
      case 'navigation-control':
        return renderNavigationControl()
      case 'dashboard':
      default:
        return (
          <div className="dashboard-screen">
          {/* Header Section */}
          <div className="dashboard-header-gradient">
            <div className="dash-container">
              <div className="dash-header-row">
                <div>
                  <h1 className="dash-title">
                    {user?.role === 'SuperAdmin' ? 'Super Admin Dashboard' : 
                     user?.role === 'HeadAdmin' ? 'Head Admin Dashboard' : 'Admin Dashboard'}
                  </h1>
                  <p className="dash-subtitle">
                    {user?.role === 'SuperAdmin' 
                      ? 'Complete system control with all admin and head admin capabilities.' 
                      : user?.role === 'HeadAdmin' 
                      ? 'Manage admins, permissions, and system access with full control.' 
                      : 'Manage your student housing efficiently with real-time data.'
                    }
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

              {/* SuperAdmin specific stats */}
              {user?.role === 'SuperAdmin' && (
                <>
                  <div className="stat-card">
                    <div className="stat-info">
                      <p className="stat-label">Total Rooms</p>
                      <p className="stat-number">{stats.totalRooms}</p>
                    </div>
                    <div className="stat-icon">🏠</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-info">
                      <p className="stat-label">Occupied Rooms</p>
                      <p className="stat-number">{stats.occupiedRooms}</p>
                    </div>
                    <div className="stat-icon">👥</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-info">
                      <p className="stat-label">Maintenance Requests</p>
                      <p className="stat-number">{stats.maintenanceRequests}</p>
                    </div>
                    <div className="stat-icon">🔧</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-info">
                      <p className="stat-label">Outstanding Amount</p>
                      <p className="stat-number">
                        ₱{dashboardStats?.totalOutstandingAmount?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div className="stat-icon">📊</div>
                  </div>
                </>
              )}
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
              <span className="logo-icon">{user?.role === 'SuperAdmin' ? '⭐' : user?.role === 'HeadAdmin' ? '👑' : '🏢'}</span>
              <span className="logo-text">{user?.role === 'SuperAdmin' ? 'Super Admin Dashboard' : user?.role === 'HeadAdmin' ? 'Head Admin Dashboard' : 'Admin Dashboard'}</span>
            </div>
          </div>
          <div className="profile-meta">
            <NotificationButton
              unreadCount={unread}
              onClick={() => setShowNotif(p => !p)}
              showDropdown={showNotif}
              style={{ marginRight: 12 }}
            >
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unread}
                markingAsRead={markingAsRead}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onClose={() => setShowNotif(false)}
              />
            </NotificationButton>
            <div className="email">{user?.email}</div>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <div className={`dashboard-body ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
        
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
          {/* BCFLATS Branding */}
          <div className="sidebar-brand">
            <div className="brand-logo">BCFLATS</div>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav">
            {navigationItems.map((item) => {
              // Check if user has permission for this navigation item
              let hasAccess = true;
              
              // If no permission required (Admin Management, Navigation Control), allow access
              if (!item.permission) {
                hasAccess = true;
              } else {
                // Check if user is HeadAdmin or SuperAdmin (they have all permissions)
                if (user?.role === 'HeadAdmin' || user?.role === 'SuperAdmin') {
                  hasAccess = true;
                } else {
                  // For other roles, check Navigation Control permissions
                  hasAccess = hasPermission('navigation', item.permission.action);
                }
              }
              
              return (
              <button
                key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''} ${!hasAccess ? 'locked' : ''}`}
                  onClick={() => {
                    if (hasAccess) {
                      setActiveTab(item.id);
                    }
                  }}
                  disabled={!hasAccess}
                  title={!hasAccess ? 'Access restricted - Contact Head Admin' : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                  {!hasAccess && <span className="lock-icon">🔒</span>}
              </button>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="sidebar-profile">
            <div className="profile-avatar">
              <div className="avatar-icon">👤</div>
              <div className="avatar-status"></div>
            </div>
            <div className="profile-info">
              <div className="profile-name">Admin User</div>
              <div className="profile-role">{user?.role === 'SuperAdmin' ? 'SUPER ADMIN' : user?.role === 'HeadAdmin' ? 'HEAD ADMIN' : 'ADMIN'}</div>
              <div className="profile-email">{user?.email}</div>
            </div>
            <div className="profile-dropdown">▼</div>
          </div>

          {/* Footer Actions */}
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

      {/* HeadAdmin Modals */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAdminModal(false);
            setAdminForm({ firstName: '', lastName: '', email: '', password: '' });
          }
        }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Admin</h3>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminForm({ firstName: '', lastName: '', email: '', password: '' });
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateAdmin}>
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    value={adminForm.firstName}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    value={adminForm.lastName}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAdminModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showNavigationModal && selectedAdmin && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowNavigationModal(false);
            setSelectedAdmin(null);
            setSelectedNavigationItems([]);
          }
        }}>
          <div className="modal-container large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Manage Navigation Access - {selectedAdmin.firstName} {selectedAdmin.lastName}</h3>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowNavigationModal(false);
                  setSelectedAdmin(null);
                  setSelectedNavigationItems([]);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="navigation-permissions">
                <h4>Select Navigation Items This Admin Can Access:</h4>
                <div className="permissions-grid">
                  {navigationPermissions.map(permission => (
                    <div key={permission.id} className="permission-item">
                      <label className="permission-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedNavigationItems.includes(permission.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNavigationItems(prev => [...prev, permission.id]);
                            } else {
                              setSelectedNavigationItems(prev => prev.filter(id => id !== permission.id));
                            }
                          }}
                        />
                        <span className="permission-label">
                          <span className="permission-icon">📄</span>
                          <div className="permission-info">
                            <span className="permission-name">{permission.name}</span>
                            <span className="permission-description">{permission.description}</span>
                          </div>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowNavigationModal(false);
                    setSelectedAdmin(null);
                    setSelectedNavigationItems([]);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleUpdateNavigationPermissions}
                >
                  Update Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard