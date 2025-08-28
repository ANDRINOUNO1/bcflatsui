import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { maintenanceService } from '../services/maintenanceService';
import { tenantService } from '../services/tenantService';
import { roomService } from '../services/roomService';
import '../components/Dashboard.css';
import '../components/TenantDashboard.css';

const TenantDashboard = () => {
  const { user } = useAuth();
  const [tenantData, setTenantData] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTenantData = async () => {
      try {
        setLoading(true);
        
        // Fetch tenant information
        try {
          const tenantResponse = await tenantService.getTenantByAccountId(user?.id);
          if (tenantResponse) {
            setTenantData(tenantResponse);
            
            // Fetch room information if tenant has a room
            if (tenantResponse.roomId) {
              try {
                const roomResponse = await roomService.getRoomById(tenantResponse.roomId);
                setRoomData(roomResponse);
              } catch (roomError) {
                console.error('Error fetching room data:', roomError);
                // Continue without room data
              }
            }
          } else {
            console.log('No tenant record found for user:', user?.id);
            // Continue without tenant data
          }
        } catch (tenantError) {
          console.error('Error fetching tenant data:', tenantError);
          // Continue without tenant data
        }
        
        // Fetch maintenance requests
        try {
          if (tenantData?.id) {
            const maintenanceResponse = await maintenanceService.listByTenant(tenantData.id);
            setMaintenanceRequests(maintenanceResponse || []);
          } else {
            setMaintenanceRequests([]);
          }
        } catch (maintenanceError) {
          console.error('Error fetching maintenance requests:', maintenanceError);
          setMaintenanceRequests([]);
        }
        
      } catch (error) {
        console.error('Error fetching tenant data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchTenantData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="tenant-dashboard">
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  } 

  if (error) {
    return (
      <div className="tenant-dashboard">
        <div className="error-message">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show welcome message if no tenant data is available
  if (!tenantData && !loading) {
    return (
      <div className="tenant-dashboard">
        <div className="welcome-header">
          <h1>Welcome to BCFlats!</h1>
          <p>Your tenant dashboard will be available once your account is set up.</p>
        </div>
        
        <div className="dashboard-row">
          <div className="dashboard-card">
            <h3>Getting Started</h3>
            <p>Please contact the property management to complete your tenant registration and room assignment.</p>
            <div className="action-buttons">
              <button className="btn-primary">Contact Management</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-dashboard">
      {/* Welcome Header */}
      <div className="welcome-header">
        <h1>Welcome back!</h1>
        <p>Here's an overview of your home and account.</p>
      </div>

      {/* Property Information & Events Row */}
      <div className="dashboard-row">
        <div className="dashboard-card property-card">
          <h3>Property Information</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">ADDRESS:</span>
              <span className="info-value">{roomData?.building || 'Main Building'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">UNIT:</span>
              <span className="info-value">{roomData ? `Room ${roomData.roomNumber}` : 'Your room'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">LEASE:</span>
              <span className="info-value">
                {tenantData?.leaseStart ? new Date(tenantData.leaseStart).toLocaleDateString() : 'Not set'} — {tenantData?.leaseEnd ? new Date(tenantData.leaseEnd).toLocaleDateString() : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        <div className="dashboard-card events-card">
          <h3>Upcoming Events / Notices</h3>
          <ul className="events-list">
            <li>Fire drill — next week</li>
            <li>Water maintenance — floor schedule</li>
          </ul>
        </div>
      </div>

      {/* Financial Information Row */}
      <div className="dashboard-row">
        <div className="dashboard-card financial-card">
          <h3>Financial Information</h3>
          <div className="financial-overview">
            <div className="financial-item">
              <span className="info-label">OUTSTANDING:</span>
              <span className="info-value outstanding">$0.00</span>
            </div>
            <div className="financial-item">
              <span className="info-label">NEXT DUE:</span>
              <span className="info-value">1st of next month</span>
            </div>
          </div>
          <div className="action-buttons">
            <button className="btn-primary">Pay Now</button>
            <button className="btn-secondary">Manage Payment Methods</button>
          </div>
        </div>
      </div>

      {/* Maintenance & Support Row */}
      <div className="dashboard-row">
        <div className="dashboard-card maintenance-card">
          <h3>Maintenance & Support</h3>
          <p className="maintenance-description">
            Submit repair requests and track progress.
          </p>
          <div className="action-buttons">
            <Link to="/tenant/maintenance" className="btn-primary">Request Maintenance</Link>
            <Link to="/tenant/maintenance" className="btn-secondary">View Requests</Link>
          </div>
          {maintenanceRequests.length > 0 && (
            <div className="recent-requests">
              <h4>Recent Requests</h4>
              <div className="requests-list">
                {maintenanceRequests.slice(0, 3).map((request) => (
                  <div key={request.id} className="request-item">
                    <span className="request-title">{request.title}</span>
                    <span className={`request-status status-${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lease & Documents Row */}
      <div className="dashboard-row">
        <div className="dashboard-card documents-card">
          <h3>Lease & Document Management</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Lease Status:</span>
              <span className="info-value">
                {tenantData?.leaseEnd ? (new Date(tenantData.leaseEnd) > new Date() ? 'Active' : 'Expired') : 'Not set'}
              </span>
            </div>
          </div>
          <div className="action-buttons">
            <button className="btn-secondary">View Lease</button>
            <button className="btn-secondary">Renew Lease</button>
          </div>
        </div>
      </div>

      {/* Community & Events Row */}
      <div className="dashboard-row">
        <div className="dashboard-card community-card">
          <h3>Community & Events</h3>
          <ul className="community-list">
            <li>Building announcement — Welcome!</li>
            <li>Community board — Buy/Sell/Share</li>
            <li>Event calendar — Movie night</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;


