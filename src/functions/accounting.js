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
