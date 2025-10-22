import { maintenanceService } from '../services/maintenanceService';
import { tenantService } from '../services/tenantService';
import { roomService } from '../services/roomService';
import { paymentService } from '../services/paymentService';

// Data fetching functions
export const fetchTenantData = async (userId, setLoading, setBillingError, setRoomError, setTenantData, setBillingInfo, setRoomData, setMaintenanceRequests, setErrorModal, setRefreshing) => {
    try {
        setLoading(true);
        setBillingError(false);
        setRoomError(false);

        // 1. Fetch the primary tenant data first
        const tenantResponse = await tenantService.getTenantByAccountId(userId);

        if (tenantResponse) {
            setTenantData(tenantResponse);

            // 2. Run all subsequent, independent fetches in parallel
            await Promise.all([
                tenantService.getTenantBillingInfo(tenantResponse.id)
                    .then(setBillingInfo)
                    .catch(error => {
                        console.error('Error fetching billing info:', error);
                        setBillingError(true);
                    }),

                tenantResponse.roomId ? roomService.getRoomById(tenantResponse.roomId)
                    .then(setRoomData)
                    .catch(error => {
                        console.error('Error fetching room data:', error);
                        setRoomError(true);
                    }) : Promise.resolve(),

                maintenanceService.listByTenant(tenantResponse.id)
                    .then(response => setMaintenanceRequests(response || []))
                    .catch(maintenanceError => {
                        console.error('Error fetching maintenance requests:', maintenanceError);
                        setMaintenanceRequests([]);
                    })
            ]);
        }
    } catch (error) {
        console.error('Error fetching primary tenant data:', error);
        setErrorModal({
            open: true,
            title: 'Failed to load your dashboard',
            message: 'Please try again in a moment.',
            details: error?.response?.data?.message || error.message || 'Unknown error'
        });
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
};

export const fetchPaymentHistory = async (tenantId, setPaymentHistoryLoading, setPaymentHistory) => {
    if (!tenantId) return;
    
    try {
        setPaymentHistoryLoading(true);
        const history = await paymentService.getPaymentsByTenant(tenantId, 20);
        setPaymentHistory(history || []);
    } catch (error) {
        console.error('Error fetching payment history:', error);
        setPaymentHistory([]);
    } finally {
        setPaymentHistoryLoading(false);
    }
};

// Payment handling functions
export const handlePaymentSubmit = async (e, tenantData, paymentForm, setPaymentModal, setPaymentForm, setErrorModal, fetchTenantData, fetchPaymentHistory) => {
    e.preventDefault();
    if (!tenantData?.id) return;

    try {
        setPaymentModal(prev => ({ ...prev, loading: true }));
        
        const paymentData = {
            tenantId: tenantData.id,
            amount: parseFloat(paymentForm.amount),
            paymentMethod: paymentForm.paymentMethod,
            description: paymentForm.description || 'Rent payment',
            referenceNumber: paymentForm.referenceNumber || null,
            status: 'Pending' // Create as pending payment
        };

        await paymentService.createPendingPayment(tenantData.id, paymentData);
        
        await fetchTenantData();
        await fetchPaymentHistory();
        
        setPaymentForm({
            amount: '',
            paymentMethod: 'gcash',
            description: '',
            referenceNumber: ''
        });
        setPaymentModal({ open: false, loading: false });
        
        setErrorModal({
            open: true,
            title: 'Payment Submitted',
            message: 'Your payment has been submitted and is pending confirmation from accounting.',
            details: 'You will be notified once the payment is confirmed and your balance is updated.'
        });
        
    } catch (error) {
        console.error('Error submitting payment:', error);
        setErrorModal({
            open: true,
            title: 'Payment Submission Failed',
            message: 'Unable to submit your payment. Please try again.',
            details: error?.response?.data?.message || error.message || 'Unknown error'
        });
    } finally {
        setPaymentModal(prev => ({ ...prev, loading: false }));
    }
};

// Modal functions
export const openPaymentModal = (setPaymentModal) => {
    setPaymentModal({ open: true, loading: false });
};

export const closePaymentModal = (setPaymentModal, setPaymentForm) => {
    setPaymentModal({ open: false, loading: false });
    setPaymentForm({
        amount: '',
        paymentMethod: 'gcash',
        description: '',
        referenceNumber: ''
    });
};

// Refresh function
export const handleRefresh = async (setRefreshing, fetchTenantData, fetchPaymentHistory) => {
    setRefreshing(true);
    await fetchTenantData();
    await fetchPaymentHistory();
};

// Utility functions
export const getFloorSuffix = (floor) => {
    const n = Number(floor);
    if (isNaN(n)) return '';
    
    const j = n % 10, k = n % 100;
    if (j === 1 && k !== 11) return n + "st floor";
    if (j === 2 && k !== 12) return n + "nd floor";
    if (j === 3 && k !== 13) return n + "rd floor";
    return n + "th floor";
};

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

// Compute a corrected outstanding balance for first-month display if the backend
// hasn't yet applied the security deposit to any cycle. This is a UI safeguard
// and does not mutate server data.
export const getCorrectedOutstanding = (billingInfo) => {
    if (!billingInfo) return 0;
    
    // Use backend-computed correctedOutstandingBalance if available
    if (billingInfo.correctedOutstandingBalance !== undefined) {
        console.log('Using backend correctedOutstandingBalance:', billingInfo.correctedOutstandingBalance);
        return Number(billingInfo.correctedOutstandingBalance || 0);
    }
    
    // Fallback: compute on frontend
    const outstanding = Number(billingInfo.outstandingBalance || 0);
    const deposit = Number(billingInfo.deposit || 0);
    const totalMonthly = Number(billingInfo.totalMonthlyCost || (Number(billingInfo.monthlyRent || 0) + Number(billingInfo.utilities || 0)));
    const cycles = Array.isArray(billingInfo.billingCycles) ? billingInfo.billingCycles : [];
    const anyDepositApplied = cycles.some(c => Number(c.depositApplied || 0) > 0);
    
    console.log('Frontend fallback calculation:', {
        outstanding,
        deposit,
        totalMonthly,
        anyDepositApplied,
        cyclesCount: cycles.length
    });
    
    if (!anyDepositApplied && deposit > 0 && totalMonthly > 0) {
        const credit = Math.min(deposit, totalMonthly);
        const corrected = Math.max(0, outstanding - credit);
        console.log('Applying deposit credit:', credit, 'Final:', corrected);
        return corrected;
    }
    return outstanding;
};

// Month progress calculation
export const calculateMonthProgress = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const totalMs = end - start || 1;
    const elapsedMs = Math.min(Math.max(now - start, 0), totalMs);
    const pct = Math.round((elapsedMs / totalMs) * 100);
    
    return {
        percentage: pct,
        daysElapsed: Math.floor(elapsedMs / (1000 * 60 * 60 * 24)),
        totalDays: Math.floor(totalMs / (1000 * 60 * 60 * 24))
    };
};
