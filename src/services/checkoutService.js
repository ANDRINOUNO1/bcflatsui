import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const checkoutService = {
  checkoutTenant,
  getArchivedTenants,
  getArchiveStats,
  restoreTenant,
  deleteArchive
};

// Checkout tenant and transfer to archive
async function checkoutTenant(tenantId, archiveReason = 'Lease ended') {
  try {
    const response = await axios.patch(`${API_URL}/tenants/${tenantId}/checkout`, {
      archiveReason
    }, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error checking out tenant:', error);
    throw error;
  }
}

// Get archived tenants with pagination and filtering
async function getArchivedTenants(options = {}) {
  try {
    const params = new URLSearchParams();
    
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options.search) params.append('search', options.search);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);

    const response = await axios.get(`${API_URL}/archives/list?${params}`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching archived tenants:', error);
    throw error;
  }
}

// Get archive statistics
async function getArchiveStats() {
  try {
    const response = await axios.get(`${API_URL}/archives/stats`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching archive stats:', error);
    throw error;
  }
}

// Restore tenant from archive
async function restoreTenant(archiveId) {
  try {
    const response = await axios.post(`${API_URL}/archives/restore/${archiveId}`, {}, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error restoring tenant:', error);
    throw error;
  }
}

// Delete archive record permanently
async function deleteArchive(archiveId) {
  try {
    const response = await axios.delete(`${API_URL}/archives/${archiveId}`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting archive:', error);
    throw error;
  }
}
