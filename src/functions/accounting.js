import { paymentService } from '../services/paymentService';

// Data fetching functions
export const fetchTenantsWithBillingInfo = async (setLoading, setTenants, setErrorModal) => {
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

export const fetchPaymentStats = async (setStats, setErrorModal) => {
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

export const fetchPendingPayments = async (setPendingPayments, setErrorModal) => {
    try {
        const payments = await paymentService.getPendingPayments();
        setPendingPayments(payments || []);
    } catch (error) {
        console.error('Error fetching pending payments:', error);
        setErrorModal({
            open: true,
            title: 'Failed to load pending payments',
            message: 'Please try refreshing the page.',
            details: error?.response?.data?.message || error.message || 'Unknown error'
        });
    }
};

// Filtering and utility functions
export const getFilteredTenants = (tenants, searchQuery, balanceFilter, sortKey) => {
    const q = searchQuery.trim().toLowerCase();
    
    let filtered = tenants.filter(tenant => {
        const matchesSearch = !q || 
            tenant.name.toLowerCase().includes(q) ||
            tenant.roomNumber.toLowerCase().includes(q) ||
            tenant.email.toLowerCase().includes(q);
        
        const matchesBalance = balanceFilter === 'all' ||
            (balanceFilter === 'withBalance' && parseFloat(tenant.outstandingBalance || 0) > 0) ||
            (balanceFilter === 'zero' && parseFloat(tenant.outstandingBalance || 0) === 0);
        
        return matchesSearch && matchesBalance;
    });
    
    // Sort the filtered results
    filtered.sort((a, b) => {
        switch (sortKey) {
            case 'balanceDesc':
                return parseFloat(b.outstandingBalance || 0) - parseFloat(a.outstandingBalance || 0);
            case 'balanceAsc':
                return parseFloat(a.outstandingBalance || 0) - parseFloat(b.outstandingBalance || 0);
            case 'name':
                return a.name.localeCompare(b.name);
            case 'room':
                return a.roomNumber.localeCompare(b.roomNumber);
            default:
                return 0;
        }
    });
    
    return filtered;
};

// Payment handling functions
export const handlePayButtonClick = async (tenant, setSelectedTenant, setShowPaymentForm, setPaymentHistory) => {
    try {
        setSelectedTenant(tenant);
        setShowPaymentForm(true);
        
        // Fetch payment history for this tenant
        const history = await paymentService.getPaymentsByTenant(tenant.id);
        setPaymentHistory(history || []);
    } catch (error) {
        console.error('Error fetching payment history:', error);
        setPaymentHistory([]);
    }
};

export const handlePaymentSubmit = async (e, selectedTenant, newPayment, setNewPayment, setShowPaymentForm, setSelectedTenant, setPaymentHistory, setErrorModal) => {
    e.preventDefault();
    
    try {
        const paymentData = {
            tenantId: selectedTenant.id,
            amount: parseFloat(newPayment.amount),
            paymentMethod: newPayment.paymentMethod,
            reference: newPayment.reference || null,
            description: newPayment.description || 'Rent payment'
        };
        
        await paymentService.createPayment(paymentData);
        
        // Reset form
        setNewPayment({
            amount: '',
            paymentMethod: 'Cash',
            reference: '',
            description: ''
        });
        setShowPaymentForm(false);
        setSelectedTenant(null);
        
        // Refresh payment history
        const history = await paymentService.getPaymentsByTenant(selectedTenant.id);
        setPaymentHistory(history || []);
        
        setErrorModal({
            open: true,
            title: 'Payment Recorded',
            message: `Payment of ${formatCurrency(paymentData.amount)} has been recorded for ${selectedTenant.name}.`,
            details: ''
        });
        
    } catch (error) {
        console.error('Error submitting payment:', error);
        const msg = error.response?.data?.message || error.message || 'Unknown error';
        setErrorModal({
            open: true,
            title: 'Payment Failed',
            message: 'We could not record the payment. Please try again.',
            details: msg
        });
    }
};

export const handleConfirmPayment = async (paymentId, setConfirming, setPendingPayments, fetchTenantsWithBillingInfo, fetchPaymentStats, setErrorModal) => {
    try {
        setConfirming(prev => ({ ...prev, [paymentId]: true }));
        
        await paymentService.confirmPayment(paymentId);
        
        setPendingPayments(prev => prev.filter(payment => payment.id !== paymentId));
        
        await fetchTenantsWithBillingInfo();
        await fetchPaymentStats();
        
        setErrorModal({
            open: true,
            title: 'Payment Confirmed',
            message: 'Payment has been confirmed and tenant balance has been updated.',
            details: ''
        });
        
    } catch (error) {
        console.error('Error confirming payment:', error);
        setErrorModal({
            open: true,
            title: 'Failed to confirm payment',
            message: 'Please try again.',
            details: error?.response?.data?.message || error.message || 'Unknown error'
        });
    } finally {
        setConfirming(prev => ({ ...prev, [paymentId]: false }));
    }
};

// Quick Pay functions
export const handleQuickPaySubmit = async (e, quickPayTenant, quickPay, setQuickPay, setShowQuickPay, setQuickPayTenant, setQuickPaySearch, setErrorModal) => {
    e.preventDefault();
    
    try {
        const amount = parseFloat(quickPay.amount);
        if (amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }
        
        const paymentData = {
            tenantId: quickPayTenant.id,
            amount: amount,
            paymentMethod: quickPay.paymentMethod,
            description: quickPay.description || 'Quick payment'
        };
        
        await paymentService.createPayment(paymentData);
        
        // Reset form
        setQuickPay({
            amount: '',
            paymentMethod: 'Cash',
            description: ''
        });
        setShowQuickPay(false);
        setQuickPayTenant(null);
        setQuickPaySearch('');
        
        setErrorModal({
            open: true,
            title: 'Payment Recorded',
            message: `Payment of ${formatCurrency(amount)} has been recorded for ${quickPayTenant.name}.`,
            details: ''
        });
        
    } catch (error) {
        console.error('Error submitting quick payment:', error);
        const msg = error.response?.data?.message || error.message || 'Unknown error';
        setErrorModal({
            open: true,
            title: 'Quick Payment Failed',
            message: 'We could not record the payment. Please try again.',
            details: msg
        });
    }
};

// Utility functions
export const toNumber = (value) => {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
};

export const formatCurrency = (amount) => {
    const n = toNumber(amount);
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(n);
};

export const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
};

export const getDueDateStatus = (dueDate) => {
    if (!dueDate) return { status: 'unknown', days: 0, color: 'gray' };
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { status: 'overdue', days: Math.abs(diffDays), color: 'red' };
    } else if (diffDays <= 7) {
        return { status: 'due-soon', days: diffDays, color: 'orange' };
    } else {
        return { status: 'upcoming', days: diffDays, color: 'green' };
    }
};

