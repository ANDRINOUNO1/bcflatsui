import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { tenantService } from '../services/tenantService';
import { roomService } from '../services/roomService';
import '../components/AddAccountPage.css';

const AddAccountPage = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'Admin',
        // Tenant-specific fields
        roomId: '',
        bedNumber: '',
        monthlyRent: '',
        utilities: '',
        deposit: '',
        emergencyContact: {
            name: '',
            phone: '',
            relationship: ''
        },
        specialRequirements: '',
        notes: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [errors, setErrors] = useState({});
    const [availableRooms, setAvailableRooms] = useState([]);
    const [roomBeds, setRoomBeds] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [customRelationship, setCustomRelationship] = useState('');
    
    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalDetails, setModalDetails] = useState('');

    // Load available rooms when component mounts
    useEffect(() => {
        loadAvailableRooms();
    }, []);

    // Load room beds when room selection changes
    useEffect(() => {
        if (formData.roomId) {
            loadRoomBeds(formData.roomId);
        } else {
            setRoomBeds([]);
        }
    }, [formData.roomId]);

    const loadAvailableRooms = async () => {
        try {
            setLoadingRooms(true);
            const rooms = await roomService.getAllRooms();
            setAvailableRooms(rooms);
        } catch (error) {
            console.error('Error loading rooms:', error);
            setMessage({ type: 'error', text: 'Failed to load available rooms' });
        } finally {
            setLoadingRooms(false);
        }
    };

    const loadRoomBeds = async (roomId) => {
        try {
            // Fetch room details to get pricing information
            const roomDetails = await roomService.getRoomById(roomId);
            setSelectedRoom(roomDetails);
            
            // Auto-populate financial fields based on room data
            if (roomDetails) {
                setFormData(prev => ({
                    ...prev,
                    monthlyRent: roomDetails.monthlyRent || '',
                    utilities: roomDetails.utilities || '',
                    deposit: roomDetails.monthlyRent ? (roomDetails.monthlyRent * 2) : '' // 2 months deposit
                }));
            }
            
            // Fetch bed status
            const bedStatus = await roomService.getRoomBedStatus(roomId);
            const availableBeds = bedStatus.bedStatus.filter(bed => bed.status === 'Available');
            setRoomBeds(availableBeds);
        } catch (error) {
            console.error('Error loading room beds:', error);
            setRoomBeds([]);
            setSelectedRoom(null);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Handle nested emergency contact fields
        if (name.startsWith('emergencyContact.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                emergencyContact: {
                    ...prev.emergencyContact,
                    [field]: value
                }
            }));
        } else if (name === 'emergencyContact.relationship') {
            // Handle relationship selection
            if (value === 'Other') {
                setFormData(prev => ({
                    ...prev,
                    emergencyContact: {
                        ...prev.emergencyContact,
                        relationship: 'Other'
                    }
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    emergencyContact: {
                        ...prev.emergencyContact,
                        relationship: value
                    }
                }));
                setCustomRelationship(''); // Clear custom relationship when selecting predefined option
            }
        } else if (name === 'customRelationship') {
            // Handle custom relationship input - only update customRelationship state
            setCustomRelationship(value);
            // Don't update the formData relationship field here to avoid re-rendering issues
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
        
        // Clear message when user starts typing
        if (message.text) {
            setMessage({ type: '', text: '' });
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        // Validate first name
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        } else if (formData.firstName.trim().length < 2) {
            newErrors.firstName = 'First name must be at least 2 characters';
        }
        
        // Validate last name
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        } else if (formData.lastName.trim().length < 2) {
            newErrors.lastName = 'Last name must be at least 2 characters';
        }
        
        // Validate email
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        
        // Validate password
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        } else if (formData.password.length > 50) {
            newErrors.password = 'Password must be less than 50 characters';
        }
        
        // Validate role
        if (!formData.role) {
            newErrors.role = 'Role is required';
        }
        
        // Validate tenant-specific fields
        if (formData.role === 'Tenant') {
            if (!formData.roomId) {
                newErrors.roomId = 'Room selection is required';
            }
            if (!formData.bedNumber) {
                newErrors.bedNumber = 'Bed number is required';
            }
            if (!formData.monthlyRent || formData.monthlyRent <= 0) {
                newErrors.monthlyRent = 'Monthly rent must be greater than 0';
            }
            if (!formData.utilities || formData.utilities < 0) {
                newErrors.utilities = 'Utilities amount cannot be negative';
            }
            if (!formData.deposit || formData.deposit < 0) {
                newErrors.deposit = 'Deposit amount cannot be negative';
            }
            if (!formData.emergencyContact.name.trim()) {
                newErrors['emergencyContact.name'] = 'Emergency contact name is required';
            }
            if (!formData.emergencyContact.phone.trim()) {
                newErrors['emergencyContact.phone'] = 'Emergency contact phone is required';
            }
            if (!formData.emergencyContact.relationship.trim()) {
                newErrors['emergencyContact.relationship'] = 'Emergency contact relationship is required';
            }
            if (formData.emergencyContact.relationship === 'Other' && !customRelationship.trim()) {
                newErrors.customRelationship = 'Please specify the relationship';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            setMessage({ type: 'error', text: 'Please fix the errors below' });
            return;
        }
        
        // Check if current user has permission to create accounts with the selected role
        const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        const userRole = currentUser.role;
        
        // Define role hierarchy and permissions
        const roleHierarchy = {
            'SuperAdmin': 100,
            'HeadAdmin': 90,
            'Admin': 50,
            'Accounting': 30,
            'Tenant': 10
        };
        
        const targetRoleLevel = roleHierarchy[formData.role] || 0;
        const userRoleLevel = roleHierarchy[userRole] || 0;
        
        // Check if user can create accounts with the selected role
        if (targetRoleLevel >= userRoleLevel && formData.role !== userRole) {
            setModalMessage('Permission Denied');
            setModalDetails(`You don't have permission to create ${formData.role} accounts. Only ${userRole} and higher roles can create this type of account.`);
            setShowErrorModal(true);
            return;
        }
        
        // Special permission checks
        if (formData.role === 'SuperAdmin' && userRole !== 'SuperAdmin') {
            setModalMessage('Permission Denied');
            setModalDetails('Only Super Admin can create other Super Admin accounts.');
            setShowErrorModal(true);
            return;
        }
        
        if (formData.role === 'HeadAdmin' && !['SuperAdmin', 'HeadAdmin'].includes(userRole)) {
            setModalMessage('Permission Denied');
            setModalDetails('Only Super Admin or Head Admin can create Head Admin accounts.');
            setShowErrorModal(true);
            return;
        }
        
        setLoading(true);
        setMessage({ type: '', text: '' });
        
        try {
            // Prepare account data
            const accountData = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                role: formData.role,
                status: 'Pending'
            };
            
            // Create account first
            console.log('Creating account with data:', accountData);
            const accountResponse = await authService.createAccount(accountData);
            console.log('Account creation response:', accountResponse);
            
            // Extract the account data from the response
            const createdAccount = accountResponse.account || accountResponse;
            console.log('Extracted account data:', createdAccount);
            
            // If creating a tenant, also create tenant record
            if (formData.role === 'Tenant') {
                // Validate that all required tenant fields are present
                if (!formData.roomId || !formData.bedNumber || !formData.monthlyRent) {
                    throw new Error('Missing required tenant information: room, bed number, or monthly rent');
                }
                
                const tenantData = {
                    accountId: createdAccount.id,
                    roomId: parseInt(formData.roomId),
                    bedNumber: parseInt(formData.bedNumber),
                    monthlyRent: parseFloat(formData.monthlyRent),
                    utilities: parseFloat(formData.utilities) || 0,
                    deposit: parseFloat(formData.deposit) || 0,
                    emergencyContact: {
                        ...formData.emergencyContact,
                        relationship: formData.emergencyContact.relationship === 'Other' ? customRelationship : formData.emergencyContact.relationship
                    },
                    specialRequirements: formData.specialRequirements || '',
                    notes: formData.notes || '',
                    status: 'Pending',
                    checkInDate: new Date().toISOString()
                };
                
                console.log('Creating tenant with data:', tenantData);
                await tenantService.createTenant(tenantData);
                console.log('Tenant created successfully');
            }
            
            // Success
            const successMessage = formData.role === 'Tenant' 
                ? `Tenant account created successfully! ${formData.firstName} ${formData.lastName} has been submitted for SuperAdmin approval and will be assigned to their room once approved.`
                : `Account created successfully! ${formData.firstName} ${formData.lastName} has been submitted for SuperAdmin approval and can log in once approved.`;
                
            setModalMessage(successMessage);
            setModalDetails(formData.role === 'Tenant' 
                ? `Room: ${selectedRoom?.roomNumber || 'N/A'}, Bed: ${formData.bedNumber}, Monthly Rent: ₱${formData.monthlyRent}\nStatus: Pending SuperAdmin Approval`
                : `Role: ${formData.role}, Email: ${formData.email}\nStatus: Pending SuperAdmin Approval`
            );
            setShowSuccessModal(true);
            
            // Clear form
            resetForm();
            
        } catch (error) {
            console.error('Error creating account:', error);
            
            // Handle specific error cases
            let errorMessage = '';
            let errorDetails = '';
            
            if (error.message.includes('already registered') || error.message.includes('already exists')) {
                errorMessage = 'Account Creation Failed';
                errorDetails = 'An account with this email already exists. Please use a different email address.';
                setErrors({ email: 'Email already exists' });
            } else if (error.message.includes('Missing required')) {
                errorMessage = 'Account Creation Failed';
                errorDetails = error.message || 'Required information is missing. Please check all fields.';
            } else if (error.message.includes('permission')) {
                errorMessage = 'Permission Denied';
                errorDetails = error.message || 'You do not have permission to create this type of account.';
            } else {
                errorMessage = 'Account Creation Failed';
                errorDetails = error.message || 'Failed to create account. Please try again.';
            }
            
            setModalMessage(errorMessage);
            setModalDetails(errorDetails);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            role: 'Admin',
            roomId: '',
            bedNumber: '',
            monthlyRent: '',
            utilities: '',
            deposit: '',
            emergencyContact: {
                name: '',
                phone: '',
                relationship: ''
            },
            specialRequirements: '',
            notes: ''
        });
        setErrors({});
        setMessage({ type: '', text: '' });
        setSelectedRoom(null);
        setCustomRelationship('');
        setRoomBeds([]);
    };

    const getFullName = () => {
        return `${formData.firstName} ${formData.lastName}`.trim();
    };

    const getAvailableRoles = () => {
        const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
        const userRole = currentUser.role;
        
        const allRoles = [
            { value: 'HeadAdmin', label: 'Head Admin' },
            { value: 'SuperAdmin', label: 'Super Admin' },
            { value: 'Admin', label: 'Admin' },
            { value: 'Accounting', label: 'Accounting' },
            { value: 'Tenant', label: 'Tenant' }
        ];
        
        // Filter roles based on current user's permissions
        switch (userRole) {
            case 'SuperAdmin':
                return allRoles; // Super Admin can create all roles
            case 'HeadAdmin':
                return allRoles.filter(role => role.value !== 'SuperAdmin');
            case 'Admin':
                return allRoles.filter(role => !['SuperAdmin', 'HeadAdmin'].includes(role.value));
            case 'Accounting':
                return allRoles.filter(role => !['SuperAdmin', 'HeadAdmin', 'Admin'].includes(role.value));
            default:
                return allRoles.filter(role => role.value === 'Tenant'); // Default to tenant only
        }
    };

    return (
        <div className="add-account-container">
            <div className="add-account-header">
                <h2>👤 Add New Account</h2>
                <p>Create a new admin or accounting account for the dormitory management system</p>
            </div>

            <div className="add-account-content">
                <div className="form-container">
                    <form onSubmit={handleSubmit} className="account-form">
                        <div className="form-section">
                            <h3>Account Information</h3>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="firstName">
                                        First Name <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className={errors.firstName ? 'error' : ''}
                                        placeholder="Enter first name"
                                        disabled={loading}
                                    />
                                    {errors.firstName && (
                                        <span className="error-message">{errors.firstName}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="lastName">
                                        Last Name <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className={errors.lastName ? 'error' : ''}
                                        placeholder="Enter last name"
                                        disabled={loading}
                                    />
                                    {errors.lastName && (
                                        <span className="error-message">{errors.lastName}</span>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">
                                    Email Address <span className="required">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={errors.email ? 'error' : ''}
                                    placeholder="Enter email address"
                                    disabled={loading}
                                />
                                {errors.email && (
                                    <span className="error-message">{errors.email}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">
                                    Password <span className="required">*</span>
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={errors.password ? 'error' : ''}
                                    placeholder="Enter password (min 6 characters)"
                                    disabled={loading}
                                />
                                {errors.password && (
                                    <span className="error-message">{errors.password}</span>
                                )}
                                <small className="form-help">
                                    Password must be at least 6 characters long
                                </small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="role">
                                    Role <span className="required">*</span>
                                </label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className={errors.role ? 'error' : ''}
                                    disabled={loading}
                                >
                                    {getAvailableRoles().map(role => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.role && (
                                    <span className="error-message">{errors.role}</span>
                                )}
                                <small className="form-help">
                                    Select the appropriate role for this account
                                </small>
                            </div>
                        </div>

                        {/* Tenant-specific fields */}
                        {formData.role === 'Tenant' && (
                            <div className="form-section tenant-section">
                                <h3>🏠 Tenant Information</h3>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="roomId">
                                            Room <span className="required">*</span>
                                        </label>
                                        <select
                                            id="roomId"
                                            name="roomId"
                                            value={formData.roomId}
                                            onChange={handleInputChange}
                                            className={errors.roomId ? 'error' : ''}
                                            disabled={loading || loadingRooms}
                                        >
                                            <option value="">Select a room</option>
                                            {availableRooms.map(room => (
                                                <option key={room.id} value={room.id}>
                                                    {room.roomNumber} - Floor {room.floor} ({room.bedCount} beds)
                                                </option>
                                            ))}
                                        </select>
                                        {errors.roomId && (
                                            <span className="error-message">{errors.roomId}</span>
                                        )}
                                        {loadingRooms && (
                                            <small className="form-help">Loading rooms...</small>
                                        )}
                                        {selectedRoom && (
                                            <small className="form-help">
                                                Room {selectedRoom.roomNumber} - Floor {selectedRoom.floor} | 
                                                Monthly Rent: ₱{selectedRoom.monthlyRent?.toLocaleString()} | 
                                                Utilities: ₱{selectedRoom.utilities?.toLocaleString()}
                                            </small>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="bedNumber">
                                            Bed Number <span className="required">*</span>
                                        </label>
                                        <select
                                            id="bedNumber"
                                            name="bedNumber"
                                            value={formData.bedNumber}
                                            onChange={handleInputChange}
                                            className={errors.bedNumber ? 'error' : ''}
                                            disabled={loading || !formData.roomId}
                                        >
                                            <option value="">Select a bed</option>
                                            {roomBeds.map(bed => (
                                                <option key={bed.bedNumber} value={bed.bedNumber}>
                                                    Bed {bed.bedNumber}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.bedNumber && (
                                            <span className="error-message">{errors.bedNumber}</span>
                                        )}
                                        {!formData.roomId && (
                                            <small className="form-help">Please select a room first</small>
                                        )}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="monthlyRent">
                                            Monthly Rent (PHP) <span className="required">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            id="monthlyRent"
                                            name="monthlyRent"
                                            value={formData.monthlyRent}
                                            onChange={handleInputChange}
                                            className={errors.monthlyRent ? 'error' : ''}
                                            placeholder="Enter monthly rent"
                                            min="0"
                                            step="0.01"
                                            disabled={loading}
                                        />
                                        {errors.monthlyRent && (
                                            <span className="error-message">{errors.monthlyRent}</span>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="utilities">
                                            Utilities (PHP)
                                        </label>
                                        <input
                                            type="number"
                                            id="utilities"
                                            name="utilities"
                                            value={formData.utilities}
                                            onChange={handleInputChange}
                                            className={errors.utilities ? 'error' : ''}
                                            placeholder="Enter utilities amount"
                                            min="0"
                                            step="0.01"
                                            disabled={loading}
                                        />
                                        {errors.utilities && (
                                            <span className="error-message">{errors.utilities}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="deposit">
                                        Deposit (PHP)
                                    </label>
                                    <input
                                        type="number"
                                        id="deposit"
                                        name="deposit"
                                        value={formData.deposit}
                                        onChange={handleInputChange}
                                        className={errors.deposit ? 'error' : ''}
                                        placeholder="Enter deposit amount"
                                        min="0"
                                        step="0.01"
                                        disabled={loading}
                                    />
                                    {errors.deposit && (
                                        <span className="error-message">{errors.deposit}</span>
                                    )}
                                </div>

                                <div className="form-section">
                                    <h4>📞 Emergency Contact</h4>
                                    
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="emergencyContact.name">
                                                Contact Name <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="emergencyContact.name"
                                                name="emergencyContact.name"
                                                value={formData.emergencyContact.name}
                                                onChange={handleInputChange}
                                                className={errors['emergencyContact.name'] ? 'error' : ''}
                                                placeholder="Enter emergency contact name"
                                                disabled={loading}
                                            />
                                            {errors['emergencyContact.name'] && (
                                                <span className="error-message">{errors['emergencyContact.name']}</span>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="emergencyContact.phone">
                                                Contact Phone <span className="required">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                id="emergencyContact.phone"
                                                name="emergencyContact.phone"
                                                value={formData.emergencyContact.phone}
                                                onChange={handleInputChange}
                                                className={errors['emergencyContact.phone'] ? 'error' : ''}
                                                placeholder="Enter phone number"
                                                disabled={loading}
                                            />
                                            {errors['emergencyContact.phone'] && (
                                                <span className="error-message">{errors['emergencyContact.phone']}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="emergencyContact.relationship">
                                            Relationship <span className="required">*</span>
                                        </label>
                                        <select
                                            id="emergencyContact.relationship"
                                            name="emergencyContact.relationship"
                                            value={formData.emergencyContact.relationship}
                                            onChange={handleInputChange}
                                            className={errors['emergencyContact.relationship'] ? 'error' : ''}
                                            disabled={loading}
                                        >
                                            <option value="">Select relationship</option>
                                            <option value="Parent">Parent</option>
                                            <option value="Sibling">Sibling</option>
                                            <option value="Spouse">Spouse</option>
                                            <option value="Guardian">Guardian</option>
                                            <option value="Friend">Friend</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        {errors['emergencyContact.relationship'] && (
                                            <span className="error-message">{errors['emergencyContact.relationship']}</span>
                                        )}
                                        
                                        {/* Custom relationship input field */}
                                        {formData.emergencyContact.relationship === 'Other' && (
                                            <div className="form-group" style={{ marginTop: '10px' }}>
                                                <label htmlFor="customRelationship">
                                                    Specify Relationship <span className="required">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    id="customRelationship"
                                                    name="customRelationship"
                                                    value={customRelationship}
                                                    onChange={handleInputChange}
                                                    className={errors.customRelationship ? 'error' : ''}
                                                    placeholder="Enter relationship (e.g., Cousin, Uncle, etc.)"
                                                    disabled={loading}
                                                />
                                                {errors.customRelationship && (
                                                    <span className="error-message">{errors.customRelationship}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="specialRequirements">
                                        Special Requirements
                                    </label>
                                    <textarea
                                        id="specialRequirements"
                                        name="specialRequirements"
                                        value={formData.specialRequirements}
                                        onChange={handleInputChange}
                                        className={errors.specialRequirements ? 'error' : ''}
                                        placeholder="Enter any special requirements or accommodations needed"
                                        rows="3"
                                        disabled={loading}
                                    />
                                    {errors.specialRequirements && (
                                        <span className="error-message">{errors.specialRequirements}</span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="notes">
                                        Additional Notes
                                    </label>
                                    <textarea
                                        id="notes"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        className={errors.notes ? 'error' : ''}
                                        placeholder="Enter any additional notes"
                                        rows="3"
                                        disabled={loading}
                                    />
                                    {errors.notes && (
                                        <span className="error-message">{errors.notes}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Account Preview */}
                        {getFullName() && (
                            <div className="account-preview">
                                <h4>Account Preview</h4>
                                <div className="preview-card">
                                    <div className="preview-avatar">
                                        {formData.firstName.charAt(0).toUpperCase()}
                                        {formData.lastName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="preview-details">
                                        <div className="preview-name">{getFullName()}</div>
                                        <div className="preview-email">{formData.email || 'email@example.com'}</div>
                                        <div className="preview-role">
                                            <span className={`role-badge ${formData.role.toLowerCase()}`}>
                                                {formData.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Message Display */}
                        {message.text && (
                            <div className={`message ${message.type}`}>
                                <div className="message-icon">
                                    {message.type === 'success' ? '✅' : '❌'}
                                </div>
                                <div className="message-text">{message.text}</div>
                            </div>
                        )}

                        {/* Form Actions */}
                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={resetForm}
                                disabled={loading}
                            >
                                Clear Form
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        👤 Create Account
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Help Section */}
                <div className="help-section">
                    <h4>📋 Account Roles</h4>
                    <div className="role-info">
                        <div className="role-item">
                            <div className="role-icon superadmin">⭐</div>
                            <div className="role-details">
                                <h5>Super Admin</h5>
                                <p>Highest level access including:</p>
                                <ul>
                                    <li>All system functions</li>
                                    <li>User management</li>
                                    <li>System configuration</li>
                                    <li>Financial oversight</li>
                                    <li>Admin management</li>
                                    <li>Navigation control</li>
                                </ul>
                            </div>
                        </div>
                        <div className="role-item">
                            <div className="role-icon headadmin">👑</div>
                            <div className="role-details">
                                <h5>Head Admin</h5>
                                <p>Advanced administrative access including:</p>
                                <ul>
                                    <li>Room management</li>
                                    <li>Tenant management</li>
                                    <li>Payment processing</li>
                                    <li>Maintenance requests</li>
                                    <li>Account management</li>
                                    <li>Overdue payments</li>
                                </ul>
                            </div>
                        </div>
                        <div className="role-item">
                            <div className="role-icon admin">🔧</div>
                            <div className="role-details">
                                <h5>Admin</h5>
                                <p>Standard administrative access including:</p>
                                <ul>
                                    <li>Room management</li>
                                    <li>Tenant management</li>
                                    <li>Payment processing</li>
                                    <li>Maintenance requests</li>
                                </ul>
                            </div>
                        </div>
                        <div className="role-item">
                            <div className="role-icon accounting">💰</div>
                            <div className="role-details">
                                <h5>Accounting</h5>
                                <p>Financial management access including:</p>
                                <ul>
                                    <li>Payment processing</li>
                                    <li>Billing management</li>
                                    <li>Financial reports</li>
                                    <li>Tenant billing info</li>
                                </ul>
                            </div>
                        </div>
                        <div className="role-item">
                            <div className="role-icon tenant">🏠</div>
                            <div className="role-details">
                                <h5>Tenant</h5>
                                <p>Resident access including:</p>
                                <ul>
                                    <li>View personal information</li>
                                    <li>Payment history</li>
                                    <li>Maintenance requests</li>
                                    <li>Room details</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Success Modal */}
            {showSuccessModal && (
                <div className="modal-overlay" onClick={() => setShowSuccessModal(false)} style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    background: 'rgba(0, 0, 0, 0.5)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    zIndex: 2000, 
                    padding: '20px' 
                }}>
                    <div className="modal-container success-modal" onClick={(e) => e.stopPropagation()} style={{ 
                        background: 'white', 
                        borderRadius: '1rem', 
                        maxWidth: '500px', 
                        width: '100%', 
                        maxHeight: '90vh', 
                        overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <div className="modal-header success-modal-header" style={{ 
                            padding: '1.5rem', 
                            borderBottom: '1px solid #e5e7eb', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>✅</span>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Success!</h2>
                            </div>
                            <button 
                                className="modal-close" 
                                onClick={() => setShowSuccessModal(false)}
                                style={{ 
                                    background: 'rgba(255, 255, 255, 0.2)', 
                                    border: 'none', 
                                    borderRadius: '50%', 
                                    width: '32px', 
                                    height: '32px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    cursor: 'pointer',
                                    color: 'white',
                                    fontSize: '1.25rem'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body success-modal-body" style={{ padding: '1.5rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ 
                                    width: '80px', 
                                    height: '80px', 
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    margin: '0 auto 1rem',
                                    fontSize: '2rem'
                                }}>
                                    🎉
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: '#111827' }}>
                                    Account Submitted for Approval!
                                </h3>
                                <p style={{ color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                                    {modalMessage}
                                </p>
                            </div>
                            
                            {modalDetails && (
                                <div style={{ 
                                    background: '#f0f9ff', 
                                    border: '1px solid #bae6fd', 
                                    borderRadius: '0.5rem', 
                                    padding: '1rem', 
                                    marginBottom: '1.5rem' 
                                }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: '#0c4a6e' }}>
                                        Account Information:
                                    </h4>
                                    <p style={{ fontSize: '0.875rem', margin: 0, color: '#0c4a6e', whiteSpace: 'pre-line' }}>
                                        {modalDetails}
                                    </p>
                                    <div style={{ 
                                        marginTop: '0.75rem', 
                                        padding: '0.75rem', 
                                        background: '#fef3c7', 
                                        border: '1px solid #f59e0b', 
                                        borderRadius: '0.375rem' 
                                    }}>
                                        <p style={{ fontSize: '0.875rem', margin: 0, color: '#92400e', fontWeight: 600 }}>
                                            ⏳ Awaiting SuperAdmin Approval
                                        </p>
                                        <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0 0', color: '#92400e' }}>
                                            The account will be activated once approved by SuperAdmin.
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button 
                                    onClick={() => setShowSuccessModal(false)}
                                    style={{ 
                                        padding: '0.75rem 1.5rem', 
                                        background: '#10b981', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '0.5rem', 
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            {showErrorModal && (
                <div className="modal-overlay" onClick={() => setShowErrorModal(false)} style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    background: 'rgba(0, 0, 0, 0.5)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    zIndex: 2000, 
                    padding: '20px' 
                }}>
                    <div className="modal-container error-modal" onClick={(e) => e.stopPropagation()} style={{ 
                        background: 'white', 
                        borderRadius: '1rem', 
                        maxWidth: '500px', 
                        width: '100%', 
                        maxHeight: '90vh', 
                        overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <div className="modal-header error-modal-header" style={{ 
                            padding: '1.5rem', 
                            borderBottom: '1px solid #e5e7eb', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                            color: 'white'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>❌</span>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Error</h2>
                            </div>
                            <button 
                                className="modal-close" 
                                onClick={() => setShowErrorModal(false)}
                                style={{ 
                                    background: 'rgba(255, 255, 255, 0.2)', 
                                    border: 'none', 
                                    borderRadius: '50%', 
                                    width: '32px', 
                                    height: '32px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    cursor: 'pointer',
                                    color: 'white',
                                    fontSize: '1.25rem'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body error-modal-body" style={{ padding: '1.5rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ 
                                    width: '80px', 
                                    height: '80px', 
                                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    margin: '0 auto 1rem',
                                    fontSize: '2rem'
                                }}>
                                    ⚠️
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0', color: '#111827' }}>
                                    {modalMessage}
                                </h3>
                                <p style={{ color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                                    {modalDetails}
                                </p>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button 
                                    onClick={() => setShowErrorModal(false)}
                                    style={{ 
                                        padding: '0.75rem 1.5rem', 
                                        background: '#dc2626', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '0.5rem', 
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddAccountPage;
