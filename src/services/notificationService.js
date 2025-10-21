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
  },
  async getAllAnnouncements(limit = 50, offset = 0) {
    const res = await apiService.get(`/notifications/announcements?limit=${limit}&offset=${offset}`);
    return res.data;
  },
  async deleteAnnouncement(id) {
    const res = await apiService.delete(`/notifications/announcements/${id}`);
    return res.data;
  },
  async suspendAnnouncement(id) {
    const res = await apiService.post(`/notifications/announcements/${id}/suspend`);
    return res.data;
  }
};