// Quick Pay search function
export const getQuickPayFilteredTenants = (tenants, quickPaySearch) => {
    const q = quickPaySearch.trim().toLowerCase();
    return tenants.filter(tenant => {
        const matchesSearch = !q || 
            tenant.name.toLowerCase().includes(q) ||
            tenant.roomNumber.toLowerCase().includes(q) ||
            tenant.email.toLowerCase().includes(q);
        
        const outstanding = parseFloat(tenant.outstandingBalance || 0);
        return matchesSearch && outstanding > 0;
    });
};

// UI Helper Functions
export const getStatsCards = (billingStats, billingTenants) => {
    if (!billingStats) return [];
    
    return [
        {
            icon: '💰',
            color: '#10b981',
            label: 'Total Payments',
            value: formatCurrency(billingStats.totalAmount)
        },
        {
            icon: '📊',
            color: '#3b82f6',
            label: 'Payment Count',
            value: billingStats.totalPayments
        },
        {
            icon: '👥',
            color: '#8b5cf6',
            label: 'Active Tenants',
            value: billingTenants.length
        },
        {
            icon: '⚠️',
            color: '#ef4444',
            label: 'Outstanding Balances',
            value: billingTenants.filter(t => parseFloat(t.outstandingBalance) > 0).length
        }
    ];
};

export const getOutstandingStats = (billingTenants) => {
    const tenantsWithBalances = billingTenants.filter(t => parseFloat(t.outstandingBalance || 0) > 0);
    const totalOutstanding = tenantsWithBalances.reduce((sum, t) => sum + parseFloat(t.outstandingBalance || 0), 0);
    
    return {
        tenantsWithBalances,
        totalOutstanding,
        stats: [
            {
                icon: '⚠️',
                color: '#ef4444',
                label: 'Tenants with Balances',
                value: tenantsWithBalances.length
            },
            {
                icon: '💰',
                color: '#dc2626',
                label: 'Total Outstanding',
                value: formatCurrency(totalOutstanding)
            }
        ]
    };
};

