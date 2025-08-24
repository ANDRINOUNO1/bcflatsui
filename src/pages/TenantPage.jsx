import React, { useState, useEffect } from 'react';
import { tenantService } from '../services/tenantService';
import '../components/Tenants.css';

const TenantPage = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [showAddTenant, setShowAddTenant] = useState(false);
    const [stats, setStats] = useState(null);
    const [newTenant, setNewTenant] = useState({
        accountId: '',
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
    }, []);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const tenantsData = await tenantService.getAllTenants();
            setTenants(tenantsData);
        } catch (error) {
            console.error('Error fetching tenants:', error);
        } finally {
            setLoading(false);
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

    const handleAddTenant = async () => {
        if (!newTenant.accountId || !newTenant.roomId || !newTenant.monthlyRent) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            await tenantService.createTenant(newTenant);
            setShowAddTenant(false);
            setNewTenant({
                accountId: '',
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
            alert('Error adding tenant: ' + error.message);
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

    const handleDeleteTenant = async (tenantId) => {
        if (!confirm('Are you sure you want to delete this tenant?')) return;

        try {
            await tenantService.deleteTenant(tenantId);
            fetchTenants();
            fetchStats();
            if (selectedTenant && selectedTenant.id === tenantId) {
                setSelectedTenant(null);
            }
        } catch (error) {
            console.error('Error deleting tenant:', error);
            alert('Error deleting tenant: ' + error.message);
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
                        <button className="add-tenant-btn" onClick={() => setShowAddTenant(true)}>
                            + Add Tenant
                        </button>
                    </div>
                    <div className="tenants-grid">
                        {tenants.map((tenant) => (
                            <div
                                key={tenant.id}
                                className={`tenant-card ${selectedTenant?.id === tenant.id ? 'selected' : ''}`}
                                onClick={() => handleTenantClick(tenant)}
                                style={{ borderColor: getStatusColor(tenant.status) }}
                            >
                                <div className="tenant-header">
                                    <h4>{tenant.account.firstName} {tenant.account.lastName}</h4>
                                    <span className={`status-badge ${tenant.status.toLowerCase().replace(' ', '-')}`}>
                                        {tenant.status}
                                    </span>
                                </div>
                                <div className="tenant-info">
                                    <p><strong>Email:</strong> {tenant.account.email}</p>
                                    <p><strong>Room:</strong> {tenant.room.roomNumber}</p>
                                    <p><strong>Bed:</strong> {tenant.bedNumber}</p>
                                    <p><strong>Rent:</strong> ${tenant.monthlyRent}</p>
                                    <p><strong>Check-in:</strong> {new Date(tenant.checkInDate).toLocaleDateString()}</p>
                                </div>
                                <div className="tenant-actions">
                                    {tenant.status === 'Pending' && (
                                        <button
                                            className="action-btn checkin-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCheckIn(tenant.id);
                                            }}
                                        >
                                            Check In
                                        </button>
                                    )}
                                    {tenant.status === 'Active' && (
                                        <button
                                            className="action-btn checkout-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCheckOut(tenant.id);
                                            }}
                                        >
                                            Check Out
                                        </button>
                                    )}
                                    <button
                                        className="action-btn delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTenant(tenant.id);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {selectedTenant && (
                    <div className="tenant-details">
                        <div className="details-header">
                            <h3>Tenant Details</h3>
                        </div>
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
                                <label>Room ID:</label>
                                <input
                                    type="number"
                                    value={newTenant.roomId}
                                    onChange={(e) => setNewTenant({...newTenant, roomId: e.target.value})}
                                    placeholder="Enter room ID"
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

export default TenantPage;
