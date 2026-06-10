import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useUser } from '../features/user/userHooks';
import { decodeToken } from '../utils/jwtHelper';
import './AdminUsers.css';

const CLAIMS = {
    id: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
    role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
};

const valueOf = (entity, ...keys) => {
    for (const key of keys) {
        if (entity?.[key] !== undefined && entity?.[key] !== null) {
            return entity[key];
        }
    }

    return undefined;
};

const getUserId = (user) => Number(valueOf(user, 'id', 'Id')) || 0;

const formatCreatedDate = (dateValue) => {
    if (!dateValue) return '';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return String(dateValue);

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    });
};

const initials = (firstName, lastName, fallback) => {
    const first = firstName ? String(firstName)[0].toUpperCase() : fallback;
    const last = lastName ? String(lastName)[0].toUpperCase() : '';
    return `${first}${last}`;
};

const AdminUsers = () => {
    const { adminId } = useParams();
    const navigate = useNavigate();

    const [adminInfo, setAdminInfo] = useState(null);
    const [users, setUsers] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState(false);
    const [effectiveAdminId, setEffectiveAdminId] = useState(Number(adminId) || 0);
    const [currentPage, setCurrentPage] = useState(1);

    const pageSize = 5;
    const paginationDisplaySize = 5;
    const routeAdminId = Number(adminId) || 0;
    
    const { 
        getAllUsersByAdminForSetting, 
        getAllUsers, 
        getUserById, 
        promoteToAdmin: promoteToAdminRedux, 
        deleteUser: deleteUserRedux
    } = useUser();
    
    // Get user info from token
    const token = localStorage.getItem('authToken');
    const decodedUser = token ? decodeToken(token) : null;
    const currentUserId = decodedUser?.id || 0;
    const userRole = decodedUser?.role?.toLowerCase() || '';

  const loadUsers = async (adminIdToLoad, roleToUse) => {
    try {
        const result = await getAllUsersByAdminForSetting(adminIdToLoad, roleToUse || 'admin', '');
        const excludedUserIds = new Set([
            Number(currentUserId) || 0,
            Number(adminIdToLoad) || 0
        ]);
        const usersUnderAdmin = (Array.isArray(result) ? result : [])
            .filter((user) => {
                const userId = getUserId(user);
                const role = String(valueOf(user, 'role', 'Role') || '').toLowerCase();
                const isAdminAuthority = valueOf(user, 'isAdminAuthority', 'IsAdminAuthority') === true;
                const adminAuthorityBy = Number(valueOf(user, 'adminAuthorityBy', 'AdminAuthorityBy')) || 0;

                return !excludedUserIds.has(userId)
                    && (
                        role === 'user'
                        || (role === 'admin' && isAdminAuthority && adminAuthorityBy === Number(adminIdToLoad))
                    );
            });

        setUsers(usersUnderAdmin);
        setCurrentPage(1);
    } catch (error) {
        console.error('Error loading users:', error);
        setUsers([]);
    }
};

    const loadPageData = async () => {
        setIsLoading(true);

        try {
            if (!decodedUser || !routeAdminId) {
                setHasPermission(false);
                return;
            }

            const isSuperAdmin = userRole === 'superadmin';
            const isSameAdmin = currentUserId === routeAdminId;
            const canView = isSuperAdmin || isSameAdmin;
            setHasPermission(canView);

            if (!canView) return;

            let adminIdToLoad = routeAdminId;

            if (isSameAdmin && userRole === 'admin') {
                const currentUser = await getUserById(currentUserId);
                const isAdminAuthority = valueOf(currentUser, 'isAdminAuthority', 'IsAdminAuthority') === true;
                const adminAuthorityBy = Number(valueOf(currentUser, 'adminAuthorityBy', 'AdminAuthorityBy'));

                if (isAdminAuthority && adminAuthorityBy > 0) {
                    adminIdToLoad = adminAuthorityBy;
                }
            }

            setEffectiveAdminId(adminIdToLoad);

            const allUsersResult = await getAllUsers();
            const admin = (Array.isArray(allUsersResult) ? allUsersResult : [])
                .find((user) => Number(valueOf(user, 'id', 'Id')) === Number(adminIdToLoad));
            setAdminInfo(admin || null);

            await loadUsers(adminIdToLoad, userRole || 'admin');
        } catch (error) {
            console.error('Error loading admin users page:', error);
            setHasPermission(false);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };
    //  [decodedUser, currentUserId, loadUsers, routeAdminId, userRole, getAllUsers, getUserById];
    [];

useEffect(() => {
    loadPageData();
}, [routeAdminId, currentUserId, userRole]);

    const totalPages = users ? Math.ceil(users.length / pageSize) : 0;
    const currentPageUsers = users ? users.slice((currentPage - 1) * pageSize, currentPage * pageSize) : [];
    const pageNumbers = useMemo(() => {
        const pages = [];
        let startPage = Math.max(1, currentPage - Math.floor(paginationDisplaySize / 2));
        const endPage = Math.min(totalPages, startPage + paginationDisplaySize - 1);

        if (endPage - startPage + 1 < paginationDisplaySize) {
            startPage = Math.max(1, endPage - paginationDisplaySize + 1);
        }

        for (let page = startPage; page <= endPage; page += 1) {
            pages.push(page);
        }

        if (startPage > 1) pages.unshift(-1);
        if (endPage < totalPages) pages.push(-1);

        return pages;
    }, [currentPage, totalPages]);

    const goBack = () => {
        if (userRole === 'superadmin') {
            navigate('/admin-list');
        } else {
            navigate(-1);
        }
    };

    const navigateToAddUser = () => navigate(`/register?adminId=${effectiveAdminId}`);

    const viewScreenshots = (userId) => {
        const today = new Date().toISOString().split('T')[0];
        navigate(`/screenshots/${today}?viewedUserId=${userId}`);
    };

    const viewUserReport = (userId) => navigate(`/settings?userId=${userId}`);
    const editUser = (userId) => navigate(`/register/edit/${userId}/${effectiveAdminId}`);

    const promoteToAdmin = async (userId) => {
        const user = users?.find((item) => Number(valueOf(item, 'id', 'Id')) === Number(userId));
        if (!user) return;

        const result = await Swal.fire({
            title: 'Make Admin?',
            text: `Give admin authority to ${valueOf(user, 'username', 'Username') || ''}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, make admin',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            const reduxResult = await promoteToAdminRedux(userId, currentUserId);

            if (reduxResult.meta.requestStatus === 'fulfilled') {
                await Swal.fire('Updated!', 'User has been promoted to admin.', 'success');
                await loadUsers(effectiveAdminId, userRole || 'admin');
            } else {
                await Swal.fire('Error!', 'Failed to promote user. Please try again.', 'error');
            }
        }
    };

    const deleteUser = async (userId) => {
        const user = users?.find((item) => Number(valueOf(item, 'id', 'Id')) === Number(userId));
        if (!user) return;

        const result = await Swal.fire({
            title: 'Delete User?',
            text: `Are you sure you want to delete user ${valueOf(user, 'username', 'Username') || ''}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            const reduxResult = await deleteUserRedux(userId);

            if (reduxResult.meta.requestStatus === 'fulfilled') {
                await Swal.fire('Deleted!', 'User has been deleted successfully.', 'success');
                await loadUsers(effectiveAdminId, userRole || 'admin');
            } else {
                await Swal.fire('Error!', 'Failed to delete user. Please try again.', 'error');
            }
        }
    };

    const changePage = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="admin-users-container">
            <div className="right-panel">
                <div className="form-container">
                    <div className="page-header">
                        <button className="btn-back" onClick={goBack}>
                            <i className="bi bi-arrow-left"></i> Back
                        </button>
                        <div className="header-title">
                            <h2 className="text-center mb-4"><i className="bi bi-people"></i> Users of {valueOf(adminInfo, 'username', 'Username') || 'Admin'}</h2>
                            <p className="subtitle text-center">All users created by this admin</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                            <p>Loading users...</p>
                        </div>
                    ) : !hasPermission ? (
                        <div className="alert alert-warning">
                            <i className="bi bi-exclamation-triangle"></i>
                            You don't have permission to view this page.
                        </div>
                    ) : (
                        <>
                            <div className="admin-actions">
                                <button className="btn-add-user" onClick={navigateToAddUser}>
                                    <i className="bi bi-plus-circle"></i> Add User
                                </button>
                            </div>

                            {users === null || users.length === 0 ? (
                                <div className="empty-state">
                                    <i className="bi bi-person-x"></i>
                                    <p>No users found for this admin.</p>
                                    <p className="sub-text">This admin hasn't created any users yet.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="admin-info-card">
                                        <div className="admin-avatar-large">
                                            {initials(valueOf(adminInfo, 'firstName', 'FirstName'), valueOf(adminInfo, 'lastName', 'LastName'), 'A')}
                                        </div>
                                        <div className="admin-details">
                                            <h4>{valueOf(adminInfo, 'firstName', 'FirstName') || ''} {valueOf(adminInfo, 'lastName', 'LastName') || ''}</h4>
                                            <p><i className="bi bi-person"></i> {valueOf(adminInfo, 'username', 'Username')}</p>
                                            <p><i className="bi bi-envelope"></i> {valueOf(adminInfo, 'email', 'Email')}</p>
                                            <p><i className="bi bi-telephone"></i> {valueOf(adminInfo, 'phoneNumber', 'PhoneNumber')}</p>
                                        </div>
                                        <div className="admin-stats">
                                            <div className="stat-box">
                                                <span className="stat-number">{users.length}</span>
                                                <span className="stat-label">Total Users</span>
                                            </div>
                                            <div className="stat-box active">
                                                <span className="stat-number">{users.filter((user) => valueOf(user, 'isActive', 'IsActive') === true).length}</span>
                                                <span className="stat-label">Active</span>
                                            </div>
                                            <div className="stat-box inactive">
                                                <span className="stat-number">{users.filter((user) => valueOf(user, 'isActive', 'IsActive') !== true).length}</span>
                                                <span className="stat-label">Inactive</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="table-responsive">
                                        <table className="users-table">
                                            <thead>
                                                <tr>
                                                    <th>User</th>
                                                    <th>Username</th>
                                                    <th>Email</th>
                                                    <th>Phone</th>
                                                    <th>Status</th>
                                                    <th>Tracking</th>
                                                    <th>Created Date</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentPageUsers.map((user) => {
                                                    const userId = valueOf(user, 'id', 'Id');
                                                    const firstName = valueOf(user, 'firstName', 'FirstName') || '';
                                                    const lastName = valueOf(user, 'lastName', 'LastName') || '';
                                                    const isActive = valueOf(user, 'isActive', 'IsActive') === true;
                                                    const role = String(valueOf(user, 'role', 'Role') || '').toLowerCase();
                                                    const manualTracking = valueOf(user, 'isManualTrackingEnabled', 'IsManualTrackingEnabled') === true;
                                                    const autoTracking = valueOf(user, 'isAutoTrackingEnabled', 'IsAutoTrackingEnabled') === true;

                                                    return (
                                                        <tr key={userId}>
                                                            <td>
                                                                <div className="user-info">
                                                                    <div className="user-avatar-small">
                                                                        {initials(firstName, lastName, 'U')}
                                                                    </div>
                                                                    <span className="user-name">{firstName} {lastName}</span>
                                                                </div>
                                                            </td>
                                                            <td>{valueOf(user, 'username', 'Username')}</td>
                                                            <td>{valueOf(user, 'email', 'Email')}</td>
                                                            <td>{valueOf(user, 'phoneNumber', 'PhoneNumber')}</td>
                                                            <td>
                                                                <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                                                                    {isActive ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div className="tracking-indicators">
                                                                    {manualTracking && (
                                                                        <span className="tracking-badge manual" title="Manual Tracking Enabled">
                                                                            <i className="bi bi-hand-index-thumb"></i>
                                                                        </span>
                                                                    )}
                                                                    {autoTracking && (
                                                                        <span className="tracking-badge auto" title="Auto Tracking Enabled">
                                                                            <i className="bi bi-play-circle"></i>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>{formatCreatedDate(valueOf(user, 'createdAt', 'CreatedAt'))}</td>
                                                            <td>
                                                                <div className="action-buttons">
                                                                    <button className="btn-icon" onClick={() => viewScreenshots(userId)} title="View Screenshots">
                                                                        <i className="bi bi-images"></i>
                                                                    </button>
                                                                    <button className="btn-icon" onClick={() => viewUserReport(userId)} title="View Report">
                                                                        <i className="bi bi-gear"></i>
                                                                    </button>
                                                                    <button className="btn-icon" onClick={() => editUser(userId)} title="Edit User">
                                                                        <i className="bi bi-pencil"></i>
                                                                    </button>
                                                                    {role === 'user' && (
                                                                        <button className="btn-icon" onClick={() => promoteToAdmin(userId)} title="Make Admin">
                                                                            <i className="bi bi-person-check"></i>
                                                                        </button>
                                                                    )}
                                                                    <button className="btn-icon btn-delete" onClick={() => deleteUser(userId)} title="Delete User">
                                                                        <i className="bi bi-trash"></i>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="pagination-container">
                                            <nav>
                                                <ul className="pagination">
                                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                        <button className="page-link" onClick={() => changePage(currentPage - 1)}>
                                                            <span aria-hidden="true">&laquo;</span>
                                                        </button>
                                                    </li>

                                                    {pageNumbers.map((pageNumber, index) => (
                                                        <li
                                                            key={`${pageNumber}-${index}`}
                                                            className={`page-item ${pageNumber === currentPage ? 'active' : ''} ${pageNumber === -1 ? 'disabled' : ''}`}
                                                        >
                                                            <button className="page-link" onClick={() => changePage(pageNumber)}>
                                                                {pageNumber === -1 ? '...' : pageNumber}
                                                            </button>
                                                        </li>
                                                    ))}

                                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                        <button className="page-link" onClick={() => changePage(currentPage + 1)}>
                                                            <span aria-hidden="true">&raquo;</span>
                                                        </button>
                                                    </li>
                                                </ul>
                                            </nav>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
