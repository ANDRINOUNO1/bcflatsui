import React, { useState } from 'react';
import { authService } from '../services/authService';
import '../components/AddAccountPage.css';

const AddAccountPage = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'Admin'
    });
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [errors, setErrors] = useState({});

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
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
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            setMessage({ type: 'error', text: 'Please fix the errors below' });
            return;
        }
        
        setLoading(true);
        setMessage({ type: '', text: '' });
        
        try {
            // Prepare data for API call
            const accountData = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                role: formData.role,
                status: 'Active' // Set as active by default
            };
            
            // Call the API to create account
            await authService.createAccount(accountData);
            
            // Success
            setMessage({ 
                type: 'success', 
                text: `Account created successfully! ${formData.firstName} ${formData.lastName} can now log in.` 
            });
            
            // Clear form
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                role: 'Admin'
            });
            
        } catch (error) {
            console.error('Error creating account:', error);
            
            // Handle specific error cases
            if (error.message.includes('already registered') || error.message.includes('already exists')) {
                setMessage({ 
                    type: 'error', 
                    text: 'An account with this email already exists. Please use a different email address.' 
                });
                setErrors({ email: 'Email already exists' });
            } else {
                setMessage({ 
                    type: 'error', 
                    text: error.message || 'Failed to create account. Please try again.' 
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const getFullName = () => {
        return `${formData.firstName} ${formData.lastName}`.trim();
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
                                    <option value="Admin">Admin</option>
                                    <option value="Accounting">Accounting</option>
                                </select>
                                {errors.role && (
                                    <span className="error-message">{errors.role}</span>
                                )}
                                <small className="form-help">
                                    Admin: Full system access | Accounting: Payment and billing access
                                </small>
                            </div>
                        </div>

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
                                onClick={() => {
                                    setFormData({
                                        firstName: '',
                                        lastName: '',
                                        email: '',
                                        password: '',
                                        role: 'Admin'
                                    });
                                    setErrors({});
                                    setMessage({ type: '', text: '' });
                                }}
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
                            <div className="role-icon admin">👑</div>
                            <div className="role-details">
                                <h5>Admin</h5>
                                <p>Full system access including:</p>
                                <ul>
                                    <li>Room management</li>
                                    <li>Tenant management</li>
                                    <li>Payment processing</li>
                                    <li>Maintenance requests</li>
                                    <li>Account management</li>
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddAccountPage;
