import { apiService } from './apiService';

export const maintenanceService = {
  create: async ({ roomId, title, description, priority }) => {
    const res = await apiService.post(`/maintenance`, { roomId, title, description, priority });
    return res.data;
  },
  list: async () => {
    const res = await apiService.get(`/maintenance`);
    return res.data;
  },
  setStatus: async (id, status) => {
    const res = await apiService.patch(`/maintenance/${id}/status`, { status });
    return res.data;
  },
  
  listByTenant: async (tenantId) => {
    try {
      const res = await apiService.get(`/maintenance/tenant/${tenantId}`);
      return res.data;
    } catch (error) {
      console.error('Error fetching maintenance requests by tenant:', error);
      return [];
    }
  },

  // New functions for admin dashboard
  getStats: async () => {
    try {
      const res = await apiService.get(`/maintenance/stats`);
      return res.data;
    } catch (error) {
      console.error('Error fetching maintenance stats:', error);
      return { pending: 0, ongoing: 0, fixed: 0, total: 0 };
    }
  },

  updateStatus: async (id, status) => {
    try {
      const res = await apiService.patch(`/maintenance/${id}/status`, { status });
      return res.data;
    } catch (error) {
      console.error('Error updating maintenance status:', error);
      throw error;
    }
  }
};


