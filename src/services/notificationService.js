import { apiService } from './apiService';

export const notificationService = {
  async fetchMyNotifications(limit = 30) {
    const res = await apiService.get(`/notifications?limit=${encodeURIComponent(limit)}`);
    return res.data;
  },
  async markAsRead(id) {
    const res = await apiService.post(`/notifications/${id}/read`);
    return res.data;
  },
  async broadcastAnnouncement(title, message, roles = null) {
    const res = await apiService.post('/notifications/broadcast', { title, message, roles });
    return res.data;
  }
};


