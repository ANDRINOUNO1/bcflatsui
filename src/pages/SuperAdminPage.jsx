import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { notificationService } from '../services/notificationService'
import { superAdminService } from '../services/superAdminService'
import { archivedTenantService } from '../services/archivedTenantService'
import { roomService } from '../services/roomService'
import { tenantService } from '../services/tenantService'
import { paymentService } from '../services/paymentService'
import {
  fetchTenantsWithBillingInfo,
  fetchPaymentStats,
  fetchPendingPayments,
  getFilteredTenants,
  handlePayButtonClick,
  handlePaymentSubmit,
  handleConfirmPayment,
  handleQuickPaySubmit,
  toNumber,
  formatCurrency,
  formatDate,
  getDueDateStatus,
  getStatsCards,
  getOutstandingStats,
  getPaymentHistoryFilteredTenants,
  getTableHeaders,
  getStatusFilterOptions,
  getSortOptions,
  getPaymentMethodOptions,
  getQuickPayMethodOptions,
  getReportPeriodOptions,
  getTransactionFilterOptions,
  getEmptyStateConfig,
  getSummaryData,
  getPendingPaymentsSummary
} from '../functions/accounting'
import RoomPage from './RoomPage'
import TenantPage from './TenantPage'
import PricingPage from './PricingPage'
import AdminMaintenancePage from './AdminMaintenancePage'
import AddAccountPage from './AddAccountPage'
import ArchivedTenantsPage from './ArchivedTenantsPage'
import NotificationButton from '../components/NotificationButton'
import NotificationDropdown from '../components/NotificationDropdown'
import '../components/SuperAdmin.css'
import '../components/NotificationStyles.css'

const RoleBadge = ({ role }) => (
  <span className={`role-badge ${String(role || '').toLowerCase()}`}>{role}</span>
)

const SidebarItem = ({ icon, label, isActive, onClick, children }) => (
  <div className={`sidebar-item ${isActive ? 'active' : ''}`} onClick={onClick}>
    <span className="sidebar-icon">{icon}</span>
    <span className="sidebar-label">{label}</span>
    {children}
  </div>
)

const SidebarSection = ({ title, children }) => (
  <div className="sidebar-section">
    <div className="sidebar-section-title">{title}</div>
    {children}
  </div>
)

const TableHeader = ({ headers }) => (
  <thead>
    <tr>
      {headers.map((header, index) => (
        <th key={index} style={header.style}>{header.label}</th>
      ))}
    </tr>
  </thead>
)

