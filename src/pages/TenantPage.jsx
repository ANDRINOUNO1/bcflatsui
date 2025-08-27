import React, { useState, useEffect } from 'react';
import { tenantService } from '../services/tenantService';
import { roomService } from '../services/roomService';
import '../components/Tenants.css';

const TenantPage = () => {
    const [tenants, setTenants] = useState([]);
    const [floorFilter, setFloorFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [showAddTenant, setShowAddTenant] = useState(false);
    const [stats, setStats] = useState(null);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [availableBeds, setAvailableBeds] = useState([1, 2, 3, 4]);
    const [floorsList, setFloorsList] = useState([]);
    const [newTenant, setNewTenant] = useState({
        accountId: '',
        email: '',
        password: '',
        roomId: '',
        bedNumber: 1,
        monthlyRent: '',
        utilities: '',
        deposit: '',
        emergencyContact: { name: '', phone: '', relationship: '' },
        specialRequirements: ''
    });

    useEffect(() => {
        fetchTenants();
        fetchStats();
        loadFloors();
    }, []);

    const fetchTenants = async (floorArg) => {
        try {
            setLoading(true);
            console.log('👥 TenantPage: Fetching tenants...');
            const effectiveFloor = floorArg !== undefined ? floorArg : floorFilter;
            const tenantsData = await tenantService.getAllTenants(effectiveFloor === 'all' ? undefined : effectiveFloor);
            console.log('👥 TenantPage: Tenants fetched successfully:', tenantsData.length);
            setTenants(tenantsData);
        } catch (error) {
            console.error('❌ TenantPage: Error fetching tenants:', error);
            // Don't redirect on auth errors, just show empty state
            if (error.response?.status === 401) {
                console.log('👥 TenantPage: Authentication error, showing empty state');
                setTenants([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Floors come from rooms to keep dropdown stable even if tenant list is empty
    const floors = floorsList;
    const filteredTenants = tenants; // server-side filtering when floor selected

    const loadFloors = async () => {
        try {
            const rooms = await roomService.getAllRooms('all');
            const uniqueFloors = Array.from(new Set(rooms.map(r => r.floor)))
                .filter(f => f !== undefined && f !== null)
                .sort((a, b) => a - b);
            setFloorsList(uniqueFloors);
            // If current selection is no longer valid, reset to 'all'
            if (floorFilter !== 'all' && !uniqueFloors.includes(parseInt(floorFilter))) {
                setFloorFilter('all');
            }
        } catch (error) {
            console.error('Error loading floors:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const statsData = await tenantService.getTenantStats();
            setStats(statsData);
        } catch (error) {
            console.error('Error fetching tenant stats:', error);
        }
    };

    const handleTenantClick = (tenant) => {
        setSelectedTenant(tenant);
    };

    const openAddTenantModal = async () => {
        try {
            setShowAddTenant(true);
            const rooms = await roomService.getAvailableRooms();
            setAvailableRooms(rooms);
            if (rooms.length > 0) {
                const firstRoomId = rooms[0].id;
                setNewTenant((prev) => ({ ...prev, roomId: firstRoomId }));
                await loadAvailableBeds(firstRoomId);
            } else {
                setAvailableBeds([]);
            }
        } catch (error) {
            console.error('Error loading available rooms:', error);
        }
    };

    const loadAvailableBeds = async (roomId) => {
        try {
            const bedStatus = await roomService.getRoomBedStatus(roomId);
            const freeBeds = bedStatus.bedStatus
                .filter(b => b.status === 'Available')
                .map(b => b.bedNumber);
            setAvailableBeds(freeBeds);
        } catch (error) {
            console.error('Error loading bed options:', error);
            setAvailableBeds([1, 2, 3, 4]);
        }
    };

    const handleAddTenant = async () => {
        const hasAccountId = !!newTenant.accountId;
        const hasCreds = newTenant.email && newTenant.password && newTenant.password.length >= 6;
        if ((!hasAccountId && !hasCreds) || !newTenant.roomId || !newTenant.monthlyRent) {
            alert('Please provide Account ID or Email + Password (6+ chars), Room and Monthly Rent');
            return;
        }

        try {
            const payload = {
                ...newTenant,
                accountId: newTenant.accountId ? parseInt(newTenant.accountId) : undefined,
                roomId: newTenant.roomId ? parseInt(newTenant.roomId) : undefined,
                bedNumber: newTenant.bedNumber ? parseInt(newTenant.bedNumber) : 1,
            };
            // If creating via email/password, ensure accountId is not sent
            if (hasCreds) {
                delete payload.accountId;
            }
            await tenantService.createTenant(payload);
            setShowAddTenant(false);
            setNewTenant({
                accountId: '',
                email: '',
                password: '',
                roomId: '',
                bedNumber: 1,
                monthlyRent: '',
                utilities: '',
                deposit: '',
                emergencyContact: { name: '', phone: '', relationship: '' },
                specialRequirements: ''
            });
            fetchTenants();
            fetchStats();
        } catch (error) {
            console.error('Error adding tenant:', error);
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            alert('Error adding tenant: ' + msg);
        }
    };

    const handleCheckIn = async (tenantId) => {
        try {
            await tenantService.checkInTenant(tenantId);
            fetchTenants();
            if (selectedTenant && selectedTenant.id === tenantId) {
                setSelectedTenant(await tenantService.getTenantById(tenantId));
            }
        } catch (error) {
            console.error('Error checking in tenant:', error);
            alert('Error checking in tenant: ' + error.message);
        }
    };

    const handleCheckOut = async (tenantId) => {
        try {
            await tenantService.checkOutTenant(tenantId);
            fetchTenants();
            if (selectedTenant && selectedTenant.id === tenantId) {
                setSelectedTenant(await tenantService.getTenantById(tenantId));
            }
        } catch (error) {
            console.error('Error checking out tenant:', error);
            alert('Error checking out tenant: ' + error.message);
        }
    };

    const handleDeleteTenant = async (tenant) => {
        // If tenant is active, offer to check out first (backend blocks deletion otherwise)
        if (tenant.status === 'Active') {
            const proceed = confirm('This tenant is currently Active. Do you want to check them out and delete?');
            if (!proceed) return;
            try {
                await tenantService.checkOutTenant(tenant.id);
            } catch (error) {
                const msg = error.response?.data?.message || error.message || 'Unknown error';
                alert('Error checking out tenant before delete: ' + msg);
                return;
            }
        } else {
            if (!confirm('Are you sure you want to delete this tenant?')) return;
        }

        try {
            await tenantService.deleteTenant(tenant.id);
            fetchTenants();
            fetchStats();
            if (selectedTenant && selectedTenant.id === tenant.id) {
                setSelectedTenant(null);
            }
        } catch (error) {
            console.error('Error deleting tenant:', error);
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            alert('Error deleting tenant: ' + msg);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return '#4CAF50';
            case 'Pending': return '#FF9800';
            case 'Checked Out': return '#F44336';
            case 'Inactive': return '#9E9E9E';
            default: return '#757575';
        }
    };

    if (loading) {
        return <div className="tenants-loading">Loading tenants...</div>;
    }

    return (
        <div className="tenants-container">
            <div className="tenants-header">
                <h2>👥 Tenant Management</h2>
                <p>Manage student tenants and their room assignments</p>
                <div className="tenants-filters">
                    <label htmlFor="tenantFloorFilter">Floor:</label>
                    <select
                        id="tenantFloorFilter"
                        value={floorFilter}
                        onChange={async (e) => { const val = e.target.value; setFloorFilter(val); await fetchTenants(val); }}
                    >
                        <option value="all">All Floors</option>
                        {floors.map(f => (
                            <option key={f} value={f}>Floor {f}</option>
                        ))}
                    </select>
                </div>
            </div>

            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">🏠</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.totalTenants}</div>
                            <div className="stat-label">Total Tenants</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.activeTenants}</div>
                            <div className="stat-label">Active Tenants</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⏳</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats.pendingTenants}</div>
                            <div className="stat-label">Pending</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div className="stat-content">
                            <div className="stat-value">${stats.totalIncome.toFixed(2)}</div>
                            <div className="stat-label">Total Income</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="tenants-content">
                <div className="tenants-list">
                    <div className="list-header">
                        <h3>All Tenants</h3>
                        <button className="add-tenant-btn" onClick={openAddTenantModal}>
                            + Add Tenant
                        </button>
                    </div>
                    <div className="tenants-table-wrapper">
                        {filteredTenants.length === 0 ? (
                            <div className="tenants-empty">
                                <p>No tenants found for the selected filter.</p>
                            </div>
                        ) : (
                        <table className="tenants-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Room</th>
                                    <th>Bed</th>
                                    <th>Floor</th>
                                    <th>Status</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Monthly Rent</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTenants.map((tenant) => (
                                    <tr
                                        key={tenant.id}
                                        className={selectedTenant?.id === tenant.id ? 'selected' : ''}
                                        onClick={() => handleTenantClick(tenant)}
                                    >
                                        <td>{tenant.account.firstName} {tenant.account.lastName}</td>
                                        <td>{tenant.account.email}</td>
                                        <td>{tenant.room.roomNumber}</td>
                                        <td>{tenant.bedNumber}</td>
                                        <td>{tenant.room.floor}</td>
                                        <td>
                                            <span className={`status-badge ${tenant.status.toLowerCase().replace(' ', '-')}`}>
                                                {tenant.status}
                                            </span>
                                        </td>
                                        <td>{new Date(tenant.checkInDate).toLocaleDateString()}</td>
                                        <td>{tenant.checkOutDate ? new Date(tenant.checkOutDate).toLocaleDateString() : '-'}</td>
                                        <td>${tenant.monthlyRent}</td>
                                        <td>
                                            <div className="tenant-actions">
                                                {tenant.status === 'Pending' && (
                                                    <button
                                                        className="action-btn checkin-btn"
                                                        onClick={(e) => { e.stopPropagation(); handleCheckIn(tenant.id); }}
                                                    >
                                                        Check In
                                                    </button>
                                                )}
                                                {tenant.status === 'Active' && (
                                                    <button
                                                        className="action-btn checkout-btn"
                                                        onClick={(e) => { e.stopPropagation(); handleCheckOut(tenant.id); }}
                                                    >
                                                        Check Out
                                                    </button>
                                                )}
                                                <button
                                                    className="action-btn delete-btn"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTenant(tenant); }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        )}
                    </div>
                </div>

                {selectedTenant && (
                    <div className="modal-overlay" onClick={() => setSelectedTenant(null)}>
                        <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Tenant Details</h3>
                                <button className="close-btn" onClick={() => setSelectedTenant(null)}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="tenant-profile">
                            <div className="profile-section">
                                <h4>Personal Information</h4>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Name:</span>
                                        <span className="info-value">{selectedTenant.account.firstName} {selectedTenant.account.lastName}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Email:</span>
                                        <span className="info-value">{selectedTenant.account.email}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Role:</span>
                                        <span className="info-value">{selectedTenant.account.role}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Status:</span>
                                        <span className="info-value">{selectedTenant.account.status}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="profile-section">
                                <h4>Room Assignment</h4>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Room:</span>
                                        <span className="info-value">{selectedTenant.room.roomNumber}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Building:</span>
                                        <span className="info-value">{selectedTenant.room.building}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Bed Number:</span>
                                        <span className="info-value">{selectedTenant.bedNumber}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Floor:</span>
                                        <span className="info-value">{selectedTenant.room.floor}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="profile-section">
                                <h4>Financial Information</h4>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Monthly Rent:</span>
                                        <span className="info-value">${selectedTenant.monthlyRent}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Utilities:</span>
                                        <span className="info-value">${selectedTenant.utilities}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Deposit:</span>
                                        <span className="info-value">${selectedTenant.deposit}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Total Monthly:</span>
                                        <span className="info-value">${(parseFloat(selectedTenant.monthlyRent) + parseFloat(selectedTenant.utilities)).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedTenant.emergencyContact && Object.keys(selectedTenant.emergencyContact).length > 0 && (
                                <div className="profile-section">
                                    <h4>Emergency Contact</h4>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">Name:</span>
                                            <span className="info-value">{selectedTenant.emergencyContact.name || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Phone:</span>
                                            <span className="info-value">{selectedTenant.emergencyContact.phone || 'N/A'}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Relationship:</span>
                                            <span className="info-value">{selectedTenant.emergencyContact.relationship || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedTenant.specialRequirements && (
                                <div className="profile-section">
                                    <h4>Special Requirements</h4>
                                    <p className="requirements-text">{selectedTenant.specialRequirements}</p>
                                </div>
                            )}

                            <div className="profile-section">
                                <h4>Timeline</h4>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Check-in Date:</span>
                                        <span className="info-value">{new Date(selectedTenant.checkInDate).toLocaleDateString()}</span>
                                    </div>
                                    {selectedTenant.checkOutDate && (
                                        <div className="info-item">
                                            <span className="info-label">Check-out Date:</span>
                                            <span className="info-value">{new Date(selectedTenant.checkOutDate).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                                </div>
                            </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => setSelectedTenant(null)}>Close</button>
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
                                <label>Account ID (optional):</label>
                                <input
                                    type="number"
                                    value={newTenant.accountId}
                                    onChange={(e) => setNewTenant({...newTenant, accountId: e.target.value})}
                                    placeholder="Enter account ID"
                                />
                            </div>
                            <div className="form-group">
                                <label>Account Email:</label>
                                <input
                                    type="email"
                                    value={newTenant.email || ''}
                                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                                    placeholder="Enter tenant email"
                                />
                            </div>
                            <div className="form-group">
                                <label>Account Password:</label>
                                <input
                                    type="password"
                                    value={newTenant.password || ''}
                                    onChange={(e) => setNewTenant({ ...newTenant, password: e.target.value })}
                                    placeholder="Set tenant password"
                                />
                            </div>
                            <div className="form-group">
                                <label>Room:</label>
                                <select
                                    value={newTenant.roomId}
                                    onChange={async (e) => {
                                        const roomId = parseInt(e.target.value);
                                        setNewTenant({ ...newTenant, roomId });
                                        await loadAvailableBeds(roomId);
                                    }}
                                >
                                    {availableRooms.map((room) => (
                                        <option key={room.id} value={room.id}>
                                            Room {room.roomNumber} — Floor {room.floor}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Bed Number:</label>
                                <select
                                    value={newTenant.bedNumber}
                                    onChange={(e) => setNewTenant({...newTenant, bedNumber: parseInt(e.target.value)})}
                                >
                                    {availableBeds.length === 0 && (
                                        <option value="">No beds available</option>
                                    )}
                                    {availableBeds.map(num => (
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

export default TenantPage;
