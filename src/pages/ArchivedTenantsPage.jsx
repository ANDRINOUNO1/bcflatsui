import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { archivedTenantService } from '../services/archivedTenantService';
import { notificationService } from '../services/notificationService';
import './ArchivedTenantsPage.css';

const ArchivedTenantsPage = () => {
    const { user, logout } = useAuth();
    const [archivedTenants, setArchivedTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [floorFilter, setFloorFilter] = useState('');
    const [sortBy, setSortBy] = useState('checkOutDate');
    const [sortOrder, setSortOrder] = useState('DESC');

    // Notifications
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [showNotif, setShowNotif] = useState(false);

    // Modal
    const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '', details: '' });

    useEffect(() => {
        fetchArchivedTenants();
        fetchNotifications();
    }, []);

    useEffect(() => {
        // Poll notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchArchivedTenants = async () => {
        try {
            setLoading(true);
            const filters = {
                search: searchQuery,
                dateFrom,
                dateTo,
                floor: floorFilter,
                sortBy,
                sortOrder
            };
            const data = await archivedTenantService.getArchivedTenants(filters);
            setArchivedTenants(data);
        } catch (error) {
            console.error('Error fetching archived tenants:', error);
            setErrorModal({
                open: true,
                title: 'Failed to Load Archived Tenants',
                message: 'Could not fetch archived tenant data.',
                details: error.response?.data?.message || error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const data = await notificationService.fetchMyNotifications();
            setNotifications(data);
            setUnread(data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.isRead) {
            await notificationService.markNotificationAsRead(notification.id);
            fetchNotifications();
        }
    };

    const handleViewDetails = async (tenant) => {
        try {
            const detailedData = await archivedTenantService.getArchivedTenantById(tenant.id);
            setSelectedTenant(detailedData);
            setShowDetailModal(true);
        } catch (error) {
            console.error('Error fetching tenant details:', error);
            setErrorModal({
                open: true,
                title: 'Failed to Load Details',
                message: 'Could not fetch detailed tenant information.',
                details: error.response?.data?.message || error.message
            });
        }
    };

    const handleSearch = () => {
        fetchArchivedTenants();
    };

    const handleReset = () => {
        setSearchQuery('');
        setDateFrom('');
        setDateTo('');
        setFloorFilter('');
        setSortBy('checkOutDate');
        setSortOrder('DESC');
        setTimeout(fetchArchivedTenants, 100);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const exportToCSV = () => {
        try {
            const headers = ['Name', 'Email', 'Room', 'Floor', 'Check In', 'Check Out', 'Final Balance', 'Total Paid'];
            const rows = archivedTenants.map(tenant => [
                tenant.name,
                tenant.email,
                tenant.roomNumber,
                tenant.floor,
                formatDate(tenant.checkInDate),
                formatDate(tenant.checkOutDate),
                tenant.finalBalance,
                tenant.totalPaid
            ]);

            let csvContent = headers.join(',') + '\n';
            csvContent += rows.map(row => row.join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `archived_tenants_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error exporting CSV:', error);
        }
    };

    return (
        <div className="archived-tenants-page">
            {/* Header */}
            <header className="page-header">
                <div className="header-content">
                    <h1>📦 Archived Tenants</h1>
                    <div className="header-actions">
                        {/* Notification Bell */}
                        <div className="notification-wrapper">
                            <button
                                className="notification-bell"
                                onClick={() => setShowNotif(!showNotif)}
                            >
                                🔔
                                {unread > 0 && <span className="notification-badge">{unread}</span>}
                            </button>
                            {showNotif && (
                                <div className="notification-dropdown">
                                    <div className="notification-header">
                                        <h3>Notifications</h3>
                                        <button onClick={() => setShowNotif(false)}>✕</button>
                                    </div>
                                    <div className="notification-list">
                                        {notifications.length === 0 ? (
                                            <p className="no-notifications">No notifications</p>
                                        ) : (
                                            notifications.map(notif => (
                                                <div
                                                    key={notif.id}
                                                    className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                                                    onClick={() => handleNotificationClick(notif)}
                                                >
                                                    <strong>{notif.title}</strong>
                                                    <p>{notif.message}</p>
                                                    <small>{formatDate(notif.createdAt)}</small>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="user-info">
                            <span>👤 {user?.firstName} {user?.lastName}</span>
                            <button onClick={logout} className="logout-btn">Logout</button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="archived-content">
                {/* Filters Section */}
                <div className="filters-card">
                    <h2>🔍 Search & Filter</h2>
                    <div className="filter-grid">
                        <div className="filter-group">
                            <label>Search</label>
                            <input
                                type="text"
                                placeholder="Name, email, or room..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <div className="filter-group">
                            <label>From Date</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label>To Date</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Floor</label>
                            <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
                                <option value="">All Floors</option>
                                <option value="1">Floor 1</option>
                                <option value="2">Floor 2</option>
                                <option value="3">Floor 3</option>
                                <option value="4">Floor 4</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Sort By</label>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="checkOutDate">Check Out Date</option>
                                <option value="checkInDate">Check In Date</option>
                                <option value="finalBalance">Final Balance</option>
                                <option value="totalPaid">Total Paid</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Order</label>
                            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                                <option value="DESC">Descending</option>
                                <option value="ASC">Ascending</option>
                            </select>
                        </div>
                    </div>
                    <div className="filter-actions">
                        <button onClick={handleSearch} className="btn-primary">🔍 Search</button>
                        <button onClick={handleReset} className="btn-secondary">🔄 Reset</button>
                        <button onClick={exportToCSV} className="btn-export">📥 Export CSV</button>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <h3>Total Archived</h3>
                        <p className="stat-value">{archivedTenants.length}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Total Paid</h3>
                        <p className="stat-value">{formatCurrency(archivedTenants.reduce((sum, t) => sum + (t.totalPaid || 0), 0))}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Outstanding Balances</h3>
                        <p className="stat-value">{formatCurrency(archivedTenants.reduce((sum, t) => sum + (t.finalBalance || 0), 0))}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Total Payments</h3>
                        <p className="stat-value">{archivedTenants.reduce((sum, t) => sum + (t.paymentCount || 0), 0)}</p>
                    </div>
                </div>

                {/* Tenants Table */}
                <div className="tenants-table-card">
                    <h2>📋 Archived Tenant Records</h2>
                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : archivedTenants.length === 0 ? (
                        <div className="no-data">
                            <p>No archived tenants found.</p>
                            <small>Checked-out tenants will appear here.</small>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="archived-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Room</th>
                                        <th>Floor</th>
                                        <th>Check In</th>
                                        <th>Check Out</th>
                                        <th>Final Balance</th>
                                        <th>Total Paid</th>
                                        <th>Payments</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {archivedTenants.map(tenant => (
                                        <tr key={tenant.id}>
                                            <td>{tenant.name}</td>
                                            <td>{tenant.email}</td>
                                            <td>{tenant.roomNumber}</td>
                                            <td>{tenant.floor}</td>
                                            <td>{formatDate(tenant.checkInDate)}</td>
                                            <td>{formatDate(tenant.checkOutDate)}</td>
                                            <td className={tenant.finalBalance > 0 ? 'balance-owed' : 'balance-clear'}>
                                                {formatCurrency(tenant.finalBalance)}
                                            </td>
                                            <td>{formatCurrency(tenant.totalPaid)}</td>
                                            <td>{tenant.paymentCount}</td>
                                            <td>
                                                <button
                                                    className="btn-view"
                                                    onClick={() => handleViewDetails(tenant)}
                                                >
                                                    👁️ View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedTenant && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📄 Archived Tenant Details</h2>
                            <button className="close-btn" onClick={() => setShowDetailModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {/* Personal Information */}
                            <section className="detail-section">
                                <h3>👤 Personal Information</h3>
                                <div className="detail-grid">
                                    <div><strong>Name:</strong> {selectedTenant.name}</div>
                                    <div><strong>Email:</strong> {selectedTenant.email}</div>
                                    <div><strong>Title:</strong> {selectedTenant.title || 'N/A'}</div>
                                </div>
                            </section>

                            {/* Room Information */}
                            <section className="detail-section">
                                <h3>🏠 Room Information</h3>
                                <div className="detail-grid">
                                    <div><strong>Room:</strong> {selectedTenant.roomNumber}</div>
                                    <div><strong>Floor:</strong> {selectedTenant.floor}</div>
                                    <div><strong>Building:</strong> {selectedTenant.building}</div>
                                    <div><strong>Bed:</strong> {selectedTenant.bedNumber}</div>
                                </div>
                            </section>

                            {/* Lease Information */}
                            <section className="detail-section">
                                <h3>📅 Lease Information</h3>
                                <div className="detail-grid">
                                    <div><strong>Check In:</strong> {formatDate(selectedTenant.checkInDate)}</div>
                                    <div><strong>Check Out:</strong> {formatDate(selectedTenant.checkOutDate)}</div>
                                    <div><strong>Days Stayed:</strong> {selectedTenant.daysStayed}</div>
                                    <div><strong>Lease Start:</strong> {selectedTenant.leaseStart ? formatDate(selectedTenant.leaseStart) : 'N/A'}</div>
                                    <div><strong>Lease End:</strong> {selectedTenant.leaseEnd ? formatDate(selectedTenant.leaseEnd) : 'N/A'}</div>
                                </div>
                            </section>

                            {/* Financial Summary */}
                            <section className="detail-section">
                                <h3>💰 Financial Summary</h3>
                                <div className="detail-grid">
                                    <div><strong>Monthly Rent:</strong> {formatCurrency(selectedTenant.monthlyRent)}</div>
                                    <div><strong>Utilities:</strong> {formatCurrency(selectedTenant.utilities)}</div>
                                    <div><strong>Deposit:</strong> {formatCurrency(selectedTenant.deposit)}</div>
                                    <div><strong>Deposit Applied:</strong> {formatCurrency(selectedTenant.depositApplied)}</div>
                                    <div><strong>Total Charges:</strong> {formatCurrency(selectedTenant.totalCharges)}</div>
                                    <div><strong>Total Paid:</strong> {formatCurrency(selectedTenant.totalPaid)}</div>
                                    <div className={selectedTenant.finalBalance > 0 ? 'highlight-owed' : 'highlight-clear'}>
                                        <strong>Final Balance:</strong> {formatCurrency(selectedTenant.finalBalance)}
                                    </div>
                                </div>
                            </section>

                            {/* Payment History */}
                            <section className="detail-section">
                                <h3>📜 Payment History ({selectedTenant.paymentHistory.length} payments)</h3>
                                {selectedTenant.paymentHistory.length === 0 ? (
                                    <p>No payment history available.</p>
                                ) : (
                                    <div className="payment-history-table">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th>Method</th>
                                                    <th>Balance After</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedTenant.paymentHistory.map(payment => (
                                                    <tr key={payment.id}>
                                                        <td>{formatDate(payment.paymentDate)}</td>
                                                        <td>{formatCurrency(payment.amount)}</td>
                                                        <td>{payment.paymentMethod}</td>
                                                        <td>{formatCurrency(payment.balanceAfter)}</td>
                                                        <td>{payment.status}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>

                            {/* Billing Cycles */}
                            <section className="detail-section">
                                <h3>📊 Billing Cycles ({selectedTenant.billingCycles.length} cycles)</h3>
                                {selectedTenant.billingCycles.length === 0 ? (
                                    <p>No billing cycles available.</p>
                                ) : (
                                    <div className="billing-cycles-table">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Month</th>
                                                    <th>Previous Balance</th>
                                                    <th>Deposit Applied</th>
                                                    <th>Charges</th>
                                                    <th>Payments</th>
                                                    <th>Final Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedTenant.billingCycles.map(cycle => (
                                                    <tr key={cycle.id}>
                                                        <td>{cycle.cycleMonth}</td>
                                                        <td>{formatCurrency(cycle.previousBalance)}</td>
                                                        <td>{formatCurrency(cycle.depositApplied)}</td>
                                                        <td>{formatCurrency(cycle.monthlyCharges)}</td>
                                                        <td>{formatCurrency(cycle.paymentsMade)}</td>
                                                        <td>{formatCurrency(cycle.finalBalance)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>

                            {/* Notes */}
                            {selectedTenant.notes && (
                                <section className="detail-section">
                                    <h3>📝 Notes</h3>
                                    <p>{selectedTenant.notes}</p>
                                </section>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            {errorModal.open && (
                <div className="modal-overlay" onClick={() => setErrorModal({ ...errorModal, open: false })}>
                    <div className="modal-content error-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header error">
                            <h2>❌ {errorModal.title}</h2>
                            <button className="close-btn" onClick={() => setErrorModal({ ...errorModal, open: false })}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p>{errorModal.message}</p>
                            {errorModal.details && <p className="error-details">{errorModal.details}</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArchivedTenantsPage;

