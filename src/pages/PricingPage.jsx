import { useState, useEffect } from 'react';
import { roomService } from '../services/roomService';
import { useAuth } from '../context/AuthContext';
import '../components/PricingPage.css';

const PricingPage = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editForm, setEditForm] = useState({
    monthlyRent: '',
    utilities: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const roomsData = await roomService.getAllRooms();
      setRooms(roomsData || []);
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Failed to load rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleEditClick = (room) => {
    setEditingRoom(room);
    setEditForm({
      monthlyRent: room.monthlyRent?.toString() || '',
      utilities: room.utilities?.toString() || ''
    });
    setMessage('');
  };

  const handleCancelEdit = () => {
    setEditingRoom(null);
    setEditForm({ monthlyRent: '', utilities: '' });
    setMessage('');
  };

  const handleSaveEdit = async () => {
    if (!editingRoom) return;

    // Validate inputs
    const monthlyRent = parseFloat(editForm.monthlyRent);
    const utilities = parseFloat(editForm.utilities);

    if (isNaN(monthlyRent) || isNaN(utilities) || monthlyRent < 0 || utilities < 0) {
      setMessage('Please enter valid positive numbers for pricing.');
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      
      await roomService.updateRoomPricing(editingRoom.id, {
        monthlyRent,
        utilities
      });

      // Update local state
      setRooms(prev => 
        prev.map(room => 
          room.id === editingRoom.id 
            ? { ...room, monthlyRent, utilities }
            : room
        )
      );

      setMessage('✅ Pricing updated successfully!');
      setEditingRoom(null);
      setEditForm({ monthlyRent: '', utilities: '' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
      
    } catch (err) {
      console.error('Error updating pricing:', err);
      setMessage('❌ Failed to update pricing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const getFloorSuffix = (floor) => {
    if (floor === 1) return 'st';
    if (floor === 2) return 'nd';
    if (floor === 3) return 'rd';
    return 'th';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Available': return 'status-available';
      case 'Occupied': return 'status-occupied';
      case 'Maintenance': return 'status-maintenance';
      default: return 'status-unknown';
    }
  };

  if (loading) {
    return (
      <div className="pricing-page">
        <div className="loading">Loading room pricing...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pricing-page">
        <div className="error-message">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button onClick={loadRooms} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      {/* Header */}
      <header className="page-header">
        <h1>Room Pricing Management</h1>
        <p className="page-subtitle">
          Manage pricing for all rooms in the building.
        </p>
      </header>

      {/* Message */}
      {message && (
        <div className={`alert-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Pricing Table */}
      <div className="pricing-section">
        <div className="table-wrapper">
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Floor</th>
                <th>Building</th>
                <th>Status</th>
                <th>Rent per Bed</th>
                <th>Utilities per Bed</th>
                <th>Total per Bed</th>
                <th>Room Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td data-label="Room" className="room-cell">
                  <strong>Room {room.roomNumber}</strong>
                </td>
                <td data-label="Floor">{room.floor}{getFloorSuffix(room.floor)}</td>
                <td data-label="Building">{room.building}</td>
                <td data-label="Status">
                  <span className={`status-badge ${getStatusBadgeClass(room.status)}`}>
                    {room.status}
                  </span>
                </td>
                <td data-label="Rent per Bed" className="price-cell">
                  {editingRoom?.id === room.id ? (
                    <input
                      type="number"
                      value={editForm.monthlyRent}
                      onChange={(e) => setEditForm({ ...editForm, monthlyRent: e.target.value })}
                      className="price-input"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  ) : (
                    formatCurrency(room.monthlyRent)
                  )}
                </td>
                <td data-label="Utilities per Bed" className="price-cell">
                  {editingRoom?.id === room.id ? (
                    <input
                      type="number"
                      value={editForm.utilities}
                      onChange={(e) => setEditForm({ ...editForm, utilities: e.target.value })}
                      className="price-input"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  ) : (
                    formatCurrency(room.utilities)
                  )}
                </td>
                <td data-label="Total per Bed" className="price-cell total-cell">
                {formatCurrency(parseFloat(room.monthlyRent || 0) + parseFloat(room.utilities || 0))}
                </td>
                <td data-label="Room Total" className="price-cell room-total-cell">
                  {formatCurrency((parseFloat(room.monthlyRent || 0) + parseFloat(room.utilities || 0)) * 4)}
                </td>
                <td data-label="Actions" className="actions-cell">
                  {editingRoom?.id === room.id ? (
                    <div className="edit-actions">
                      <button
                        className="action-btn save-btn"
                        onClick={handleSaveEdit}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="action-btn cancel-btn"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="action-btn edit-btn"
                      onClick={() => handleEditClick(room)}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {/* Summary Section */}
      <div className="summary-section">
        <h3>Pricing Summary</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <h4>Average Rent per Bed</h4>
            <p className="summary-value">
              {formatCurrency(
                rooms.reduce((sum, room) => sum + (room.monthlyRent || 0), 0) / rooms.length
              )}
            </p>
          </div>
          <div className="summary-card">
            <h4>Average Utilities per Bed</h4>
            <p className="summary-value">
              {formatCurrency(
                rooms.reduce((sum, room) => sum + (room.utilities || 0), 0) / rooms.length
              )}
            </p>
          </div>
          <div className="summary-card">
            <h4>Average Total per Bed</h4>
            <p className="summary-value">
              {formatCurrency(
                rooms.reduce((sum, room) => sum + (room.monthlyRent || 0) + (room.utilities || 0), 0) / rooms.length
              )}
            </p>
          </div>
          <div className="summary-card">
            <h4>Total Monthly Revenue</h4>
            <p className="summary-value">
              {formatCurrency(
                rooms.reduce((sum, room) => sum + ((room.monthlyRent || 0) + (room.utilities || 0)) * 4, 0)
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
