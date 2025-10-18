import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { maintenanceService } from '../services/maintenanceService';
import { tenantService } from '../services/tenantService';
import { roomService } from '../services/roomService';
import { paymentService } from '../services/paymentService';
import '../components/TenantDashboard.css';

const TenantDashboard = () => {
  const { user } = useAuth();
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

  const fetchTenantData = useCallback(async () => {
    try {
        setLoading(true);
        setBillingError(false);
        setRoomError(false);

        // 1. Fetch the primary tenant data first
        const tenantResponse = await tenantService.getTenantByAccountId(user?.id);

        if (tenantResponse) {
            setTenantData(tenantResponse);

            // 2. Run all subsequent, independent fetches in parallel
            await Promise.all([
                tenantService.getTenantBillingInfo(tenantResponse.id)
                    .then(setBillingInfo)
                    .catch(error => {
                        console.error('Error fetching billing info:', error);
                        setBillingError(true);
                    }),

                tenantResponse.roomId ? roomService.getRoomById(tenantResponse.roomId)
                    .then(setRoomData)
                    .catch(error => {
                        console.error('Error fetching room data:', error);
                        setRoomError(true);
                    }) : Promise.resolve(),

                maintenanceService.listByTenant(tenantResponse.id)
                    .then(response => setMaintenanceRequests(response || []))
                    .catch(maintenanceError => {
                        console.error('Error fetching maintenance requests:', maintenanceError);
                        setMaintenanceRequests([]);
                    })
            ]);
        }
    } catch (error) {
        console.error('Error fetching primary tenant data:', error);
        setErrorModal({
            open: true,
            title: 'Failed to load your dashboard',
            message: 'Please try again in a moment.',
            details: error?.response?.data?.message || error.message || 'Unknown error'
        });
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  }, [user?.id]);

  // Payment functions
  const fetchPaymentHistory = useCallback(async () => {
    if (!tenantData?.id) return;
    
    try {
      setPaymentHistoryLoading(true);
      const history = await paymentService.getPaymentsByTenant(tenantData.id, 20);
      setPaymentHistory(history || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    } finally {
      setPaymentHistoryLoading(false);
    }
  }, [tenantData?.id]);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!tenantData?.id) return;

    try {
      setPaymentModal(prev => ({ ...prev, loading: true }));
      
      const paymentData = {
        tenantId: tenantData.id,
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        description: paymentForm.description || 'Rent payment',
        referenceNumber: paymentForm.referenceNumber || null,
        status: 'Pending' // Create as pending payment
      };

      await paymentService.createPendingPayment(tenantData.id, paymentData);
      
      // Refresh data after successful payment submission
      await fetchTenantData();
      await fetchPaymentHistory();
      
      // Reset form and close modal
      setPaymentForm({
        amount: '',
        paymentMethod: 'gcash',
        description: '',
        referenceNumber: ''
      });
      setPaymentModal({ open: false, loading: false });
      
      // Show success message
      setErrorModal({
        open: true,
        title: 'Payment Submitted',
        message: 'Your payment has been submitted and is pending confirmation from accounting.',
        details: 'You will be notified once the payment is confirmed and your balance is updated.'
      });
      
    } catch (error) {
      console.error('Error submitting payment:', error);
      setErrorModal({
        open: true,
        title: 'Payment Submission Failed',
        message: 'Unable to submit your payment. Please try again.',
        details: error?.response?.data?.message || error.message || 'Unknown error'
      });
    } finally {
      setPaymentModal(prev => ({ ...prev, loading: false }));
    }
  };

  const openPaymentModal = () => {
    setPaymentForm(prev => ({
      ...prev,
      amount: billingInfo?.outstandingBalance || ''
    }));
    setPaymentModal({ open: true, loading: false });
  };

  const closePaymentModal = () => {
    setPaymentModal({ open: false, loading: false });
    setPaymentForm({
      amount: '',
      paymentMethod: 'gcash',
      description: '',
      referenceNumber: ''
    });
  };

  useEffect(() => {
    if (user?.id) {
      fetchTenantData();
    }
  }, [user, fetchTenantData]);

  useEffect(() => {
    if (showPaymentHistory && tenantData?.id) {
      fetchPaymentHistory();
    }
  }, [showPaymentHistory, tenantData?.id, fetchPaymentHistory]);

  // Handle body scroll when modals are open
  useEffect(() => {
    if (paymentModal.open || errorModal.open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [paymentModal.open, errorModal.open]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTenantData();
  };

  const getFloorSuffix = (floor) => {
    const n = Number(floor);
    if (!Number.isFinite(n)) return '';
    const j = n % 10, k = n % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(toNumber(amount));
  };

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
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-header">
              <div className="error-modal-title-content">
                <span className="error-modal-icon">⚠️</span>
                <h3 className="error-modal-title">{errorModal.title || 'Something went wrong'}</h3>
              </div>
              <button aria-label="Close" className="error-modal-close" onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}>×</button>
            </div>
            <div className="error-modal-body">
              {errorModal.message && <p className="error-modal-message">{errorModal.message}</p>}
              {errorModal.details && <pre className="error-modal-details">{errorModal.details}</pre>}
              <div className="error-modal-actions">
                <button onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })} className="error-modal-button">Close</button>
              </div>
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
            <button
              onClick={handleRefresh}
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
                  {billingError ? 'Unavailable' : formatCurrency(billingInfo?.outstandingBalance || 0)}
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
                  {billingError ? 'Unavailable' : formatCurrency(billingInfo?.outstandingBalance || 0)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="card-actions-footer">
            <button 
              className="btn-action btn-action--primary"
              onClick={openPaymentModal}
              disabled={billingError || !billingInfo?.outstandingBalance}
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
                {roomError ? 'Unavailable' : roomData?.floor ? `${roomData.floor}${getFloorSuffix(roomData.floor)}` : 'N/A'}
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
              <button className="btn-full-width">
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
            <span className="card-title-icon">👥</span>
            Community & Events
          </h3>
          <div className="community-grid">
            <div className="community-card community-card--blue">
              <h4 className="community-card-title">📢 Building Announcements</h4>
              <p className="community-card-text">Welcome to {roomData?.building || 'BCFlats'}!</p>
            </div>
            <div className="community-card community-card--green">
              <h4 className="community-card-title">🛒 Community Board</h4>
              <p className="community-card-text">Buy/Sell/Share items with neighbors</p>
            </div>
            <div className="community-card community-card--purple">
              <h4 className="community-card-title">🎬 Event Calendar</h4>
              <p className="community-card-text">Movie night on {roomData?.floor ? `${getFloorSuffix(roomData.floor)} floor` : 'ground floor'}</p>
            </div>
            <div className="community-card community-card--orange">
              <h4 className="community-card-title">🏠 Floor Meeting</h4>
              <p className="community-card-text">{roomData?.floor ? `${getFloorSuffix(roomData.floor)} floor` : 'Building'} residents meeting</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal.open && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            closePaymentModal();
          }
        }}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-header">
              <div className="payment-modal-title-content">
                <span className="payment-modal-icon">💳</span>
                <h3 className="payment-modal-title">Make Payment</h3>
              </div>
              <button 
                aria-label="Close" 
                className="payment-modal-close" 
                onClick={closePaymentModal}
                disabled={paymentModal.loading}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="payment-form">
              <div className="payment-form-body">
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
              </div>
              
              <div className="payment-form-footer">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={closePaymentModal}
                  disabled={paymentModal.loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={paymentModal.loading || !paymentForm.amount}
                >
                  {paymentModal.loading ? (
                    <>
                      <div className="btn-spinner"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span>💳</span>
                      Process Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDashboard;