import axios from 'axios'

const API_BASE_URL = 'http://localhost:3001/api' // Update with your backend URL

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const apiService = {
  // Room Management
  async getRooms() {
    try {
      const response = await api.get('/rooms')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch rooms')
    }
  },

  async getRoom(id) {
    try {
      const response = await api.get(`/rooms/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch room')
    }
  },

  async createRoom(roomData) {
    try {
      const response = await api.post('/rooms', roomData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create room')
    }
  },

  async updateRoom(id, roomData) {
    try {
      const response = await api.put(`/rooms/${id}`, roomData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update room')
    }
  },

  async deleteRoom(id) {
    try {
      const response = await api.delete(`/rooms/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete room')
    }
  },

  // Student Management
  async getStudents() {
    try {
      const response = await api.get('/students')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch students')
    }
  },

  async getStudent(id) {
    try {
      const response = await api.get(`/students/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch student')
    }
  },

  async createStudent(studentData) {
    try {
      const response = await api.post('/students', studentData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create student')
    }
  },

  async updateStudent(id, studentData) {
    try {
      const response = await api.put(`/students/${id}`, studentData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update student')
    }
  },

  async deleteStudent(id) {
    try {
      const response = await api.delete(`/students/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete student')
    }
  },

  // Dashboard Statistics
  async getDashboardStats() {
    try {
      const response = await api.get('/dashboard/stats')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard stats')
    }
  },

  // Occupancy Management
  async assignRoom(studentId, roomId) {
    try {
      const response = await api.post('/occupancy/assign', { studentId, roomId })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to assign room')
    }
  },

  async unassignRoom(studentId) {
    try {
      const response = await api.post('/occupancy/unassign', { studentId })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to unassign room')
    }
  },

  // Maintenance Requests
  async getMaintenanceRequests() {
    try {
      const response = await api.get('/maintenance')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch maintenance requests')
    }
  },

  async createMaintenanceRequest(requestData) {
    try {
      const response = await api.post('/maintenance', requestData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create maintenance request')
    }
  },

  async updateMaintenanceRequest(id, requestData) {
    try {
      const response = await api.put(`/maintenance/${id}`, requestData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update maintenance request')
    }
  }
}