export default function SuperAdminPage() {
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [pending, setPending] = useState([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('pending-accounts')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [newAccount, setNewAccount] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Tenant',
    status: 'Pending'
  })
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  const [markingAsRead, setMarkingAsRead] = useState(false)
  
  // Archived tenants state
  const [archivedTenants, setArchivedTenants] = useState([])
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [floorFilter, setFloorFilter] = useState('')
  const [sortBy, setSortBy] = useState('checkOutDate')
  const [sortOrder, setSortOrder] = useState('DESC')
  
  // Announcements state
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementMessage, setAnnouncementMessage] = useState('')
  const [announcementRoles, setAnnouncementRoles] = useState(['HeadAdmin', 'Admin', 'SuperAdmin', 'Accounting', 'Tenant'])
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
  const [announcementError, setAnnouncementError] = useState('')

  // Admin Dashboard state
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    totalStudents: 0,
    maintenanceRequests: 0
  })
  const [dashboardStats, setDashboardStats] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '', details: '' })

  // Accounting Dashboard state
  const [billingTenants, setBillingTenants] = useState([])
  const [billingStats, setBillingStats] = useState(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState('')
  const [pendingPayments, setPendingPayments] = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingError, setPendingError] = useState('')
  const [accountingSearchQuery, setAccountingSearchQuery] = useState('') // Fixed duplicate variable
  const [statusFilter, setStatusFilter] = useState('all')
  const [accountingSortBy, setAccountingSortBy] = useState('name')
  const [accountingSortOrder, setAccountingSortOrder] = useState('ASC')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedTenantForPayment, setSelectedTenantForPayment] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [showQuickPayModal, setShowQuickPayModal] = useState(false)
  const [quickPayAmount, setQuickPayAmount] = useState('')
  const [quickPayMethod, setQuickPayMethod] = useState('cash')
  const [quickPayNotes, setQuickPayNotes] = useState('')
  const [submittingQuickPay, setSubmittingQuickPay] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmData, setConfirmData] = useState(null)
  const [selectedTenantForHistory, setSelectedTenantForHistory] = useState(null)
  const [showTenantDropdown, setShowTenantDropdown] = useState(false)
  const [historySearchQuery, setHistorySearchQuery] = useState('')

  const statuses = useMemo(() => ['Active', 'Pending', 'Suspended', 'Deleted', 'Rejected'], [])
  const roles = useMemo(() => ['HeadAdmin', 'Admin', 'SuperAdmin', 'Accounting', 'Tenant'], [])

  const navigationItems = [
    {
      id: 'pending-accounts',
      label: 'Pending Accounts',
      icon: '⏳',
      section: 'SuperAdmin Services'
    },
    {
      id: 'user-management',
      label: 'User Management',
      icon: '👥',
      section: 'SuperAdmin Services'
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      section: 'Admin Services'
    },
    {
      id: 'rooms',
      label: 'Rooms',
      icon: '🏠',
      section: 'Admin Services'
    },
    {
      id: 'tenants',
      label: 'Tenants',
      icon: '👥',
      section: 'Admin Services'
    },
    {
      id: 'pricing',
      label: 'Pricing',
      icon: '💵',
      section: 'Admin Services'
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: '🔧',
      section: 'Admin Services'
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: '📢',
      section: 'Admin Services'
    },
    {
      id: 'archives',
      label: 'Archives',
      icon: '📦',
      section: 'Admin Services'
    },
    {
      id: 'add-account',
      label: 'Add Account',
      icon: '👤',
      section: 'Admin Services'
    },
    {
      id: 'tenant-billing',
      label: 'Tenant Billing',
      icon: '👥',
      section: 'Accounting Services'
    },
    {
      id: 'pending-payments',
      label: 'Pending Payments',
      icon: '⏳',
      section: 'Accounting Services'
    },
    {
      id: 'transaction-list',
      label: 'Transaction List',
      icon: '📋',
      section: 'Accounting Services'
    },
    {
      id: 'financial-reports',
      label: 'Financial Reports',
      icon: '📊',
      section: 'Accounting Services'
    },
    {
      id: 'outstanding-balances',
      label: 'Outstanding Balances',
      icon: '⚠️',
      section: 'Accounting Services'
    },
    {
      id: 'payment-history',
      label: 'Payment History',
      icon: '📈',
      section: 'Accounting Services'
    }
  ]

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [all, pend] = await Promise.all([
        superAdminService.getAllAccounts(),
        superAdminService.getPendingAccounts()
      ])
      setAccounts(all)
      setPending(pend)
    } catch (e) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let id
    const loadNotifs = async () => {
      try {
        const data = await notificationService.fetchMyNotifications(25)
        setNotifications(data)
        setUnread((data || []).filter(n => !n.isRead).length)
      } catch {
        // Silently fail - notifications are not critical
      }
    }
    loadNotifs()
    id = setInterval(loadNotifs, 15000)
    return () => id && clearInterval(id)
  }, [])

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

  const handleApprove = async (id) => {
    await superAdminService.approveAccount(id)
    await load()
  }
  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection (optional):')
    await superAdminService.rejectAccount(id, reason || undefined)
    await load()
  }
  const handleRole = async (id, role) => {
    await superAdminService.updateRole(id, role)
    await load()
  }
  const handleStatus = async (id, status) => {
    await superAdminService.updateStatus(id, status)
    await load()
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await superAdminService.createAccount(newAccount)
      setNewAccount({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'Tenant',
        status: 'Pending'
      })
      setActiveTab('user-management')
      await load()
    } catch (e) {
      setError(e?.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setNewAccount(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Archived tenants functions
  const fetchArchivedTenants = async () => {
    try {
      setArchivedLoading(true)
      const filters = {
        search: searchQuery,
        dateFrom,
        dateTo,
        floor: floorFilter,
        sortBy,
        sortOrder
      }
      const data = await archivedTenantService.getArchivedTenants(filters)
      setArchivedTenants(data)
    } catch (e) {
      setError(e?.message || 'Failed to load archived tenants')
    } finally {
      setArchivedLoading(false)
    }
  }

  const handleViewDetails = async (tenant) => {
    try {
      const detailedData = await archivedTenantService.getArchivedTenantById(tenant.id)
      setSelectedTenant(detailedData)
      setShowDetailModal(true)
    } catch (e) {
      setError(e?.message || 'Failed to load tenant details')
    }
  }

  const handleSearch = () => {
    fetchArchivedTenants()
  }

  const handleReset = () => {
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
    setFloorFilter('')
    setSortBy('checkOutDate')
    setSortOrder('DESC')
    setTimeout(fetchArchivedTenants, 100)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const exportToCSV = () => {
    try {
      const headers = ['Name', 'Email', 'Room', 'Floor', 'Check In', 'Check Out', 'Final Balance', 'Total Paid']
      const rows = archivedTenants.map(tenant => [
        tenant.name,
        tenant.email,
        tenant.roomNumber,
        tenant.floor,
        formatDate(tenant.checkInDate),
        formatDate(tenant.checkOutDate),
        tenant.finalBalance,
        tenant.totalPaid
      ])

      let csvContent = headers.join(',') + '\n'
      csvContent += rows.map(row => row.join(',')).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `archived_tenants_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      setError(e?.message || 'Failed to export CSV')
    }
  }

  const handleSendAnnouncement = async (e) => {
    e.preventDefault()
    if (!announcementTitle || !announcementMessage) {
      setError('Title and message are required')
      return
    }
    
    setSendingAnnouncement(true)
    setError('')
    try {
      await notificationService.broadcastAnnouncement(
        announcementTitle,
        announcementMessage,
        announcementRoles
      )
      setAnnouncementTitle('')
      setAnnouncementMessage('')
      setAnnouncementRoles(['HeadAdmin', 'Admin', 'SuperAdmin', 'Accounting', 'Tenant'])
      alert('Announcement sent successfully to all selected roles!')
    } catch (e) {
      setError(e?.message || 'Failed to send announcement')
    } finally {
      setSendingAnnouncement(false)
    }
  }

  const toggleRole = (role) => {
    setAnnouncementRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  // Admin Dashboard functions
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      console.log('🔐 SuperAdmin Dashboard: Fetching statistics...')
      
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

      setStats({
        totalRooms: Number(roomStats.totalRooms || 0),
        occupiedRooms: Number((roomStats.fullyOccupiedRooms || 0)) + Number((roomStats.partiallyOccupiedRooms || 0)),
        totalStudents: Number(tenantStats.activeTenants || 0),
        maintenanceRequests: Number(roomStats.maintenanceRooms || 0)
      })

      setDashboardStats(paymentStats)
    } catch (error) {
      console.error('❌ SuperAdmin Dashboard: Failed to fetch stats:', error)
      if (error.response?.status === 401) {
        console.log('🔄 SuperAdmin Dashboard: Auth error, showing empty stats')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

  // Accounting Dashboard functions
  const loadBillingData = async () => {
    try {
      setBillingLoading(true)
      setBillingError('')
      
      const [tenantsData, statsData] = await Promise.all([
        fetchTenantsWithBillingInfo(),
        fetchPaymentStats()
      ])
      
      setBillingTenants(tenantsData)
      setBillingStats(statsData)
    } catch (err) {
      console.error('Failed to load billing data:', err)
      setBillingError(err?.response?.data?.message || err.message || 'Failed to load billing data')
    } finally {
      setBillingLoading(false)
    }
  }

  const loadPendingPayments = async () => {
    try {
      setPendingLoading(true)
      setPendingError('')
      
      const data = await fetchPendingPayments()
      setPendingPayments(data)
    } catch (err) {
      console.error('Failed to load pending payments:', err)
      setPendingError(err?.response?.data?.message || err.message || 'Failed to load pending payments')
    } finally {
      setPendingLoading(false)
    }
  }

  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true)
      setAnnouncementError('')
      
      const data = await notificationService.getAllAnnouncements()
      setAnnouncements(data)
    } catch (err) {
      console.error('Failed to load announcements:', err)
      setAnnouncementError(err?.response?.data?.message || err.message || 'Failed to load announcements')
    } finally {
      setLoadingAnnouncements(false)
    }
  }

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return
    
    try {
      await notificationService.deleteAnnouncement(announcementId)
      await loadAnnouncements()
      alert('Announcement deleted successfully!')
    } catch (err) {
      console.error('Failed to delete announcement:', err)
      alert('Failed to delete announcement: ' + (err?.response?.data?.message || err.message))
    }
  }

  const handleSuspendAnnouncement = async (announcementId) => {
    if (!window.confirm('Are you sure you want to suspend this announcement?')) return
    
    try {
      await notificationService.suspendAnnouncement(announcementId)
      await loadAnnouncements()
      alert('Announcement suspended successfully!')
    } catch (err) {
      console.error('Failed to suspend announcement:', err)
      alert('Failed to suspend announcement: ' + (err?.response?.data?.message || err.message))
    }
  }

  const loadNotifs = async () => {
    try {
      const data = await notificationService.fetchMyNotifications()
      const filteredNotifs = data.filter(notif => 
        !(notif.type === 'SYSTEM' && notif.isRead === true)
      )
      setNotifications(filteredNotifs)
      setUnread(filteredNotifs.filter(n => !n.isRead).length)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnread(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const deleteNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      setUnread(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'pending-accounts':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>⏳ Pending Accounts</h2>
              <button className="refresh-btn" onClick={load} disabled={loading}>
                {loading ? '🔄' : '🔄'} Refresh
              </button>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            {pending.length === 0 ? (
              <div className="empty-state">No pending accounts</div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Date Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map(a => (
                      <tr key={a.id} className="clickable-row" onClick={() => console.log('View account:', a.id)}>
                        <td>{a.firstName} {a.lastName}</td>
                        <td>{a.email}</td>
                        <td><RoleBadge role={a.role} /></td>
                        <td><span className="status-badge pending">{a.status}</span></td>
                        <td>{new Date(a.createdAt || Date.now()).toLocaleDateString()}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="action-buttons">
                            <button className="btn-success" onClick={() => handleApprove(a.id)}>Approve</button>
                            <button className="btn-danger" onClick={() => handleReject(a.id)}>Reject</button>
                            <select className="role-select" value={a.role} onChange={(e) => handleRole(a.id, e.target.value)}>
                              {roles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      case 'user-management':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>👥 User Management</h2>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.id}>
                      <td>{a.firstName} {a.lastName}</td>
                      <td>{a.email}</td>
                      <td>
                        <select className="role-select" value={a.role} onChange={(e) => handleRole(a.id, e.target.value)}>
                          {roles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className="status-select" value={a.status} onChange={(e) => handleStatus(a.id, e.target.value)}>
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td>
                        <button className="btn-warning" onClick={() => handleStatus(a.id, 'Suspended')}>Suspend</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      case 'add-account':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>➕ Add New Account</h2>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="form-container">
              <form onSubmit={handleCreateAccount} className="account-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      value={newAccount.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      value={newAccount.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={newAccount.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      id="password"
                      value={newAccount.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required
                      minLength={6}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="role">Role</label>
                    <select
                      id="role"
                      value={newAccount.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      className="form-select"
                    >
                      {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="status">Initial Status</label>
                    <select
                      id="status"
                      value={newAccount.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="form-select"
                    >
                      <option value="Pending">Pending (Requires Approval)</option>
                      <option value="Active">Active (Auto-Approved)</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setActiveTab('user-management')}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      case 'archived-tenants':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>📦 Archived Tenants</h2>
              <button className="refresh-btn" onClick={fetchArchivedTenants} disabled={archivedLoading}>
                {archivedLoading ? '🔄' : '🔄'} {archivedLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {/* Filters Section */}
            <div style={{ padding: '1.5rem', background: '#f9fafb', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>🔍 Search & Filter</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Search</label>
                  <input
                    type="text"
                    placeholder="Name, email, or room..."
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Floor</label>
                  <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)} className="form-select">
                    <option value="">All Floors</option>
                    <option value="1">Floor 1</option>
                    <option value="2">Floor 2</option>
                    <option value="3">Floor 3</option>
                    <option value="4">Floor 4</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Sort By</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-select">
                    <option value="checkOutDate">Check Out Date</option>
                    <option value="checkInDate">Check In Date</option>
                    <option value="finalBalance">Final Balance</option>
                    <option value="totalPaid">Total Paid</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Order</label>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="form-select">
                    <option value="DESC">Descending</option>
                    <option value="ASC">Ascending</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleSearch} className="btn-primary">🔍 Search</button>
                <button onClick={handleReset} className="btn-secondary">🔄 Reset</button>
                <button onClick={exportToCSV} className="btn-success">📥 Export CSV</button>
              </div>
            </div>

            {/* Stats Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <h4 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Archived</h4>
                <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>{archivedTenants.length}</p>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <h4 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Paid</h4>
                <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#059669', margin: 0 }}>{formatCurrency(archivedTenants.reduce((sum, t) => sum + (t.totalPaid || 0), 0))}</p>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <h4 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Outstanding</h4>
                <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#dc2626', margin: 0 }}>{formatCurrency(archivedTenants.reduce((sum, t) => sum + (t.finalBalance || 0), 0))}</p>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <h4 style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Payments</h4>
                <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>{archivedTenants.reduce((sum, t) => sum + (t.paymentCount || 0), 0)}</p>
              </div>
            </div>

            {/* Tenants Table */}
            <div className="table-container">
              {archivedLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading...</div>
              ) : archivedTenants.length === 0 ? (
                <div className="empty-state">
                  <p>No archived tenants found.</p>
                  <small style={{ color: '#6b7280' }}>Checked-out tenants will appear here.</small>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Room</th>
                      <th>Floor</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Final Balance</th>
                      <th>Total Paid</th>
                      <th>Payments</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedTenants.map(tenant => (
                      <tr key={tenant.id}>
                        <td>{tenant.name}</td>
                        <td>{tenant.email}</td>
                        <td>{tenant.roomNumber}</td>
                        <td>{tenant.floor}</td>
                        <td>{formatDate(tenant.checkInDate)}</td>
                        <td>{formatDate(tenant.checkOutDate)}</td>
                        <td style={{ color: tenant.finalBalance > 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>
                          {formatCurrency(tenant.finalBalance)}
                        </td>
                        <td style={{ color: '#059669', fontWeight: 600 }}>{formatCurrency(tenant.totalPaid)}</td>
                        <td>{tenant.paymentCount}</td>
                        <td>
                          <button className="btn-success" onClick={() => handleViewDetails(tenant)}>
                            👁️ View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      case 'announcements':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>📢 Announcements</h2>
              <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                Send important messages to tenants and staff members.
              </p>
              <button className="refresh-btn" onClick={loadAnnouncements} disabled={loadingAnnouncements}>
                {loadingAnnouncements ? '🔄' : '🔄'} Refresh List
              </button>
            </div>
            {announcementError && <div className="alert alert-danger">{announcementError}</div>}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
              {/* Left Panel - Send Announcement */}
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
                      {roles.map(role => (
                        <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={announcementRoles.includes(role)}
                            onChange={() => toggleRole(role)}
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
                        setAnnouncementRoles(['HeadAdmin', 'Admin', 'SuperAdmin', 'Accounting', 'Tenant'])
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

              {/* Right Panel - Announcements List */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>📋</span>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Announcements List</h3>
                </div>
                
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
                            isRead: announcement.isRead,
                            isSuspended: announcement.isSuspended
                          };
                        }
                        
                        // Use Set to avoid duplicate roles
                        groups[key].roles.add(announcement.recipientRole);
                        groups[key].ids.push(announcement.id);
                        
                        // If any announcement in the group is not read, mark the group as not read
                        if (!announcement.isRead) {
                          groups[key].isRead = false;
                        }
                        
                        // If any announcement in the group is suspended, mark the group as suspended
                        if (announcement.isSuspended) {
                          groups[key].isSuspended = true;
                        }
                        
                        return groups;
                      }, {});

                      return Object.values(groupedAnnouncements).map((group, index) => (
                        <div key={index} style={{ 
                          padding: '1rem', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '0.5rem', 
                          marginBottom: '1rem',
                          background: group.isSuspended ? '#fef2f2' : '#fff'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{group.title}</h4>
                              {group.isSuspended && (
                                <span style={{ 
                                  background: '#6b7280', 
                                  color: 'white', 
                                  padding: '0.25rem 0.5rem', 
                                  borderRadius: '1rem', 
                                  fontSize: '0.75rem',
                                  fontWeight: 500
                                }}>
                                  Suspended
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {!group.isSuspended && (
                                <button 
                                  onClick={() => handleSuspendAnnouncement(group.ids[0])}
                                  style={{ 
                                    background: '#3b82f6', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '0.5rem', 
                                    borderRadius: '0.25rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  ⏸️ Suspend
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteAnnouncement(group.ids[0])}
                                style={{ 
                                  background: '#dc2626', 
                                  color: 'white', 
                                  border: 'none', 
                                  padding: '0.5rem', 
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.875rem'
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#374151' }}>{group.message}</p>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            <div><strong>Target:</strong> {Array.from(group.roles).join(', ')}</div>
                            <div><strong>Sent:</strong> {new Date(group.createdAt).toLocaleString()}</div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      case 'dashboard':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>📊 Dashboard Overview</h2>
              <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? '🔄' : '🔄'} Refresh
              </button>
            </div>
            {errorModal.open && (
              <div className="alert alert-danger">
                <strong>{errorModal.title}</strong><br />
                {errorModal.message}
                {errorModal.details && <details><summary>Details</summary>{errorModal.details}</details>}
              </div>
            )}
            {loading ? (
              <div className="loading-state">Loading dashboard data...</div>
            ) : (
              <div className="dashboard-content">
                {/* Stats Cards */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">🏠</div>
                    <div className="stat-content">
                      <div className="stat-label">Total Rooms</div>
                      <div className="stat-value">{stats.totalRooms}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                      <div className="stat-label">Occupied Rooms</div>
                      <div className="stat-value">{stats.occupiedRooms}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🎓</div>
                    <div className="stat-content">
                      <div className="stat-label">Total Students</div>
                      <div className="stat-value">{stats.totalStudents}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🔧</div>
                    <div className="stat-content">
                      <div className="stat-label">Maintenance Requests</div>
                      <div className="stat-value">{stats.maintenanceRequests}</div>
                    </div>
                  </div>
                </div>

                {/* Financial Overview */}
                {dashboardStats && (
                  <div className="financial-overview">
                    <h3>💰 Financial Overview</h3>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-icon">⚠️</div>
                        <div className="stat-content">
                          <div className="stat-label">Unpaid Bills</div>
                          <div className="stat-value">{dashboardStats.totalUnpaidBills}</div>
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div className="stat-content">
                          <div className="stat-label">Amount Collected</div>
                          <div className="stat-value">{formatCurrency(dashboardStats.totalAmountCollected)}</div>
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                          <div className="stat-label">Outstanding Amount</div>
                          <div className="stat-value">{formatCurrency(dashboardStats.totalOutstandingAmount)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      case 'rooms':
        return <RoomPage />
      case 'tenants':
        return <TenantPage />
      case 'pricing':
        return <PricingPage />
      case 'maintenance':
        return <AdminMaintenancePage />
      case 'archives':
        return <ArchivedTenantsPage />
      case 'tenant-billing':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>👥 Tenant Billing</h2>
              <button className="refresh-btn" onClick={loadBillingData} disabled={billingLoading}>
                {billingLoading ? '🔄' : '🔄'} Refresh
              </button>
            </div>
            {billingError && <div className="alert alert-danger">{billingError}</div>}
            
            {billingLoading ? (
              <div className="loading-state">Loading tenant billing data...</div>
            ) : (
              <div className="billing-content">
                {/* Stats Cards */}
                {billingStats && (
                  <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {getStatsCards(billingStats, billingTenants).map((stat, index) => (
                      <div key={index} className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '3rem', height: '3rem', background: stat.color, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{stat.icon}</div>
                          <div>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>{stat.label}</p>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{stat.value}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tenant List */}
                <div className="table-container">
                  <div className="table-header">
                    <h3>Tenant Billing Overview</h3>
                    <div className="table-controls">
                      <input
                        type="text"
                        placeholder="Search tenants..."
value={accountingSearchQuery}
onChange={(e) => setAccountingSearchQuery(e.target.value)}
                        className="search-input"
                      />
                      <div className="status-filters">
                        {getStatusFilterOptions().map(option => (
                          <button
                            key={option.id}
                            onClick={() => setStatusFilter(option.id)}
                            className={`status-btn ${statusFilter === option.id ? 'active' : ''}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <select
                        value={`${accountingSortBy}-${accountingSortOrder}`}
                        onChange={(e) => {
                          const [field, order] = e.target.value.split('-')
                          setAccountingSortBy(field)
                          setAccountingSortOrder(order)
                        }}
                        className="sort-select"
                      >
                        {getSortOptions().map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {billingTenants.length === 0 ? (
                    <div className="empty-state">
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>No Tenants Found</h3>
                      <p style={{ margin: 0, color: '#6b7280' }}>No tenant billing information available.</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <TableHeader headers={getTableHeaders('tenant-billing')} />
                      <tbody>
                        {getFilteredTenants(billingTenants, accountingSearchQuery, statusFilter, accountingSortBy, accountingSortOrder).map(tenant => (
                          <tr key={tenant.id}>
                            <td>{tenant.name}</td>
                            <td>{tenant.email}</td>
                            <td>{tenant.roomNumber}</td>
                            <td>{tenant.floor}</td>
                            <td style={{ color: getDueDateStatus(tenant.nextDueDate).color, fontWeight: 600 }}>
                              {formatDate(tenant.nextDueDate)}
                            </td>
                            <td style={{ color: tenant.currentBalance > 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>
                              {formatCurrency(tenant.currentBalance)}
                            </td>
                            <td>
                              <button 
                                className="btn-primary"
                                onClick={() => handlePayButtonClick(tenant, setShowPaymentModal, setSelectedTenantForPayment)}
                              >
                                💰 Pay
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      case 'pending-payments':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>⏳ Pending Payments</h2>
              <button className="refresh-btn" onClick={loadPendingPayments} disabled={pendingLoading}>
                {pendingLoading ? '🔄' : '🔄'} Refresh
              </button>
            </div>
            {pendingError && <div className="alert alert-danger">{pendingError}</div>}
            
            {pendingLoading ? (
              <div className="loading-state">Loading pending payments...</div>
            ) : (
              <div className="pending-content">
                {/* Summary */}
                {pendingPayments.length > 0 && (
                  <div className="summary-section" style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                    {(() => {
                      const summary = getPendingPaymentsSummary(pendingPayments)
                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>Total Pending: {summary.count} payments</span>
                            <span style={{ marginLeft: '1rem', color: '#dc2626', fontWeight: 600 }}>
                              {formatCurrency(summary.totalAmount)}
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Pending Payments List */}
                <div className="table-container">
                  {pendingPayments.length === 0 ? (
                    <div className="empty-state">
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>No Pending Payments</h3>
                      <p style={{ margin: 0, color: '#6b7280' }}>All payments have been processed.</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <TableHeader headers={getTableHeaders('pending-payments')} />
                      <tbody>
                        {pendingPayments.map(payment => (
                          <tr key={payment.id}>
                            <td>{payment.tenantName}</td>
                            <td>{payment.roomNumber}</td>
                            <td>{formatCurrency(payment.amount)}</td>
                            <td>{payment.paymentMethod}</td>
                            <td>{formatDate(payment.paymentDate)}</td>
                            <td>
                              <span className={`status-badge ${payment.status.toLowerCase()}`}>
                                {payment.status}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="btn-success"
                                onClick={() => handleConfirmPayment(payment.id, setShowConfirmModal, setConfirmData)}
                              >
                                ✅ Confirm
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      case 'transaction-list':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>📋 Transaction List</h2>
            </div>
            <div className="coming-soon">
              <p>Transaction list coming soon!</p>
            </div>
          </div>
        )
      case 'financial-reports':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>📊 Financial Reports</h2>
            </div>
            <div className="coming-soon">
              <p>Financial reports coming soon!</p>
            </div>
          </div>
        )
      case 'outstanding-balances':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>⚠️ Outstanding Balances</h2>
              <button className="refresh-btn" onClick={loadBillingData} disabled={billingLoading}>
                {billingLoading ? '🔄' : '🔄'} Refresh
              </button>
            </div>
            {billingError && <div className="alert alert-danger">{billingError}</div>}
            
            {billingLoading ? (
              <div className="loading-state">Loading outstanding balances...</div>
            ) : (
              <div className="outstanding-content">
                {/* Outstanding Stats */}
                {(() => {
                  const outstandingStats = getOutstandingStats(billingTenants)
                  return (
                    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                      {outstandingStats.stats.map((stat, index) => (
                        <div key={index} className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '3rem', height: '3rem', background: stat.color, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{stat.icon}</div>
                            <div>
                              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>{stat.label}</p>
                              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{stat.value}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Outstanding Balances List */}
                <div className="table-container">
                  <div className="table-header">
                    <h3>Tenants with Outstanding Balances</h3>
                    <div className="table-controls">
                      <input
                        type="text"
                        placeholder="Search tenants..."
value={accountingSearchQuery}
onChange={(e) => setAccountingSearchQuery(e.target.value)}
                        className="search-input"
                      />
                      <div className="status-filters">
                        {getStatusFilterOptions().map(option => (
                          <button
                            key={option.id}
                            onClick={() => setStatusFilter(option.id)}
                            className={`status-btn ${statusFilter === option.id ? 'active' : ''}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <select
                        value={`${accountingSortBy}-${accountingSortOrder}`}
                        onChange={(e) => {
                          const [field, order] = e.target.value.split('-')
                          setAccountingSortBy(field)
                          setAccountingSortOrder(order)
                        }}
                        className="sort-select"
                      >
                        {getSortOptions().map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const outstandingTenants = billingTenants.filter(tenant => tenant.currentBalance > 0)
                    const filteredTenants = getFilteredTenants(outstandingTenants, accountingSearchQuery, statusFilter, accountingSortBy, accountingSortOrder)
                    
                    return filteredTenants.length === 0 ? (
                      <div className="empty-state">
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>No Outstanding Balances</h3>
                        <p style={{ margin: 0, color: '#6b7280' }}>All tenants are up to date with their payments.</p>
                      </div>
                    ) : (
                      <table className="data-table">
                        <TableHeader headers={getTableHeaders('outstanding-balances')} />
                        <tbody>
                          {filteredTenants.map(tenant => (
                            <tr key={tenant.id}>
                              <td>{tenant.name}</td>
                              <td>{tenant.email}</td>
                              <td>{tenant.roomNumber}</td>
                              <td>{tenant.floor}</td>
                              <td style={{ color: '#dc2626', fontWeight: 600 }}>
                                {formatCurrency(tenant.currentBalance)}
                              </td>
                              <td style={{ color: getDueDateStatus(tenant.nextDueDate).color, fontWeight: 600 }}>
                                {formatDate(tenant.nextDueDate)}
                              </td>
                              <td>
                                <button 
                                  className="btn-primary"
                                  onClick={() => handlePayButtonClick(tenant, setShowPaymentModal, setSelectedTenantForPayment)}
                                >
                                  💰 Pay Now
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        )
      case 'payment-history':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>📈 Payment History</h2>
              <button className="refresh-btn" onClick={loadBillingData} disabled={billingLoading}>
                {billingLoading ? '🔄' : '🔄'} Refresh
              </button>
            </div>
            {billingError && <div className="alert alert-danger">{billingError}</div>}
            
            {billingLoading ? (
              <div className="loading-state">Loading payment history...</div>
            ) : (
              <div className="payment-history-content">
                {/* Tenant Selection */}
                <div className="tenant-selection" style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>Select Tenant</h3>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search by name, room, or email..."
                      value={historySearchQuery}
                      onChange={(e) => {
                        setHistorySearchQuery(e.target.value)
                        setShowTenantDropdown(true)
                      }}
                      onFocus={() => setShowTenantDropdown(true)}
                      className="search-input"
                      style={{ width: '100%' }}
                    />
                    {showTenantDropdown && (
                      <div 
                        className="tenant-dropdown"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'white',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          zIndex: 10,
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}
                      >
                        {getPaymentHistoryFilteredTenants(billingTenants, historySearchQuery).map(tenant => (
                          <div
                            key={tenant.id}
                            onClick={() => {
                              setSelectedTenantForHistory(tenant)
                              setHistorySearchQuery(`${tenant.name} - Room ${tenant.roomNumber}`)
                              setShowTenantDropdown(false)
                            }}
                            style={{
                              padding: '0.75rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6'
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{tenant.name}</div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              Room {tenant.roomNumber} • Floor {tenant.floor} • {tenant.email}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Tenant Details */}
                {selectedTenantForHistory ? (
                  <div className="tenant-details">
                    <div className="tenant-info" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600 }}>Tenant Information</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div><strong>Name:</strong> {selectedTenantForHistory.name}</div>
                        <div><strong>Email:</strong> {selectedTenantForHistory.email}</div>
                        <div><strong>Room:</strong> {selectedTenantForHistory.roomNumber}</div>
                        <div><strong>Floor:</strong> {selectedTenantForHistory.floor}</div>
                        <div><strong>Current Balance:</strong> 
                          <span style={{ color: selectedTenantForHistory.currentBalance > 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>
                            {formatCurrency(selectedTenantForHistory.currentBalance)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment History Table */}
                    <div className="table-container">
                      <div className="table-header">
                        <h3>Payment History</h3>
                      </div>
                      {!selectedTenantForHistory.paymentHistory || selectedTenantForHistory.paymentHistory.length === 0 ? (
                        <div className="empty-state">
                          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
                          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>No Payment History</h3>
                          <p style={{ margin: 0, color: '#6b7280' }}>No payment records found for this tenant.</p>
                        </div>
                      ) : (
                        <table className="data-table">
                          <TableHeader headers={getTableHeaders('payment-history')} />
                          <tbody>
                            {selectedTenantForHistory.paymentHistory.map(payment => (
                              <tr key={payment.id}>
                                <td>{formatDate(payment.paymentDate)}</td>
                                <td>{formatCurrency(payment.amount)}</td>
                                <td>{payment.paymentMethod}</td>
                                <td>{formatCurrency(payment.balanceAfter)}</td>
                                <td>
                                  <span className={`status-badge ${payment.status.toLowerCase()}`}>
                                    {payment.status}
                                  </span>
                                </td>
                                <td>{payment.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Select a Tenant</h3>
                    <p style={{ margin: 0, color: '#6b7280' }}>Please select a tenant to view their payment history.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      default:
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>{navigationItems.find(item => item.id === activeTab)?.icon} {navigationItems.find(item => item.id === activeTab)?.label}</h2>
            </div>
            <div className="coming-soon">
              <p>This feature is coming soon!</p>
            </div>
          </div>
        )
    }
  }

  const groupedItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = []
    }
    acc[item.section].push(item)
    return acc
  }, {})

  // Load data when component mounts
  useEffect(() => {
    load()
    loadNotifs()
  }, [])

  // Load specific data when switching tabs
  useEffect(() => {
    switch (activeTab) {
      case 'dashboard':
        fetchDashboardData()
        break
      case 'tenant-billing':
        loadBillingData()
        break
      case 'pending-payments':
        loadPendingPayments()
        break
      case 'announcements':
        loadAnnouncements()
        break
      case 'archived-tenants':
        fetchArchivedTenants()
        break
      default:
        break
    }
  }, [activeTab])

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTenantDropdown && !event.target.closest('.tenant-dropdown') && !event.target.closest('input')) {
        setShowTenantDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTenantDropdown])

  return (
    <div className="superadmin-layout">
      {/* Header */}
      <header className="superadmin-header">
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
              <span className="logo-icon">👑</span>
              <span className="logo-text">Super Admin Dashboard</span>
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
            <div className="email">Super Admin</div>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <div className="superadmin-body">
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
        
        <aside className={`superadmin-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {Object.entries(groupedItems).map(([section, items]) => (
              <SidebarSection key={section} title={section}>
                {items.map(item => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    isActive={activeTab === item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                      if (item.id === 'archived-tenants') {
                        fetchArchivedTenants();
                      }
                    }}
                  />
                ))}
              </SidebarSection>
            ))}
          </nav>
        </aside>

        <main className="superadmin-main-content">
          {renderContent()}
        </main>
      </div>

      {/* Detail Modal for Archived Tenants */}
      {showDetailModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '1rem', maxWidth: '900px', width: '100%', maxHeight: '90vh', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>📄 Archived Tenant Details</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Personal Information */}
              <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>👤 Personal Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div><strong>Name:</strong> {selectedTenant.name}</div>
                  <div><strong>Email:</strong> {selectedTenant.email}</div>
                  <div><strong>Title:</strong> {selectedTenant.title || 'N/A'}</div>
                </div>
              </section>

              {/* Room Information */}
              <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>🏠 Room Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div><strong>Room:</strong> {selectedTenant.roomNumber}</div>
                  <div><strong>Floor:</strong> {selectedTenant.floor}</div>
                  <div><strong>Building:</strong> {selectedTenant.building}</div>
                  <div><strong>Bed:</strong> {selectedTenant.bedNumber}</div>
                </div>
              </section>

              {/* Lease Information */}
              <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>📅 Lease Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div><strong>Check In:</strong> {formatDate(selectedTenant.checkInDate)}</div>
                  <div><strong>Check Out:</strong> {formatDate(selectedTenant.checkOutDate)}</div>
                  <div><strong>Days Stayed:</strong> {selectedTenant.daysStayed}</div>
                  <div><strong>Lease Start:</strong> {selectedTenant.leaseStart ? formatDate(selectedTenant.leaseStart) : 'N/A'}</div>
                  <div><strong>Lease End:</strong> {selectedTenant.leaseEnd ? formatDate(selectedTenant.leaseEnd) : 'N/A'}</div>
                </div>
              </section>

              {/* Financial Summary */}
              <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>💰 Financial Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div><strong>Monthly Rent:</strong> {formatCurrency(selectedTenant.monthlyRent)}</div>
                  <div><strong>Utilities:</strong> {formatCurrency(selectedTenant.utilities)}</div>
                  <div><strong>Deposit:</strong> {formatCurrency(selectedTenant.deposit)}</div>
                  <div><strong>Deposit Applied:</strong> {formatCurrency(selectedTenant.depositApplied)}</div>
                  <div><strong>Total Charges:</strong> {formatCurrency(selectedTenant.totalCharges)}</div>
                  <div><strong>Total Paid:</strong> {formatCurrency(selectedTenant.totalPaid)}</div>
                  <div style={{ color: selectedTenant.finalBalance > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                    <strong>Final Balance:</strong> {formatCurrency(selectedTenant.finalBalance)}
                  </div>
                </div>
              </section>

              {/* Payment History */}
              <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>📜 Payment History ({selectedTenant.paymentHistory?.length || 0} payments)</h3>
                {!selectedTenant.paymentHistory || selectedTenant.paymentHistory.length === 0 ? (
                  <p>No payment history available.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Method</th>
                          <th>Balance After</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTenant.paymentHistory.map(payment => (
                          <tr key={payment.id}>
                            <td>{formatDate(payment.paymentDate)}</td>
                            <td>{formatCurrency(payment.amount)}</td>
                            <td>{payment.paymentMethod}</td>
                            <td>{formatCurrency(payment.balanceAfter)}</td>
                            <td>{payment.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Billing Cycles */}
              <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>📊 Billing Cycles ({selectedTenant.billingCycles?.length || 0} cycles)</h3>
                {!selectedTenant.billingCycles || selectedTenant.billingCycles.length === 0 ? (
                  <p>No billing cycles available.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Previous Balance</th>
                          <th>Deposit Applied</th>
                          <th>Charges</th>
                          <th>Payments</th>
                          <th>Final Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTenant.billingCycles.map(cycle => (
                          <tr key={cycle.id}>
                            <td>{cycle.cycleMonth}</td>
                            <td>{formatCurrency(cycle.previousBalance)}</td>
                            <td>{formatCurrency(cycle.depositApplied)}</td>
                            <td>{formatCurrency(cycle.monthlyCharges)}</td>
                            <td>{formatCurrency(cycle.paymentsMade)}</td>
                            <td>{formatCurrency(cycle.finalBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Notes */}
              {selectedTenant.notes && (
                <section style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>📝 Notes</h3>
                  <p>{selectedTenant.notes}</p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