export const getPaymentHistoryFilteredTenants = (billingTenants, searchQuery) => {
    const q = searchQuery.trim().toLowerCase();
    return billingTenants.filter(tenant => 
        !q || 
        tenant.name.toLowerCase().includes(q) ||
        tenant.email.toLowerCase().includes(q) ||
        tenant.roomNumber.toString().includes(q)
    );
};

export const getTableHeaders = (type) => {
    const commonStyles = {
        background: '#f8fafc',
        color: '#374151',
        fontWeight: 600,
        textAlign: 'left',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '0.875rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    };

    switch (type) {
        case 'tenant-billing':
            return [
                { label: 'Tenant', style: commonStyles },
                { label: 'Room', style: commonStyles },
                { label: 'Monthly Rent', style: commonStyles },
                { label: 'Outstanding Balance', style: commonStyles },
                { label: 'Last Payment', style: commonStyles },
                { label: 'Next Due', style: commonStyles },
                { label: 'Actions', style: commonStyles }
            ];
        case 'outstanding-balances':
            return [
                { label: 'Tenant', style: commonStyles },
                { label: 'Room', style: commonStyles },
                { label: 'Outstanding Balance', style: commonStyles },
                { label: 'Last Payment', style: commonStyles },
                { label: 'Next Due', style: commonStyles },
                { label: 'Actions', style: commonStyles }
            ];
        case 'payment-history':
            return [
                { label: 'Date', style: commonStyles },
                { label: 'Amount', style: commonStyles },
                { label: 'Method', style: commonStyles },
                { label: 'Reference', style: commonStyles },
                { label: 'Description', style: commonStyles },
                { label: 'Balance After', style: commonStyles }
            ];
        default:
            return [];
    }
};

export const getStatusFilterOptions = () => [
    { id: 'all', label: 'All', icon: '📊' },
    { id: 'withBalance', label: 'Outstanding', icon: '⚠️' },
    { id: 'zero', label: 'Paid', icon: '✅' }
];

export const getSortOptions = () => [
    { value: 'balanceDesc', label: '💰 Balance: High → Low' },
    { value: 'balanceAsc', label: '💰 Balance: Low → High' },
    { value: 'name', label: '👤 Name (A-Z)' },
    { value: 'room', label: '🏠 Room Number' }
];

export const getPaymentMethodOptions = () => [
    { value: 'Cash', label: 'Cash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Credit Card', label: 'Credit Card' },
    { value: 'Debit Card', label: 'Debit Card' },
    { value: 'Check', label: 'Check' },
    { value: 'Mobile Payment', label: 'Mobile Payment' }
];

export const getQuickPayMethodOptions = () => [
    { value: 'Cash', label: 'Cash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Mobile Payment', label: 'Mobile Payment' }
];

export const getReportPeriodOptions = () => [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
];

export const getTransactionFilterOptions = () => [
    { value: '', label: 'All Methods' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Check', label: 'Check' }
];

export const getEmptyStateConfig = (type) => {
    const configs = {
        'no-tenants': {
            icon: '📊',
            title: 'No Tenants Found',
            message: 'No tenants match your current search or filter criteria.'
        },
        'no-pending-payments': {
            icon: '✅',
            title: 'No Pending Payments',
            message: 'All payments have been confirmed. Check back later for new payment submissions.'
        },
        'no-outstanding-balances': {
            icon: '✅',
            title: 'No Outstanding Balances',
            message: 'All tenants are up to date with their payments.'
        },
        'no-payment-history': {
            icon: '📊',
            title: 'No Payment History',
            message: 'No payment history found for this tenant.'
        },
        'select-tenant': {
            icon: '👤',
            title: 'Select a Tenant',
            message: 'Choose a tenant from the dropdown above to view their payment history.'
        },
        'no-transactions': {
            icon: '📋',
            title: 'No Transactions Found',
            message: 'No transactions match your current filter criteria.'
        },
        'no-reports': {
            icon: '📊',
            title: 'No Reports Available',
            message: 'Select a period and generate a report'
        }
    };
    
    return configs[type] || configs['no-tenants'];
};

export const getSummaryData = (filteredTenants, billingTenants) => {
    const totalOutstanding = filteredTenants.reduce((sum, t) => sum + parseFloat(t.outstandingBalance || 0), 0);
    
    return {
        showing: filteredTenants.length,
        total: billingTenants.length,
        totalOutstanding
    };
};

export const getPendingPaymentsSummary = (pendingPayments) => {
    const totalAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    return {
        count: pendingPayments.length,
        totalAmount
    };
};