import React, { useState, useEffect } from 'react';
import { roomService } from '../services/roomService';
import { tenantService } from '../services/tenantService';
import { useAuth } from '../context/AuthContext';
import '../components/Rooms.css';

const RoomPage = () => {
    const { user } = useAuth();
    const [allRooms, setAllRooms] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [floorFilter, setFloorFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [showRoomDetails, setShowRoomDetails] = useState(false);
    const [showAddTenant, setShowAddTenant] = useState(false);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [pricingData, setPricingData] = useState({
        monthlyRent: '',
        utilities: ''
    });
    const [newTenant, setNewTenant] = useState({
        accountId: '',
        email: '',
        password: '',
        bedNumber: 1,
        monthlyRent: '',
        utilities: '',
        deposit: '',
        emergencyContact: { name: '', phone: '', relationship: '' },
        specialRequirements: ''
    });

    // Check if user is admin
    const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

    useEffect(() => {
        fetchRooms();
    }, []);

    // Debug modal state
    useEffect(() => {
        console.log('Modal states changed:', {
            showRoomDetails,
            showAddTenant,
            showPricingModal,
            selectedRoom: selectedRoom?.room?.id
        });
    }, [showRoomDetails, showAddTenant, showPricingModal, selectedRoom]);

    // Recompute visible rooms whenever filter or allRooms changes
    useEffect(() => {
        if (floorFilter === 'all') {
            setRooms(allRooms);
        } else {
            setRooms(allRooms.filter(r => String(r.floor) === String(floorFilter)));
        }
    }, [floorFilter, allRooms]);
const handleOpenAddTenantModal = () => {
    console.log('Opening Add Tenant modal for room:', selectedRoom?.room?.id);
    
    // Reset tenant form
    const resetTenant = {
        accountId: '',
        email: '',
        password: '',
        bedNumber: 1,
        monthlyRent: '',
        utilities: '',
        deposit: '',
        emergencyContact: { name: '', phone: '', relationship: '' },
        specialRequirements: ''
    };
    
    setNewTenant(resetTenant);
    loadRoomPricing();
    
    // Add a small delay to ensure state updates
    setTimeout(() => {
        setShowAddTenant(true);
        console.log('Add Tenant modal state set to true, showAddTenant:', true);
    }, 100);
};
    const fetchRooms = async () => {
        try {
            setLoading(true);
            console.log(' RoomPage: Fetching rooms...');
            // Always fetch all rooms; filtering is client-side to avoid clearing
            const roomsData = await roomService.getAllRooms();
            console.log(' RoomPage: Rooms fetched successfully:', roomsData.length);
            setAllRooms(roomsData);
            // Keep selection if it still exists
            if (selectedRoom) {
                const stillExists = roomsData.some(r => r.id === selectedRoom?.room?.id || r.id === selectedRoom?.id);
                if (!stillExists) setSelectedRoom(null);
            }
        } catch (error) {
            console.error('❌ RoomPage: Error fetching rooms:', error);
            if (error.response?.status === 401) {
                console.log(' RoomPage: Authentication error, showing empty state');
                setAllRooms([]);
                setRooms([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const floors = Array.from(new Set(allRooms.map(r => r.floor))).sort((a, b) => a - b);
    const filteredRooms = floorFilter === 'all' ? rooms : rooms; // rooms already filtered via effect

    const handleRoomClick = async (room) => {
        console.log('Room clicked:', room);
        try {
            const bedStatus = await roomService.getRoomBedStatus(room.id);
            console.log('Bed status fetched:', bedStatus);
            setSelectedRoom(bedStatus);
            setShowRoomDetails(true);
            console.log('Modal should be open now');
        } catch (error) {
            console.error('Error fetching room details:', error);
        }
    };

    const handlePricingClick = (room) => {
        console.log('Pricing clicked for room:', room);
        setPricingData({
            monthlyRent: (room.monthlyRent || 0).toString(),
            utilities: (room.utilities || 0).toString()
        });
        setSelectedRoom({ room });
        setShowPricingModal(true);
        console.log('Pricing modal should be open now');
    };

    const handleUpdatePricing = async () => {
        if (!selectedRoom?.room?.id) return;

        try {
            await roomService.updateRoomPricing(selectedRoom.room.id, {
                monthlyRent: parseFloat(pricingData.monthlyRent),
                utilities: parseFloat(pricingData.utilities)
            });
            
            setShowPricingModal(false);
            await fetchRooms();
            alert('Pricing updated successfully!');
        } catch (error) {
            console.error('Error updating pricing:', error);
            alert('Error updating pricing: ' + (error.response?.data?.message || error.message));
        }
    };


    const handleAddTenant = async () => {
        const hasAccountId = !!newTenant.accountId;
        const hasCreds = newTenant.email && newTenant.password && newTenant.password.length >= 6;
        if ((!hasAccountId && !hasCreds) || !newTenant.monthlyRent) {
            alert('Please provide Account ID or Email + Password (6+ chars), and Monthly Rent');
            return;
        }

        try {
            const payload = {
                ...newTenant,
                roomId: selectedRoom.room.id,
                accountId: newTenant.accountId ? parseInt(newTenant.accountId) : undefined,
                bedNumber: parseInt(newTenant.bedNumber) || 1,
                monthlyRent: parseFloat(newTenant.monthlyRent) || 0,
                utilities: parseFloat(newTenant.utilities) || 0,
                deposit: parseFloat(newTenant.deposit) || 0,
            };
            // If creating via email/password, ensure accountId is not sent
            if (hasCreds) {
                delete payload.accountId;
            }
            
            console.log('Creating tenant with payload:', payload);
            const result = await tenantService.createTenant(payload);
            
            // Store the created tenant's accountId for navigation if needed
            if (result && result.accountId) {
                console.log('Created tenant with accountId:', result.accountId);
            }
            
            setShowAddTenant(false);
            setNewTenant({
                accountId: '',
                email: '',
                password: '',
                bedNumber: 1,
                monthlyRent: '',
                utilities: '',
                deposit: '',
                emergencyContact: { name: '', phone: '', relationship: '' },
                specialRequirements: ''
            });
            await fetchRooms();
            const refreshed = (allRooms.find(r => r.id === selectedRoom.room.id));
            if (refreshed) handleRoomClick(refreshed);
        } catch (error) {
            console.error('Error adding tenant:', error);
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            alert('Error adding tenant: ' + msg);
        }
    };

    const loadRoomPricing = async () => {
        if (selectedRoom?.room) {
            setNewTenant(prev => ({
                ...prev,
                monthlyRent: (selectedRoom.room.monthlyRent || 0).toString(),
                utilities: (selectedRoom.room.utilities || 0).toString()
            }));
        }
    };

    const handleRemoveTenant = async (tenantId) => {
        if (!selectedRoom) return;

        try {
            await roomService.removeTenantFromRoom(selectedRoom.room.id, tenantId);
            await fetchRooms();
            const refreshed = (allRooms.find(r => r.id === selectedRoom.room.id));
            if (refreshed) handleRoomClick(refreshed);
        } catch (error) {
            console.error('Error removing tenant:', error);
            alert('Error removing tenant: ' + error.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Available': return '#4CAF50';
            case 'Partially Occupied': return '#FF9800';
            case 'Fully Occupied': return '#F44336';
            case 'Maintenance': return '#9C27B0';
            default: return '#757575';
        }
    };

    if (loading) {
        return <div className="rooms-loading">Loading rooms...</div>;
    }

    return (
        <div className="rooms-container">
            <div className="rooms-header">
                <h2>🏠 Room Management</h2>
                <p>Manage 8 floors (2nd-9th) with 9 rooms per floor - 72 total rooms</p>
                <div className="rooms-filters">
                    <label htmlFor="floorFilter">Floor:</label>
                    <select
                        id="floorFilter"
                        value={floorFilter}
                        onChange={(e) => setFloorFilter(e.target.value)}
                    >
                        <option value="all">All Floors (2nd-9th)</option>
                        {floors.map(f => (
                            <option key={f} value={f}>{f}{f === 1 ? 'st' : f === 2 ? 'nd' : f === 3 ? 'rd' : 'th'} Floor</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="rooms-content">
                <div className="rooms-grid">
                    {filteredRooms.map((room) => (
                        <div
                            key={room.id}
                            className={`room-card ${selectedRoom?.room.id === room.id ? 'selected' : ''}`}
                            onClick={() => handleRoomClick(room)}
                            style={{ borderColor: getStatusColor(room.status) }}
                        >
                            <div className="room-header">
                                <h3>Room {room.roomNumber}</h3>
                                <div className="room-badges">
                                    <span className={`status-badge ${room.status.toLowerCase().replace(' ', '-')}`}>
                                        {room.status}
                                    </span>
                                </div>
                            </div>
                            <div className="room-info">
                                <p><strong>Floor:</strong> {room.floor}{room.floor === 1 ? 'st' : room.floor === 2 ? 'nd' : room.floor === 3 ? 'rd' : 'th'}</p>
                                <p><strong>Building:</strong> {room.building}</p>
                                <p><strong>Rent per Bed:</strong> ₱{(room.monthlyRent || 0).toLocaleString()}</p>
                                <p><strong>Utilities per Bed:</strong> ₱{(room.utilities || 0).toLocaleString()}</p>
                                <p><strong>Total per Bed:</strong> ₱{(parseFloat(room.monthlyRent || 0) + parseFloat(room.utilities || 0)).toLocaleString()}</p>
                            </div>
                            <div className="room-occupancy">
                                <div className="bed-indicators">
                                    {[1, 2, 3, 4].map((bedNum) => (
                                        <div
                                            key={bedNum}
                                            className={`bed-indicator ${
                                                room.tenants?.some(t => t.bedNumber === bedNum) ? 'occupied' : 'available'
                                            }`}
                                        >
                                            {bedNum}
                                        </div>
                                    ))}
                                </div>
                                <p className="occupancy-text">
                                    {room.occupiedBeds}/{room.totalBeds} beds occupied
                                </p>
                            </div>
                            {isAdmin && (
                                <div className="room-actions">
                                    <button 
                                        className="btn-secondary small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePricingClick(room);
                                        }}
                                    >
                                        💰 Edit Pricing
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {selectedRoom && showRoomDetails && (
                    <div className="modal-overlay" onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowRoomDetails(false);
                        }
                    }}>
                        <div className="modal-container details-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header details-modal-header">
                                <div className="modal-title-content">
                                    <span className="modal-icon">🏠</span>
                                    <h3 className="modal-title">Room {selectedRoom.room.roomNumber} Details</h3>
                                </div>
                                <button 
                                    aria-label="Close" 
                                    className="modal-close" 
                                    onClick={() => setShowRoomDetails(false)}
                                >
                                    ×
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="room-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Status:</span>
                                        <span className="stat-value">{selectedRoom.room.status}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Total Beds:</span>
                                        <span className="stat-value">{selectedRoom.room.totalBeds}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Occupied:</span>
                                        <span className="stat-value">{selectedRoom.room.occupiedBeds}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Available:</span>
                                        <span className="stat-value">{selectedRoom.room.availableBeds}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Occupancy Rate:</span>
                                        <span className="stat-value">{selectedRoom.room.occupancyRate}%</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Monthly Rent per Bed:</span>
                                        <span className="stat-value">₱{(selectedRoom.room.monthlyRent || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Utilities per Bed:</span>
                                        <span className="stat-value">₱{(selectedRoom.room.utilities || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Total per Bed:</span>
                                        <span className="stat-value">₱{((selectedRoom.room.monthlyRent || 0) + (selectedRoom.room.utilities || 0)).toLocaleString()}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Room Total (4 beds):</span>
                                        <span className="stat-value">₱{(((selectedRoom.room.monthlyRent || 0) + (selectedRoom.room.utilities || 0)) * 4).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="bed-status">
                                    <h4>Bed Status</h4>
                                    <div className="beds-grid">
                                        {selectedRoom.bedStatus.map((bed) => (
                                            <div key={bed.bedNumber} className={`bed-status-card ${bed.status.toLowerCase()}`}>
                                                <div className="bed-number">Bed {bed.bedNumber}</div>
                                                <div className="bed-status-text">{bed.status}</div>
                                                {bed.tenant ? (
                                                    <div className="tenant-info">
                                                        <p><strong>Name:</strong> {bed.tenant.firstName} {bed.tenant.lastName}</p>
                                                        <p><strong>Email:</strong> {bed.tenant.email}</p>
                                                        <p><strong>Rent per Bed:</strong> ₱{(bed.tenant.monthlyRent || 0).toLocaleString()}</p>
                                                        <p><strong>Utilities per Bed:</strong> ₱{(bed.tenant.utilities || 0).toLocaleString()}</p>
                                                        <button
                                                            className="remove-tenant-btn"
                                                            onClick={() => handleRemoveTenant(bed.tenant.id)}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="tenant-info">
                                                        <p><strong>Available</strong></p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    className="modal-btn modal-btn-secondary" 
                                    onClick={() => setShowRoomDetails(false)}
                                >
                                    Close
                                </button>
                                {isAdmin && (
                                    <button 
                                        className="modal-btn modal-btn-secondary"
                                        onClick={() => {
                                            setShowRoomDetails(false);
                                            handlePricingClick(selectedRoom.room);
                                        }}
                                    >
                                        💰 Edit Pricing
                                    </button>
                                )}
                                <button
                                    className="modal-btn modal-btn-primary"
                                    onClick={() => {
                                        console.log('Add Tenant button clicked');
                                        console.log('selectedRoom:', selectedRoom);
                                        console.log('availableBeds:', selectedRoom?.room?.availableBeds);
                                        handleOpenAddTenantModal();
                                    }} 
                                    disabled={selectedRoom?.room?.availableBeds === 0}
                                >
                                    + Add Tenant
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Pricing Update Modal */}
            {showPricingModal && (
                <div className="modal-overlay" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowPricingModal(false);
                    }
                }}>
                    <div className="modal-container pricing-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header pricing-modal-header">
                            <div className="modal-title-content">
                                <span className="modal-icon">💰</span>
                                <h3 className="modal-title">Room Pricing</h3>
                            </div>
                            <button 
                                aria-label="Close" 
                                className="modal-close" 
                                onClick={() => setShowPricingModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <form className="modal-form">
                                <div className="modal-form-group">
                                    <label className="modal-form-label">Monthly Rent per Bed (₱):</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="modal-form-input"
                                        value={pricingData.monthlyRent}
                                        onChange={(e) => setPricingData({...pricingData, monthlyRent: e.target.value})}
                                        placeholder="Enter monthly rent per bed"
                                    />
                                </div>
                                <div className="modal-form-group">
                                    <label className="modal-form-label">Utilities per Bed (₱):</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="modal-form-input"
                                        value={pricingData.utilities}
                                        onChange={(e) => setPricingData({...pricingData, utilities: e.target.value})}
                                        placeholder="Enter utilities cost per bed"
                                    />
                                </div>
                                <div className="pricing-summary">
                                    <p><strong>Total per Bed:</strong> ₱{((parseFloat(pricingData.monthlyRent) || 0) + (parseFloat(pricingData.utilities) || 0)).toLocaleString()}</p>
                                    <p><strong>Room Total (4 beds):</strong> ₱{(((parseFloat(pricingData.monthlyRent) || 0) + (parseFloat(pricingData.utilities) || 0)) * 4).toLocaleString()}</p>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="modal-btn modal-btn-secondary" 
                                onClick={() => setShowPricingModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="modal-btn modal-btn-primary" 
                                onClick={handleUpdatePricing}
                            >
                                Update Pricing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Tenant Modal */}
            {showAddTenant && (
                <div className="modal-overlay" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowAddTenant(false);
                    }
                }}>
                    <div className="modal-container form-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header form-modal-header">
                            <div className="modal-title-content">
                                <span className="modal-icon">👤</span>
                                <h3 className="modal-title">Add Tenant</h3>
                            </div>
                            <button 
                                aria-label="Close" 
                                className="modal-close" 
                                onClick={() => setShowAddTenant(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <form className="modal-form">
                                <div className="modal-form-group">
                                    <label className="modal-form-label">Account ID (optional):</label>
                                    <input
                                        type="number"
                                        className="modal-form-input"
                                        value={newTenant.accountId}
                                        onChange={(e) => setNewTenant({...newTenant, accountId: e.target.value})}
                                        placeholder="Enter account ID"
                                    />
                                </div>
                                <div className="modal-form-group">
                                    <label className="modal-form-label">Monthly Rent per Bed (₱):</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="modal-form-input"
                                        value={newTenant.monthlyRent}
                                        onChange={(e) => setNewTenant({...newTenant, monthlyRent: e.target.value})}
                                        placeholder="Enter monthly rent per bed"
                                    />
                                </div>
                                <div className="modal-form-group">
                                    <label className="modal-form-label">Utilities per Bed (₱):</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="modal-form-input"
                                        value={newTenant.utilities}
                                        onChange={(e) => setNewTenant({...newTenant, utilities: e.target.value})}
                                        placeholder="Enter utilities cost per bed"
                                    />
                                </div>
                                <div className="modal-form-group">
                                    <label className="modal-form-label">Deposit (₱):</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="modal-form-input"
                                        value={newTenant.deposit}
                                        onChange={(e) => setNewTenant({...newTenant, deposit: e.target.value})}
                                        placeholder="Enter deposit amount"
                                    />
                                </div>
                                <div className="pricing-summary">
                                    <h4>💰 Pricing Summary (Per Bed)</h4>
                                    <div className="summary-item">
                                        <span>Monthly Rent per Bed:</span>
                                        <span>₱{parseFloat(newTenant.monthlyRent || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span>Utilities per Bed:</span>
                                        <span>₱{parseFloat(newTenant.utilities || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="summary-item total">
                                        <span>Total per Bed:</span>
                                        <span>₱{(parseFloat(newTenant.monthlyRent || 0) + parseFloat(newTenant.utilities || 0)).toLocaleString()}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span>Room Total (4 beds):</span>
                                        <span>₱{(((parseFloat(newTenant.monthlyRent || 0) + parseFloat(newTenant.utilities || 0)) * 4)).toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="modal-form-group">
                                    <label className="modal-form-label">Emergency Contact Name:</label>
                                    <input
                                        type="text"
                                        className="modal-form-input"
                                        value={newTenant.emergencyContact.name}
                                        onChange={(e) => setNewTenant({
                                            ...newTenant,
                                            emergencyContact: {...newTenant.emergencyContact, name: e.target.value}
                                        })}
                                        placeholder="Enter emergency contact name"
                                    />
                                </div>
                                <div className="modal-form-group">
                                    <label className="modal-form-label">Emergency Contact Phone:</label>
                                    <input
                                        type="text"
                                        className="modal-form-input"
                                        value={newTenant.emergencyContact.phone}
                                        onChange={(e) => setNewTenant({
                                            ...newTenant,
                                            emergencyContact: {...newTenant.emergencyContact, phone: e.target.value}
                                        })}
                                        placeholder="Enter emergency contact phone"
                                    />
                                </div>
                                <div className="modal-form-group">
                                    <label className="modal-form-label">Emergency Contact Relationship:</label>
                                    <input
                                        type="text"
                                        className="modal-form-input"
                                        value={newTenant.emergencyContact.relationship}
                                        onChange={(e) => setNewTenant({
                                            ...newTenant,
                                            emergencyContact: {...newTenant.emergencyContact, relationship: e.target.value}
                                        })}
                                        placeholder="Enter relationship (e.g., Parent, Sibling, Friend)"
                                    />
                                </div>
                                <div className="modal-form-group">
                                    <label className="modal-form-label">Special Requirements:</label>
                                    <textarea
                                        className="modal-form-textarea"
                                        value={newTenant.specialRequirements}
                                        onChange={(e) => setNewTenant({...newTenant, specialRequirements: e.target.value})}
                                        placeholder="Enter any special requirements"
                                        rows="3"
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="modal-btn modal-btn-secondary" 
                                onClick={() => setShowAddTenant(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="modal-btn modal-btn-primary" 
                                onClick={handleAddTenant}
                            >
                                Add Tenant
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomPage;
