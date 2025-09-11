import { useState, useEffect } from 'react';
import { maintenanceService } from '../services/maintenanceService';
import { useAuth } from '../context/AuthContext';
import '../components/AdminMaintenancePage.css';

const AdminMaintenancePage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [stats, setStats] = useState({ pending: 0, ongoing: 0, fixed: 0, total: 0 });
  const [updating, setUpdating] = useState(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all maintenance requests
      const requestsData = await maintenanceService.list();
      setRequests(requestsData || []);
      
      // Load statistics
      const statsData = await maintenanceService.getStats();
      setStats(statsData);
      
    } catch (err) {
      console.error('Error loading maintenance requests:', err);
      setError('Failed to load maintenance requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    // Filter requests based on status
    if (statusFilter === 'All') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(req => req.status === statusFilter));
    }
  }, [requests, statusFilter]);

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      setUpdating(requestId);
      await maintenanceService.updateStatus(requestId, newStatus);
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId ? { ...req, status: newStatus } : req
        )
      );
      
      // Update stats
      const newStats = { ...stats };
      const oldRequest = requests.find(req => req.id === requestId);
      if (oldRequest) {
        newStats[oldRequest.status.toLowerCase()]--;
        newStats[newStatus.toLowerCase()]++;
      }
      setStats(newStats);
      
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'Ongoing': return 'status-ongoing';
      case 'Fixed': return 'status-fixed';
      default: return 'status-default';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return 'priority-low';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="admin-maintenance-page">
        <div className="loading">Loading maintenance requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-maintenance-page">
        <div className="error-message">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button onClick={loadRequests} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-maintenance-page">
      {/* Header */}
      <header className="page-header">
        <h1>Maintenance Management</h1>
        <p className="page-subtitle">
          Manage and track all maintenance requests from tenants.
        </p>
      </header>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Requests</h3>
            <p className="stat-number">{stats.total}</p>
          </div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending</h3>
            <p className="stat-number">{stats.pending}</p>
          </div>
        </div>
        <div className="stat-card stat-ongoing">
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <h3>Ongoing</h3>
            <p className="stat-number">{stats.ongoing}</p>
          </div>
        </div>
        <div className="stat-card stat-fixed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Fixed</h3>
            <p className="stat-number">{stats.fixed}</p>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filter-section">
        <h3>Filter by Status</h3>
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${statusFilter === 'All' ? 'active' : ''}`}
            onClick={() => setStatusFilter('All')}
          >
            All ({requests.length})
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'Pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Pending')}
          >
            Pending ({stats.pending})
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'Ongoing' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Ongoing')}
          >
            Ongoing ({stats.ongoing})
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'Fixed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Fixed')}
          >
            Fixed ({stats.fixed})
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="requests-section">
        <h3>Maintenance Requests</h3>
        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <p>No maintenance requests found for the selected filter.</p>
          </div>
        ) : (
          <div className="requests-grid">
            {filteredRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <div className="request-id">#{request.id}</div>
                  <div className="request-status">
                    <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                </div>
                
                <div className="request-content">
                  <h4 className="request-title">{request.title}</h4>
                  <p className="request-description">{request.description}</p>
                  
                  <div className="request-details">
                    <div className="detail-item">
                      <span className="detail-label">Room:</span>
                      <span className="detail-value">Room {request.roomId}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Priority:</span>
                      <span className={`priority-badge ${getPriorityBadgeClass(request.priority)}`}>
                        {request.priority}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Submitted:</span>
                      <span className="detail-value">{formatDate(request.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="request-actions">
                  {request.status === 'Pending' && (
                    <>
                      <button 
                        className="action-btn action-start"
                        onClick={() => handleStatusUpdate(request.id, 'Ongoing')}
                        disabled={updating === request.id}
                      >
                        {updating === request.id ? 'Updating...' : 'Start Work'}
                      </button>
                      <button 
                        className="action-btn action-fix"
                        onClick={() => handleStatusUpdate(request.id, 'Fixed')}
                        disabled={updating === request.id}
                      >
                        Mark as Fixed
                      </button>
                    </>
                  )}
                  
                  {request.status === 'Ongoing' && (
                    <>
                      <button 
                        className="action-btn action-back"
                        onClick={() => handleStatusUpdate(request.id, 'Pending')}
                        disabled={updating === request.id}
                      >
                        Back to Pending
                      </button>
                      <button 
                        className="action-btn action-fix"
                        onClick={() => handleStatusUpdate(request.id, 'Fixed')}
                        disabled={updating === request.id}
                      >
                        Mark as Fixed
                      </button>
                    </>
                  )}
                  
                  {request.status === 'Fixed' && (
                    <button 
                      className="action-btn action-reopen"
                      onClick={() => handleStatusUpdate(request.id, 'Ongoing')}
                      disabled={updating === request.id}
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMaintenancePage;
