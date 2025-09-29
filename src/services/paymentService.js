import { apiService } from './apiService';

export const paymentService = {
    // Get tenants with billing information for accounting page
    getTenantsWithBillingInfo: async () => {
        try {
            const response = await apiService.get('/payments/billing-info');
            return response.data;
        } catch (error) {
            console.error('Error fetching tenants with billing info:', error);
            throw error;
        }
    },

    // Get payments by tenant
    getPaymentsByTenant: async (tenantId, limit = 50) => {
        try {
            // Support both new and legacy endpoints; prefer new
            const response = await apiService.get(`/payments/${tenantId}?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching payments by tenant:', error);
            throw error;
        }
    },

    // Record a new payment
    recordPayment: async (paymentData) => {
        try {
            const response = await apiService.post('/payments', paymentData);
            return response.data;
        } catch (error) {
            console.error('Error recording payment:', error);
            throw error;
        }
    },

    // Process payment for a specific tenant
    processPayment: async (tenantId, paymentData) => {
        try {
            const response = await apiService.post(`/payments/process/${tenantId}`, paymentData);
            return response.data;
        } catch (error) {
            console.error('Error processing payment:', error);
            throw error;
        }
    },

    // Get payment statistics
    getPaymentStats: async (tenantId = null) => {
        try {
            const url = tenantId ? `/payments/stats?tenantId=${tenantId}` : '/payments/stats';
            const response = await apiService.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching payment stats:', error);
            throw error;
        }
    },

    // Get recent payments across all tenants
    getRecentPayments: async (limit = 10) => {
        try {
            const response = await apiService.get(`/payments/recent?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching recent payments:', error);
            throw error;
        }
    },

    // Get payment by ID
    getPaymentById: async (paymentId) => {
        try {
            // Updated path to avoid conflict with tenantId route
            const response = await apiService.get(`/payments/id/${paymentId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching payment by ID:', error);
            throw error;
        }
    },

    // Get comprehensive dashboard statistics
    getDashboardStats: async () => {
        try {
            const response = await apiService.get('/payments/dashboard-stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }
};
