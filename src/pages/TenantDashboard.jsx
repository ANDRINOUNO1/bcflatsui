import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';
import { tenantService } from '../services/tenantService';
import NotificationButton from '../components/NotificationButton';
import NotificationDropdown from '../components/NotificationDropdown';
import '../components/TenantDashboard.css';
import '../components/NotificationStyles.css';
import {
    fetchTenantData,
    fetchPaymentHistory,
    handlePaymentSubmit,
    openPaymentModal,
    closePaymentModal,
    handleRefresh,
    getFloorSuffix,
    formatCurrency,
    getCorrectedOutstanding
} from '../functions/tenantDashboard';

const TenantDashboard = () => {
  const { user, logout } = useAuth();
  const [tenantData, setTenantData] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [billingInfo, setBillingInfo] = useState(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingError, setBillingError] = useState(false);
  const [roomError, setRoomError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '', details: '' });
  
  // Payment modal states
  const [paymentModal, setPaymentModal] = useState({ open: false, loading: false });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'gcash',
    description: '',
    referenceNumber: ''
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  
  // Emergency contact modal states
  const [emergencyContactModal, setEmergencyContactModal] = useState({ open: false, loading: false });
  const [emergencyContactForm, setEmergencyContactForm] = useState({
    name: '',
    phone: '',
    relationship: ''
  });

  const fetchTenantDataWrapper = useCallback(async () => {
    await fetchTenantData(user?.id, setLoading, setBillingError, setRoomError, setTenantData, setBillingInfo, setRoomData, setMaintenanceRequests, setErrorModal, setRefreshing);
  }, [user?.id]);

  const fetchPaymentHistoryWrapper = useCallback(async () => {
    await fetchPaymentHistory(tenantData?.id, setPaymentHistoryLoading, setPaymentHistory);
  }, [tenantData?.id]);

  const handlePaymentSubmitWrapper = async (e) => {
    await handlePaymentSubmit(e, tenantData, paymentForm, setPaymentModal, setPaymentForm, setErrorModal, fetchTenantDataWrapper, fetchPaymentHistoryWrapper);
  };

  const openPaymentModalWrapper = () => {
    openPaymentModal(setPaymentModal);
  };

  const closePaymentModalWrapper = () => {
    closePaymentModal(setPaymentModal, setPaymentForm);
  };

  const handleRefreshWrapper = async () => {
    await handleRefresh(setRefreshing, fetchTenantDataWrapper, fetchPaymentHistoryWrapper);
    await fetchAnnouncements();
  };

  const fetchAnnouncements = useCallback(async () => {
    try {
      setAnnouncementsLoading(true);
      const notifications = await notificationService.fetchMyNotifications(50);
      // Filter for announcements
      const announcementNotifications = notifications.filter(notif => 
        notif.type === 'announcement' || notif.metadata?.isAnnouncement
      );
      setAnnouncements(announcementNotifications);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  // Emergency contact modal functions
  const openEmergencyContactModal = () => {
    setEmergencyContactForm({
      name: tenantData?.emergencyContact?.name || '',
      phone: tenantData?.emergencyContact?.phone || '',
      relationship: tenantData?.emergencyContact?.relationship || ''
    });
    setEmergencyContactModal({ open: true, loading: false });
  };

  const closeEmergencyContactModal = () => {
    setEmergencyContactModal({ open: false, loading: false });
    setEmergencyContactForm({ name: '', phone: '', relationship: '' });
  };

  const handleEmergencyContactSubmit = async (e) => {
    e.preventDefault();
    
    if (!emergencyContactForm.name || !emergencyContactForm.phone || !emergencyContactForm.relationship) {
      setErrorModal({
        open: true,
        title: 'Validation Error',
        message: 'Please fill in all emergency contact fields.',
        details: ''
      });
      return;
    }

    setEmergencyContactModal({ open: true, loading: true });
    
    try {
      const updateData = {
        emergencyContact: {
          name: emergencyContactForm.name.trim(),
          phone: emergencyContactForm.phone.trim(),
          relationship: emergencyContactForm.relationship.trim()
        }
      };
      
      await tenantService.updateTenant(tenantData.id, updateData);
      
      // Update local state
      setTenantData(prev => ({
        ...prev,
        emergencyContact: updateData.emergencyContact
      }));
      
      closeEmergencyContactModal();
      
      // Show success message
      setErrorModal({
        open: true,
        title: 'Success',
        message: 'Emergency contact information updated successfully!',
        details: ''
      });
      
    } catch (err) {
      console.error('Failed to update emergency contact:', err);
      setErrorModal({
        open: true,
        title: 'Update Failed',
        message: err.response?.data?.message || 'Failed to update emergency contact information.',
        details: err.message
      });
    } finally {
      setEmergencyContactModal({ open: true, loading: false });
    }
  };

  const handleLogout = () => {
    logout()
  }

  useEffect(() => {
    if (user) {
      fetchTenantDataWrapper();
      fetchAnnouncements();
    }
  }, [user, fetchTenantDataWrapper, fetchAnnouncements]);

  // Poll notifications
  useEffect(() => {
    let intervalId;
    const load = async () => {
      try {
        const data = await notificationService.fetchMyNotifications(20);
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      } catch {
        // ignore
      }
    };
    if (user) {
      load();
      intervalId = setInterval(load, 15000);
    }
    return () => intervalId && clearInterval(intervalId);
  }, [user]);

  // Handle notification dropdown visibility changes
  const handleNotificationToggle = async (isOpen) => {
    if (isOpen && unreadCount > 0) {
      try {
        // Mark all notifications as read when dropdown is opened
        await notificationService.markAllAsRead();
        
        // Update local state immediately
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      } catch (err) {
        console.error('Failed to mark notifications as read:', err);
      }
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      setMarkingAsRead(true);
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setMarkingAsRead(false);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAsRead(true);
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    } finally {
      setMarkingAsRead(false);
    }
  };

  useEffect(() => {
    if (showPaymentHistory && tenantData?.id) {
      fetchPaymentHistoryWrapper();
    }
  }, [showPaymentHistory, tenantData?.id, fetchPaymentHistoryWrapper]);

  // Handle body scroll when modals are open
  useEffect(() => {
    if (paymentModal.open || errorModal.open || emergencyContactModal.open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [paymentModal.open, errorModal.open, emergencyContactModal.open]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading your dashboard...</p>
        </div>
      </div>
    );
  } 

  if (!tenantData && !loading) {
    return (
      <div className="welcome-screen">
        <div className="welcome-container">
          <div className="welcome-card">
            <div className="welcome-icon">🏠</div>
            <h1 className="welcome-title">Welcome to BCFlats!</h1>
            <p className="welcome-subtitle">Your tenant dashboard will be available once your account is set up.</p>
            <div className="welcome-getting-started">
              <h3 className="welcome-getting-started-title">Getting Started</h3>
              <p className="welcome-getting-started-text">Please contact the property management to complete your tenant registration and room assignment.</p>
              <button className="btn btn--primary">
                Contact Management
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-dashboard">
      {errorModal.open && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setErrorModal({ open: false, title: '', message: '', details: '' });
          }
        }}>
          <div className="modal-container error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header error-modal-header">
              <div className="modal-title-content error-modal-title-content">
                <span className="modal-icon error-modal-icon">⚠️</span>
                <h3 className="modal-title error-modal-title">{errorModal.title || 'Something went wrong'}</h3>
              </div>
              <button 
                aria-label="Close" 
                className="modal-close error-modal-close" 
                onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}
              >
                ×
              </button>
            </div>
            <div className="modal-body error-modal-body">
              {errorModal.message && <p className="error-modal-message">{errorModal.message}</p>}
              {errorModal.details && <pre className="error-modal-details">{errorModal.details}</pre>}
            </div>
            <div className="modal-footer error-modal-actions">
              <button 
                onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })} 
                className="modal-btn modal-btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="tenant-header-gradient">
        <div className="tenant-header-container">
          <div className="tenant-header-content">
            <div>
              <h1 className="tenant-welcome-title">
                Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'Tenant'}!
              </h1>
              <p className="tenant-welcome-subtitle">Here's an overview of your home and account.</p>
            </div>
            <div className="tenant-header-actions" style={{ position: 'relative', display: 'flex', gap: 8 }}>
            <NotificationButton
              unreadCount={unreadCount}
              onClick={() => {
                const newShowState = !showNotifications;
                setShowNotifications(newShowState);
                handleNotificationToggle(newShowState);
              }}
              showDropdown={showNotifications}
              style={{ marginRight: 12 }}
            >
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                markingAsRead={markingAsRead}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onClose={() => {
                  setShowNotifications(false);
                  handleNotificationToggle(false);
                }}
              />
            </NotificationButton>
              <button
                onClick={handleRefreshWrapper}
                disabled={refreshing}
                className="tenant-refresh-button"
              >
                {refreshing ? (
                  <>
                    <div className="tenant-refresh-spinner"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Refresh
                  </>
                )}
              </button>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-main-content">
        <div className="stats-grid">
          <div className="stats-card stats-card--red">
            <div className="stats-card-content">
              <div>
                <p className="stats-card-label">Current Balance</p>
                <p className="stats-card-value">
                  {billingError ? 'Unavailable' : formatCurrency(getCorrectedOutstanding(billingInfo))}
                </p>
              </div>
              <div className="stats-card-icon-wrapper stats-card-icon-wrapper--red">
                <div className="stats-card-icon">💰</div>
              </div>
            </div>
          </div>

          <div className="stats-card stats-card--blue">
            <div className="stats-card-content">
              <div>
                <p className="stats-card-label">Next Due Date</p>
                <p className="stats-card-value">
                  {billingError ? 'Unavailable' : billingInfo?.nextDueDate 
                    ? new Date(billingInfo.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'N/A'
                  }
                </p>
              </div>
              <div className="stats-card-icon-wrapper stats-card-icon-wrapper--blue">
                <div className="stats-card-icon">📅</div>
              </div>
            </div>
          </div>

          <div className="stats-card stats-card--green">
            <div className="stats-card-content">
              <div>
                <p className="stats-card-label">Deposit Balance</p>
                <p className="stats-card-value">
                  {billingError ? 'Unavailable' : formatCurrency(billingInfo?.deposit || 0)}
                </p>
              </div>
              <div className="stats-card-icon-wrapper stats-card-icon-wrapper--green">
                <div className="stats-card-icon">🏦</div>
              </div>
            </div>
          </div>

          <div className="stats-card stats-card--purple">
            <div className="stats-card-content">
              <div>
                <p className="stats-card-label">Payment History</p>
                <p className="stats-card-value">
                  {billingError ? 'N/A' : (billingInfo?.paymentHistory?.length || 0)}
                </p>
              </div>
              <div className="stats-card-icon-wrapper stats-card-icon-wrapper--purple">
                <div className="stats-card-icon">📊</div>
              </div>
            </div>
          </div>
        </div>

        <div className="content-card content-card--large-padding">
          <h3 className="card-title card-title-with-icon">
            <span className="card-title-icon">💰</span>
            Billing Information
          </h3>
          
          <div className="billing-info-grid">
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">Monthly Rent:</span>
                <span className="info-value info-value--strong">
                  {billingError ? 'Unavailable' : formatCurrency(billingInfo?.monthlyRent || 0)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Utilities:</span>
                <span className="info-value info-value--strong">
                  {billingError ? 'Unavailable' : formatCurrency(billingInfo?.utilities || 0)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Deposit Paid:</span>
                <span className="info-value info-value--strong">
                  {billingError ? 'Unavailable' : formatCurrency(billingInfo?.deposit || 0)}
                </span>
              </div>
              <div className="info-row info-row--no-border">
                <span className="info-label">Last Payment:</span>
                <span className="info-value info-value--strong">
                  {billingError ? 'Unavailable' : billingInfo?.lastPaymentDate 
                    ? new Date(billingInfo.lastPaymentDate).toLocaleDateString()
                    : 'No payments yet'
                  }
                </span>
              </div>
            </div>
            
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">Account Status:</span>
                <span className={`status-badge ${
                  billingInfo?.status === 'Active' 
                    ? 'status-badge--green' 
                    : 'status-badge--yellow'
                }`}>
                  {billingError ? 'Unknown' : (billingInfo?.status || 'Unknown')}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Next Due Date:</span>
                <span className="info-value info-value--strong">
                  {billingError ? 'Unavailable' : billingInfo?.nextDueDate 
                    ? new Date(billingInfo.nextDueDate).toLocaleDateString()
                    : 'Not set'
                  }
                </span>
              </div>
              {billingInfo?.nextDueDate && !billingError && (
                <div className="progress-bar-container">
                  {(() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    const totalMs = end - start || 1;
                    const elapsedMs = Math.min(Math.max(now - start, 0), totalMs);
                    const pct = Math.round((elapsedMs / totalMs) * 100);
                    return (
                      <>
                        <div className="progress-bar-track">
                          <div className={`progress-bar-fill ${pct > 80 ? 'progress-bar-fill--red' : pct > 60 ? 'progress-bar-fill--orange' : 'progress-bar-fill--blue'}`} style={{ width: pct + '%' }}></div>
                        </div>
                        <div className="progress-bar-labels">
                          <span>Start</span>
                          <span>{pct}%</span>
                          <span>End</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
              <div className="info-row">
                <span className="info-label">Total Monthly:</span>
                <span className="info-value info-value--blue">
                  {billingError ? 'Unavailable' : formatCurrency(billingInfo?.totalMonthlyCost || 0)}
                </span>
              </div>
              <div className="info-row info-row--no-border">
                <span className="info-label">Outstanding Balance:</span>
                <span className="info-value info-value--red">
                  {billingError ? 'Unavailable' : formatCurrency(getCorrectedOutstanding(billingInfo))}
                </span>
              </div>
            </div>
          </div>
          
          <div className="card-actions-footer">
            <button 
              className="btn-action btn-action--primary"
              onClick={openPaymentModalWrapper}
              disabled={billingError || getCorrectedOutstanding(billingInfo) <= 0}
            >
              <span className="btn-action-icon">💳</span>
              <span>Pay Now</span>
            </button>
            <button 
              className="btn-action btn-action--secondary"
              onClick={() => setShowPaymentHistory(!showPaymentHistory)}
            >
              <span className="btn-action-icon">📊</span>
              <span>{showPaymentHistory ? 'Hide' : 'View'} Payment History</span>
            </button>
          </div>
        </div>

        <div className="content-card">
          <h3 className="card-title card-title-with-icon">
            <span className="card-title-icon">🏠</span>
            Property Information
          </h3>
          <div className="info-list">
            <div className="info-row info-row--light-border">
              <span className="info-label">Building:</span>
              <span className="info-value">{roomError ? 'Unavailable' : (roomData?.building || 'Main Building')}</span>
            </div>
            <div className="info-row info-row--light-border">
              <span className="info-label">Room:</span>
              <span className="info-value">{roomError ? 'Unavailable' : (roomData?.roomNumber || 'N/A')}</span>
            </div>
            <div className="info-row info-row--light-border">
              <span className="info-label">Floor:</span>
              <span className="info-value">
                {roomError ? 'Unavailable' : roomData?.floor ? getFloorSuffix(roomData.floor) : 'N/A'}
              </span>
            </div>
            <div className="info-row info-row--light-border">
              <span className="info-label">Bed Number:</span>
              <span className="info-value">{tenantData?.bedNumber || 'N/A'}</span>
            </div>
            <div className="info-row info-row--no-border">
              <span className="info-label">Check-in Date:</span>
              <span className="info-value">
                {tenantData?.checkInDate ? new Date(tenantData.checkInDate).toLocaleDateString() : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {showPaymentHistory && (
          <div className="content-card">
            <h3 className="card-title card-title-with-icon">
              <span className="card-title-icon">💳</span>
              Payment History
            </h3>
            {paymentHistoryLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading payment history...</p>
              </div>
            ) : paymentHistory.length > 0 ? (
              <div className="table-container">
                <table className="payment-table">
                  <thead className="payment-table-header">
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Description</th>
                      <th>Reference</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody className="payment-table-body">
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td className="cell-text-strong">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                        <td className="cell-text-green">{formatCurrency(payment.amount)}</td>
                        <td className="payment-method-badge">{payment.paymentMethod}</td>
                        <td>{payment.description || 'Rent payment'}</td>
                        <td>{payment.referenceNumber || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${
                            payment.status === 'Completed' 
                              ? 'status-badge--green' 
                              : payment.status === 'Pending'
                              ? 'status-badge--yellow'
                              : 'status-badge--red'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">💳</div>
                <h4 className="empty-state-title">No Payment History</h4>
                <p className="empty-state-text">You haven't made any payments yet.</p>
              </div>
            )}
          </div>
        )}

        <div className="content-card">
          <h3 className="card-title card-title-with-icon">
            <span className="card-title-icon">🔧</span>
            Maintenance & Support
          </h3>
          <p className="card-description">
            Submit repair requests and track progress for your room.
          </p>
          <div className="maintenance-actions">
            <Link to="/tenant/maintenance" className="btn btn--primary">
              🔧 Request Maintenance
            </Link>
            <Link to="/tenant/maintenance" className="btn btn--secondary">
              📋 View Requests
            </Link>
          </div>
          
          {maintenanceRequests.length > 0 && (
            <div>
              <h4 className="card-subtitle">Recent Requests</h4>
              <div className="requests-list">
                {maintenanceRequests.slice(0, 3).map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-card-header">
                      <h5 className="request-card-title">{request.title}</h5>
                      <span className={`status-badge ${
                        request.status === 'Completed' 
                          ? 'status-badge--green'
                          : request.status === 'In Progress'
                          ? 'status-badge--blue'
                          : 'status-badge--yellow'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="request-card-description">{request.description}</p>
                    <div className="request-card-footer">
                      <span>Priority: {request.priority}</span>
                      <span>Submitted: {new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid-2-col">
          <div className="content-card">
            <h3 className="card-title card-title-with-icon">
              <span className="card-title-icon">🚨</span>
              Emergency Contact
            </h3>
            <div className="info-list">
              <div className="info-row info-row--light-border">
                <span className="info-label">Contact Name:</span>
                <span className="info-value">{tenantData?.emergencyContact?.name || 'Not provided'}</span>
              </div>
              <div className="info-row info-row--light-border">
                <span className="info-label">Phone:</span>
                <span className="info-value">{tenantData?.emergencyContact?.phone || 'Not provided'}</span>
              </div>
              <div className="info-row info-row--no-border">
                <span className="info-label">Relationship:</span>
                <span className="info-value">{tenantData?.emergencyContact?.relationship || 'Not provided'}</span>
              </div>
            </div>
            <div className="card-footer-action">
              <button 
                className="btn-full-width"
                onClick={openEmergencyContactModal}
              >
                Update Contact Info
              </button>
            </div>
          </div>

          <div className="content-card">
            <h3 className="card-title card-title-with-icon">
              <span className="card-title-icon">📄</span>
              Lease Information
            </h3>
            <div className="info-list">
              <div className="info-row info-row--light-border">
                <span className="info-label">Lease Status:</span>
                <span className={`status-badge-xs ${
                  tenantData?.leaseEnd && new Date(tenantData.leaseEnd) > new Date()
                    ? 'status-badge--green'
                    : 'status-badge--red'
                }`}>
                  {tenantData?.leaseEnd 
                    ? (new Date(tenantData.leaseEnd) > new Date() ? 'Active' : 'Expired')
                    : 'Not set'
                  }
                </span>
              </div>
              <div className="info-row info-row--light-border">
                <span className="info-label">Lease Start:</span>
                <span className="info-value">{tenantData?.leaseStart ? new Date(tenantData.leaseStart).toLocaleDateString() : 'Not set'}</span>
              </div>
              <div className="info-row info-row--no-border">
                <span className="info-label">Lease End:</span>
                <span className="info-value">{tenantData?.leaseEnd ? new Date(tenantData.leaseEnd).toLocaleDateString() : 'Not set'}</span>
              </div>
            </div>
            <div className="card-footer-action-group">
              <button className="btn-flex-1">View Lease</button>
              <button className="btn-flex-1">Renew Lease</button>
            </div>
          </div>
        </div>

        <div className="content-card">
          <h3 className="card-title card-title-with-icon">
            <span className="card-title-icon">📢</span>
            Building Announcements
          </h3>
          <p className="card-description">
            Stay updated with the latest announcements from building management.
          </p>
          
          {announcementsLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Loading announcements...</p>
            </div>
          ) : announcements.length > 0 ? (
            <div className="announcements-list">
              {announcements.map((announcement, index) => (
                <div key={announcement.id || index} className="announcement-card">
                  <div className="announcement-card-header">
                    <h4 className="announcement-card-title">{announcement.title}</h4>
                    <span className="announcement-card-date">
                      {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="announcement-card-content">
                    <p>{announcement.message}</p>
                  </div>
                  <div className="announcement-card-footer">
                    <span className="announcement-card-type">📢 Announcement</span>
                    {announcement.metadata?.createdByName && (
                      <span className="announcement-card-author">
                        By: {announcement.metadata.createdByName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📢</div>
              <h4 className="empty-state-title">No Announcements</h4>
              <p className="empty-state-text">There are no announcements at the moment. Check back later for updates!</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal.open && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            closePaymentModalWrapper();
          }
        }}>
          <div className="modal-container payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header payment-modal-header">
              <div className="modal-title-content payment-modal-title-content">
                <span className="modal-icon payment-modal-icon">💳</span>
                <h3 className="modal-title payment-modal-title">Make Payment</h3>
              </div>
              <button 
                aria-label="Close" 
                className="modal-close payment-modal-close" 
                onClick={closePaymentModalWrapper}
                disabled={paymentModal.loading}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body payment-modal-body">
              <form onSubmit={handlePaymentSubmitWrapper} className="modal-form payment-form">
                <div className="payment-summary">
                  <div className="payment-summary-item">
                    <span className="payment-summary-label">Outstanding Balance:</span>
                    <span className="payment-summary-value payment-summary-value--red">
                      {formatCurrency(billingInfo?.outstandingBalance || 0)}
                    </span>
                  </div>
                  <div className="payment-summary-item">
                    <span className="payment-summary-label">Monthly Rent:</span>
                    <span className="payment-summary-value">
                      {formatCurrency(billingInfo?.monthlyRent || 0)}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="amount" className="form-label">
                    Payment Amount <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    id="amount"
                    className="form-input"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="paymentMethod" className="form-label">
                    Payment Method <span className="required">*</span>
                  </label>
                  <select
                    id="paymentMethod"
                    className="form-select"
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    required
                  >
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="description" className="form-label">Description</label>
                  <textarea
                    id="description"
                    className="form-textarea"
                    value={paymentForm.description}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description (e.g., Rent for January 2024)"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="referenceNumber" className="form-label">Reference Number</label>
                  <input
                    type="text"
                    id="referenceNumber"
                    className="form-input"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    placeholder="Transaction reference (optional)"
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer payment-modal-footer">
              <button 
                type="button" 
                className="modal-btn modal-btn-secondary"
                onClick={closePaymentModalWrapper}
                disabled={paymentModal.loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="modal-btn modal-btn-primary"
                onClick={handlePaymentSubmitWrapper}
                disabled={paymentModal.loading || !paymentForm.amount}
              >
                {paymentModal.loading ? (
                  <>
                    <div className="modal-btn-loading"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    💳 Process Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Contact Modal */}
      {emergencyContactModal.open && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeEmergencyContactModal();
          }
        }}>
          <div className="modal-container payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header payment-modal-header">
              <div className="modal-title-content payment-modal-title-content">
                <span className="modal-icon payment-modal-icon">🚨</span>
                <h3 className="modal-title payment-modal-title">Update Emergency Contact</h3>
              </div>
              <button 
                aria-label="Close" 
                className="modal-close payment-modal-close" 
                onClick={closeEmergencyContactModal}
                disabled={emergencyContactModal.loading}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body payment-modal-body">
              <form onSubmit={handleEmergencyContactSubmit} className="modal-form payment-form">
                <div className="form-group">
                  <label htmlFor="contactName" className="form-label">
                    Contact Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    className="form-input"
                    value={emergencyContactForm.name}
                    onChange={(e) => setEmergencyContactForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter emergency contact name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contactPhone" className="form-label">
                    Phone Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="contactPhone"
                    className="form-input"
                    value={emergencyContactForm.phone}
                    onChange={(e) => setEmergencyContactForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contactRelationship" className="form-label">
                    Relationship <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="contactRelationship"
                    className="form-input"
                    value={emergencyContactForm.relationship}
                    onChange={(e) => setEmergencyContactForm(prev => ({ ...prev, relationship: e.target.value }))}
                    placeholder="e.g., Parent, Sibling, Friend"
                    required
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer payment-modal-footer">
              <button 
                type="button" 
                className="modal-btn modal-btn-secondary"
                onClick={closeEmergencyContactModal}
                disabled={emergencyContactModal.loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="modal-btn modal-btn-primary"
                onClick={handleEmergencyContactSubmit}
                disabled={emergencyContactModal.loading || !emergencyContactForm.name || !emergencyContactForm.phone || !emergencyContactForm.relationship}
              >
                {emergencyContactModal.loading ? (
                  <>
                    <div className="modal-btn-loading"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    🚨 Update Contact
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDashboard;