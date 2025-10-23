import { apiService } from './apiService';

export const navigationControlService = {
    // Simplified Admin Management (Navigation Control Only)
    async getAllAdmins() {
        const res = await apiService.get('/accounts/navigation-control/admins');
        return res.data;
    },
    
    async createAdmin(adminData) {
        const res = await apiService.post('/accounts/navigation-control/admins', adminData);
        return res.data;
    },
    
    async updateAdminNavigationPermissions(adminId, permissions) {
        const res = await apiService.put(`/accounts/navigation-control/admins/${adminId}/navigation`, { permissions });
        return res.data;
    },
    
    async deactivateAdmin(adminId) {
        const res = await apiService.patch(`/accounts/navigation-control/admins/${adminId}/deactivate`);
        return res.data;
    },
    
    async deleteAdmin(adminId) {
        const res = await apiService.delete(`/accounts/navigation-control/admins/${adminId}`);
        return res.data;
    },
    
    // Navigation Permission Management
    async getNavigationPermissions() {
        const res = await apiService.get('/accounts/navigation-control/permissions');
        return res.data;
    },
    
    async updateNavigationAccess(adminId, navigationItems) {
        const res = await apiService.put(`/accounts/navigation-control/admins/${adminId}/access`, { navigationItems });
        return res.data;
    },

    // Get current user's navigation access
    async getCurrentUserNavigationAccess() {
        const res = await apiService.get('/accounts/navigation-control/current-user-access');
        return res.data;
    }
};
