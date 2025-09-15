import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { maintenanceService } from '../services/maintenanceService';
import { tenantService } from '../services/tenantService';
import { roomService } from '../services/roomService';
import { paymentService } from '../services/paymentService';
// Removed legacy CSS import to prevent overrides of Tailwind styles
import '../components/TenantDashboard.css';
// Inline modal state will be used instead of a shared modal component

const TenantDashboard = () => {
  const { user } = useAuth();
  const [tenantData, setTenantData] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [billingInfo, setBillingInfo] = useState(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '', details: '' });

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch tenant information
      try {
        const tenantResponse = await tenantService.getTenantByAccountId(user?.id);
        if (tenantResponse) {
          setTenantData(tenantResponse);
          
          // Fetch comprehensive billing information
          try {
            const billingResponse = await tenantService.getTenantBillingInfo(tenantResponse.id);
            setBillingInfo(billingResponse);
          } catch (billingError) {
            console.error('Error fetching billing info:', billingError);
            // Continue without billing data
          }
          
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
          
          // Fetch maintenance requests
          try {
            const maintenanceResponse = await maintenanceService.listByTenant(tenantResponse.id);
            setMaintenanceRequests(maintenanceResponse || []);
          } catch (maintenanceError) {
            console.error('Error fetching maintenance requests:', maintenanceError);
            setMaintenanceRequests([]);
          }
        } else {
          console.log('No tenant record found for user:', user?.id);
          // Continue without tenant data
        }
      } catch (tenantError) {
        console.error('Error fetching tenant data:', tenantError);
        // Continue without tenant data
      }
      
    } catch (error) {
      console.error('Error fetching tenant data:', error);
      setError('Failed to load dashboard data. Please try again later.');
      setErrorModal({
        open: true,
        title: 'Failed to load your dashboard',
        message: 'Please try again in a moment.',
        details: error?.response?.data?.message || error.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchTenantData();
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTenantData();
  };

  // Helper function to get floor suffix
  const getFloorSuffix = (floor) => {
    const n = Number(floor);
    if (!Number.isFinite(n)) return '';
    const j = n % 10, k = n % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  // Helper function to format currency
  const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(toNumber(amount));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  } 

  // Show normal page with modal for error instead of replacing the whole view

  // Show welcome message if no tenant data is available
  if (!tenantData && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🏠</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to BCFlats!</h1>
            <p className="text-gray-600 mb-8">Your tenant dashboard will be available once your account is set up.</p>
            
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Getting Started</h3>
              <p className="text-gray-700 mb-6">Please contact the property management to complete your tenant registration and room assignment.</p>
              <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                Contact Management
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {errorModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}></div>
          <div className="relative bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <h3 className="text-lg font-semibold">{errorModal.title || 'Something went wrong'}</h3>
                </div>
                <button aria-label="Close" className="text-white/90 hover:text-white text-xl leading-none" onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })}>×</button>
              </div>
            </div>
            <div className="p-6">
              {errorModal.message && <p className="text-gray-800 mb-2">{errorModal.message}</p>}
              {errorModal.details && <pre className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{errorModal.details}</pre>}
              <div className="mt-6 flex justify-end">
                <button onClick={() => setErrorModal({ open: false, title: '', message: '', details: '' })} className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header with Gradient Background */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-4xl font-bold text-white">
                Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'Tenant'}!
              </h1>
              <p className="text-blue-100 mt-2 text-lg">Here's an overview of your home and account.</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white hover:bg-gray-50 disabled:bg-gray-200 text-blue-600 font-semibold py-3 px-6 rounded-full transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {refreshing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-200 border border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Current Balance</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(billingInfo?.outstandingBalance || 0)}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded-full">
                <div className="text-2xl">💰</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-200 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Next Due Date</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {billingInfo?.nextDueDate 
                    ? new Date(billingInfo.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'N/A'
                  }
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <div className="text-2xl">📅</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-200 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Deposit Balance</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(billingInfo?.deposit || 0)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <div className="text-2xl">🏦</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-200 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Payment History</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {billingInfo?.paymentHistory?.length || 0}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <div className="text-2xl">📊</div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">💰</span>
            Billing Information
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Monthly Rent:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(billingInfo?.monthlyRent || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Utilities:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(billingInfo?.utilities || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Deposit Paid:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(billingInfo?.deposit || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 font-medium">Last Payment:</span>
                <span className="font-bold text-gray-900">
                  {billingInfo?.lastPaymentDate 
                    ? new Date(billingInfo.lastPaymentDate).toLocaleDateString()
                    : 'No payments yet'
                  }
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Account Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  billingInfo?.status === 'Active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {billingInfo?.status || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Next Due Date:</span>
                <span className="font-bold text-gray-900">
                  {billingInfo?.nextDueDate 
                    ? new Date(billingInfo.nextDueDate).toLocaleDateString()
                    : 'Not set'
                  }
                </span>
              </div>
              {billingInfo?.nextDueDate && (
                <div className="py-3">
                  {(() => {
                    const due = new Date(billingInfo.nextDueDate)
                    const now = new Date()
                    const start = new Date(now.getFullYear(), now.getMonth(), 1)
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                    const totalMs = end - start || 1
                    const elapsedMs = Math.min(Math.max(now - start, 0), totalMs)
                    const pct = Math.round((elapsedMs / totalMs) * 100)
                    return (
                      <>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-2 ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-orange-400' : 'bg-blue-500'}`} style={{ width: pct + '%' }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Start</span>
                          <span>{pct}%</span>
                          <span>End</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Total Monthly:</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(billingInfo?.totalMonthlyCost || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 font-medium">Outstanding Balance:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(billingInfo?.outstandingBalance || 0)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-xl transform hover:-translate-y-1">
              <span className="text-xl">💳</span>
              <span>Pay Now</span>
            </button>
            <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 px-8 rounded-lg transition-all duration-200 flex items-center justify-center gap-3">
              <span className="text-xl">📊</span>
              <span>Billing History</span>
            </button>
          </div>
        </div>

        {/* Property Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🏠</span>
            Property Information
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Building:</span>
              <span className="font-medium text-gray-900">{roomData?.building || 'Main Building'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Room:</span>
              <span className="font-medium text-gray-900">{roomData?.roomNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Floor:</span>
              <span className="font-medium text-gray-900">
                {roomData?.floor ? `${roomData.floor}${getFloorSuffix(roomData.floor)}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Bed Number:</span>
              <span className="font-medium text-gray-900">{tenantData?.bedNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Check-in Date:</span>
              <span className="font-medium text-gray-900">
                {tenantData?.checkInDate ? new Date(tenantData.checkInDate).toLocaleDateString() : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {billingInfo?.paymentHistory && billingInfo.paymentHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">💳</span>
              Recent Payment History
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {billingInfo.paymentHistory.slice(0, 5).map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(payment.balanceAfter)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'Completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {billingInfo.paymentHistory.length > 5 && (
              <div className="mt-4 text-center">
                <button className="text-primary-600 hover:text-primary-700 font-medium">
                  View All Payments
                </button>
              </div>
            )}
          </div>
        )}

        {/* Maintenance & Support */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🔧</span>
            Maintenance & Support
          </h3>
          <p className="text-gray-600 mb-6">
            Submit repair requests and track progress for your room.
          </p>
          <div className="flex gap-3 mb-6">
            <Link 
              to="/tenant/maintenance" 
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              🔧 Request Maintenance
            </Link>
            <Link 
              to="/tenant/maintenance" 
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              📋 View Requests
            </Link>
          </div>
          
          {maintenanceRequests.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Recent Requests</h4>
              <div className="space-y-3">
                {maintenanceRequests.slice(0, 3).map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900">{request.title}</h5>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'Completed' 
                          ? 'bg-green-100 text-green-800'
                          : request.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{request.description}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Priority: {request.priority}</span>
                      <span>Submitted: {new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Emergency Contact & Lease Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🚨</span>
              Emergency Contact
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Contact Name:</span>
                <span className="font-medium text-gray-900">
                  {tenantData?.emergencyContact?.name || 'Not provided'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium text-gray-900">
                  {tenantData?.emergencyContact?.phone || 'Not provided'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Relationship:</span>
                <span className="font-medium text-gray-900">
                  {tenantData?.emergencyContact?.relationship || 'Not provided'}
                </span>
              </div>
            </div>
            <div className="mt-6">
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors">
                Update Contact Info
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📄</span>
              Lease Information
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Lease Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  tenantData?.leaseEnd && new Date(tenantData.leaseEnd) > new Date()
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tenantData?.leaseEnd 
                    ? (new Date(tenantData.leaseEnd) > new Date() ? 'Active' : 'Expired')
                    : 'Not set'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Lease Start:</span>
                <span className="font-medium text-gray-900">
                  {tenantData?.leaseStart ? new Date(tenantData.leaseStart).toLocaleDateString() : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Lease End:</span>
                <span className="font-medium text-gray-900">
                  {tenantData?.leaseEnd ? new Date(tenantData.leaseEnd).toLocaleDateString() : 'Not set'}
                </span>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors">
                View Lease
              </button>
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors">
                Renew Lease
              </button>
            </div>
          </div>
        </div>

        {/* Community & Events */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">👥</span>
            Community & Events
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📢 Building Announcements</h4>
              <p className="text-gray-600 text-sm">Welcome to {roomData?.building || 'BCFlats'}!</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🛒 Community Board</h4>
              <p className="text-gray-600 text-sm">Buy/Sell/Share items with neighbors</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🎬 Event Calendar</h4>
              <p className="text-gray-600 text-sm">Movie night on {roomData?.floor ? `${getFloorSuffix(roomData.floor)} floor` : 'ground floor'}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🏠 Floor Meeting</h4>
              <p className="text-gray-600 text-sm">{roomData?.floor ? `${getFloorSuffix(roomData.floor)} floor` : 'Building'} residents meeting</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;


