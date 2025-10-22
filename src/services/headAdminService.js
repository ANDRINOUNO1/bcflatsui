import { apiService as api } from './apiService';

export const headAdminService = {
  // Admin management
  async getAllAdmins() {
    try {
      const response = await api.get('/accounts/head-admin/admins');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch admins');
    }
  },

  async createAdmin(adminData) {
    try {
      const response = await api.post('/accounts/head-admin/admins', adminData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to create admin');
    }
  },

  async updateAdminPermissions(adminId, permissions) {
    try {
      const response = await api.put(`/accounts/head-admin/admins/${adminId}/permissions`, { permissions });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to update admin permissions');
    }
  },

  async deactivateAdmin(adminId) {
    try {
      const response = await api.patch(`/accounts/head-admin/admins/${adminId}/deactivate`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to deactivate admin');
    }
  },

  async deleteAdmin(adminId) {
    try {
      const response = await api.delete(`/accounts/head-admin/admins/${adminId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete admin');
    }
  },

  // Role and permission management
  async getAllRoles() {
    try {
      const response = await api.get('/accounts/head-admin/roles');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch roles');
    }
  },

  async getAllPermissions() {
    try {
      const response = await api.get('/accounts/head-admin/permissions');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch permissions');
    }
  },

  async getAccountRoles(accountId) {
    try {
      const response = await api.get(`/accounts/head-admin/accounts/${accountId}/roles`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch account roles');
    }
  },

  async getAccountPermissions(accountId) {
    try {
      const response = await api.get(`/accounts/head-admin/accounts/${accountId}/permissions`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch account permissions');
    }
  },

  async assignRoleToAccount(accountId, roleId) {
    try {
      const response = await api.post('/accounts/head-admin/accounts/roles', { accountId, roleId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to assign role');
    }
  },

  async removeRoleFromAccount(accountId, roleId) {
    try {
      const response = await api.delete('/accounts/head-admin/accounts/roles', { data: { accountId, roleId } });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to remove role');
    }
  },

  async grantPermission(accountId, permissionId) {
    try {
      const response = await api.post('/accounts/head-admin/accounts/permissions', { accountId, permissionId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to grant permission');
    }
  },

  async revokePermission(accountId, permissionId) {
    try {
      const response = await api.delete('/accounts/head-admin/accounts/permissions', { data: { accountId, permissionId } });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to revoke permission');
    }
  },

  // Permission checking
  async checkPermission(resource, action) {
    try {
      const response = await api.get(`/accounts/check-permission?resource=${resource}&action=${action}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to check permission');
    }
  },

  async getEffectivePermissions(accountId) {
    try {
      const response = await api.get(`/accounts/accounts/${accountId}/effective-permissions`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch effective permissions');
    }
  }
};
