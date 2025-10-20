import { roomService } from '../services/roomService';
import { tenantService } from '../services/tenantService';
import { paymentService } from '../services/paymentService';

// Data fetching functions
export const fetchDashboardData = async (isAuthenticated, setLoading, setStats, setDashboardStats, setErrorModal) => {
    try {
        setLoading(true);
        console.log('🔐 Dashboard: Authentication status:', isAuthenticated);
        console.log('🔐 Dashboard: Token in sessionStorage:', !!sessionStorage.getItem('token'));
        
        if (!isAuthenticated) {
            console.log(' Dashboard: Not authenticated, skipping data fetch');
            setLoading(false);
            return;
        }
        
        console.log(' Dashboard: Fetching statistics...');
        const [roomStats, tenantStats, paymentStats] = await Promise.all([
            roomService.getRoomStats().catch((e) => {
                setErrorModal({ open: true, title: 'Failed to load room stats', message: 'Some dashboard data may be incomplete.', details: e?.response?.data?.message || e.message });
                return { totalRooms: 0, fullyOccupiedRooms: 0, partiallyOccupiedRooms: 0, maintenanceRooms: 0 };
            }),
            tenantService.getTenantStats().catch((e) => {
                setErrorModal({ open: true, title: 'Failed to load tenant stats', message: 'Some dashboard data may be incomplete.', details: e?.response?.data?.message || e.message });
                return { totalTenants: 0, activeTenants: 0, inactiveTenants: 0 };
            }),
            paymentService.getPaymentStats().catch((e) => {
                setErrorModal({ open: true, title: 'Failed to load payment stats', message: 'Some dashboard data may be incomplete.', details: e?.response?.data?.message || e.message });
                return { totalAmountCollected: 0, totalOutstandingAmount: 0, recentPayments: [] };
            })
        ]);
        
        console.log(' Dashboard: Stats fetched successfully');
        console.log('📊 Room stats:', roomStats);
        console.log('👥 Tenant stats:', tenantStats);
        console.log('💰 Payment stats:', paymentStats);
        
        setStats({
            totalRooms: roomStats.totalRooms || 0,
            occupiedRooms: (roomStats.fullyOccupiedRooms || 0) + (roomStats.partiallyOccupiedRooms || 0),
            totalStudents: tenantStats.totalTenants || 0,
            maintenanceRequests: roomStats.maintenanceRooms || 0
        });
        
        setDashboardStats(paymentStats);
        
    } catch (error) {
        console.error('❌ Dashboard: Error fetching data:', error);
        setErrorModal({
            open: true,
            title: 'Dashboard Error',
            message: 'Failed to load dashboard data. Some information may be incomplete.',
            details: error?.response?.data?.message || error.message || 'Unknown error'
        });
    } finally {
        setLoading(false);
    }
};

// Action handlers
export const handleRefresh = async (setRefreshing, fetchDashboardData) => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
};

export const handleLogout = (logout) => {
    logout();
};

// Navigation configuration
export const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', component: 'Dashboard' },
    { id: 'rooms', label: 'Rooms', icon: '🏠', component: 'RoomPage' },
    { id: 'tenants', label: 'Tenants', icon: '👥', component: 'TenantPage' },
    { id: 'pricing', label: 'Pricing', icon: '💰', component: 'PricingPage' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧', component: 'AdminMaintenancePage' },
    { id: 'accounting', label: 'Accounting', icon: '📋', component: 'AccountingPage' },
    { id: 'add-account', label: 'Add Account', icon: '➕', component: 'AddAccountPage' }
];

// Content rendering function
export const renderContent = (activeTab) => {
    switch (activeTab) {
        case 'rooms':
            return 'RoomPage';
        case 'tenants':
            return 'TenantPage';
        case 'pricing':
            return 'PricingPage';
        case 'maintenance':
            return 'AdminMaintenancePage';
        case 'accounting':
            return 'AccountingPage';
        case 'add-account':
            return 'AddAccountPage';
        default:
            return 'Dashboard';
    }
};

// Utility functions for dashboard calculations
export const calculatePaymentProgress = (dashboardStats) => {
    const collected = Number(dashboardStats?.totalAmountCollected || 0);
    const outstanding = Number(dashboardStats?.totalOutstandingAmount || 0);
    const total = collected + outstanding || 1;
    const collectedPct = Math.round((collected / total) * 100);
    const outstandingPct = 100 - collectedPct;
    
    return {
        collected,
        outstanding,
        total,
        collectedPct,
        outstandingPct
    };
};

export const formatCurrency = (amount) => {
    const n = Number(amount);
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
