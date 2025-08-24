import { apiService } from './apiService';

const API_BASE_URL = 'http://localhost:3000/api';

export const roomService = {
    // Get room statistics
    getRoomStats: async () => {
        try {
            const response = await apiService.get(`${API_BASE_URL}/rooms/stats`);
            return response.data;
        } catch (error) {
            console.error('Error fetching room stats:', error);
            throw error;
        }
    },

    // Get all available rooms
    getAvailableRooms: async () => {
        try {
            const response = await apiService.get(`${API_BASE_URL}/rooms/available`);
            return response.data;
        } catch (error) {
            console.error('Error fetching available rooms:', error);
            throw error;
        }
    },

    // Get all rooms (requires authentication)
    getAllRooms: async () => {
        try {
            const response = await apiService.get(`${API_BASE_URL}/rooms`);
            return response.data;
        } catch (error) {
            console.error('Error fetching all rooms:', error);
            throw error;
        }
    },

    // Get room by ID
    getRoomById: async (roomId) => {
        try {
            const response = await apiService.get(`${API_BASE_URL}/rooms/${roomId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching room:', error);
            throw error;
        }
    },

    // Get room bed status
    getRoomBedStatus: async (roomId) => {
        try {
            const response = await apiService.get(`${API_BASE_URL}/rooms/${roomId}/beds`);
            return response.data;
        } catch (error) {
            console.error('Error fetching room bed status:', error);
            throw error;
        }
    },

    // Get room tenants
    getRoomTenants: async (roomId) => {
        try {
            const response = await apiService.get(`${API_BASE_URL}/rooms/${roomId}/tenants`);
            return response.data;
        } catch (error) {
            console.error('Error fetching room tenants:', error);
            throw error;
        }
    },

    // Create new room (Admin only)
    createRoom: async (roomData) => {
        try {
            const response = await apiService.post(`${API_BASE_URL}/rooms`, roomData);
            return response.data;
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        }
    },

    // Update room (Admin only)
    updateRoom: async (roomId, updateData) => {
        try {
            const response = await apiService.put(`${API_BASE_URL}/rooms/${roomId}`, updateData);
            return response.data;
        } catch (error) {
            console.error('Error updating room:', error);
            throw error;
        }
    },

    // Delete room (Admin only)
    deleteRoom: async (roomId) => {
        try {
            const response = await apiService.delete(`${API_BASE_URL}/rooms/${roomId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting room:', error);
            throw error;
        }
    },

    // Update room status
    updateRoomStatus: async (roomId, status) => {
        try {
            const response = await apiService.patch(`${API_BASE_URL}/rooms/${roomId}/status`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating room status:', error);
            throw error;
        }
    },

    // Set maintenance mode (Admin only)
    setMaintenanceMode: async (roomId, maintenance, reason) => {
        try {
            const response = await apiService.patch(`${API_BASE_URL}/rooms/${roomId}/maintenance`, {
                maintenance,
                reason
            });
            return response.data;
        } catch (error) {
            console.error('Error setting maintenance mode:', error);
            throw error;
        }
    },

    // Add tenant to room
    addTenantToRoom: async (roomId, tenantData) => {
        try {
            const response = await apiService.post(`${API_BASE_URL}/rooms/${roomId}/tenants`, tenantData);
            return response.data;
        } catch (error) {
            console.error('Error adding tenant to room:', error);
            throw error;
        }
    },

    // Remove tenant from room
    removeTenantFromRoom: async (roomId, tenantId) => {
        try {
            const response = await apiService.delete(`${API_BASE_URL}/rooms/${roomId}/tenants/${tenantId}`);
            return response.data;
        } catch (error) {
            console.error('Error removing tenant from room:', error);
            throw error;
        }
    }
};
