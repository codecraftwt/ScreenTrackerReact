import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeToken } from '../utils/jwtHelper';
import { useUser } from '../features/user/userHooks';
import './Profile.css';

const valueOf = (entity, ...keys) => {
    for (const key of keys) {
        if (entity?.[key] !== undefined && entity?.[key] !== null) {
            return entity[key];
        }
    }

    return undefined;
};

const formatDateOnly = (value) => {
    if (!value) return '-';
    return String(value).split('T')[0] || '-';
};

const Profile = () => {
    const navigate = useNavigate();
    const { getUserById } = useUser();
    const [user, setUser] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            setErrorMessage('User is not authenticated. Please log in.');
            setTimeout(() => navigate('/login'), 1500);
            return;
        }

        const decodedUser = decodeToken(token);
        if (!decodedUser) {
            setErrorMessage('Unable to load profile details.');
            return;
        }

        try {
            const apiUser = decodedUser.id ? await getUserById(decodedUser.id) : null;
            if (!isMounted) return;

            setUser({
                username: valueOf(apiUser, 'username', 'Username', 'userName', 'UserName') || decodedUser.name || decodedUser.username || '',
                firstName: valueOf(apiUser, 'firstName', 'FirstName') || decodedUser.firstName || decodedUser.FirstName || '',
                lastName: valueOf(apiUser, 'lastName', 'LastName') || decodedUser.lastName || decodedUser.LastName || '',
                email: valueOf(apiUser, 'email', 'Email') || decodedUser.email || '',
                phoneNumber: valueOf(apiUser, 'phoneNumber', 'PhoneNumber', 'phone', 'Phone') || decodedUser.phoneNumber || decodedUser.PhoneNumber || '',
                role: valueOf(apiUser, 'role', 'Role') || decodedUser.role || '',
                createdAt: valueOf(apiUser, 'createdAt', 'CreatedAt', 'createdDate', 'CreatedDate', 'createdOn', 'CreatedOn', 'insertedAt', 'InsertedAt') || decodedUser.createdAt || decodedUser.CreatedAt || ''
            });
        } catch (error) {
            if (!isMounted) return;
            setUser({
                username: decodedUser.name || decodedUser.username || '',
                firstName: decodedUser.firstName || decodedUser.FirstName || '',
                lastName: decodedUser.lastName || decodedUser.LastName || '',
                email: decodedUser.email || '',
                phoneNumber: decodedUser.phoneNumber || decodedUser.PhoneNumber || '',
                role: decodedUser.role || '',
                createdAt: decodedUser.createdAt || decodedUser.CreatedAt || ''
            });
        }
        };

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, [navigate, getUserById]);

    const goBack = () => {
        navigate(-1);
    };

    return (
        <div className="profile-container">
            {errorMessage ? (
                <div className="profile-state text-danger">{errorMessage}</div>
            ) : !user ? (
                <div className="profile-state">Loading profile...</div>
            ) : (
                <>
                    <div className="profile-top-bar">
                        <button className="btn-back profile-back-btn" onClick={goBack} title="Go Back">
                            <i className="fas fa-arrow-left" aria-hidden="true"></i>
                            Back
                        </button>
                    </div>

                    {/* <section className="profile-page-header">
                        <div>
                            <p className="profile-eyebrow">Account overview</p>
                            <h1>Profile</h1>
                            <p className="profile-subtitle">Viewing {user.username || 'user'}</p>
                        </div>
                        <span className="profile-role-badge">{user.role || 'User'}</span>
                    </section> */}

                    <section className="profile-card">
                        <div className="profile-card-header">
                            <div className="profile-avatar">
                                {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                            </div>
                            <div>
                                <h2 className="profile-heading">{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username}</h2>
                                <p>{user.email || 'No email available'}</p>
                            </div>
                        </div>

                        <div className="profile-info">
                            <div className="profile-row">
                                <span>Username</span>
                                <strong>{user.username || '-'}</strong>
                            </div>
                            <div className="profile-row">
                                <span>First Name</span>
                                <strong>{user.firstName || '-'}</strong>
                            </div>
                            <div className="profile-row">
                                <span>Last Name</span>
                                <strong>{user.lastName || '-'}</strong>
                            </div>
                            <div className="profile-row">
                                <span>Email</span>
                                <strong>{user.email || '-'}</strong>
                            </div>
                            <div className="profile-row">
                                <span>Phone Number</span>
                                <strong>{user.phoneNumber || '-'}</strong>
                            </div>
                            <div className="profile-row">
                                <span>Role</span>
                                <strong>{user.role || '-'}</strong>
                            </div>
                            <div className="profile-row profile-row-full">
                                <span>Member Since</span>
                                <strong>{formatDateOnly(user.createdAt)}</strong>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default Profile;
