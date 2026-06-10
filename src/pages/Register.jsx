import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../features/auth/authHooks';
import { useUser } from '../features/user/userHooks';
import { decodeToken } from '../utils/jwtHelper';
import './Register.css';

const createEmptyFormData = (adminAuthorityBy = 0, role = 'User') => ({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role,
    phoneNumber: '',
    adminAuthorityBy,
    IsCreatedBy: adminAuthorityBy || null,
    isManualTrackingEnabled: true,
    manualTrackingAuthBy: adminAuthorityBy || null,
    isAutoTrackingEnabled: true,
    autoTrackingAuthBy: adminAuthorityBy || null
});

const toValidId = (value) => {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : 0;
};

const valueOf = (entity, ...keys) => {
    for (const key of keys) {
        if (entity?.[key] !== undefined && entity?.[key] !== null) {
            return entity[key];
        }
    }

    return undefined;
};

const toEditFormData = (user, fallbackAdminId = 0) => {
    const createdBy = toValidId(valueOf(user, 'isCreatedBy', 'IsCreatedBy')) || fallbackAdminId;

    return {
        id: valueOf(user, 'id', 'Id'),
        username: valueOf(user, 'username', 'Username') || '',
        firstName: valueOf(user, 'firstName', 'FirstName') || '',
        lastName: valueOf(user, 'lastName', 'LastName') || '',
        email: valueOf(user, 'email', 'Email') || '',
        password: '',
        confirmPassword: '',
        role: valueOf(user, 'role', 'Role') || 'User',
        phoneNumber: valueOf(user, 'phoneNumber', 'PhoneNumber') || '',
        adminAuthorityBy: toValidId(valueOf(user, 'adminAuthorityBy', 'AdminAuthorityBy')) || fallbackAdminId,
        IsCreatedBy: createdBy || null,
        isManualTrackingEnabled: valueOf(user, 'isManualTrackingEnabled', 'IsManualTrackingEnabled') ?? true,
        manualTrackingAuthBy: toValidId(valueOf(user, 'manualTrackingAuthBy', 'ManualTrackingAuthBy')) || createdBy || null,
        isAutoTrackingEnabled: valueOf(user, 'isAutoTrackingEnabled', 'IsAutoTrackingEnabled') ?? true,
        autoTrackingAuthBy: toValidId(valueOf(user, 'autoTrackingAuthBy', 'AutoTrackingAuthBy')) || createdBy || null
    };
};

const EMAIL_REGEX = /^([a-zA-Z0-9_\-.]+)@((\[[0-9]{1,3}(\.[0-9]{1,3}){2}\.)|(([a-zA-Z0-9-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
const PHONE_NUMBER_REGEX = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
const NAME_REGEX = /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

const Register = () => {
    const { userId, adminId } = useParams();
    const [searchParams] = useSearchParams();
    const queryAdminId = searchParams.get('adminId');

    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(createEmptyFormData());

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const { register: registerUser } = useAuth();
    const { getUserById, updateUser } = useUser();

    const getDecodedUser = () => {
        const token = localStorage.getItem('authToken');
        return token ? decodeToken(token) : null;
    };

    const resolveAdminAuthorityBy = () => {
        if (queryAdminId) return toValidId(queryAdminId);
        if (adminId) return toValidId(adminId);

        const decodedUser = getDecodedUser();
        return toValidId(decodedUser?.id);
    };

    const resolveDefaultRole = () => {
        const decodedUser = getDecodedUser();
        return String(decodedUser?.role || '').toLowerCase() === 'superadmin' ? 'Admin' : 'User';
    };

    useEffect(() => {
        const loadUser = async () => {
            if (userId) {
                setIsEditMode(true);
                setIsLoading(true);
                const user = await getUserById(userId);
                if (user) {
                    setFormData(toEditFormData(user, resolveAdminAuthorityBy()));
                } else {
                    setMessage('Unable to load user details.');
                    setMessageType('error');
                }
                setIsLoading(false);
            } else {
                setIsEditMode(false);
                setFormData(createEmptyFormData(resolveAdminAuthorityBy(), resolveDefaultRole()));
            }
        };
        loadUser();
    }, [userId, queryAdminId, adminId, getUserById]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleReset = () => {
        if (isEditMode && userId) {
            setIsLoading(true);
            getUserById(userId)
                .then((user) => {
                    if (user) {
                        setFormData(toEditFormData(user, resolveAdminAuthorityBy()));
                    }
                })
                .finally(() => setIsLoading(false));
        } else {
            setFormData(createEmptyFormData(formData.adminAuthorityBy, formData.role));
        }
        setMessage('');
    };

    const validateForm = () => {
        const firstName = formData.firstName.trim();
        const lastName = formData.lastName.trim();
        const email = formData.email.trim();
        const phoneNumber = formData.phoneNumber.trim();
        const password = formData.password;
        const confirmPassword = formData.confirmPassword;

        if (!formData.username.trim() || !email || !firstName || !lastName) {
            return 'Please fill required fields.';
        }

        if (!NAME_REGEX.test(firstName) || !NAME_REGEX.test(lastName)) {
            return 'Invalid name format.';
        }

        if (phoneNumber && !PHONE_NUMBER_REGEX.test(phoneNumber)) {
            return 'Invalid phone number format.';
        }

        if (!EMAIL_REGEX.test(email)) {
            return 'Invalid email format.';
        }

        if (!isEditMode) {
            if (!password) {
                return 'Password is required.';
            }

            if (!PASSWORD_REGEX.test(password)) {
                return 'Password must be at least 6 characters and contain uppercase, lowercase, number, and special character.';
            }

            if (password !== confirmPassword) {
                return 'Passwords do not match.';
            }
        } else if (password || confirmPassword) {
            if (!password) {
                return 'Password is required.';
            }

            if (!PASSWORD_REGEX.test(password)) {
                return 'Password must be at least 6 characters and contain uppercase, lowercase, number, and special character.';
            }

            if (password !== confirmPassword) {
                return 'Passwords do not match.';
            }
        }

        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const validationMessage = validateForm();
        if (validationMessage) {
            setMessage(validationMessage);
            setMessageType('error');
            return;
        }

        setIsLoading(true);

        try {
            if (isEditMode) {
                const updatedBy = resolveAdminAuthorityBy();
                
                const userToUpdate = {
                    id: formData.id,
                    username: formData.username.trim(),
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    email: formData.email.trim().toLowerCase(),
                    phoneNumber: formData.phoneNumber.trim(),
                    role: formData.role,
                    IsCreatedBy: formData.IsCreatedBy,
                    isCreatedBy: formData.IsCreatedBy,
                    isManualTrackingEnabled: formData.isManualTrackingEnabled,
                    manualTrackingAuthBy: formData.manualTrackingAuthBy,
                    isAutoTrackingEnabled: formData.isAutoTrackingEnabled,
                    autoTrackingAuthBy: formData.autoTrackingAuthBy
                };
                
                if (formData.password) {
                    userToUpdate.password = formData.password;
                    userToUpdate.Password = formData.password;
                }

                const result = await updateUser(userToUpdate, updatedBy);
                if (result.meta.requestStatus === 'fulfilled') {
                    setMessage('User updated successfully');
                    setMessageType('success');
                    setTimeout(() => navigate(-1), 1500);
                } else {
                    setMessage('Failed to update user.');
                    setMessageType('error');
                }
            } else {
                const registerModel = {
                    username: formData.username.trim(),
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password,
                    Password: formData.password,
                    ConfirmPassword: formData.confirmPassword,
                    role: formData.role,
                    phoneNumber: formData.phoneNumber.trim(),
                    adminAuthorityBy: formData.adminAuthorityBy,
                    IsCreatedBy: formData.IsCreatedBy,
                    isCreatedBy: formData.IsCreatedBy,
                    isManualTrackingEnabled: formData.isManualTrackingEnabled,
                    manualTrackingAuthBy: formData.manualTrackingAuthBy,
                    isAutoTrackingEnabled: formData.isAutoTrackingEnabled,
                    autoTrackingAuthBy: formData.autoTrackingAuthBy
                };

                const result = await registerUser(registerModel);
                if (result.meta.requestStatus === 'fulfilled') {
                    setMessage('Registration successful');
                    setMessageType('success');
                    setTimeout(() => navigate(-1), 1500);
                } else {
                    setMessage(result.payload || 'Registration failed');
                    setMessageType('error');
                }
            }
        } catch (error) {
            setMessage('An unexpected error occurred.');
            setMessageType('error');
        } finally {
            setIsLoading(false);
        }
    };

    const navigateBack = () => navigate(-1);

    return (
        <div className="register-container">
            <div className="form-card">
                <div className="form-header">
                    <h2>{isEditMode ? "Edit User" : "Add User"}</h2>
                    <p>{isEditMode ? "Update user information" : "Create a new user under this admin"}</p>
                </div>

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="input-grid">
                        <div className="input-group">
                            <label>User Name <span className="required">*</span></label>
                            <input 
                                type="text" 
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="input-field" 
                                placeholder="Enter your username" 
                                autoComplete="new-username"
                                readOnly={isEditMode} 
                            />
                        </div>
                        <div className="input-group">
                            <label>First Name <span className="required">*</span></label>
                            <input 
                                type="text" 
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="input-field" 
                                placeholder="Enter your first name" 
                            />
                        </div>
                    </div>

                    <div className="input-grid">
                        <div className="input-group">
                            <label>Last Name <span className="required">*</span></label>
                            <input 
                                type="text" 
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="input-field" 
                                placeholder="Enter your last name" 
                            />
                        </div>
                        <div className="input-group">
                            <label>Email <span className="required">*</span></label>
                            <input 
                                type="email" 
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input-field" 
                                placeholder="Enter your email" 
                            />
                        </div>
                    </div>

                    <div className="input-grid">
                        <div className="input-group">
                            <label>Password {!isEditMode && <span className="required">*</span>}</label>
                            <div className="password-wrapper">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input-field" 
                                    placeholder={isEditMode ? "Leave blank" : "Create password"} 
                                    autoComplete="new-password"
                                />
                                <button type="button" className="toggle-button" onClick={() => setShowPassword(!showPassword)}>
                                    <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Confirm Password {!isEditMode && <span className="required">*</span>}</label>
                            <div className="password-wrapper">
                                <input 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="input-field" 
                                    placeholder={isEditMode ? "Confirm new" : "Confirm password"} 
                                    autoComplete="new-password"
                                />
                                <button type="button" className="toggle-button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <i className={showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="input-grid">
                        <div className="input-group">
                            <label>Role</label>
                            <input 
                                type="text" 
                                name="role"
                                value={formData.role}
                                className="input-field" 
                                readOnly 
                            />
                        </div>
                        <div className="input-group">
                            <label>Phone Number <span className="optional-label">(Optional)</span></label>
                            <input 
                                type="text" 
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                className="input-field" 
                                placeholder="Enter your phone number" 
                            />
                        </div>
                    </div>

                    <div className="button-group">
                        <button type="submit" className="btn primary">{isEditMode ? "Update" : "Add User"}</button>
                        <button type="button" className="btn secondary" onClick={navigateBack}>Cancel</button>
                        <button type="button" className="btn outline" onClick={handleReset}>Reset</button>
                    </div>
                </form>

                {message && (
                    <div className={`message ${messageType === 'success' ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Register;
