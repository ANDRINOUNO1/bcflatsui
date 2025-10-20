import { apiService } from './apiService';

export const archivedTenantService = {
    // Get all archived tenants with filters
    async getArchivedTenants(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.append('dateTo', filters.dateTo);
            if (filters.floor !== undefined && filters.floor !== '') params.append('floor', filters.floor);
            if (filters.sortBy) params.append('sortBy', filters.sortBy);
            if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

            const queryString = params.toString();
            const url = `/tenants/archived/list${queryString ? '?' + queryString : ''}`;
            
            const response = await apiService.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching archived tenants:', error);
            throw error;
        }
    },

    // Get detailed information for a specific archived tenant
    async getArchivedTenantById(id) {
        try {
            const response = await apiService.get(`/tenants/archived/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching archived tenant ${id}:`, error);
            throw error;
        }
    },

    // Export archived tenants data (can be used for CSV export)
    async exportArchivedData(filters = {}) {
        try {
            const tenants = await this.getArchivedTenants(filters);
            return tenants.map(tenant => ({
                Name: tenant.name,
                Email: tenant.email,
                Room: tenant.roomNumber,
                Floor: tenant.floor,
                'Check In': new Date(tenant.checkInDate).toLocaleDateString(),
                'Check Out': new Date(tenant.checkOutDate).toLocaleDateString(),
                'Monthly Rent': tenant.monthlyRent,
                'Utilities': tenant.utilities,
                'Deposit': tenant.deposit,
                'Total Paid': tenant.totalPaid,
                'Total Charges': tenant.totalCharges,
                'Final Balance': tenant.finalBalance,
                'Payment Count': tenant.paymentCount
            }));
        } catch (error) {
            console.error('Error exporting archived data:', error);
            throw error;
        }
    }
};

