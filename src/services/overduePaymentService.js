import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

class OverduePaymentService {
    // Get list of tenants with overdue payments
    async getOverdueTenants() {
        try {
            const response = await axios.get(`${API_BASE_URL}/payments/overdue`, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get overdue tenants:', error);
            throw new Error(error.response?.data?.message || 'Failed to get overdue tenants');
        }
    }

    // Manually trigger overdue payment check and notifications
    async checkOverduePayments() {
        try {
            const response = await axios.post(`${API_BASE_URL}/payments/check-overdue`, {}, {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to check overdue payments:', error);
            throw new Error(error.response?.data?.message || 'Failed to check overdue payments');
        }
    }

    // Get overdue payment statistics
    async getOverdueStats() {
        try {
            const overdueTenants = await this.getOverdueTenants();
            
            const stats = {
                totalOverdue: overdueTenants.length,
                critical: overdueTenants.filter(t => t.severity === 'critical').length,
                high: overdueTenants.filter(t => t.severity === 'high').length,
                medium: overdueTenants.filter(t => t.severity === 'medium').length,
                warning: overdueTenants.filter(t => t.severity === 'warning').length,
                totalOutstanding: overdueTenants.reduce((sum, t) => sum + t.outstandingBalance, 0),
                averageDaysOverdue: overdueTenants.length > 0 
                    ? Math.round(overdueTenants.reduce((sum, t) => sum + t.daysOverdue, 0) / overdueTenants.length)
                    : 0
            };

            return stats;
        } catch (error) {
            console.error('Failed to get overdue stats:', error);
            throw new Error(error.message || 'Failed to get overdue statistics');
        }
    }

    // Format overdue tenant data for display
    formatOverdueTenant(tenant) {
        return {
            ...tenant,
            outstandingBalanceFormatted: `₱${tenant.outstandingBalance.toFixed(2)}`,
            nextDueDateFormatted: new Date(tenant.nextDueDate).toLocaleDateString(),
            lastPaymentDateFormatted: tenant.lastPaymentDate 
                ? new Date(tenant.lastPaymentDate).toLocaleDateString() 
                : 'No payments yet',
            severityColor: this.getSeverityColor(tenant.severity),
            severityIcon: this.getSeverityIcon(tenant.severity)
        };
    }

    // Get color for severity level
    getSeverityColor(severity) {
        const colors = {
            critical: '#dc2626', // red-600
            high: '#ea580c',     // orange-600
            medium: '#d97706',   // amber-600
            warning: '#ca8a04'   // yellow-600
        };
        return colors[severity] || colors.warning;
    }

    // Get icon for severity level
    getSeverityIcon(severity) {
        const icons = {
            critical: '🚨',
            high: '⚠️',
            medium: '⚡',
            warning: '📋'
        };
        return icons[severity] || icons.warning;
    }

    // Get severity description
    getSeverityDescription(severity) {
        const descriptions = {
            critical: 'Critical - Over 30 days overdue',
            high: 'High - Over 2 weeks overdue',
            medium: 'Medium - Over 1 week overdue',
            warning: 'Warning - Recently overdue'
        };
        return descriptions[severity] || descriptions.warning;
    }
}

export const overduePaymentService = new OverduePaymentService();
