import { useAuth } from '../context/AuthContext';

/**
 * Permission Guard Component
 * Conditionally renders children based on user permissions
 */
const PermissionGuard = ({ 
  resource, 
  action, 
  role, 
  roles = [], 
  children, 
  fallback = null,
  requireAll = false 
}) => {
  const { hasPermission, hasRole, hasAnyRole } = useAuth();

  // Check role-based access
  if (role && !hasRole(role)) {
    return fallback;
  }

  if (roles.length > 0) {
    if (requireAll) {
      // User must have ALL specified roles
      const hasAllRoles = roles.every(r => hasRole(r));
      if (!hasAllRoles) {
        return fallback;
      }
    } else {
      // User must have ANY of the specified roles
      if (!hasAnyRole(roles)) {
        return fallback;
      }
    }
  }

  // Check permission-based access
  if (resource && action && !hasPermission(resource, action)) {
    return fallback;
  }

  // If no specific checks are provided, render children
  if (!resource && !action && !role && roles.length === 0) {
    return children;
  }

  return children;
};

/**
 * Role Guard Component
 * Conditionally renders children based on user roles
 */
export const RoleGuard = ({ role, roles = [], children, fallback = null, requireAll = false }) => {
  return (
    <PermissionGuard 
      role={role} 
      roles={roles} 
      children={children} 
      fallback={fallback} 
      requireAll={requireAll}
    />
  );
};

/**
 * Permission Guard Hook
 * Returns permission checking functions
 */
export const usePermissionGuard = () => {
  const { hasPermission, hasRole, hasAnyRole, canManageAccount } = useAuth();

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    canManageAccount,
    
    // Convenience methods
    canView: (resource) => hasPermission(resource, 'read'),
    canEdit: (resource) => hasPermission(resource, 'write'),
    canDelete: (resource) => hasPermission(resource, 'delete'),
    canManage: (resource) => hasPermission(resource, 'manage'),
    
    // Role checks
    isHeadAdmin: () => hasRole('HeadAdmin'),
    isSuperAdmin: () => hasRole('SuperAdmin'),
    isAdmin: () => hasRole('Admin'),
    isAccounting: () => hasRole('Accounting'),
    isTenant: () => hasRole('Tenant'),
    
    // Admin hierarchy checks
    isAdminOrHigher: () => hasAnyRole(['Admin', 'SuperAdmin', 'HeadAdmin']),
    isSuperAdminOrHigher: () => hasAnyRole(['SuperAdmin', 'HeadAdmin']),
  };
};

export default PermissionGuard;
