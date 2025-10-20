import { apiService } from './apiService';

// Helper function to format currency in Philippine Peso
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount || 0);
};

export const tenantService = {
    // Get tenant statistics
    getTenantStats: async () => {
        try {
            const response = await apiService.get(`/tenants/stats`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tenant stats:', error);
            throw error;
        }
    },

    // Get all tenants 
    getAllTenants: async (floor) => {
        try {
            const params = floor && floor !== 'all' ? `?floor=${encodeURIComponent(floor)}` : '';
            const response = await apiService.get(`/tenants${params}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching all tenants:', error);
            throw error;
        }
    },

    // Get active tenants
    getActiveTenants: async () => {
        try {
            const response = await apiService.get(`/tenants/active`);
            return response.data;
        } catch (error) {
            console.error('Error fetching active tenants:', error);
            throw error;
        }
    },

    // Get tenant by ID
    getTenantById: async (tenantId) => {
        try {
            const response = await apiService.get(`/tenants/${tenantId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tenant:', error);
            throw error;
        }
    },

    // Create new tenant
    createTenant: async (tenantData) => {
        try {
            const response = await apiService.post(`/tenants`, tenantData);
            return response.data;
        } catch (error) {
            console.error('Error creating tenant:', error);
            throw error;
        }
    },

    // Update tenant
    updateTenant: async (tenantId, updateData) => {
        try {
            const response = await apiService.put(`/tenants/${tenantId}`, updateData);
            return response.data;
        } catch (error) {
            console.error('Error updating tenant:', error);
            throw error;
        }
    },

    // Delete tenant (Admin only)
    deleteTenant: async (tenantId) => {
        try {
            const response = await apiService.delete(`/tenants/${tenantId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting tenant:', error);
            throw error;
        }
    },

    // Check in tenant
    checkInTenant: async (tenantId) => {
        try {
            const response = await apiService.patch(`/tenants/${tenantId}/checkin`);
            return response.data;
        } catch (error) {
            console.error('Error checking in tenant:', error);
            throw error;
        }
    },

    // Check out tenant
    checkOutTenant: async (tenantId) => {
        try {
            const response = await apiService.patch(`/tenants/${tenantId}/checkout`);
            return response.data;
        } catch (error) {
            console.error('Error checking out tenant:', error);
            throw error;
        }
    },

    // Update tenant status
    updateTenantStatus: async (tenantId, status) => {
        try {
            const response = await apiService.patch(`/tenants/${tenantId}/status`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating tenant status:', error);
            throw error;
        }
    },

    // Get tenants by account
    getTenantsByAccount: async (accountId) => {
        try {
            const response = await apiService.get(`/tenants/search/account/${accountId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tenants by account:', error);
            throw error;
        }
    },

    // Get tenants by room
    getTenantsByRoom: async (roomId) => {
        try {
            const response = await apiService.get(`/tenants/search/room/${roomId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tenants by room:', error);
            throw error;
        }
    },

    // Get tenant by account ID
    getTenantByAccountId: async (accountId) => {
        try {
            const response = await apiService.get(`/tenants/search/account/${accountId}`);
            return response.data.length > 0 ? response.data[0] : null;
        } catch (error) {
            console.error('Error fetching tenant by account ID:', error);
            throw error;
        }
    },

    // Get comprehensive billing information for a specific tenant
    getTenantBillingInfo: async (tenantId) => {
        try {
            const response = await apiService.get(`/tenants/${tenantId}/billing-info`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tenant billing info:', error);
            throw error;
        }
    },

    // Helper function to format currency
    formatCurrency
};
