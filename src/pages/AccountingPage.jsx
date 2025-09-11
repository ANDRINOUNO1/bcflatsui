import React, { useState, useEffect } from 'react';
import { paymentService } from '../services/paymentService';
import '../components/AccountingPage.css';

const AccountingPage = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [stats, setStats] = useState(null);
    const [newPayment, setNewPayment] = useState({
        amount: '',
        paymentMethod: 'Cash',
        reference: '',
        description: ''
    });

    useEffect(() => {
        fetchTenantsWithBillingInfo();
        fetchPaymentStats();
    }, []);

    const fetchTenantsWithBillingInfo = async () => {
        try {
            setLoading(true);
            console.log('💰 AccountingPage: Fetching tenants with billing info...');
            const tenantsData = await paymentService.getTenantsWithBillingInfo();
            console.log('💰 AccountingPage: Tenants fetched successfully:', tenantsData.length);
            setTenants(tenantsData);
        } catch (error) {
            console.error('❌ AccountingPage: Error fetching tenants:', error);
            if (error.response?.status === 401) {
                console.log('💰 AccountingPage: Authentication error, showing empty state');
                setTenants([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentStats = async () => {
        try {
            const statsData = await paymentService.getPaymentStats();
            setStats(statsData);
        } catch (error) {
            console.error('Error fetching payment stats:', error);
        }
    };

    const handlePayButtonClick = async (tenant) => {
        setSelectedTenant(tenant);
        setShowPaymentForm(true);
        
        // Reset payment form
        setNewPayment({
            amount: '',
            paymentMethod: 'Cash',
            reference: '',
            description: ''
        });

        // Fetch payment history for this tenant
        try {
            const history = await paymentService.getPaymentsByTenant(tenant.id);
            setPaymentHistory(history);
        } catch (error) {
            console.error('Error fetching payment history:', error);
            setPaymentHistory([]);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        
        if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
            alert('Please enter a valid payment amount');
            return;
        }

        try {
            const paymentData = {
                amount: parseFloat(newPayment.amount),
                paymentMethod: newPayment.paymentMethod,
                reference: newPayment.reference || null,
                description: newPayment.description || null
            };

            await paymentService.processPayment(selectedTenant.id, paymentData);
            
            // Refresh data
            await fetchTenantsWithBillingInfo();
            await fetchPaymentStats();
            
            // Refresh payment history
            const history = await paymentService.getPaymentsByTenant(selectedTenant.id);
            setPaymentHistory(history);
            
            // Reset form
            setNewPayment({
                amount: '',
                paymentMethod: 'Cash',
                reference: '',
                description: ''
            });
            
            alert('Payment recorded successfully!');
        } catch (error) {
            console.error('Error processing payment:', error);
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            alert('Error processing payment: ' + msg);
        }
    };

    const formatCurrency = (amount) => {
        return `₱${parseFloat(amount).toLocaleString()}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getBalanceStatus = (balance) => {
        const amount = parseFloat(balance);
        if (amount === 0) return { status: 'paid', color: '#4CAF50' };
        if (amount <= 1000) return { status: 'low', color: '#FF9800' };
        return { status: 'high', color: '#F44336' };
    };

    const getDueDateStatus = (dueDate) => {
        if (!dueDate) return { status: 'unknown', color: '#9E9E9E' };
        
        const due = new Date(dueDate);
        const now = new Date();
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { status: 'overdue', color: '#F44336' };
        if (diffDays <= 7) return { status: 'due-soon', color: '#FF9800' };
        return { status: 'current', color: '#4CAF50' };
    };

    if (loading) {
        return <div className="accounting-loading">Loading accounting data...</div>;
    }

    return (
        <div className="accounting-container">
            <div className="accounting-header">
                <h2>💰 Accounting & Payments</h2>
                <p>Manage tenant payments and track outstanding balances</p>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div className="stat-content">
                            <div className="stat-value">{formatCurrency(stats.totalAmount)}</div>
                            <div className="stat-label">Total Payments</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.totalPayments}</div>
                            <div className="stat-label">Payment Count</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-content">
                            <div className="stat-value">{tenants.length}</div>
                            <div className="stat-label">Active Tenants</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⚠️</div>
                        <div className="stat-content">
                            <div className="stat-value">
                                {tenants.filter(t => parseFloat(t.outstandingBalance) > 0).length}
                            </div>
                            <div className="stat-label">With Outstanding Balance</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tenants Table */}
            <div className="accounting-content">
                <div className="tenants-table-section">
                    <div className="table-header">
                        <h3>Tenant Billing Overview</h3>
                        <button 
                            className="refresh-btn" 
                            onClick={fetchTenantsWithBillingInfo}
                        >
                            🔄 Refresh
                        </button>
                    </div>
                    
                    <div className="table-wrapper">
                        {tenants.length === 0 ? (
                            <div className="empty-state">
                                <p>No active tenants found.</p>
                            </div>
                        ) : (
                            <table className="accounting-table">
                                <thead>
                                    <tr>
                                        <th>Tenant Name</th>
                                        <th>Room</th>
                                        <th>Monthly Rent</th>
                                        <th>Outstanding Balance</th>
                                        <th>Last Payment</th>
                                        <th>Next Due Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tenants.map((tenant) => {
                                        const balanceStatus = getBalanceStatus(tenant.outstandingBalance);
                                        const dueDateStatus = getDueDateStatus(tenant.nextDueDate);
                                        
                                        return (
                                            <tr key={tenant.id}>
                                                <td>
                                                    <div className="tenant-info">
                                                        <div className="tenant-name">{tenant.name}</div>
                                                        <div className="tenant-email">{tenant.email}</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="room-info">
                                                        <div className="room-number">Room {tenant.roomNumber}</div>
                                                        <div className="room-floor">Floor {tenant.floor}</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="rent-info">
                                                        <div className="monthly-rent">{formatCurrency(tenant.monthlyRent)}</div>
                                                        <div className="utilities">+ {formatCurrency(tenant.utilities)} utilities</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div 
                                                        className="balance-amount"
                                                        style={{ color: balanceStatus.color }}
                                                    >
                                                        {formatCurrency(tenant.outstandingBalance)}
                                                    </div>
                                                </td>
                                                <td>
                                                    {tenant.lastPaymentDate ? (
                                                        <div className="last-payment">
                                                            {formatDate(tenant.lastPaymentDate)}
                                                        </div>
                                                    ) : (
                                                        <div className="no-payment">No payments yet</div>
                                                    )}
                                                </td>
                                                <td>
                                                    {tenant.nextDueDate ? (
                                                        <div 
                                                            className="due-date"
                                                            style={{ color: dueDateStatus.color }}
                                                        >
                                                            {formatDate(tenant.nextDueDate)}
                                                        </div>
                                                    ) : (
                                                        <div className="no-due-date">Not set</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        className="pay-btn"
                                                        onClick={() => handlePayButtonClick(tenant)}
                                                    >
                                                        💳 Pay
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
                            <form onSubmit={handlePaymentSubmit} className="payment-form">
                                <h4>Payment Details</h4>
                                
                                <div className="form-group">
                                    <label htmlFor="amount">Payment Amount (₱):</label>
                                    <input
                                        type="number"
                                        id="amount"
                                        step="0.01"
                                        min="0.01"
                                        max={selectedTenant.outstandingBalance}
                                        value={newPayment.amount}
                                        onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                                        placeholder="Enter payment amount"
                                        required
                                    />
                                    <small className="form-help">
                                        Maximum: {formatCurrency(selectedTenant.outstandingBalance)}
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
        </div>
    );
};

export default AccountingPage;
