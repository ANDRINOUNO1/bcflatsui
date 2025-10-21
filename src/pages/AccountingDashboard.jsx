import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { notificationService } from '../services/notificationService'
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
import '../components/AccountingDashboard.css'

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

// Reusable Components
const StatsCard = ({ icon, color, label, value }) => (
  <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: '3rem', height: '3rem', background: color, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>{label}</p>
        <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{value}</p>
      </div>
    </div>
  </div>
)

const StatsGrid = ({ stats }) => (
  <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
    {stats.map((stat, index) => (
      <StatsCard key={index} {...stat} />
    ))}
  </div>
)

const EmptyState = ({ type }) => {
  const config = getEmptyStateConfig(type)
  return (
    <div className="empty-state">
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{config.icon}</div>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>{config.title}</h3>
      <p style={{ margin: 0, color: '#6b7280' }}>{config.message}</p>
    </div>
  )
}

const TableHeader = ({ headers }) => (
  <thead>
    <tr>
      {headers.map((header, index) => (
        <th key={index} style={header.style}>{header.label}</th>
      ))}
    </tr>
  </thead>
)

const StatusFilterButtons = ({ options, activeFilter, onFilterChange }) => (
  <div style={{ display: 'flex', gap: '0.5rem' }}>
    {options.map(tab => (
      <button
        key={tab.id}
        onClick={() => onFilterChange(tab.id)}
        className={`enhanced-status-btn ${activeFilter === tab.id ? 'active' : ''}`}
        style={{
          padding: '0.5rem 1rem',
          border: '2px solid transparent',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          background: activeFilter === tab.id 
            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
            : 'white',
          color: activeFilter === tab.id ? 'white' : '#374151',
          boxShadow: activeFilter === tab.id 
            ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
            : '0 2px 4px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          whiteSpace: 'nowrap'
        }}
      >
        <span>{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    ))}
  </div>
)

const SortDropdown = ({ options, value, onChange }) => (
  <select
    className="enhanced-sort-select"
    value={value}
    onChange={(e) => onChange(e.target.value)}
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
    {options.map(option => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
)

export default function AccountingDashboard() {
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('tenant-billing')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  
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
  
  // Payment Collection state
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [newPayment, setNewPayment] = useState({
    amount: '',
    paymentMethod: 'Cash',
    reference: '',
    description: ''
  })
  
  // Financial Reports state
  const [reportPeriod, setReportPeriod] = useState('monthly')
  const [reportData, setReportData] = useState(null)
  
  // Payment History state
  const [paymentHistory, setPaymentHistory] = useState([])
  const [selectedTenantHistory, setSelectedTenantHistory] = useState(null)
  const [paymentHistorySearch, setPaymentHistorySearch] = useState('')
  const [showPaymentHistoryDropdown, setShowPaymentHistoryDropdown] = useState(false)

  // Tenant Billing state (from old AccountingPage)
  const [billingTenants, setBillingTenants] = useState([])
  const [billingStats, setBillingStats] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [balanceFilter, setBalanceFilter] = useState('all')
  const [sortKey, setSortKey] = useState('balanceDesc')

  // Pending Payments state
  const [pendingPayments, setPendingPayments] = useState([])
  const [confirming, setConfirming] = useState({})

  // Quick Pay modal state
  const [showQuickPay, setShowQuickPay] = useState(false)
  const [quickPaySearch, setQuickPaySearch] = useState('')
  const [quickPayTenant, setQuickPayTenant] = useState(null)
  const [quickPay, setQuickPay] = useState({
    amount: '',
    paymentMethod: 'Cash',
    description: ''
  })

  // Error modal state
  const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '', details: '' })

  const navigationItems = [
    {
      id: 'tenant-billing',
      label: 'Tenant Billing',
      icon: '👥',
      section: 'Financial Management'
    },
    {
      id: 'pending-payments',
      label: 'Pending Payments',
      icon: '⏳',
      section: 'Financial Management'
    },
    {
      id: 'transaction-list',
      label: 'Transaction List',
      icon: '📋',
      section: 'Financial Management'
    },
    {
      id: 'financial-reports',
      label: 'Financial Reports',
      icon: '📊',
      section: 'Financial Management'
    },
    {
      id: 'outstanding-balances',
      label: 'Outstanding Balances',
      icon: '⚠️',
      section: 'Financial Management'
    },
    {
      id: 'payment-history',
      label: 'Payment History',
      icon: '📈',
      section: 'Financial Management'
    }
  ]

  // Group navigation items by section
  const groupedNavItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = []
    }
    acc[item.section].push(item)
    return acc
  }, {})

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
      } catch (e) {
        console.warn('Failed to fetch notifications', e)
      }
    }
    loadNotifs()
    id = setInterval(loadNotifs, 15000)
    return () => id && clearInterval(id)
  }, [])

  // Load data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case 'tenant-billing':
        fetchTenantsWithBillingInfo(setLoading, setBillingTenants, setErrorModal)
        fetchPaymentStats(setBillingStats, setErrorModal)
        break
      case 'pending-payments':
        fetchPendingPayments(setPendingPayments, setErrorModal)
        break
      case 'transaction-list':
        loadTransactions()
        break
      case 'financial-reports':
        loadFinancialReports()
        break
      case 'outstanding-balances':
        fetchTenantsWithBillingInfo(setLoading, setBillingTenants, setErrorModal)
        fetchPaymentStats(setBillingStats, setErrorModal)
        break
      case 'payment-history':
        fetchTenantsWithBillingInfo(setLoading, setBillingTenants, setErrorModal)
        break
    }
  }, [activeTab])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPaymentHistoryDropdown && !event.target.closest('.payment-history-dropdown')) {
        setShowPaymentHistoryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPaymentHistoryDropdown])

  const loadTransactions = async () => {
    try {
      setTransactionLoading(true)
      // TODO: Implement transaction loading
      setTransactions([])
    } catch (err) {
      console.error('Failed to load transactions:', err)
      setError('Failed to load transactions')
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
      setError('Failed to load financial reports')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
  }

  // Tenant Billing handlers
  const handlePayButtonClickWrapper = async (tenant) => {
    await handlePayButtonClick(tenant, setSelectedTenant, setShowPaymentForm, setPaymentHistory)
  }

  const handlePaymentSubmitWrapper = async (e) => {
    await handlePaymentSubmit(e, selectedTenant, newPayment, setNewPayment, setShowPaymentForm, setSelectedTenant, setPaymentHistory, setErrorModal)
  }

  const handleConfirmPaymentWrapper = async (paymentId) => {
    await handleConfirmPayment(paymentId, setConfirming, setPendingPayments, 
      () => fetchTenantsWithBillingInfo(setLoading, setBillingTenants, setErrorModal),
      () => fetchPaymentStats(setBillingStats, setErrorModal),
      setErrorModal
    )
  }

  const handleQuickPaySubmitWrapper = async (e) => {
    await handleQuickPaySubmit(e, quickPayTenant, quickPay, setQuickPay, setShowQuickPay, setQuickPayTenant, setQuickPaySearch, setErrorModal)
  }

  // Derived view of tenants for UI (search, filter, sort)
  const filteredTenants = getFilteredTenants(billingTenants, searchQuery, balanceFilter, sortKey)

  const renderContent = () => {
    switch (activeTab) {
      case 'tenant-billing':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>👥 Tenant Billing Overview</h2>
              <button className="refresh-btn" onClick={() => {
                fetchTenantsWithBillingInfo(setLoading, setBillingTenants, setErrorModal)
                fetchPaymentStats(setBillingStats, setErrorModal)
              }} disabled={loading}>
                {loading ? '🔄' : '🔄'} Refresh
              </button>
            </div>

            {/* Stats Summary */}
            {billingStats && <StatsGrid stats={getStatsCards(billingStats, billingTenants)} />}

            <div className="billing-table-container" style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
              <div className="billing-table-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Tenant Billing Overview</h3>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    Manage payments and track balances for {filteredTenants.length} tenants
                  </p>
                </div>
                <div>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setShowQuickPay(true)
                      setQuickPaySearch('')
                      setQuickPayTenant(null)
                      setQuickPay({ amount: '', paymentMethod: 'Cash', description: '' })
                    }}
                    style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                  >
                    <span>💳</span> Pay Bill
                  </button>
                </div>
              </div>

              {/* Enhanced Table Controls: Search (Left), Status (Middle), Sort (Right) */}
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
                {/* Search Bar - Left */}
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
                      className="enhanced-search-input"
                      type="text"
                      placeholder="Search by name, email, or room number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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

                {/* Status Filter - Middle */}
                <div className="status-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 600, 
                    color: '#374151',
                    whiteSpace: 'nowrap'
                  }}>
                    Status:
                  </label>
                  <StatusFilterButtons 
                    options={getStatusFilterOptions()} 
                    activeFilter={balanceFilter} 
                    onFilterChange={setBalanceFilter} 
                  />
                </div>

                {/* Sort Dropdown - Right */}
                <div className="sort-section" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
                  <label style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 600, 
                    color: '#374151',
                    whiteSpace: 'nowrap'
                  }}>
                    Sort by:
                  </label>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <SortDropdown 
                      options={getSortOptions()} 
                      value={sortKey} 
                      onChange={setSortKey} 
                    />
                  </div>
                </div>
              </div>
              
              {/* Summary Bar */}
              <div className="billing-table-summary" style={{ padding: '0.75rem 1.5rem', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <div>
                  Showing <strong>{getSummaryData(filteredTenants, billingTenants).showing}</strong> of <strong>{getSummaryData(filteredTenants, billingTenants).total}</strong> tenants
                </div>
                <div>
                  Total Outstanding: <span style={{ color: '#dc2626', fontWeight: 600 }}>{formatCurrency(getSummaryData(filteredTenants, billingTenants).totalOutstanding)}</span>
                </div>
              </div>
              
              <div className="table-wrapper" style={{ padding: '1.5rem' }}>
                {filteredTenants.length === 0 ? (
                  <EmptyState type="no-tenants" />
                ) : (
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                    <TableHeader headers={getTableHeaders('tenant-billing')} />
                    <tbody>
                      {filteredTenants.map((tenant) => {
                        const dueDateStatus = getDueDateStatus(tenant.nextDueDate)
                        
                        return (
                          <tr key={tenant.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              <div style={{ fontWeight: 600 }}>{tenant.name}</div>
                              <div>{tenant.email}</div>
                            </td>
                            <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              <div style={{ fontWeight: 600 }}>Room {tenant.roomNumber}</div>
                              <div>Floor {tenant.floor}</div>
                            </td>
                            <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              <div style={{ fontWeight: 600 }}>{formatCurrency(tenant.monthlyRent)}</div>
                              <div>+ {formatCurrency(tenant.utilities)} utilities</div>
                            </td>
                            <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              {parseFloat(tenant.outstandingBalance) > 0 ? (
                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                  {formatCurrency(tenant.outstandingBalance)}
                                </span>
                              ) : (
                                <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                  Paid
                                </span>
                              )}
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
                            <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              <button
                                className="btn-action btn-action--primary"
                                onClick={() => handlePayButtonClickWrapper(tenant)}
                                style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <span>💳</span>
                                <span>Pay</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )

      case 'pending-payments':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>⏳ Pending Payment Confirmations</h2>
              <button className="refresh-btn" onClick={() => fetchPendingPayments(setPendingPayments, setErrorModal)} disabled={loading}>
                {loading ? '🔄' : '🔄'} Refresh
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                Review and confirm payments submitted by tenants
              </p>

              {pendingPayments.length === 0 ? (
                <EmptyState type="no-pending-payments" />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {pendingPayments.map((payment) => (
                    <div key={payment.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
                      <div style={{ padding: '1rem', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                          {formatCurrency(payment.amount)}
                        </div>
                        <div style={{ background: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          {payment.paymentMethod}
                        </div>
                      </div>

                      <div style={{ padding: '1rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Tenant:</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{payment.tenant.name}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Room:</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                              {payment.tenant.roomNumber} - {payment.tenant.floor}{payment.tenant.floor === 1 ? 'st' : payment.tenant.floor === 2 ? 'nd' : payment.tenant.floor === 3 ? 'rd' : 'th'} Floor
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Email:</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{payment.tenant.email}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Current Balance:</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#dc2626' }}>
                              {formatCurrency(payment.balanceBefore)}
                            </span>
                          </div>
                          {payment.reference && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Reference:</span>
                              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{payment.reference}</span>
                            </div>
                          )}
                          {payment.description && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Description:</span>
                              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{payment.description}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Submitted:</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{formatDate(payment.createdAt)}</span>
                          </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                          <button
                            style={{ 
                              background: '#10b981', 
                              color: 'white', 
                              border: 'none', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '0.375rem', 
                              fontSize: '0.875rem', 
                              fontWeight: 500, 
                              cursor: 'pointer', 
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                            onClick={() => handleConfirmPaymentWrapper(payment.id)}
                            disabled={confirming[payment.id]}
                          >
                            {confirming[payment.id] ? (
                              <>
                                <div style={{ width: '1rem', height: '1rem', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                Confirming...
                              </>
                            ) : (
                              <>
                                <span>✅</span>
                                Confirm Payment
                              </>
                            )}
                          </button>
                        </div>

                        <div style={{ padding: '0.75rem', background: '#f3f4f6', borderRadius: '0.375rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Balance After Payment:</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                              {formatCurrency(payment.balanceBefore - payment.amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>Summary</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Pending Payments:</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginLeft: '0.5rem' }}>{getPendingPaymentsSummary(pendingPayments).count}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Amount:</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginLeft: '0.5rem' }}>
                      {formatCurrency(getPendingPaymentsSummary(pendingPayments).totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
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
                <EmptyState type="no-transactions" />
              ) : (
                <table className="data-table">
                  <TableHeader headers={getTableHeaders('transaction-list')} />
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{new Date(transaction.createdAt).toLocaleDateString()}</td>
                        <td>{transaction.tenantName}</td>
                        <td>₱{transaction.amount.toLocaleString()}</td>
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
                <StatsGrid stats={[
                  { icon: '💰', color: '#10b981', label: 'Total Revenue', value: formatCurrency(reportData.totalRevenue || 0) },
                  { icon: '📊', color: '#3b82f6', label: 'Total Transactions', value: reportData.totalTransactions || 0 },
                  { icon: '📈', color: '#8b5cf6', label: 'Average Payment', value: formatCurrency(reportData.averagePayment || 0) }
                ]} />
              </div>
            ) : (
              <EmptyState type="no-reports" />
            )}
          </div>
        )

      case 'outstanding-balances':
        return (
          <div className="content-section">
            <div className="content-header">
              <h2>⚠️ Outstanding Balances</h2>
              <button className="refresh-btn" onClick={() => {
                fetchTenantsWithBillingInfo(setLoading, setBillingTenants, setErrorModal)
                fetchPaymentStats(setBillingStats, setErrorModal)
              }} disabled={loading}>
                {loading ? '🔄' : '🔄'} Refresh
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                View and manage outstanding tenant balances
              </p>

              {(() => {
                const { tenantsWithBalances, totalOutstanding, stats } = getOutstandingStats(billingTenants)

                return (
                  <>
                    {/* Summary Stats */}
                    <StatsGrid stats={stats} />

                    {/* Tenants List */}
                    {tenantsWithBalances.length === 0 ? (
                      <EmptyState type="no-outstanding-balances" />
                    ) : (
                      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Tenants with Outstanding Balances</h3>
                          <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                            {tenantsWithBalances.length} tenants with outstanding balances totaling {formatCurrency(totalOutstanding)}
                          </p>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                          <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                            <TableHeader headers={getTableHeaders('outstanding-balances')} />
                            <tbody>
                              {tenantsWithBalances.map((tenant) => {
                                const dueDateStatus = getDueDateStatus(tenant.nextDueDate)
                                
                                return (
                                  <tr key={tenant.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                                      <div style={{ fontWeight: 600 }}>{tenant.name}</div>
                                      <div>{tenant.email}</div>
                                    </td>
                                    <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                                      <div style={{ fontWeight: 600 }}>Room {tenant.roomNumber}</div>
                                      <div>Floor {tenant.floor}</div>
                                    </td>
                                    <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                                      <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                        {formatCurrency(tenant.outstandingBalance)}
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
                                    <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                                      <button
                                        style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                        onClick={() => handlePayButtonClickWrapper(tenant)}
                                      >
                                        <span>💳</span>
                                        <span>Pay</span>
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
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
              <button className="refresh-btn" onClick={() => {
                fetchTenantsWithBillingInfo(setLoading, setBillingTenants, setErrorModal)
                if (selectedTenantHistory) {
                  // TODO: Load payment history for selected tenant
                }
              }} disabled={loading}>
                {loading ? '🔄' : '🔄'} Refresh
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                View detailed payment history by tenant
              </p>

              {/* Tenant Selector with Search */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Select Tenant:
                </label>
                
                <div className="payment-history-dropdown" style={{ position: 'relative', maxWidth: '400px' }}>
                  <div 
                    style={{ 
                      position: 'relative',
                      background: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowPaymentHistoryDropdown(!showPaymentHistoryDropdown)}
                  >
                    <input
                      type="text"
                      placeholder="Search by name, room, or email..."
                      value={paymentHistorySearch}
                      onChange={(e) => setPaymentHistorySearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none',
                        background: 'transparent'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowPaymentHistoryDropdown(true)
                      }}
                    />
                    <div style={{ 
                      position: 'absolute', 
                      right: '0.75rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: '#6b7280',
                      fontSize: '0.875rem'
                    }}>
                      {showPaymentHistoryDropdown ? '▲' : '▼'}
                    </div>
                  </div>

                  {showPaymentHistoryDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #d1d5db',
                      borderTop: 'none',
                      borderRadius: '0 0 0.5rem 0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      zIndex: 50,
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {getPaymentHistoryFilteredTenants(billingTenants, paymentHistorySearch).map((tenant) => (
                          <div
                            key={tenant.id}
                            style={{
                              padding: '0.75rem 1rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              fontSize: '0.875rem'
                            }}
                            onClick={() => {
                              setSelectedTenantHistory(tenant)
                              setPaymentHistorySearch(`${tenant.name} - Room ${tenant.roomNumber}`)
                              setShowPaymentHistoryDropdown(false)
                              // TODO: Load payment history for this tenant
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                          >
                            <div style={{ fontWeight: 600, color: '#111827' }}>{tenant.name}</div>
                            <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                              Room {tenant.roomNumber} - Floor {tenant.floor} • {tenant.email}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                              Balance: {formatCurrency(tenant.outstandingBalance || 0)}
                            </div>
                          </div>
                        ))}
                      
                      {billingTenants.filter(tenant => 
                        !paymentHistorySearch || 
                        tenant.name.toLowerCase().includes(paymentHistorySearch.toLowerCase()) ||
                        tenant.email.toLowerCase().includes(paymentHistorySearch.toLowerCase()) ||
                        tenant.roomNumber.toString().includes(paymentHistorySearch)
                      ).length === 0 && (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                          No tenants found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Tenant Info */}
              {selectedTenantHistory && (
                <div style={{ 
                  background: 'white', 
                  padding: '1.5rem', 
                  borderRadius: '0.5rem', 
                  border: '1px solid #e5e7eb',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                    {selectedTenantHistory.name}
                  </h3>
                  <p style={{ margin: '0 0 0.25rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    Room {selectedTenantHistory.roomNumber} - Floor {selectedTenantHistory.floor}
                  </p>
                  <p style={{ margin: '0 0 0.25rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    Email: {selectedTenantHistory.email}
                  </p>
                  <p style={{ margin: 0, color: '#dc2626', fontSize: '0.875rem', fontWeight: 600 }}>
                    Current Balance: {formatCurrency(selectedTenantHistory.outstandingBalance || 0)}
                  </p>
                </div>
              )}

              {/* Payment History Table */}
              <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Payment History</h3>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    {selectedTenantHistory ? `Payment history for ${selectedTenantHistory.name}` : 'Select a tenant to view payment history'}
                  </p>
                </div>

                <div style={{ padding: '1.5rem' }}>
                  {!selectedTenantHistory ? (
                    <EmptyState type="select-tenant" />
                  ) : paymentHistory.length === 0 ? (
                    <EmptyState type="no-payment-history" />
                  ) : (
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'white', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                      <TableHeader headers={getTableHeaders('payment-history')} />
                      <tbody>
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              {formatDate(payment.createdAt)}
                            </td>
                            <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              <span style={{ background: '#dcfce7', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                {formatCurrency(payment.amount)}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              {payment.paymentMethod}
                            </td>
                            <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              {payment.reference || '-'}
                            </td>
                            <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              {payment.description || '-'}
                            </td>
                            <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                              {formatCurrency(payment.balanceAfter || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="content-section">
            <div className="welcome-message">
              <h2>Welcome to Accounting Dashboard</h2>
              <p>Select a section from the sidebar to get started</p>
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
          <p className="loading-text">Loading accounting dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="accounting-layout">
      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button className="error-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Header */}
      <header className="accounting-header">
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
              <span className="logo-text">Accounting Dashboard</span>
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

      <div className={`accounting-body ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
        
        {/* Sidebar */}
        <aside className={`accounting-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {Object.entries(groupedNavItems).map(([sectionTitle, items]) => (
              <SidebarSection key={sectionTitle} title={sectionTitle}>
                {items.map((item) => (
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

        {/* Main Content */}
        <main className="accounting-main-content">
          {renderContent()}
        </main>
      </div>

      {/* Error Modal */}
      {errorModal.open && (
        <div className="modal-overlay" onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '1rem', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'hidden' }}>
            <div className="error-modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>{errorModal.title || 'Something went wrong'}</h3>
              </div>
              <button 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
                onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}
              >
                ×
              </button>
            </div>
            <div className="error-modal-body" style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1rem 0', color: '#374151' }}>{errorModal.message}</p>
              {errorModal.details && (
                <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  {errorModal.details}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button 
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
                  onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowPaymentForm(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="modal payment-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '1rem', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>Record Payment - {selectedTenant.name}</h3>
              <button 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
                onClick={() => setShowPaymentForm(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Tenant Info */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>Tenant Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Name:</span>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{selectedTenant.name}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Room:</span>
                    <div style={{ fontWeight: 500, color: '#111827' }}>Room {selectedTenant.roomNumber}, Floor {selectedTenant.floor}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Monthly Rent:</span>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{formatCurrency(selectedTenant.monthlyRent)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Current Outstanding Balance:</span>
                    <div style={{ fontWeight: 500, color: '#dc2626' }}>
                      {formatCurrency(selectedTenant.outstandingBalance)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <form onSubmit={handlePaymentSubmitWrapper} style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>Payment Details</h4>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="amount" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Payment Amount (₱):</label>
                  <input
                    type="number"
                    id="amount"
                    step="0.01"
                    min={selectedTenant.outstandingBalance > 0 ? 0.01 : 0}
                    max={selectedTenant.outstandingBalance > 0 ? toNumber(selectedTenant.outstandingBalance) : undefined}
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                    placeholder="Enter payment amount"
                    required
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  />
                  <small style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    {selectedTenant.outstandingBalance > 0 ? (
                      <>Maximum: {formatCurrency(selectedTenant.outstandingBalance)}</>
                    ) : (
                      <>This tenant currently has no outstanding balance</>
                    )}
                  </small>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="paymentMethod" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Payment Method:</label>
                  <select
                    id="paymentMethod"
                    value={newPayment.paymentMethod}
                    onChange={(e) => setNewPayment({...newPayment, paymentMethod: e.target.value})}
                    required
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  >
                    {getPaymentMethodOptions().map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="reference" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Reference/Transaction ID:</label>
                  <input
                    type="text"
                    id="reference"
                    value={newPayment.reference}
                    onChange={(e) => setNewPayment({...newPayment, reference: e.target.value})}
                    placeholder="Optional: Transaction reference or check number"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="description" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Description/Notes:</label>
                  <textarea
                    id="description"
                    value={newPayment.description}
                    onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
                    placeholder="Optional: Payment description or notes"
                    rows="3"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowPaymentForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                    💳 Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Quick Pay Modal */}
      {showQuickPay && (
        <div className="modal-overlay" onClick={() => setShowQuickPay(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="modal payment-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '1rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>Pay Bill</h3>
              <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }} onClick={() => setShowQuickPay(false)}>×</button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Searchable Tenant Dropdown */}
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="tenantSearch" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Select Tenant:</label>
                <input
                  id="tenantSearch"
                  type="text"
                  placeholder="Type to search tenant by name or email"
                  value={quickPaySearch}
                  onChange={(e) => setQuickPaySearch(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                />
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '0.375rem', marginTop: '0.5rem' }}>
                  {billingTenants
                    .filter(t => {
                      const q = quickPaySearch.trim().toLowerCase()
                      if (!q) return true
                      return (
                        (t.name || '').toLowerCase().includes(q) ||
                        (t.email || '').toLowerCase().includes(q)
                      )
                    })
                    .slice(0, 50)
                    .map(t => (
                      <div
                        key={t.id}
                        style={{ 
                          padding: '0.5rem 0.75rem', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          background: quickPayTenant?.id === t.id ? '#eff6ff' : 'white',
                          borderBottom: '1px solid #f3f4f6'
                        }}
                        onClick={() => {
                          setQuickPayTenant(t)
                          const outstanding = parseFloat(t.outstandingBalance || 0)
                          setQuickPay(prev => ({ ...prev, amount: outstanding > 0 ? String(outstanding) : '' }))
                        }}
                      >
                        <span>
                          {t.name}
                          <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>{t.email}</span>
                        </span>
                        <span style={{ color: '#374151' }}>{formatCurrency(t.outstandingBalance || 0)}</span>
                      </div>
                    ))}
                  {billingTenants.length === 0 && (
                    <div style={{ padding: '0.5rem 0.75rem', color: '#6b7280' }}>No tenants found</div>
                  )}
                </div>
              </div>

              {/* Selected Tenant Summary */}
              {quickPayTenant && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>Tenant</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Name:</span>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{quickPayTenant.name}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Outstanding:</span>
                      <div style={{ fontWeight: 500, color: '#dc2626' }}>{formatCurrency(quickPayTenant.outstandingBalance || 0)}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Monthly:</span>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{formatCurrency((quickPayTenant.monthlyRent || 0) + (quickPayTenant.utilities || 0))}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Inputs */}
              <form onSubmit={handleQuickPaySubmitWrapper}>
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="qpAmount" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Payment Amount (₱):</label>
                  <input
                    id="qpAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quickPay.amount}
                    onChange={(e) => setQuickPay({ ...quickPay, amount: e.target.value })}
                    placeholder="Enter payment amount"
                    required
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="qpMethod" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Payment Method:</label>
                  <select
                    id="qpMethod"
                    value={quickPay.paymentMethod}
                    onChange={(e) => setQuickPay({ ...quickPay, paymentMethod: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                  >
                    {getQuickPayMethodOptions().map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="qpNotes" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Notes (optional):</label>
                  <textarea
                    id="qpNotes"
                    rows="3"
                    value={quickPay.description}
                    onChange={(e) => setQuickPay({ ...quickPay, description: e.target.value })}
                    placeholder="Optional notes about this payment"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" style={{ background: '#6b7280', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowQuickPay(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                    ✅ Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
