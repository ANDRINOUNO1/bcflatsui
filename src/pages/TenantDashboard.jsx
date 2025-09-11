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

  // Helper function to get floor suffix
  const getFloorSuffix = (floor) => {
    if (floor === 1) return 'st';
    if (floor === 2) return 'nd';
    if (floor === 3) return 'rd';
    return 'th';
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

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
        <h1>Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'Tenant'}!</h1>
        <p>Here's an overview of your home and account.</p>
      </div>

      {/* Property Information & Events Row */}
      <div className="dashboard-row">
        <div className="dashboard-card property-card">
          <h3>🏠 Property Information</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">BUILDING:</span>
              <span className="info-value">{roomData?.building || 'Main Building'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">ROOM:</span>
              <span className="info-value">{roomData?.roomNumber || 'Main Building'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">FLOOR:</span>
              <span className="info-value">{roomData?.floor ? `${roomData.floor}${getFloorSuffix(roomData.floor)}` : 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">BED NUMBER:</span>
              <span className="info-value">{tenantData?.bedNumber || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">CHECK-IN DATE:</span>
              <span className="info-value">
                {tenantData?.checkInDate ? new Date(tenantData.checkInDate).toLocaleDateString() : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        <div className="dashboard-card events-card">
          <h3>📅 Upcoming Events / Notices</h3>
          <ul className="events-list">
            <li>Fire drill — next week</li>
            <li>Water maintenance — floor schedule</li>
            <li>Community meeting — {roomData?.floor ? `${getFloorSuffix(roomData.floor)} floor` : 'Building'}</li>
          </ul>
        </div>
      </div>

      {/* Financial Information Row */}
      <div className="dashboard-row">
        <div className="dashboard-card financial-card">
          <h3>💰 Financial Information</h3>
          <div className="financial-overview">
            <div className="financial-item">
              <span className="info-label">OUTSTANDING BALANCE:</span>
              <span className="info-value total-amount">
                {formatCurrency(tenantData?.outstandingBalance || 0)}
              </span>
            </div>
            <div className="financial-item">
              <span className="info-label">YOUR RENT (per bed):</span>
              <span className="info-value">{formatCurrency(tenantData?.monthlyRent)}</span>
            </div>
            <div className="financial-item">
              <span className="info-label">YOUR UTILITIES (per bed):</span>
              <span className="info-value">{formatCurrency(tenantData?.utilities)}</span>
            </div>
            <div className="financial-item">
              <span className="info-label">TOTAL MONTHLY (per bed):</span>
              <span className="info-value total-amount">
                {formatCurrency((tenantData?.monthlyRent || 0) + (tenantData?.utilities || 0))}
              </span>
            </div>
            <div className="financial-item">
              <span className="info-label">DEPOSIT PAID:</span>
              <span className="info-value">{formatCurrency(tenantData?.deposit)}</span>
            </div>
            <div className="financial-item">
              <span className="info-label">OUTSTANDING:</span>
              <span className="info-value outstanding">₱0.00</span>
            </div>
            <div className="financial-item">
              <span className="info-label">NEXT DUE:</span>
              <span className="info-value">1st of next month</span>
            </div>
          </div>
          <div className="action-buttons">
            <button className="btn-primary">Pay Now</button>
            <button className="btn-secondary">Billing Breakdown</button>
          </div>
        </div>
      </div>

      {/* Room Details Row */}
      <div className="dashboard-row">
        <div className="dashboard-card room-details-card">
          <h3>🏠 Room Details</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">ROOM STATUS:</span>
              <span className={`info-value status-${roomData?.status?.toLowerCase()}`}>
                {roomData?.status || 'Unknown'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">TOTAL BEDS:</span>
              <span className="info-value">{roomData?.totalBeds || 4}</span>
            </div>
            <div className="info-item">
              <span className="info-label">OCCUPIED BEDS:</span>
              <span className="info-value">{roomData?.occupiedBeds || 0}</span>
            </div>
            <div className="info-item">
              <span className="info-label">OCCUPANCY RATE:</span>
              <span className="info-value">{roomData?.occupancyRate || 0}%</span>
            </div>
            <div className="info-item">
              <span className="info-label">ROOM DESCRIPTION:</span>
              <span className="info-value description">
                {roomData?.description || 'Standard student accommodation'}
              </span>
            </div>
          </div>
          {roomData?.amenities && roomData.amenities.length > 0 && (
            <div className="amenities-section">
              <h4>🏠 Room Amenities</h4>
              <div className="amenities-list">
                {roomData.amenities.map((amenity, index) => (
                  <span key={index} className="amenity-tag">{amenity}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance & Support Row */}
      <div className="dashboard-row">
        <div className="dashboard-card maintenance-card">
          <h3>🔧 Maintenance & Support</h3>
          <p className="maintenance-description">
            Submit repair requests and track progress for your room.
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
                    <div className="request-header">
                      <span className="request-title">{request.title}</span>
                      <span className={`request-status status-${request.status.toLowerCase()}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="request-details">
                      <p className="request-description">{request.description}</p>
                      <p className="request-priority">Priority: {request.priority}</p>
                      <p className="request-date">Submitted: {new Date(request.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contact Row */}
      <div className="dashboard-row">
        <div className="dashboard-card emergency-card">
          <h3>🚨 Emergency Contact</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">CONTACT NAME:</span>
              <span className="info-value">
                {tenantData?.emergencyContact?.name || 'Not provided'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">PHONE:</span>
              <span className="info-value">
                {tenantData?.emergencyContact?.phone || 'Not provided'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">RELATIONSHIP:</span>
              <span className="info-value">
                {tenantData?.emergencyContact?.relationship || 'Not provided'}
              </span>
            </div>
          </div>
          <div className="action-buttons">
            <button className="btn-secondary">Update Contact Info</button>
          </div>
        </div>
      </div>

      {/* Lease & Documents Row */}
      <div className="dashboard-row">
        <div className="dashboard-card documents-card">
          <h3>📄 Lease & Document Management</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">LEASE STATUS:</span>
              <span className={`info-value status-${tenantData?.leaseEnd ? (new Date(tenantData.leaseEnd) > new Date() ? 'active' : 'expired') : 'unknown'}`}>
                {tenantData?.leaseEnd ? (new Date(tenantData.leaseEnd) > new Date() ? 'Active' : 'Expired') : 'Not set'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">LEASE START:</span>
              <span className="info-value">
                {tenantData?.leaseStart ? new Date(tenantData.leaseStart).toLocaleDateString() : 'Not set'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">LEASE END:</span>
              <span className="info-value">
                {tenantData?.leaseEnd ? new Date(tenantData.leaseEnd).toLocaleDateString() : 'Not set'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">SPECIAL REQUIREMENTS:</span>
              <span className="info-value description">
                {tenantData?.specialRequirements || 'None specified'}
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
          <h3>👥 Community & Events</h3>
          <ul className="community-list">
            <li>Building announcement — Welcome to {roomData?.building || 'BCFlats'}!</li>
            <li>Community board — Buy/Sell/Share</li>
            <li>Event calendar — Movie night on {roomData?.floor ? `${getFloorSuffix(roomData.floor)} floor` : 'ground floor'}</li>
            <li>Floor meeting — {roomData?.floor ? `${getFloorSuffix(roomData.floor)} floor` : 'Building'} residents</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;


