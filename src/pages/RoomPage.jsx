import React, { useState, useEffect } from 'react';
import { roomService } from '../services/roomService';
import { tenantService } from '../services/tenantService';
import '../components/Rooms.css';

const RoomPage = () => {
    const [allRooms, setAllRooms] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [floorFilter, setFloorFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [showRoomDetails, setShowRoomDetails] = useState(false);
    const [showAddTenant, setShowAddTenant] = useState(false);
    const [newTenant, setNewTenant] = useState({
        accountId: '',
        bedNumber: 1,
        monthlyRent: '',
        utilities: '',
        deposit: '',
        emergencyContact: { name: '', phone: '', relationship: '' },
        specialRequirements: ''
    });

    useEffect(() => {
        fetchRooms();
    }, []);

    // Recompute visible rooms whenever filter or allRooms changes
    useEffect(() => {
        if (floorFilter === 'all') {
            setRooms(allRooms);
        } else {
            setRooms(allRooms.filter(r => String(r.floor) === String(floorFilter)));
        }
    }, [floorFilter, allRooms]);

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
        try {
            const bedStatus = await roomService.getRoomBedStatus(room.id);
            setSelectedRoom(bedStatus);
            setShowRoomDetails(true);
        } catch (error) {
            console.error('Error fetching room details:', error);
        }
    };

    const handleAddTenant = async () => {
        if (!selectedRoom || !newTenant.accountId || !newTenant.monthlyRent) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            await roomService.addTenantToRoom(selectedRoom.room.id, newTenant);
            setShowAddTenant(false);
            setNewTenant({
                accountId: '',
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
            alert('Error adding tenant: ' + error.message);
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
                <p>Manage rooms and tenant assignments</p>
                <div className="rooms-filters">
                    <label htmlFor="floorFilter">Floor:</label>
                    <select
                        id="floorFilter"
                        value={floorFilter}
                        onChange={(e) => setFloorFilter(e.target.value)}
                    >
                        <option value="all">All Floors</option>
                        {floors.map(f => (
                            <option key={f} value={f}>Floor {f}</option>
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
                                <span className={`status-badge ${room.status.toLowerCase().replace(' ', '-')}`}>
                                    {room.status}
                                </span>
                            </div>
                            <div className="room-info">
                                <p><strong>Floor:</strong> {room.floor}</p>
                                <p><strong>Building:</strong> {room.building}</p>
                                <p><strong>Type:</strong> {room.roomType}</p>
                                <p><strong>Rent:</strong> ${room.monthlyRent}</p>
                                <p><strong>Utilities:</strong> ${room.utilities}</p>
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
                        </div>
                    ))}
                </div>

                {selectedRoom && showRoomDetails && (
                    <div className="modal-overlay">
                        <div className="modal modal-large">
                            <div className="modal-header">
                                <h3>Room {selectedRoom.room.roomNumber} Details</h3>
                                <button className="close-btn" onClick={() => setShowRoomDetails(false)}>×</button>
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
                                </div>

                                <div className="bed-status">
                                    <h4>Bed Status</h4>
                                    <div className="beds-grid">
                                        {selectedRoom.bedStatus.map((bed) => (
                                            <div key={bed.bedNumber} className={`bed-status-card ${bed.status.toLowerCase()}`}>
                                                <div className="bed-number">Bed {bed.bedNumber}</div>
                                                <div className="bed-status">{bed.status}</div>
                                                {bed.tenant ? (
                                                    <div className="tenant-info">
                                                        <p><strong>Name:</strong> {bed.tenant.firstName} {bed.tenant.lastName}</p>
                                                        <p><strong>Email:</strong> {bed.tenant.email}</p>
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
                                <button className="btn-secondary" onClick={() => setShowRoomDetails(false)}>Close</button>
                                <button
                                    className="btn-primary"
                                    onClick={() => { setShowAddTenant(true); }}
                                    disabled={selectedRoom.room.availableBeds === 0}
                                >
                                    + Add Tenant
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showAddTenant && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Add New Tenant</h3>
                            <button className="close-btn" onClick={() => setShowAddTenant(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Account ID:</label>
                                <input
                                    type="number"
                                    value={newTenant.accountId}
                                    onChange={(e) => setNewTenant({...newTenant, accountId: e.target.value})}
                                    placeholder="Enter account ID"
                                />
                            </div>
                            <div className="form-group">
                                <label>Bed Number:</label>
                                <select
                                    value={newTenant.bedNumber}
                                    onChange={(e) => setNewTenant({...newTenant, bedNumber: parseInt(e.target.value)})}
                                >
                                    {[1, 2, 3, 4].map(num => (
                                        <option key={num} value={num}>Bed {num}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Monthly Rent:</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newTenant.monthlyRent}
                                    onChange={(e) => setNewTenant({...newTenant, monthlyRent: e.target.value})}
                                    placeholder="Enter monthly rent"
                                />
                            </div>
                            <div className="form-group">
                                <label>Utilities:</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newTenant.utilities}
                                    onChange={(e) => setNewTenant({...newTenant, utilities: e.target.value})}
                                    placeholder="Enter utilities cost"
                                />
                            </div>
                            <div className="form-group">
                                <label>Deposit:</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newTenant.deposit}
                                    onChange={(e) => setNewTenant({...newTenant, deposit: e.target.value})}
                                    placeholder="Enter deposit amount"
                                />
                            </div>
                            <div className="form-group">
                                <label>Emergency Contact Name:</label>
                                <input
                                    type="text"
                                    value={newTenant.emergencyContact.name}
                                    onChange={(e) => setNewTenant({
                                        ...newTenant,
                                        emergencyContact: {...newTenant.emergencyContact, name: e.target.value}
                                    })}
                                    placeholder="Enter emergency contact name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Emergency Contact Phone:</label>
                                <input
                                    type="text"
                                    value={newTenant.emergencyContact.phone}
                                    onChange={(e) => setNewTenant({
                                        ...newTenant,
                                        emergencyContact: {...newTenant.emergencyContact, phone: e.target.value}
                                    })}
                                    placeholder="Enter emergency contact phone"
                                />
                            </div>
                            <div className="form-group">
                                <label>Special Requirements:</label>
                                <textarea
                                    value={newTenant.specialRequirements}
                                    onChange={(e) => setNewTenant({...newTenant, specialRequirements: e.target.value})}
                                    placeholder="Enter any special requirements"
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowAddTenant(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleAddTenant}>Add Tenant</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomPage;
