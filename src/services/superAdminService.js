import { apiService } from './apiService';

export const superAdminService = {
    async getAllAccounts() {
        const res = await apiService.get('/accounts');
        return res.data;
    },
    async getPendingAccounts() {
        const res = await apiService.get('/accounts/pending');
        return res.data;
    },
    async approveAccount(id) {
        const res = await apiService.patch(`/accounts/${id}/approve`);
        return res.data;
    },
    async rejectAccount(id, reason) {
        const res = await apiService.patch(`/accounts/${id}/reject`, { reason });
        return res.data;
    },
    async updateRole(id, role) {
        const res = await apiService.patch(`/accounts/${id}/role`, { role });
        return res.data;
    },
    async updateStatus(id, status) {
        const res = await apiService.patch(`/accounts/${id}/status`, { status });
        return res.data;
    }
};


