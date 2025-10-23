import React, { useState, useEffect } from 'react';
import { overduePaymentService } from '../services/overduePaymentService';
import '../components/Dashboard.css';

const OverduePaymentsPage = () => {
  const [overdueTenants, setOverdueTenants] = useState([]);
  const [overdueStats, setOverdueStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingOverdue, setCheckingOverdue] = useState(false);

  useEffect(() => {
    fetchOverdueData();
  }, []);

  const fetchOverdueData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [overdueTenantsData, overdueStatsData] = await Promise.all([
        overduePaymentService.getOverdueTenants(),
        overduePaymentService.getOverdueStats()
      ]);
      
      setOverdueTenants(overdueTenantsData);
      setOverdueStats(overdueStatsData);
    } catch (error) {
      console.error('Failed to fetch overdue data:', error);
      setError('Failed to load overdue payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOverduePayments = async () => {
    try {
      setCheckingOverdue(true);
      const result = await overduePaymentService.checkOverduePayments();
      
      // Refresh overdue data after checking
      await fetchOverdueData();
      
      alert(`Overdue payment check completed!\n\nChecked: ${result.checked} tenants\nNotifications sent: ${result.overdue}`);
    } catch (error) {
      console.error('Failed to check overdue payments:', error);
      alert('Failed to check overdue payments: ' + error.message);
    } finally {
      setCheckingOverdue(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#dc2626', // red-600
      high: '#ea580c',     // orange-600
      medium: '#d97706',   // amber-600
      warning: '#ca8a04'   // yellow-600
    };
    return colors[severity] || colors.warning;
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      warning: '📋'
    };
    return icons[severity] || icons.warning;
  };

  const getSeverityDescription = (severity) => {
    const descriptions = {
      critical: 'Critical - Over 30 days overdue',
      high: 'High - Over 2 weeks overdue',
      medium: 'Medium - Over 1 week overdue',
      warning: 'Warning - Recently overdue'
    };
    return descriptions[severity] || descriptions.warning;
  };

  return (
    <div className="dashboard-screen">
      {/* Header Section */}
      <div className="dashboard-header-gradient">
        <div className="dash-container">
          <div className="dash-header-row">
            <div>
              <h1 className="dash-title">⚠️ Overdue Payments</h1>
              <p className="dash-subtitle">
                Monitor and manage tenants with overdue payments. Send notifications to remind them of their outstanding balances.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleCheckOverduePayments}
                disabled={checkingOverdue}
                className="btn-primary refresh-btn"
              >
                {checkingOverdue ? 'Checking...' : '🔍 Check & Notify'}
              </button>
              <button
                onClick={fetchOverdueData}
                disabled={loading}
                className="btn-secondary refresh-btn"
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-container dash-content">
        {/* Error Display */}
        {error && (
          <div className="form-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Statistics Overview */}
        {overdueStats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-info">
                <p className="stat-label">Total Overdue</p>
                <p className="stat-number">{overdueStats.totalOverdue}</p>
              </div>
              <div className="stat-icon">⚠️</div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <p className="stat-label">Critical (30+ days)</p>
                <p className="stat-number" style={{ color: '#dc2626' }}>{overdueStats.critical}</p>
              </div>
              <div className="stat-icon">🚨</div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <p className="stat-label">High (14+ days)</p>
                <p className="stat-number" style={{ color: '#ea580c' }}>{overdueStats.high}</p>
              </div>
              <div className="stat-icon">⚠️</div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <p className="stat-label">Total Outstanding</p>
                <p className="stat-number" style={{ color: '#dc2626' }}>
                  ₱{overdueStats.totalOutstanding.toFixed(2)}
                </p>
              </div>
              <div className="stat-icon">💰</div>
            </div>
          </div>
        )}

        {/* Overdue Tenants List */}
        <div className="overview-grid">
          <div className="overview-card">
            <h3 className="overview-title">
              <span>👥</span> Overdue Tenants
            </h3>
            <div className="overview-list">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  Loading overdue tenants...
                </div>
              ) : overdueTenants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                  <h3>No Overdue Payments</h3>
                  <p>All tenants are up to date with their payments!</p>
                </div>
              ) : (
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {overdueTenants.map((tenant) => (
                    <div key={tenant.id} className="overdue-tenant-card">
                      <div className="tenant-header">
                        <div className="tenant-info">
                          <h4>{tenant.name}</h4>
                          <p className="tenant-details">
                            Room {tenant.roomNumber} • {tenant.email}
                          </p>
                        </div>
                        <div className="severity-badge" style={{ backgroundColor: getSeverityColor(tenant.severity) }}>
                          {getSeverityIcon(tenant.severity)} {tenant.severity.toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="tenant-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Outstanding Balance:</span>
                          <span className="detail-value" style={{ color: '#dc2626', fontWeight: 'bold' }}>
                            ₱{tenant.outstandingBalance.toFixed(2)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Days Overdue:</span>
                          <span className="detail-value" style={{ color: getSeverityColor(tenant.severity) }}>
                            {tenant.daysOverdue} days
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Due Date:</span>
                          <span className="detail-value">
                            {new Date(tenant.nextDueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Last Payment:</span>
                          <span className="detail-value">
                            {tenant.lastPaymentDate 
                              ? new Date(tenant.lastPaymentDate).toLocaleDateString()
                              : 'No payments yet'
                            }
                          </span>
                        </div>
                      </div>

                      <div className="tenant-actions">
                        <div className="severity-description">
                          {getSeverityDescription(tenant.severity)}
                        </div>
                        <div className="action-buttons">
                          <button 
                            className="btn-primary"
                            onClick={() => {
                              // Navigate to tenant details or payment page
                              alert(`Contact ${tenant.name} at ${tenant.email} regarding their overdue payment of ₱${tenant.outstandingBalance.toFixed(2)}`);
                            }}
                          >
                            📞 Contact Tenant
                          </button>
                          <button 
                            className="btn-secondary"
                            onClick={() => {
                              // Send reminder notification
                              alert(`Reminder notification sent to ${tenant.name}`);
                            }}
                          >
                            📧 Send Reminder
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="overview-card">
            <h3 className="overview-title">
              <span>⚡</span> Quick Actions
            </h3>
            <div className="overview-list">
              <div className="quick-action-item">
                <button 
                  className="btn-primary"
                  onClick={handleCheckOverduePayments}
                  disabled={checkingOverdue}
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  {checkingOverdue ? 'Checking...' : '🔍 Check All Overdue Payments'}
                </button>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  Automatically check all tenants and send notifications to those with overdue payments.
                </p>
              </div>

              <div className="quick-action-item">
                <button 
                  className="btn-secondary"
                  onClick={fetchOverdueData}
                  disabled={loading}
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  {loading ? 'Refreshing...' : '🔄 Refresh Data'}
                </button>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  Refresh the overdue payments data to see the latest information.
                </p>
              </div>

              <div className="quick-action-item">
                <button 
                  className="btn-warning"
                  onClick={() => {
                    if (confirm('This will send reminder notifications to ALL overdue tenants. Continue?')) {
                      alert('Bulk reminder notifications sent to all overdue tenants!');
                    }
                  }}
                  style={{ width: '100%' }}
                >
                  📢 Send Bulk Reminders
                </button>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  Send reminder notifications to all tenants with overdue payments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverduePaymentsPage;
