import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { notificationService } from '../services/notificationService'
import { superAdminService } from '../services/superAdminService'
import { archivedTenantService } from '../services/archivedTenantService'
import '../components/SuperAdmin.css'

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
  const [announcementRoles, setAnnouncementRoles] = useState(['Admin', 'SuperAdmin', 'Accounting', 'Tenant'])
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false)

  const statuses = useMemo(() => ['Active', 'Pending', 'Suspended', 'Deleted', 'Rejected'], [])
  const roles = useMemo(() => ['Admin', 'SuperAdmin', 'Accounting', 'Tenant'], [])

  const navigationItems = [
    {
      id: 'pending-accounts',
      label: 'Pending Accounts',
      icon: '⏳',
      section: 'Admin Services'
    },
    {
      id: 'user-management',
      label: 'User Management',
      icon: '👥',
      section: 'Admin Services'
    },
    {
      id: 'archived-tenants',
      label: 'Archived Tenants',
      icon: '📦',
      section: 'Admin Services'
    },
    {
      id: 'reservations',
      label: 'Reservations',
      icon: '📅',
      section: 'Admin Services'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '📊',
      section: 'Admin Services'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      section: 'Admin Services'
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: '💳',
      section: 'Accounting Services'
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: '💰',
      section: 'Accounting Services'
    },
    {
      id: 'revenue-reports',
      label: 'Revenue Reports',
      icon: '📈',
      section: 'Accounting Services'
    },
    {
      id: 'unpaid-tenants',
      label: 'Unpaid Tenants',
      icon: '⚠️',
      section: 'Accounting Services'
    },
    {
      id: 'add-account',
      label: 'Add Account',
      icon: '➕',
      section: 'Admin Services'
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: '📢',
      section: 'Admin Services'
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
      setAnnouncementRoles(['Admin', 'SuperAdmin', 'Accounting', 'Tenant'])
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
              <h2>📢 System Announcements</h2>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="form-container">
              <form onSubmit={handleSendAnnouncement} className="account-form">
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
                  <p style={{ margin: 0, color: '#0c4a6e', fontSize: '0.875rem' }}>
                    <strong>📢 Broadcast Announcement:</strong> Send important messages to all users or specific roles across the system.
                  </p>
                </div>
                
                <div className="form-group">
                  <label htmlFor="announcementTitle">Announcement Title</label>
                  <input
                    type="text"
                    id="announcementTitle"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    required
                    className="form-input"
                    placeholder="Enter announcement title..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="announcementMessage">Message</label>
                  <textarea
                    id="announcementMessage"
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    required
                    className="form-input"
                    rows="6"
                    placeholder="Enter your announcement message..."
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div className="form-group">
                  <label>Target Recipients</label>
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
                    Clear
                  </button>
                </div>
              </form>
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
            <div style={{ position: 'relative', marginRight: 12 }}>
              <button className="refresh-btn" onClick={() => setShowNotif(p => !p)} aria-label="Notifications">🔔{unread > 0 && <span className="pending-badge">{unread}</span>}</button>
              {showNotif && (
                <div style={{ position: 'absolute', right: 0, top: '100%', width: 380, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 20 }}>
                  <div style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 700 }}>Notifications</div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 12, color: '#777' }}>No notifications</div>
                    ) : notifications.map(n => (
                      <div key={n.id} style={{ padding: 12, borderBottom: '1px solid #f0f0f0', background: n.isRead ? '#fff' : '#f9fbff' }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.title}</div>
                        <div style={{ fontSize: 13, color: '#444' }}>{n.message}</div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="email">{user?.email}</div>
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


