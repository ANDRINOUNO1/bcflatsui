import React, { useState, useEffect } from 'react';
import '../components/AccountingPage.css';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';
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
    getDueDateStatus
} from '../functions/accounting';


const AccountingPage = () => {
    const { logout } = useAuth()
    const [notifications, setNotifications] = useState([])
    const [unread, setUnread] = useState(0)
    const [showNotif, setShowNotif] = useState(false)
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [stats, setStats] = useState(null);
    const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '', details: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [balanceFilter, setBalanceFilter] = useState('all'); // all | withBalance | zero
    const [sortKey, setSortKey] = useState('balanceDesc'); // balanceDesc | balanceAsc | name | room
    const [newPayment, setNewPayment] = useState({
        amount: '',
        paymentMethod: 'Cash',
        reference: '',
        description: ''
    });

    // Pending payments state
    const [pendingPayments, setPendingPayments] = useState([]);
    const [confirming, setConfirming] = useState({});
    const [activeTab, setActiveTab] = useState('overview'); // overview | pending

    // Quick Pay modal state
    const [showQuickPay, setShowQuickPay] = useState(false);
    const [quickPaySearch, setQuickPaySearch] = useState('');
    const [quickPayTenant, setQuickPayTenant] = useState(null);
    const [quickPay, setQuickPay] = useState({
        amount: '',
        paymentMethod: 'Cash',
        description: ''
    });

    useEffect(() => {
        fetchTenantsWithBillingInfo(setLoading, setTenants, setErrorModal);
        fetchPaymentStats(setStats, setErrorModal);
        fetchPendingPayments(setPendingPayments, setErrorModal);
    }, []);

    useEffect(() => {
        let id
        const loadNotifs = async () => {
            try {
                const data = await notificationService.fetchMyNotifications(25)
                setNotifications(data)
                setUnread((data || []).filter(n => !n.isRead).length)
            } catch (e) {
                console.warn('Failed to fetch notifications', e)
            }
        }
        loadNotifs()
        id = setInterval(loadNotifs, 15000)
        return () => id && clearInterval(id)
    }, [])

    // Derived view of tenants for UI (search, filter, sort)
    const filteredTenants = getFilteredTenants(tenants, searchQuery, balanceFilter, sortKey);
    const totalOutstanding = filteredTenants.reduce((sum, t) => sum + parseFloat(t.outstandingBalance || 0), 0);

    const handlePayButtonClickWrapper = async (tenant) => {
        await handlePayButtonClick(tenant, setSelectedTenant, setShowPaymentForm, setPaymentHistory);
    };

    const handlePaymentSubmitWrapper = async (e) => {
        await handlePaymentSubmit(e, selectedTenant, newPayment, setNewPayment, setShowPaymentForm, setSelectedTenant, setPaymentHistory, setErrorModal);
    };

    const handleConfirmPaymentWrapper = async (paymentId) => {
        await handleConfirmPayment(paymentId, setConfirming, setPendingPayments, 
            () => fetchTenantsWithBillingInfo(setLoading, setTenants, setErrorModal),
            () => fetchPaymentStats(setStats, setErrorModal),
            setErrorModal
        );
    };

    const handleQuickPaySubmitWrapper = async (e) => {
        await handleQuickPaySubmit(e, quickPayTenant, quickPay, setQuickPay, setShowQuickPay, setQuickPayTenant, setQuickPaySearch, setErrorModal);
    };

    const handleLogout = () => {
        logout();
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-content">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading accounting data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="accounting-page">
            {/* Top Navigation Bar */}
            <div className="top-nav-bar">
                <div className="top-nav-content">
                    <div className="nav-left">
                        <div className="nav-icon">🏢</div>
                        <span className="nav-title">Admin Dashboard</span>
                    </div>
                    <div className="nav-right">
                        <div className="notification-icon">
                            🔔
                            <span className="notification-badge">3</span>
                        </div>
                        <span className="user-email">admin@example.com</span>
                        <button className="logout-btn" onClick={() => logout()}>
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <div className="main-header">
                <div className="main-header-content">
                    <div className="header-left">
                        <div className="header-icon">💰</div>
                        <div className="header-text">
                            <h1 className="header-title">Accounting & Payments</h1>
                            <p className="header-subtitle">Manage tenant payments and track outstanding balances</p>
                        </div>
                    </div>
                    
                    <div className="header-actions">
                        <div style={{ position: 'relative' }}>
                            <button className="refresh-button" onClick={() => setShowNotif(p => !p)} aria-label="Notifications">
                                🔔{unread > 0 && <span className="pending-badge">{unread}</span>}
                            </button>
                            {showNotif && (
                                <div style={{ position: 'absolute', right: 0, top: '100%', width: 360, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10 }}>
                                    <div style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 700 }}>Notifications</div>
                                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
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
                        <button
                            onClick={() => {
                                fetchTenantsWithBillingInfo(setLoading, setTenants, setErrorModal);
                                fetchPaymentStats(setStats, setErrorModal);
                                fetchPendingPayments(setPendingPayments, setErrorModal);
                            }}
                            className="refresh-button"
                        >
                            <span>🔄</span>
                            Refresh Data
                        </button>

                        <button
                            onClick={handleLogout}
                            className="logout-button"
                        >
                            🚪 Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="accounting-content-container">
                {/* Tab Navigation */}
                <div className="tab-navigation">
                    <button 
                        className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <span>📊</span>
                        Overview
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        <span>⏳</span>
                        Pending Payments
                        {pendingPayments.length > 0 && (
                            <span className="pending-badge">{pendingPayments.length}</span>
                        )}
                    </button>
                </div>

                {/* Error Modal */}
                {errorModal.open && (
                    <div className="modal-overlay" onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}>
                        <div className="error-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="error-modal-header">
                                <div className="error-modal-title-content">
                                    <span className="error-modal-icon">⚠️</span>
                                    <h3 className="error-modal-title">{errorModal.title || 'Something went wrong'}</h3>
                                </div>
                                <button 
                                    className="error-modal-close"
                                    onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}
                                >
                                    ×
                                </button>
                            </div>
                            <div className="error-modal-body">
                                <p className="error-modal-message">{errorModal.message}</p>
                                {errorModal.details && (
                                    <div className="error-modal-details">{errorModal.details}</div>
                                )}
                                <div className="error-modal-actions">
                                    <button 
                                        className="error-modal-button"
                                        onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overview Tab Content */}
                {activeTab === 'overview' && (
                    <>
                        {/* Stats Summary */}
                        {stats && (
                    <div className="stats-grid">
                        <div className="stat-card stat-card-green">
                            <div className="stat-card-content">
                                <div className="stat-icon stat-icon-green">
                                    <div className="stat-icon-emoji">💰</div>
                                </div>
                                <div class="stat-text">
                                    <p className="stat-label">Total Payments</p>
                                    <p className="stat-value">{formatCurrency(stats.totalAmount)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card stat-card-blue">
                            <div className="stat-card-content">
                                <div className="stat-icon stat-icon-blue">
                                    <div className="stat-icon-emoji">📊</div>
                                </div>
                                <div class="stat-text">
                                    <p className="stat-label">Payment Count</p>
                                    <p className="stat-value">{stats.totalPayments}</p>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card stat-card-purple">
                            <div className="stat-card-content">
                                <div className="stat-icon stat-icon-purple">
                                    <div className="stat-icon-emoji">👥</div>
                                </div>
                                <div class="stat-text">
                                    <p className="stat-label">Active Tenants</p>
                                    <p className="stat-value">{tenants.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card stat-card-red">
                            <div className="stat-card-content">
                                <div className="stat-icon stat-icon-red">
                                    <div className="stat-icon-emoji">⚠️</div>
                                </div>
                                <div class="stat-text">
                                    <p className="stat-label">Outstanding Balances</p>
                                    <p className="stat-value">
                                    {tenants.filter(t => parseFloat(t.outstandingBalance) > 0).length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="billing-table-container">
                    <div className="billing-table-header">
                        <div>
                            <h3 className="billing-table-title">Tenant Billing Overview</h3>
                            <p className="billing-table-subtitle">
                                Manage payments and track balances for {filteredTenants.length} tenants
                            </p>
                        </div>
                        <div className="billing-table-actions">
                            <button
                                className="btn-primary" // Use unified button style
                                onClick={() => {
                                    setShowQuickPay(true);
                                    setQuickPaySearch('');
                                    setQuickPayTenant(null);
                                    setQuickPay({ amount: '', paymentMethod: 'Cash', description: '' });
                                }}
                            >
                                <span>💳</span>
                                Pay Bill
                            </button>
                        </div>
                    </div>

                    {/* Table Controls: Filters, Search, and Sort */}
                    <div className="billing-table-controls">
                        <div className="filter-group">
                            <label>Status:</label>
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'withBalance', label: 'Outstanding' },
                                { id: 'zero', label: 'Paid' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setBalanceFilter(tab.id)}
                                    className={`btn-filter ${balanceFilter === tab.id ? 'active' : ''}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="filter-group">
                            <input
                                className="control-input"
                                type="text"
                                placeholder="Search name, email, room..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="filter-group">
                            <label>Sort by:</label>
                            <select
                                className="control-input"
                                value={sortKey}
                                onChange={(e) => setSortKey(e.target.value)}
                            >
                                <option value="balanceDesc">Balance: High → Low</option>
                                <option value="balanceAsc">Balance: Low → High</option>
                                <option value="name">Name (A-Z)</option>
                                <option value="room">Room Number</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Summary Bar */}
                    <div className="billing-table-summary">
                        <div>
                            Showing <strong>{filteredTenants.length}</strong> of <strong>{tenants.length}</strong> tenants
                        </div>
                        <div>
                            Total Outstanding: <span className="summary-amount">{formatCurrency(totalOutstanding)}</span>
                        </div>
                    </div>
                    
                    <div className="table-wrapper">
                        {filteredTenants.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📊</div>
                                <h3 className="empty-state-title">No Tenants Found</h3>
                                <p className="empty-state-message">No tenants match your current search or filter criteria.</p>
                            </div>
                        ) : (
                            <table className="accounting-table">
                                <thead>
                                    <tr>
                                        <th>Tenant</th>
                                        <th>Room</th>
                                        <th>Monthly Rent</th>
                                        <th>Outstanding Balance</th>
                                        <th>Last Payment</th>
                                        <th>Next Due</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTenants.map((tenant) => {
                                        const dueDateStatus = getDueDateStatus(tenant.nextDueDate);
                                        
                                        return (
                                            <tr key={tenant.id}>
                                                <td>
                                                    <div className="cell-text-strong">{tenant.name}</div>
                                                    <div>{tenant.email}</div>
                                                </td>
                                                <td>
                                                    <div className="cell-text-strong">Room {tenant.roomNumber}</div>
                                                    <div>Floor {tenant.floor}</div>
                                                </td>
                                                <td>
                                                    <div className="cell-text-strong">{formatCurrency(tenant.monthlyRent)}</div>
                                                    <div>+ {formatCurrency(tenant.utilities)} utilities</div>
                                                </td>
                                                <td>
                                                    {parseFloat(tenant.outstandingBalance) > 0 ? (
                                                        <span className="status-badge status-badge--red">
                                                            {formatCurrency(tenant.outstandingBalance)}
                                                        </span>
                                                    ) : (
                                                        <span className="status-badge status-badge--green">
                                                            Paid
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {tenant.lastPaymentDate ? formatDate(tenant.lastPaymentDate) : 'No payments yet'}
                                                </td>
                                                <td>
                                                    {tenant.nextDueDate ? (
                                                        <div style={{ color: dueDateStatus.color, fontWeight: 600 }}>
                                                            {formatDate(tenant.nextDueDate)}
                                                        </div>
                                                    ) : (
                                                        <div>Not set</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn-action btn-action--primary"
                                                        onClick={() => handlePayButtonClickWrapper(tenant)}
                                                    >
                                                        <span className="btn-action-icon">💳</span>
                                                        <span>Pay</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                    </>
                )}

                {/* Pending Payments Tab Content */}
                {activeTab === 'pending' && (
                    <div className="pending-payments-section">
                        <div className="pending-payments-header">
                            <h3 className="pending-payments-title">Pending Payment Confirmations</h3>
                            <p className="pending-payments-subtitle">
                                Review and confirm payments submitted by tenants
                            </p>
                        </div>

                        {pendingPayments.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">✅</div>
                                <h3 className="empty-state-title">No Pending Payments</h3>
                                <p className="empty-state-text">
                                    All payments have been confirmed. Check back later for new payment submissions.
                                </p>
                            </div>
                        ) : (
                            <div className="pending-payments-grid">
                                {pendingPayments.map((payment) => (
                                    <div key={payment.id} className="payment-card">
                                        <div className="payment-card-header">
                                            <div className="payment-amount">
                                                {formatCurrency(payment.amount)}
                                            </div>
                                            <div className={`payment-method payment-method--${payment.paymentMethod.toLowerCase()}`}>
                                                {payment.paymentMethod}
                                            </div>
                                        </div>

                                        <div className="payment-card-body">
                                            <div className="payment-info">
                                                <div className="info-row">
                                                    <span className="info-label">Tenant:</span>
                                                    <span className="info-value">{payment.tenant.name}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">Room:</span>
                                                    <span className="info-value">
                                                        {payment.tenant.roomNumber} - {payment.tenant.floor}{payment.tenant.floor === 1 ? 'st' : payment.tenant.floor === 2 ? 'nd' : payment.tenant.floor === 3 ? 'rd' : 'th'} Floor
                                                    </span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">Email:</span>
                                                    <span className="info-value">{payment.tenant.email}</span>
                                                </div>
                                                <div className="info-row">
                                                    <span className="info-label">Current Balance:</span>
                                                    <span className="info-value info-value--red">
                                                        {formatCurrency(payment.balanceBefore)}
                                                    </span>
                                                </div>
                                                {payment.reference && (
                                                    <div className="info-row">
                                                        <span className="info-label">Reference:</span>
                                                        <span className="info-value">{payment.reference}</span>
                                                    </div>
                                                )}
                                                {payment.description && (
                                                    <div className="info-row">
                                                        <span className="info-label">Description:</span>
                                                        <span className="info-value">{payment.description}</span>
                                                    </div>
                                                )}
                                                <div className="info-row">
                                                    <span className="info-label">Submitted:</span>
                                                    <span className="info-value">{formatDate(payment.createdAt)}</span>
                                                </div>
                                            </div>

                                            <div className="payment-actions">
                                                <button
                                                    className="btn-confirm"
                                                    onClick={() => handleConfirmPaymentWrapper(payment.id)}
                                                    disabled={confirming[payment.id]}
                                                >
                                                    {confirming[payment.id] ? (
                                                        <>
                                                            <div className="btn-spinner"></div>
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
                                        </div>

                                        <div className="payment-card-footer">
                                            <div className="balance-preview">
                                                <span className="balance-label">Balance After Payment:</span>
                                                <span className="balance-value">
                                                    {formatCurrency(payment.balanceBefore - payment.amount)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pending-summary-card">
                            <h3 className="summary-title">Summary</h3>
                            <div className="summary-stats">
                                <div className="summary-stat">
                                    <span className="summary-label">Pending Payments:</span>
                                    <span className="summary-value">{pendingPayments.length}</span>
                                </div>
                                <div className="summary-stat">
                                    <span className="summary-label">Total Amount:</span>
                                    <span className="summary-value">
                                        {formatCurrency(pendingPayments.reduce((sum, payment) => sum + payment.amount, 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Form Modal */}
            {showPaymentForm && selectedTenant && (
                <div className="modal-overlay" onClick={() => setShowPaymentForm(false)}>
                    <div className="modal payment-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Record Payment - {selectedTenant.name}</h3>
                            <button 
                                className="close-btn" 
                                onClick={() => setShowPaymentForm(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            {/* Tenant Info */}
                            <div className="tenant-summary">
                                <h4>Tenant Information</h4>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Name:</span>
                                        <span className="info-value">{selectedTenant.name}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Room:</span>
                                        <span className="info-value">Room {selectedTenant.roomNumber}, Floor {selectedTenant.floor}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Monthly Rent:</span>
                                        <span className="info-value">{formatCurrency(selectedTenant.monthlyRent)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Current Outstanding Balance:</span>
                                        <span className="info-value balance-highlight">
                                            {formatCurrency(selectedTenant.outstandingBalance)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Form */}
                            <form onSubmit={handlePaymentSubmitWrapper} className="payment-form">
                                <h4>Payment Details</h4>
                                
                                <div className="form-group">
                                    <label htmlFor="amount">Payment Amount (₱):</label>
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
                                    />
                                    <small className="form-help">
                                        {selectedTenant.outstandingBalance > 0 ? (
                                            <>Maximum: {formatCurrency(selectedTenant.outstandingBalance)}</>
                                        ) : (
                                            <>This tenant currently has no outstanding balance</>
                                        )}
                                    </small>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="paymentMethod">Payment Method:</label>
                                    <select
                                        id="paymentMethod"
                                        value={newPayment.paymentMethod}
                                        onChange={(e) => setNewPayment({...newPayment, paymentMethod: e.target.value})}
                                        required
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Credit Card">Credit Card</option>
                                        <option value="Debit Card">Debit Card</option>
                                        <option value="Check">Check</option>
                                        <option value="Mobile Payment">Mobile Payment</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="reference">Reference/Transaction ID:</label>
                                    <input
                                        type="text"
                                        id="reference"
                                        value={newPayment.reference}
                                        onChange={(e) => setNewPayment({...newPayment, reference: e.target.value})}
                                        placeholder="Optional: Transaction reference or check number"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="description">Description/Notes:</label>
                                    <textarea
                                        id="description"
                                        value={newPayment.description}
                                        onChange={(e) => setNewPayment({...newPayment, description: e.target.value})}
                                        placeholder="Optional: Payment description or notes"
                                        rows="3"
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowPaymentForm(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        💳 Record Payment
                                    </button>
                                </div>
                            </form>

                            {/* Payment History Section */}
                            <div className="payment-history-section">
                                <div className="history-header">
                                    <h4>Payment History</h4>
                                    <button 
                                        className="toggle-btn"
                                        onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                                    >
                                        {showPaymentHistory ? '▼' : '▶'} 
                                        {showPaymentHistory ? 'Hide' : 'Show'} History
                                    </button>
                                </div>
                                
                                {showPaymentHistory && (
                                    <div className="payment-history">
                                        {paymentHistory.length === 0 ? (
                                            <div className="no-history">
                                                <p>No payment history found for this tenant.</p>
                                            </div>
                                        ) : (
                                            <div className="history-list">
                                                {paymentHistory.map((payment) => (
                                                    <div key={payment.id} className="history-item">
                                                        <div className="history-main">
                                                            <div className="history-amount">
                                                                {formatCurrency(payment.amount)}
                                                            </div>
                                                            <div className="history-method">
                                                                {payment.paymentMethod}
                                                            </div>
                                                            <div className="history-date">
                                                                {formatDate(payment.paymentDate)}
                                                            </div>
                                                        </div>
                                                        <div className="history-details">
                                                            {payment.reference && (
                                                                <div className="history-reference">
                                                                    Ref: {payment.reference}
                                                                </div>
                                                            )}
                                                            {payment.description && (
                                                                <div className="history-description">
                                                                    {payment.description}
                                                                </div>
                                                            )}
                                                            <div className="history-balance">
                                                                Balance after: {formatCurrency(payment.balanceAfter)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Pay Modal */}
            {showQuickPay && (
                <div className="modal-overlay" onClick={() => setShowQuickPay(false)}>
                    <div className="modal payment-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Pay Bill</h3>
                            <button className="close-btn" onClick={() => setShowQuickPay(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            {/* Searchable Tenant Dropdown */}
                            <div className="form-group">
                                <label htmlFor="tenantSearch">Select Tenant:</label>
                                <input
                                    id="tenantSearch"
                                    type="text"
                                    placeholder="Type to search tenant by name or email"
                                    value={quickPaySearch}
                                    onChange={(e) => setQuickPaySearch(e.target.value)}
                                />
                                <div className="dropdown-list" style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 6, marginTop: 6 }}>
                                    {tenants
                                        .filter(t => {
                                            const q = quickPaySearch.trim().toLowerCase();
                                            if (!q) return true;
                                            return (
                                                (t.name || '').toLowerCase().includes(q) ||
                                                (t.email || '').toLowerCase().includes(q)
                                            );
                                        })
                                        .slice(0, 50)
                                        .map(t => (
                                            <div
                                                key={t.id}
                                                className={`dropdown-item ${quickPayTenant?.id === t.id ? 'selected' : ''}`}
                                                style={{ padding: '8px 10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                                                onClick={() => {
                                                    setQuickPayTenant(t);
                                                    // Prefill amount with outstanding balance when available
                                                    const outstanding = parseFloat(t.outstandingBalance || 0);
                                                    setQuickPay(prev => ({ ...prev, amount: outstanding > 0 ? String(outstanding) : '' }));
                                                }}
                                            >
                                                <span>
                                                    {t.name}
                                                    <span style={{ color: '#777', marginLeft: 8 }}>{t.email}</span>
                                                </span>
                                                <span style={{ color: '#555' }}>{formatCurrency(t.outstandingBalance || 0)}</span>
                                            </div>
                                        ))}
                                    {tenants.length === 0 && (
                                        <div style={{ padding: '8px 10px', color: '#777' }}>No tenants found</div>
                                    )}
                                </div>
                            </div>

                            {/* Selected Tenant Summary */}
                            {quickPayTenant && (
                                <div className="tenant-summary" style={{ marginTop: 12 }}>
                                    <h4>Tenant</h4>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">Name:</span>
                                            <span className="info-value">{quickPayTenant.name}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Outstanding:</span>
                                            <span className="info-value balance-highlight">{formatCurrency(quickPayTenant.outstandingBalance || 0)}</span>
                                        </div>
                                    </div>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">Monthly:</span>
                                            <span className="info-value">{formatCurrency((quickPayTenant.monthlyRent || 0) + (quickPayTenant.utilities || 0))}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment Inputs */}
                            <form onSubmit={handleQuickPaySubmitWrapper} className="payment-form" style={{ marginTop: 16 }}>
                                <div className="form-group">
                                    <label htmlFor="qpAmount">Payment Amount (₱):</label>
                                    <input
                                        id="qpAmount"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={quickPay.amount}
                                        onChange={(e) => setQuickPay({ ...quickPay, amount: e.target.value })}
                                        placeholder="Enter payment amount"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="qpMethod">Payment Method:</label>
                                    <select
                                        id="qpMethod"
                                        value={quickPay.paymentMethod}
                                        onChange={(e) => setQuickPay({ ...quickPay, paymentMethod: e.target.value })}
                                        required
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Mobile Payment">Mobile Payment</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="qpNotes">Notes (optional):</label>
                                    <textarea
                                        id="qpNotes"
                                        rows="3"
                                        value={quickPay.description}
                                        onChange={(e) => setQuickPay({ ...quickPay, description: e.target.value })}
                                        placeholder="Optional notes about this payment"
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowQuickPay(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        ✅ Confirm Payment
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            <footer className="app-footer">
                <div className="footer-left">
                    <p>© 2025 BC Flats. All rights reserved.</p>
                </div>
                <div className="footer-right">
                    <span className="version-badge">UI vA1</span>
                </div>
            </footer>
        </div>
    );
};

export default AccountingPage;