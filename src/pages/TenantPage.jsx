import React, { useState, useEffect } from 'react';
import { tenantService } from '../services/tenantService';
import { roomService } from '../services/roomService';
import { checkoutService } from '../services/checkoutService';
import '../components/Tenants.css';

const TenantPage = () => {
    const [tenants, setTenants] = useState([]);
    const [floorFilter, setFloorFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [showAddTenant, setShowAddTenant] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [checkoutTenantId, setCheckoutTenantId] = useState(null);
    const [archiveReason, setArchiveReason] = useState('Lease ended');
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
    const [customRelationship, setCustomRelationship] = useState('');

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
                await loadRoomPricing(firstRoomId);
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

    const loadRoomPricing = async (roomId) => {
        try {
            const room = await roomService.getRoomById(roomId);
            setNewTenant(prev => ({
                ...prev,
                monthlyRent: room.monthlyRent.toString(),
                utilities: room.utilities.toString()
            }));
        } catch (error) {
            console.error('Error loading room pricing:', error);
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
                roomId: parseInt(newTenant.roomId) || undefined,
                bedNumber: parseInt(newTenant.bedNumber) || 1,
                monthlyRent: parseFloat(newTenant.monthlyRent) || 0,
                utilities: parseFloat(newTenant.utilities) || 0,
                deposit: parseFloat(newTenant.deposit) || 0,
                emergencyContact: {
                    ...newTenant.emergencyContact,
                    relationship: newTenant.emergencyContact.relationship === 'Other' ? customRelationship : newTenant.emergencyContact.relationship
                }
            };
            
            if (hasCreds) {
                delete payload.accountId;
            }
            
            console.log('Creating tenant with payload:', payload);
            const result = await tenantService.createTenant(payload);
            
           
            if (result && result.accountId) {
                console.log('Created tenant with accountId:', result.accountId);
            }
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
            setCustomRelationship('');
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
        setCheckoutTenantId(tenantId);
        setShowCheckoutModal(true);
    };

    const confirmCheckout = async () => {
        if (!checkoutTenantId) return;
        
        try {
            const result = await checkoutService.checkoutTenant(checkoutTenantId, archiveReason);
            alert(`Tenant successfully checked out and archived!\n\nArchive ID: ${result.archive.id}\nReason: ${archiveReason}`);
            
            setShowCheckoutModal(false);
            setCheckoutTenantId(null);
            setArchiveReason('Lease ended');
            
            fetchTenants();
            fetchStats();
            
            if (selectedTenant && selectedTenant.id === checkoutTenantId) {
                setSelectedTenant(null);
            }
        } catch (error) {
            console.error('Error checking out tenant:', error);
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            alert('Error checking out tenant: ' + msg);
        }
    };

    const cancelCheckout = () => {
        setShowCheckoutModal(false);
        setCheckoutTenantId(null);
        setArchiveReason('Lease ended');
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
                            <div className="stat-value">₱{stats.totalIncome.toLocaleString()}</div>
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
                                    <th className="col-name">Name</th>
                                    <th className="col-email">Email</th>
                                    <th className="col-room">Room</th>
                                    <th className="col-bed">Bed</th>
                                    <th className="col-floor">Floor</th>
                                    <th className="col-status">Status</th>
                                    <th className="col-checkin">Check-in Date</th>
                                    <th className="col-rent">Monthly Rent</th>
                                    <th className="col-balance">Outstanding Balance</th>
                                    <th className="col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTenants.map((tenant) => (
                                    <tr
                                        key={tenant.id}
                                        className={selectedTenant?.id === tenant.id ? 'selected' : ''}
                                        onClick={() => handleTenantClick(tenant)}
                                    >
                                        <td className="col-name" title={`${tenant.account.firstName} ${tenant.account.lastName}`}>
                                            {tenant.account.firstName} {tenant.account.lastName}
                                        </td>
                                        <td className="col-email" title={tenant.account.email}>
                                            {tenant.account.email}
                                        </td>
                                        <td className="col-room">{tenant.room.roomNumber}</td>
                                        <td className="col-bed">{tenant.bedNumber}</td>
                                        <td className="col-floor">{tenant.room.floor}</td>
                                        <td className="col-status">
                                            <span className={`status-badge ${tenant.status.toLowerCase().replace(' ', '-')}`}>
                                                {tenant.status}
                                            </span>
                                        </td>
                                        <td className="col-checkin">{new Date(tenant.checkInDate).toLocaleDateString()}</td>
                                        <td className="col-rent">₱{tenant.monthlyRent.toLocaleString()}</td>
                                        <td className="col-balance">₱{parseFloat(tenant.outstandingBalance || 0).toLocaleString()}</td>
                                        <td className="col-actions">
                                            <div className="tenant-actions">
                                                {tenant.status === 'Pending' && (
                                                    <button
                                                        className="action-btn checkin-btn"
                                                        onClick={(e) => { e.stopPropagation(); handleCheckIn(tenant.id); }}
                                                        title="Check In Tenant"
                                                    >
                                                        Check In
                                                    </button>
                                                )}
                                                {tenant.status === 'Active' && (
                                                    <button
                                                        className="action-btn checkout-btn"
                                                        onClick={(e) => { e.stopPropagation(); handleCheckOut(tenant.id); }}
                                                        title="Check Out Tenant"
                                                    >
                                                        Check Out
                                                    </button>
                                                )}
                                                <button
                                                    className="action-btn delete-btn"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTenant(tenant); }}
                                                    title="Delete Tenant"
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
                                        <span className="info-label">Monthly Rent per Bed:</span>
                                        <span className="info-value">₱{selectedTenant.monthlyRent.toLocaleString()}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Utilities per Bed:</span>
                                        <span className="info-value">₱{selectedTenant.utilities.toLocaleString()}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Deposit:</span>
                                        <span className="info-value">₱{selectedTenant.deposit.toLocaleString()}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Total Monthly:</span>
                                        <span className="info-value">₱{(parseFloat(selectedTenant.monthlyRent) + parseFloat(selectedTenant.utilities)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedTenant.emergencyContact && Object.keys(selectedTenant.emergencyContact).length > 0 && (
                                <div className="profile-section emergency-contact-section">
                                    <h4>📞 Emergency Contact</h4>
                                    <div className="emergency-contact-grid">
                                        <div className="emergency-contact-item">
                                            <div className="emergency-contact-label">
                                                Contact Name <span className="required">*</span>
                                            </div>
                                            <div className="emergency-contact-value">
                                                {selectedTenant.emergencyContact.name || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="emergency-contact-item">
                                            <div className="emergency-contact-label">
                                                Contact Phone <span className="required">*</span>
                                            </div>
                                            <div className="emergency-contact-value">
                                                {selectedTenant.emergencyContact.phone || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="emergency-contact-item emergency-contact-full">
                                            <div className="emergency-contact-label">
                                                Relationship <span className="required">*</span>
                                            </div>
                                            <div className="emergency-contact-value">
                                                {selectedTenant.emergencyContact.relationship || 'N/A'}
                                            </div>
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
                                    placeholder="Enter tenant email (e.g., tenant@example.com)"
                                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                                    title="Please enter a valid email address"
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
                                        await loadRoomPricing(roomId);
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
                                <label>Monthly Rent per Bed (₱):</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newTenant.monthlyRent}
                                    onChange={(e) => setNewTenant({...newTenant, monthlyRent: e.target.value})}
                                    placeholder="Enter monthly rent per bed"
                                />
                            </div>
                            <div className="form-group">
                                <label>Utilities per Bed (₱):</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newTenant.utilities}
                                    onChange={(e) => setNewTenant({...newTenant, utilities: e.target.value})}
                                    placeholder="Enter utilities cost per bed"
                                />
                            </div>
                            <div className="form-group">
                                <label>Deposit (₱):</label>
                                <input
                                    type="number"
                                    step="0.01"
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
                            <div className="form-section emergency-contact-form-section">
                                <h4>📞 Emergency Contact</h4>
                                
                                <div className="emergency-contact-form-row">
                                    <div className="form-group">
                                        <label htmlFor="emergencyContactName">
                                            Contact Name <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="emergencyContactName"
                                            value={newTenant.emergencyContact.name}
                                            onChange={(e) => setNewTenant({
                                                ...newTenant,
                                                emergencyContact: {...newTenant.emergencyContact, name: e.target.value}
                                            })}
                                            placeholder="Enter emergency contact name"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="emergencyContactPhone">
                                            Contact Phone <span className="required">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            id="emergencyContactPhone"
                                            value={newTenant.emergencyContact.phone}
                                            onChange={(e) => setNewTenant({
                                                ...newTenant,
                                                emergencyContact: {...newTenant.emergencyContact, phone: e.target.value}
                                            })}
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="emergencyContactRelationship">
                                        Relationship <span className="required">*</span>
                                    </label>
                                    <select
                                        id="emergencyContactRelationship"
                                        value={newTenant.emergencyContact.relationship}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === 'Other') {
                                                setNewTenant({
                                                    ...newTenant,
                                                    emergencyContact: {...newTenant.emergencyContact, relationship: 'Other'}
                                                });
                                            } else {
                                                setNewTenant({
                                                    ...newTenant,
                                                    emergencyContact: {...newTenant.emergencyContact, relationship: value}
                                                });
                                                setCustomRelationship(''); // Clear custom relationship when selecting predefined option
                                            }
                                        }}
                                    >
                                        <option value="">Select relationship</option>
                                        <option value="Parent">Parent</option>
                                        <option value="Sibling">Sibling</option>
                                        <option value="Spouse">Spouse</option>
                                        <option value="Guardian">Guardian</option>
                                        <option value="Friend">Friend</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    
                                    {/* Custom relationship input field */}
                                    {newTenant.emergencyContact.relationship === 'Other' && (
                                        <div className="form-group" style={{ marginTop: '10px' }}>
                                            <label htmlFor="customRelationship">
                                                Specify Relationship <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="customRelationship"
                                                value={customRelationship}
                                                onChange={(e) => setCustomRelationship(e.target.value)}
                                                placeholder="Enter relationship (e.g., Cousin, Uncle, etc.)"
                                            />
                                        </div>
                                    )}
                                </div>
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

            {/* Checkout Modal */}
            {showCheckoutModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>🏠 Check Out Tenant</h3>
                            <button className="modal-close" onClick={cancelCheckout}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Archive Reason:</label>
                                <select
                                    value={archiveReason}
                                    onChange={(e) => setArchiveReason(e.target.value)}
                                >
                                    <option value="Lease ended">Lease ended</option>
                                    <option value="Graduation">Graduation</option>
                                    <option value="Transfer">Transfer</option>
                                    <option value="Personal reasons">Personal reasons</option>
                                    <option value="Violation of terms">Violation of terms</option>
                                    <option value="Financial issues">Financial issues</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            {archiveReason === 'Other' && (
                                <div className="form-group">
                                    <label>Custom Reason:</label>
                                    <input
                                        type="text"
                                        value={archiveReason}
                                        onChange={(e) => setArchiveReason(e.target.value)}
                                        placeholder="Enter custom reason"
                                    />
                                </div>
                            )}
                            <div className="checkout-warning">
                                <p><strong>⚠️ Important:</strong></p>
                                <ul>
                                    <li>This will transfer the tenant to the archive table</li>
                                    <li>The tenant's account will be suspended</li>
                                    <li>The room will be marked as available</li>
                                    <li>All payment history will be preserved</li>
                                    <li>This action cannot be undone easily</li>
                                </ul>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={cancelCheckout}>Cancel</button>
                            <button className="btn-danger" onClick={confirmCheckout}>Check Out & Archive</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantPage;
