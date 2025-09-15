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
            setErrorModal({
                open: true,
                title: 'Failed to load tenants',
                message: 'We could not load tenant billing information.',
                details: error?.response?.data?.message || error.message || 'Unknown error'
            });
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
            setErrorModal({
                open: true,
                title: 'Failed to load payment statistics',
                message: 'Please try refreshing the page.',
                details: error?.response?.data?.message || error.message || 'Unknown error'
            });
        }
    };

    // Derived view of tenants for UI (search, filter, sort)
    const getFilteredTenants = () => {
        const q = searchQuery.trim().toLowerCase();
        let list = [...tenants];
        if (q) {
            list = list.filter(t => (
                (t.name || '').toLowerCase().includes(q) ||
                (t.email || '').toLowerCase().includes(q) ||
                String(t.roomNumber || '').toLowerCase().includes(q)
            ));
        }
        if (balanceFilter === 'withBalance') {
            list = list.filter(t => parseFloat(t.outstandingBalance) > 0);
        } else if (balanceFilter === 'zero') {
            list = list.filter(t => parseFloat(t.outstandingBalance) === 0);
        }
        list.sort((a, b) => {
            if (sortKey === 'balanceDesc') return parseFloat(b.outstandingBalance) - parseFloat(a.outstandingBalance);
            if (sortKey === 'balanceAsc') return parseFloat(a.outstandingBalance) - parseFloat(b.outstandingBalance);
            if (sortKey === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sortKey === 'room') return String(a.roomNumber || '').localeCompare(String(b.roomNumber || ''));
            return 0;
        });
        return list;
    };

    const filteredTenants = getFilteredTenants();
    const totalOutstanding = filteredTenants.reduce((sum, t) => sum + parseFloat(t.outstandingBalance || 0), 0);

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
            setErrorModal({
                open: true,
                title: 'Failed to load payment history',
                message: 'Payment history could not be loaded for this tenant.',
                details: error?.response?.data?.message || error.message || 'Unknown error'
            });
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        
        if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
            setErrorModal({ open: true, title: 'Invalid amount', message: 'Please enter a valid payment amount.', details: '' });
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
            
            setErrorModal({
                open: true,
                title: 'Payment recorded',
                message: 'The payment was recorded successfully.',
                details: ''
            });
        } catch (error) {
            console.error('Error processing payment:', error);
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            setErrorModal({
                open: true,
                title: 'Error processing payment',
                message: 'There was a problem recording this payment.',
                details: msg
            });
        }
    };

    // Formatting helpers with guards
    const toNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };

    const formatCurrency = (amount) => {
        const n = toNumber(amount);
        return `₱${n.toLocaleString()}`;
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleDateString();
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
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading accounting data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with Gradient Background */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white flex items-center">
                                <span className="mr-4">💰</span>
                                Accounting & Payments
                            </h1>
                            <p className="text-blue-100 mt-2 text-lg">Manage tenant payments and track outstanding balances</p>
                        </div>
                        <button
                            onClick={fetchTenantsWithBillingInfo}
                            className="bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-6 rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <span>🔄</span>
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Stats Summary */}
                {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-200 border border-green-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Payments</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalAmount)}</p>
                                </div>
                                <div className="bg-green-100 p-3 rounded-full">
                                    <div className="text-2xl">💰</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-200 border border-blue-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Payment Count</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPayments}</p>
                                </div>
                                <div className="bg-blue-100 p-3 rounded-full">
                                    <div className="text-2xl">📊</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-200 border border-purple-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Active Tenants</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{tenants.length}</p>
                                </div>
                                <div className="bg-purple-100 p-3 rounded-full">
                                    <div className="text-2xl">👥</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-200 border border-red-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Outstanding Balances</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {tenants.filter(t => parseFloat(t.outstandingBalance) > 0).length}
                                    </p>
                                </div>
                                <div className="bg-red-100 p-3 rounded-full">
                                    <div className="text-2xl">⚠️</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tenant Billing Overview Table */}
                <div className="bg-white rounded-xl shadow-lg">
                    <div className="px-8 py-6 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Tenant Billing Overview</h3>
                                <p className="text-gray-600 mt-1">Manage payments and track balances</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
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
                        
                        {/* Quick Tabs and Filters */}
                        <div className="mt-6 bg-gray-50 rounded-lg p-4">
                            {/* Quick Tabs */}
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'withBalance', label: 'Outstanding' },
                                    { id: 'zero', label: 'Paid' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setBalanceFilter(tab.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${balanceFilter === tab.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-200'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <input
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        type="text"
                                        placeholder="Search name, email, or room..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <select 
                                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                    value={balanceFilter} 
                                    onChange={(e) => setBalanceFilter(e.target.value)}
                                >
                                    <option value="all">All Tenants</option>
                                    <option value="withBalance">With Balance</option>
                                    <option value="zero">Zero Balance</option>
                                </select>
                                <select 
                                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                    value={sortKey} 
                                    onChange={(e) => setSortKey(e.target.value)}
                                >
                                    <option value="balanceDesc">Balance: High → Low</option>
                                    <option value="balanceAsc">Balance: Low → High</option>
                                    <option value="name">Sort by Name</option>
                                    <option value="room">Sort by Room</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* Summary Bar */}
                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-sm text-gray-700 font-medium">
                                Showing <strong className="text-blue-600">{filteredTenants.length}</strong> tenants
                            </div>
                            <div className="text-sm font-semibold text-gray-900">
                                Total Outstanding: <span className="text-red-600 font-bold text-lg">{formatCurrency(totalOutstanding)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        {filteredTenants.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">📊</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
                                <p className="text-gray-500">No tenants match your current search or filter criteria.</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tenant</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Room</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Monthly Rent</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Outstanding Balance</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Payment</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Next Due</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredTenants.map((tenant, idx) => {
                                        const balanceStatus = getBalanceStatus(tenant.outstandingBalance);
                                        const dueDateStatus = getDueDateStatus(tenant.nextDueDate);
                                        
                                        return (
                                            <tr key={tenant.id} className={`hover:bg-blue-50 transition-colors duration-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                                                        <div className="text-sm text-gray-500">{tenant.email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">Room {tenant.roomNumber}</div>
                                                        <div className="text-sm text-gray-500">Floor {tenant.floor}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{formatCurrency(tenant.monthlyRent)}</div>
                                                        <div className="text-sm text-gray-500">+ {formatCurrency(tenant.utilities)} utilities</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                                        {formatCurrency(tenant.outstandingBalance)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {tenant.lastPaymentDate ? formatDate(tenant.lastPaymentDate) : 'No payments yet'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {tenant.nextDueDate ? (
                                                        <div 
                                                            className="text-sm font-medium"
                                                            style={{ color: dueDateStatus.color }}
                                                        >
                                                            {formatDate(tenant.nextDueDate)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-500">Not set</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                                                        onClick={() => handlePayButtonClick(tenant)}
                                                    >
                                                        <span>💳</span>
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
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!quickPayTenant) {
                                        setErrorModal({ open: true, title: 'No tenant selected', message: 'Please select a tenant to proceed.', details: '' });
                                        return;
                                    }
                                    const amount = parseFloat(quickPay.amount);
                                    if (!amount || amount <= 0) {
                                        setErrorModal({ open: true, title: 'Invalid amount', message: 'Please enter a valid payment amount.', details: '' });
                                        return;
                                    }
                                    try {
                                        await paymentService.processPayment(quickPayTenant.id, {
                                            amount,
                                            paymentMethod: quickPay.paymentMethod,
                                            reference: null,
                                            description: quickPay.description || null
                                        });
                                        await fetchTenantsWithBillingInfo();
                                        await fetchPaymentStats();
                                        setErrorModal({ open: true, title: 'Payment recorded', message: 'The payment was recorded successfully.', details: '' });
                                        setShowQuickPay(false);
                                    } catch (error) {
                                        const msg = error.response?.data?.message || error.message || 'Unknown error';
                                        setErrorModal({ open: true, title: 'Error processing payment', message: 'There was a problem recording this payment.', details: msg });
                                    }
                                }}
                                className="payment-form"
                                style={{ marginTop: 16 }}
                            >
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
        </div>
    );
};

export default AccountingPage;

