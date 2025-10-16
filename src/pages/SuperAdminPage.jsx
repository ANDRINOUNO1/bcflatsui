import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { superAdminService } from '../services/superAdminService'
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
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Tenant',
    status: 'Pending'
  })

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
      setShowAddAccount(false)
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
                  <button type="button" className="btn-secondary" onClick={() => setShowAddAccount(false)}>
                    Cancel
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
            <div className="logo">
              <span className="logo-icon">👑</span>
              <span className="logo-text">Super Admin Dashboard</span>
            </div>
          </div>
          <div className="profile-meta">
            <div className="email">{user?.email}</div>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <div className="superadmin-body">
        <main className="superadmin-main-content">
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
                        setActiveTab(item.id)
                        setSidebarOpen(false)
                      }}
                    />
                  ))}
                </SidebarSection>
              ))}
            </nav>
          </aside>
          {renderContent()}
        </main>
      </div>
    </div>
  )
}


