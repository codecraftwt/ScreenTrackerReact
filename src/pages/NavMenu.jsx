import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import Swal from 'sweetalert2';
import { resetUserState } from '../features/user/userSlice';
import './NavMenu.css';

const NavMenu = () => {
    const auth = useSelector((state) => state.auth);
    const authUser = auth.currentUser || auth.user;
    const userRole = authUser?.role?.toLowerCase() || '';
    const userName = authUser?.name || 'User';
    const userId = authUser?.id || null;

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [showProfileDropdown, setShowProfileDropdown] = useState(false);

    const toggleProfileDropdown = () => setShowProfileDropdown((v) => !v);
    const closeProfileDropdown = () => setShowProfileDropdown(false);

    const onProfileLogoutClicked = async () => {
        const result = await Swal.fire({
            title: 'Logout',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, logout',
            cancelButtonText: 'Cancel',
        });
        if (!result.isConfirmed) return;
        dispatch(resetUserState());
        await dispatch(logout());
        navigate('/login');
    };

    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        const saved = localStorage.getItem('hs-theme') || 'system';
        if (saved === 'dark') return true;
        if (saved === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Apply theme on mount and when theme state changes
    React.useEffect(() => {
        if (isDarkTheme) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }, [isDarkTheme]);

    return (
        <div className="stitch-header">
            <div className="header-content">
                <NavLink to="/users" className="nav-link">
                    <i className="bi bi-house-door"></i> Dashboard
                </NavLink>

                {(userRole === "admin" || userRole === "superadmin") && (
                    <NavLink to="/active-users" className="nav-link">
                        <i className="bi bi-person-circle"></i> Active Users
                    </NavLink>
                )}

                {userId && (
                    <NavLink to={`/rptTime/${userId}?usageType=all`} className="nav-link">
                        <i className="bi bi-bar-chart-line"></i> Reports
                    </NavLink>
                )}

                {userRole === "superadmin" && (
                    <NavLink to="/admin-list" className="nav-link">
                        <i className="bi bi-people"></i> Admin List
                    </NavLink>
                )}

                {userRole === "admin" && (
                    <NavLink to={`/admin-users/${userId}`} className="nav-link">
                        <i className="bi bi-people"></i> User List
                    </NavLink>
                )}

                {(userRole === "admin" || userRole === "superadmin") && (
                    <NavLink to="/settings" className="nav-link">
                        <i className="bi bi-gear"></i> Settings
                    </NavLink>
                )}
            </div>

            <div className="tooltip-container" style={{ zIndex: 4 }}>
                <div className="sidebar-profile-section">
                    <div className="profile-icon-wrapper">
                        <button
                            className="profile-icon-btn"
                            onClick={toggleProfileDropdown}
                            aria-label="Profile"
                            data-dashboard-tooltip="Profile"
                        >
                            <i className="fas fa-user"></i>
                        </button>

                        {showProfileDropdown && (
                            <>
                                <div className="profile-dropdown">
                                    <NavLink to="/profile" className="profile-dropdown-item" onClick={closeProfileDropdown}>
                                        <i className="fas fa-user"></i> Profile
                                    </NavLink>
                                    <button className="profile-dropdown-item" onClick={onProfileLogoutClicked}>
                                        <i className="fas fa-sign-out-alt"></i> Logout
                                    </button>
                                </div>
                                <div className="profile-dropdown-overlay" onClick={closeProfileDropdown}></div>
                            </>
                        )}
                    </div>
                </div>

                <h3 className="stitch-heading">Welcome {userName}</h3>
            </div>
        </div>
    );
};

export default NavMenu;
