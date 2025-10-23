import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { notificationService } from '../services/notificationService'
import { navigationControlService } from '../services/navigationControlService'
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
  getDueDateStatus,
  getStatsCards,
  getOutstandingStats,
  getPaymentHistoryFilteredTenants,
  getTableHeaders,
  getStatusFilterOptions,
  getSortOptions,
  getPendingPaymentsSummary,
  getTransactionFilterOptions,
  getReportPeriodOptions
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
import '../components/Dashboard.css'
import '../components/AccountingDashboard.css'
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
  const { logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [pending, setPending] = useState([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('pending-accounts')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  const [markingAsRead, setMarkingAsRead] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  
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
  const [pendingPayments, setPendingPayments] = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [accountingSearchQuery, setAccountingSearchQuery] = useState('') // Fixed duplicate variable
  const [statusFilter, setStatusFilter] = useState('all')
  const [accountingSortBy, setAccountingSortBy] = useState('name')
  const [accountingSortOrder, setAccountingSortOrder] = useState('ASC')
  const [selectedTenantForHistory, setSelectedTenantForHistory] = useState(null)
  const [showTenantDropdown, setShowTenantDropdown] = useState(false)
  const [historySearchQuery, setHistorySearchQuery] = useState('')

  // Transaction List state
  const [transactions, setTransactions] = useState([])
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [transactionFilters, setTransactionFilters] = useState({
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    paymentMethod: '',
    tenantId: ''
  })

  // Financial Reports state
  const [reportPeriod, setReportPeriod] = useState('monthly')
  const [reportData, setReportData] = useState(null)

  // Admin Management state
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
      id: 'admin-management',
      label: 'Admin Management',
      icon: '👑',
      section: 'Admin Services'
    },
    {
      id: 'navigation-control',
      label: 'Navigation Control',
      icon: '🧭',
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

  // Load data when switching tabs
  useEffect(() => {
    switch (activeTab) {
      case 'dashboard':
        fetchDashboardData()
        break
      case 'tenant-billing':
      case 'outstanding-balances':
        loadBillingData()
        break
      case 'pending-payments':
        loadPendingPayments()
        break
      case 'transaction-list':
        loadTransactions()
        break
      case 'financial-reports':
        loadFinancialReports()
        break
      case 'announcements':
        loadAnnouncements()
        break
      default:
        break
    }
  }, [activeTab])

  // Load HeadAdmin/SuperAdmin data for Admin Management and Navigation Control
  const loadHeadAdminData = useCallback(async () => {
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
  }, [])

  // Load HeadAdmin/SuperAdmin data when component mounts
  useEffect(() => {
    loadHeadAdminData()
  }, [loadHeadAdminData])

  // Admin Management handler functions
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

  const openNavigationModal = async (admin) => {
    setSelectedAdmin(admin)
    setSelectedNavigationItems(admin.permissions ? admin.permissions.map(p => p.id) : [])
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

  // User Management handler functions
  const handleSaveUser = async (userId) => {
    try {
      // Get the current user data from accounts
      const user = accounts.find(a => a.id === userId)
      if (!user) return

      // Update the user's role and status
      await superAdminService.updateRole(userId, user.role)
      await superAdminService.updateStatus(userId, user.status)
      
      // Refresh the accounts list
      await load()
      
      // Exit edit mode
      setEditingUser(null)
      
      alert('User updated successfully!')
    } catch (error) {
      console.error('Failed to save user:', error)
      alert('Failed to save user: ' + error.message)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      await superAdminService.deleteAccount(userId)
      await load()
      alert('User deleted successfully!')
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Failed to delete user: ' + error.message)
    }
  }


  // Archived tenants functions
  const fetchArchivedTenants = useCallback(async () => {
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
  }, [searchQuery, dateFrom, dateTo, floorFilter, sortBy, sortOrder])

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
      
      await Promise.all([
        fetchTenantsWithBillingInfo(setBillingLoading, setBillingTenants, setErrorModal),
        fetchPaymentStats(setBillingStats, setErrorModal)
      ])
    } catch (err) {
      console.error('Failed to load billing data:', err)
      setErrorModal({
        open: true,
        title: 'Failed to load billing data',
        message: 'We could not load tenant billing information.',
        details: err?.response?.data?.message || err.message || 'Unknown error'
      })
    } finally {
      setBillingLoading(false)
    }
  }

  const loadPendingPayments = async () => {
    try {
      setPendingLoading(true)
      
      await fetchPendingPayments(setPendingPayments, setErrorModal)
    } catch (err) {
      console.error('Failed to load pending payments:', err)
      setErrorModal({
        open: true,
        title: 'Failed to load pending payments',
        message: 'We could not load pending payment data.',
        details: err?.response?.data?.message || err.message || 'Unknown error'
      })
    } finally {
      setPendingLoading(false)
    }
  }

  const loadTransactions = async () => {
    try {
      setTransactionLoading(true)
      // TODO: Implement transaction loading from paymentService
      setTransactions([])
    } catch (err) {
      console.error('Failed to load transactions:', err)
      setErrorModal({
        open: true,
        title: 'Failed to load transactions',
        message: 'We could not load transaction data.',
        details: err?.response?.data?.message || err.message || 'Unknown error'
      })
    } finally {
      setTransactionLoading(false)
    }
  }

  const loadFinancialReports = async () => {
    try {
      setLoading(true)
      // TODO: Implement financial reports loading
      setReportData(null)
    } catch (err) {
      console.error('Failed to load financial reports:', err)
      setErrorModal({
        open: true,
        title: 'Failed to load financial reports',
        message: 'We could not generate the financial report.',
        details: err?.response?.data?.message || err.message || 'Unknown error'
      })
    } finally {
      setLoading(false)
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
            <div className="modern-table-container">
              <table className="modern-data-table">
                <thead>
                  <tr>
                    <th className="checkbox-column">
                      <input type="checkbox" className="select-all-checkbox" />
                    </th>
                    <th className="name-column">
                      <div className="column-header">
                        <span>NAME</span>
                        <span className="sort-icon">▼</span>
                      </div>
                    </th>
                    <th className="role-column">
                      <div className="column-header">
                        <span>ROLE</span>
                        <span className="sort-icon">▼</span>
                      </div>
                    </th>
                    <th className="status-column">
                      <div className="column-header">
                        <span>STATUS</span>
                        <span className="sort-icon">▼</span>
                      </div>
                    </th>
                    <th className="actions-column">
                      <div className="column-header">
                        <span>ACTIONS</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.id} className="user-row">
                      <td className="checkbox-column">
                        <input type="checkbox" className="user-checkbox" />
                      </td>
                      <td className="name-column">
                        <div className="user-info">
                          <div className="user-avatar">
                            {a.firstName?.charAt(0)}{a.lastName?.charAt(0)}
                          </div>
                          <div className="user-details">
                            <div className="user-name">{a.firstName} {a.lastName}</div>
                            <div className="user-email">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="role-column">
                        {editingUser === a.id ? (
                          <select className="role-select" value={a.role} onChange={(e) => handleRole(a.id, e.target.value)}>
                            {roles.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <span className={`role-badge ${a.role?.toLowerCase().replace(' ', '-')}`}>{a.role}</span>
                        )}
                      </td>
                      <td className="status-column">
                        {editingUser === a.id ? (
                          <select className="status-select" value={a.status} onChange={(e) => handleStatus(a.id, e.target.value)}>
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <div className={`status-indicator ${a.status?.toLowerCase()}`}>
                            <span className="status-dot"></span>
                            <span className="status-text">{a.status}</span>
                          </div>
                        )}
                      </td>
                      <td className="actions-column">
                        <div className="action-buttons">
                          {editingUser === a.id ? (
                            <>
                              <button 
                                className="btn-success" 
                                onClick={() => handleSaveUser(a.id)}
                                title="Save changes"
                              >
                                ✓ Save
                              </button>
                              <button 
                                className="btn-secondary" 
                                onClick={() => setEditingUser(null)}
                                title="Cancel editing"
                              >
                                ✕ Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                className="btn-primary" 
                                onClick={() => setEditingUser(a.id)}
                                title="Edit user"
                              >
                                ✏️ Edit
                              </button>
                              <button 
                                className="btn-danger" 
                                onClick={() => handleDeleteUser(a.id)}
                                title="Delete user"
                              >
                                🗑️ Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      case 'add-account':
        return <AddAccountPage />
      case 'admin-management':
        return (
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
      case 'navigation-control':
        return (
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
          <div className="dashboard-screen">
            <div className="dashboard-header-gradient">
              <div className="dash-container">
                <div className="dash-header-row">
                  <div>
                    <h1 className="dash-title">Super Admin Dashboard</h1>
                    <p className="dash-subtitle">Complete system control with all admin and head admin capabilities.</p>
                  </div>
                  <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
                    {refreshing ? '🔄' : '🔄'} Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="dash-container dash-content">
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
                <>
                  {/* 📊 Enhanced Stats Overview */}
                  <div className="enhanced-stats-grid">
                    <div className="enhanced-stat-card">
                      <div className="stat-icon-container">
                        <div className="stat-icon-bg">
                          <span className="stat-icon">👥</span>
                        </div>
                      </div>
                      <div className="stat-content">
                        <h3 className="stat-label">TOTAL TENANTS</h3>
                        <p className="stat-number">{stats.totalStudents}</p>
                      </div>
                    </div>

                    <div className="enhanced-stat-card">
                      <div className="stat-icon-container">
                        <div className="stat-icon-bg">
                          <span className="stat-icon">📊</span>
                        </div>
                      </div>
                      <div className="stat-content">
                        <h3 className="stat-label">OCCUPANCY RATE</h3>
                        <p className="stat-number">
                          {stats.totalRooms > 0
                            ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100)
                            : 0}%
                        </p>
                      </div>
                    </div>

                    <div className="enhanced-stat-card">
                      <div className="stat-icon-container">
                        <div className="stat-icon-bg">
                          <span className="stat-icon">⚠️</span>
                        </div>
                      </div>
                      <div className="stat-content">
                        <h3 className="stat-label">UNPAID BILLS</h3>
                        <p className="stat-number">{dashboardStats?.totalUnpaidBills || 0}</p>
                      </div>
                    </div>

                    <div className="enhanced-stat-card">
                      <div className="stat-icon-container">
                        <div className="stat-icon-bg">
                          <span className="stat-icon">💰</span>
                        </div>
                      </div>
                      <div className="stat-content">
                        <h3 className="stat-label">TOTAL COLLECTED</h3>
                        <p className="stat-number">
                          ₱{dashboardStats?.totalAmountCollected?.toLocaleString() || '0'}
                        </p>
                      </div>
                    </div>

                    <div className="enhanced-stat-card">
                      <div className="stat-icon-container">
                        <div className="stat-icon-bg">
                          <span className="stat-icon">🏠</span>
                        </div>
                      </div>
                      <div className="stat-content">
                        <h3 className="stat-label">TOTAL ROOMS</h3>
                        <p className="stat-number">{stats.totalRooms}</p>
                      </div>
                    </div>

                    <div className="enhanced-stat-card">
                      <div className="stat-icon-container">
                        <div className="stat-icon-bg">
                          <span className="stat-icon">👥</span>
                        </div>
                      </div>
                      <div className="stat-content">
                        <h3 className="stat-label">OCCUPIED ROOMS</h3>
                        <p className="stat-number">{stats.occupiedRooms}</p>
                      </div>
                    </div>

                    <div className="enhanced-stat-card">
                      <div className="stat-icon-container">
                        <div className="stat-icon-bg">
                          <span className="stat-icon">🔧</span>
                        </div>
                      </div>
                      <div className="stat-content">
                        <h3 className="stat-label">MAINTENANCE REQUESTS</h3>
                        <p className="stat-number">{stats.maintenanceRequests}</p>
                      </div>
                    </div>

                    <div className="enhanced-stat-card">
                      <div className="stat-icon-container">
                        <div className="stat-icon-bg">
                          <span className="stat-icon">📊</span>
                        </div>
                      </div>
                      <div className="stat-content">
                        <h3 className="stat-label">OUTSTANDING AMOUNT</h3>
                        <p className="stat-number">
                          ₱{dashboardStats?.totalOutstandingAmount?.toLocaleString() || '0'}
                        </p>
                      </div>
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
                                  <p className="item-amount">₱{payment.amount?.toLocaleString()}</p>
                                  <p className="item-date">{formatDate(payment.paymentDate)}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-list">
                              <p>No recent payments</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Top Outstanding Tenants Card */}
                      <div className="overview-card">
                        <h3 className="overview-title"><span>⚠️</span> Top Outstanding</h3>
                        <div className="overview-list">
                          {dashboardStats?.topOutstandingTenants?.length > 0 ? (
                            dashboardStats.topOutstandingTenants.slice(0, 3).map(tenant => (
                              <div key={tenant.id} className="list-item">
                                <div>
                                  <p className="item-name">{tenant.tenantName}</p>
                                  <p className="item-sub">Room {tenant.roomNumber}</p>
                                </div>
                                <div className="item-right">
                                  <p className="item-amount text-red">₱{tenant.outstandingAmount?.toLocaleString()}</p>
                                  <p className="item-date">{formatDate(tenant.dueDate)}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-list">
                              <p>No outstanding balances</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
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
              <h2>👥 Tenant Billing Overview</h2>
              <button className="refresh-btn" onClick={loadBillingData} disabled={billingLoading}>
                {billingLoading ? '🔄' : '🔄'} Refresh
              </button>
            </div>

            {/* Stats Summary */}
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

            <div className="billing-table-container" style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
              <div className="billing-table-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Tenant Billing Overview</h3>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    Manage payments and track balances for {getFilteredTenants(billingTenants, accountingSearchQuery, statusFilter, accountingSortBy, accountingSortOrder).length} tenants
                  </p>
                </div>
                <div>
                  <button
                    className="btn-primary"
                    onClick={() => console.log('Quick Pay clicked')}
                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                  >
                    <span>💳</span> Pay Bill
                  </button>
                </div>
              </div>

              {/* Enhanced Table Controls */}
              <div className="billing-table-controls" style={{ 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                borderBottom: '1px solid #e5e7eb', 
                display: 'flex', 
                gap: '2rem', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                borderRadius: '0.75rem 0.75rem 0 0'
              }}>
                {/* Search Bar */}
                <div className="search-section" style={{ flex: '1', minWidth: '300px' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '0.75rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: '#6b7280', 
                      fontSize: '1rem' 
                    }}>
                      🔍
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name, email, or room number..."
                      value={accountingSearchQuery}
                      onChange={(e) => setAccountingSearchQuery(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem 0.75rem 0.75rem 2.5rem', 
                        border: '2px solid #e5e7eb', 
                        borderRadius: '0.75rem', 
                        fontSize: '0.875rem',
                        background: 'white',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Status Filters */}
                <div className="status-section" style={{ display: 'flex', gap: '0.5rem' }}>
                  {getStatusFilterOptions().map(option => (
                    <button
                      key={option.id}
                      onClick={() => setStatusFilter(option.id)}
                      className={`enhanced-status-btn ${statusFilter === option.id ? 'active' : ''}`}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '2px solid transparent',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: statusFilter === option.id 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                          : 'white',
                        color: statusFilter === option.id ? 'white' : '#374151',
                        boxShadow: statusFilter === option.id 
                          ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
                          : '0 2px 4px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <div className="sort-section" style={{ minWidth: '200px' }}>
                  <select
                    value={`${accountingSortBy}-${accountingSortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-')
                      setAccountingSortBy(field)
                      setAccountingSortOrder(order)
                    }}
                    style={{ 
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem', 
                      border: '2px solid #e5e7eb', 
                      borderRadius: '0.75rem', 
                      fontSize: '0.875rem',
                      background: 'white',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1rem'
                    }}
                  >
                    {getSortOptions().map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table Content */}
              {billingTenants.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>No Tenants Found</h3>
                  <p style={{ margin: 0, color: '#6b7280' }}>No tenant billing information available.</p>
                </div>
              ) : (
                <div className="table-container">
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
                              onClick={() => console.log('Pay button clicked for tenant:', tenant.id)}
                              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                            >
                              💰 Pay
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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

            {/* Summary */}
            {pendingPayments.length > 0 && (
              <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {(() => {
                  const summary = getPendingPaymentsSummary(pendingPayments)
                  return (
                    <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>⏳</div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Total Pending</p>
                          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{summary.count} payments</p>
                          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#dc2626' }}>{formatCurrency(summary.totalAmount)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            <div className="billing-table-container" style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
              <div className="billing-table-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Pending Payments</h3>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    Review and confirm pending payment transactions
                  </p>
                </div>
              </div>

              {/* Table Content */}
              {pendingPayments.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>No Pending Payments</h3>
                  <p style={{ margin: 0, color: '#6b7280' }}>All payments have been processed.</p>
                </div>
              ) : (
                <div className="table-container">
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
                              onClick={() => console.log('Confirm payment:', payment.id)}
                              style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                            >
                              ✅ Confirm
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      case 'transaction-list':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>📋 Transaction List</h2>
              <button className="refresh-btn" onClick={loadTransactions} disabled={transactionLoading}>
                {transactionLoading ? '🔄' : '🔄'} Refresh
              </button>
            </div>
            
            <div className="filters-section">
              <div className="filter-group">
                <label>Date From:</label>
                <input
                  type="date"
                  value={transactionFilters.dateFrom}
                  onChange={(e) => setTransactionFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Date To:</label>
                <input
                  type="date"
                  value={transactionFilters.dateTo}
                  onChange={(e) => setTransactionFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Payment Method:</label>
                <select
                  value={transactionFilters.paymentMethod}
                  onChange={(e) => setTransactionFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  {getTransactionFilterOptions().map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" onClick={loadTransactions}>
                Apply Filters
              </button>
            </div>

            <div className="table-container">
              {transactionLoading ? (
                <div className="loading-state">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>No Transactions Found</h3>
                  <p style={{ margin: 0, color: '#6b7280' }}>No transactions match your current filter criteria.</p>
                </div>
              ) : (
                <table className="data-table">
                  <TableHeader headers={getTableHeaders('transaction-list')} />
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{new Date(transaction.createdAt).toLocaleDateString()}</td>
                        <td>{transaction.tenantName}</td>
                        <td>{formatCurrency(transaction.amount)}</td>
                        <td>{transaction.paymentMethod}</td>
                        <td>{transaction.reference}</td>
                        <td>{transaction.description}</td>
                        <td>
                          <button className="btn-action">Edit</button>
                          <button className="btn-action btn-danger">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      case 'financial-reports':
        return (
          <div className="content-section">
            <div className="section-header">
              <h2>📊 Financial Reports</h2>
              <p>Generate and view financial reports</p>
            </div>

            <div className="report-controls">
              <div className="filter-group">
                <label>Report Period:</label>
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                >
                  {getReportPeriodOptions().map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" onClick={loadFinancialReports}>
                Generate Report
              </button>
            </div>

            {reportData ? (
              <div className="report-content">
                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>💰</div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Total Revenue</p>
                        <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{formatCurrency(reportData.totalRevenue || 0)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📊</div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Total Transactions</p>
                        <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{reportData.totalTransactions || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '3rem', height: '3rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📈</div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Average Payment</p>
                        <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{formatCurrency(reportData.averagePayment || 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>No Reports Available</h3>
                <p style={{ margin: 0, color: '#6b7280' }}>Select a period and generate a report</p>
              </div>
            )}
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

            <div className="billing-table-container" style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
              <div className="billing-table-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Tenants with Outstanding Balances</h3>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    View and manage tenant outstanding balances
                  </p>
                </div>
              </div>

              {/* Enhanced Table Controls */}
              <div className="billing-table-controls" style={{ 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                borderBottom: '1px solid #e5e7eb', 
                display: 'flex', 
                gap: '2rem', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                borderRadius: '0.75rem 0.75rem 0 0'
              }}>
                {/* Search Bar */}
                <div className="search-section" style={{ flex: '1', minWidth: '300px' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '0.75rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: '#6b7280', 
                      fontSize: '1rem' 
                    }}>
                      🔍
                    </div>
                    <input
                      type="text"
                      placeholder="Search tenants..."
                      value={accountingSearchQuery}
                      onChange={(e) => setAccountingSearchQuery(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem 0.75rem 0.75rem 2.5rem', 
                        border: '2px solid #e5e7eb', 
                        borderRadius: '0.75rem', 
                        fontSize: '0.875rem',
                        background: 'white',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Status Filters */}
                <div className="status-section" style={{ display: 'flex', gap: '0.5rem' }}>
                  {getStatusFilterOptions().map(option => (
                    <button
                      key={option.id}
                      onClick={() => setStatusFilter(option.id)}
                      className={`enhanced-status-btn ${statusFilter === option.id ? 'active' : ''}`}
                      style={{
                        padding: '0.5rem 1rem',
                        border: '2px solid transparent',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: statusFilter === option.id 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                          : 'white',
                        color: statusFilter === option.id ? 'white' : '#374151',
                        boxShadow: statusFilter === option.id 
                          ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
                          : '0 2px 4px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <div className="sort-section" style={{ minWidth: '200px' }}>
                  <select
                    value={`${accountingSortBy}-${accountingSortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-')
                      setAccountingSortBy(field)
                      setAccountingSortOrder(order)
                    }}
                    style={{ 
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 1rem', 
                      border: '2px solid #e5e7eb', 
                      borderRadius: '0.75rem', 
                      fontSize: '0.875rem',
                      background: 'white',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1rem'
                    }}
                  >
                    {getSortOptions().map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table Content */}
              {(() => {
                const outstandingTenants = billingTenants.filter(tenant => tenant.currentBalance > 0)
                const filteredTenants = getFilteredTenants(outstandingTenants, accountingSearchQuery, statusFilter, accountingSortBy, accountingSortOrder)
                
                return filteredTenants.length === 0 ? (
                  <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>No Outstanding Balances</h3>
                    <p style={{ margin: 0, color: '#6b7280' }}>All tenants are up to date with their payments.</p>
                  </div>
                ) : (
                  <div className="table-container">
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
                                onClick={() => console.log('Pay button clicked for tenant:', tenant.id)}
                                style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                              >
                                💰 Pay Now
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
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

            <div className="billing-table-container" style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
              <div className="billing-table-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Select Tenant</h3>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    Choose a tenant to view their payment history
                  </p>
                </div>
              </div>

              {/* Tenant Selection */}
              <div className="billing-table-controls" style={{ 
                padding: '1.5rem', 
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                borderBottom: '1px solid #e5e7eb', 
                display: 'flex', 
                gap: '2rem', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                borderRadius: '0.75rem 0.75rem 0 0'
              }}>
                <div className="search-section" style={{ flex: '1', minWidth: '300px' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '0.75rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: '#6b7280', 
                      fontSize: '1rem' 
                    }}>
                      🔍
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name, room, or email..."
                      value={historySearchQuery}
                      onChange={(e) => {
                        setHistorySearchQuery(e.target.value)
                        setShowTenantDropdown(true)
                      }}
                      onFocus={() => setShowTenantDropdown(true)}
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem 0.75rem 0.75rem 2.5rem', 
                        border: '2px solid #e5e7eb', 
                        borderRadius: '0.75rem', 
                        fontSize: '0.875rem',
                        background: 'white',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
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
                          overflowY: 'auto',
                          marginTop: '0.5rem'
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
              </div>

              {/* Selected Tenant Details */}
              {selectedTenantForHistory ? (
                <div className="tenant-details">
                  <div className="billing-table-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>👤 Tenant Information</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
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
                  </div>

                  {/* Payment History Table */}
                  <div className="billing-table-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>📈 Payment History</h3>
                    </div>
                  </div>

                  {!selectedTenantForHistory.paymentHistory || selectedTenantForHistory.paymentHistory.length === 0 ? (
                    <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>No Payment History</h3>
                      <p style={{ margin: 0, color: '#6b7280' }}>No payment records found for this tenant.</p>
                    </div>
                  ) : (
                    <div className="table-container">
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
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Select a Tenant</h3>
                  <p style={{ margin: 0, color: '#6b7280' }}>Please select a tenant to view their payment history.</p>
                </div>
              )}
            </div>
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
  }, [activeTab, fetchArchivedTenants])

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

      {/* Admin Management Modal */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '1rem', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>👑 Create New Admin</h2>
              <button className="modal-close" onClick={() => setShowAdminModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <form onSubmit={handleCreateAdmin}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>First Name</label>
                    <input
                      type="text"
                      value={adminForm.firstName}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Last Name</label>
                    <input
                      type="text"
                      value={adminForm.lastName}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email</label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Password</label>
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowAdminModal(false)} style={{ padding: '0.75rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: 'white', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
                    Create Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Control Modal */}
      {showNavigationModal && selectedAdmin && (
        <div className="modal-overlay" onClick={() => setShowNavigationModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '1rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>🧭 Navigation Control - {selectedAdmin.firstName} {selectedAdmin.lastName}</h2>
              <button className="modal-close" onClick={() => setShowNavigationModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Navigation Permissions</h3>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Select which navigation items this admin can access:</p>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {[
                    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
                    { id: 'rooms', name: 'Rooms', icon: '🏠' },
                    { id: 'tenants', name: 'Tenants', icon: '👥' },
                    { id: 'accounting', name: 'Accounting', icon: '💰' },
                    { id: 'overdue_payments', name: 'Overdue Payments', icon: '⚠️' },
                    { id: 'pricing', name: 'Pricing', icon: '💵' },
                    { id: 'maintenance', name: 'Maintenance', icon: '🔧' },
                    { id: 'announcements', name: 'Announcements', icon: '📢' },
                    { id: 'archives', name: 'Archives', icon: '📦' },
                    { id: 'add_account', name: 'Add Account', icon: '👤' }
                  ].map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedNavigationItems.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNavigationItems(prev => [...prev, item.id])
                            } else {
                              setSelectedNavigationItems(prev => prev.filter(id => id !== item.id))
                            }
                          }}
                          style={{ marginRight: '0.5rem' }}
                        />
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Enable</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowNavigationModal(false)} style={{ padding: '0.75rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: 'white', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleUpdateNavigationPermissions} style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
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


