import { apiService } from './apiService';

const API_BASE_URL = 'http://localhost:3000/api';

export const maintenanceService = {
  create: async ({ roomId, title, description, priority }) => {
    const res = await apiService.post(`${API_BASE_URL}/maintenance`, { roomId, title, description, priority });
    return res.data;
  },
  list: async () => {
    const res = await apiService.get(`${API_BASE_URL}/maintenance`);
    return res.data;
  },
  setStatus: async (id, status) => {
    const res = await apiService.patch(`${API_BASE_URL}/maintenance/${id}/status`, { status });
    return res.data;
  }
};


