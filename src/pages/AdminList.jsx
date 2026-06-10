import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Swal from 'sweetalert2';
import { useUser } from '../features/user/userHooks';
import './AdminList.css';

const valueOf = (entity, ...keys) => {
    for (const key of keys) {
        if (entity?.[key] !== undefined && entity?.[key] !== null) {
            return entity[key];
        }
    }

    return undefined;
};

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

const AdminList = () => {
    const [currentPage, setCurrentPage] = useState(1);

    const pageSize = 5;
    const paginationDisplaySize = 5;
    const navigate = useNavigate();
    const { getAdminsCreatedBy, admins, deleteUser } = useUser();
    const authUser = useSelector((state) => state.auth.currentUser || state.auth.user);
    const userRole = authUser?.role?.toLowerCase() || '';
    const userId = authUser?.id || 0;
    const isSuperAdmin = userRole === 'superadmin';
    const [isLoading, setIsLoading] = useState(isSuperAdmin);

    const loadAdmins = useCallback(async (superAdminId) => {
        setIsLoading(true);
        await getAdminsCreatedBy(superAdminId);
        setIsLoading(false);
    }, [getAdminsCreatedBy]);

    useEffect(() => {
        if (!isSuperAdmin) return undefined;

        const timer = window.setTimeout(() => {
            loadAdmins(userId);
        }, 0);

        return () => window.clearTimeout(timer);
    }, [userId, isSuperAdmin, loadAdmins]);

    const totalPages = admins ? Math.ceil(admins.length / pageSize) : 0;
    const currentPageAdmins = admins ? admins.slice((currentPage - 1) * pageSize, currentPage * pageSize) : [];
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

    const navigateToRegister = () => navigate('/register');
    const viewAdminDetails = (adminId) => navigate(`/admin-users/${adminId}`);
    const editAdmin = (adminId) => navigate(`/register/edit/${adminId}/${userId}`);
    const editSetting = (adminId) => navigate(`/settings?adminId=${adminId}&userId=${adminId}`);

    const deleteAdmin = async (adminId) => {
        const admin = admins?.find((item) => Number(valueOf(item, 'id', 'Id')) === Number(adminId));
        if (!admin) return;

        const result = await Swal.fire({
            title: 'Delete Admin?',
            text: `Are you sure you want to delete admin ${valueOf(admin, 'username', 'Username') || ''}? This will also delete all users created by this admin.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            const result = await deleteUser(adminId);

            if (result.meta.requestStatus === 'fulfilled') {
                await Swal.fire('Deleted!', 'Admin has been deleted successfully.', 'success');
                await loadAdmins(userId);
            } else {
                await Swal.fire('Error!', 'Failed to delete admin. Please try again.', 'error');
            }
        }
    };

    const changePage = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="admin-list-container admin-users-container">
            <div className="right-panel">
                <div className="form-container">
                    <div className="page-header">
                        <button className="btn-back" onClick={() => navigate(-1)}>
                            <i className="bi bi-arrow-left"></i> Back
                        </button>
                        <div className="header-title">
                            <h2 className="text-center mb-4"><i className="bi bi-people-fill"></i> Admin List</h2>
                            <p className="subtitle text-center">Admins created by you</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                            <p>Loading admins...</p>
                        </div>
                    ) : !isSuperAdmin ? (
                        <div className="alert alert-warning">
                            <i className="bi bi-exclamation-triangle"></i>
                            You don't have permission to view this page.
                        </div>
                    ) : (
                        <>
                            <div className="admin-actions">
                                <button className="btn-add-user" onClick={navigateToRegister}>
                                    <i className="bi bi-person-plus"></i> Add Admin
                                </button>
                            </div>

                            {admins === null || admins.length === 0 ? (
                                <div className="empty-state">
                                    <i className="bi bi-person-x"></i>
                                    <p>No admins found.</p>
                                    <p className="sub-text">Admins you create will appear here.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="admin-info-card">
                                        <div className="admin-avatar-large">
                                            {initials(authUser?.firstName || authUser?.FirstName, authUser?.lastName || authUser?.LastName, 'S')}
                                        </div>
                                        <div className="admin-details">
                                            <h4>{authUser?.firstName || authUser?.FirstName || 'Super'} {authUser?.lastName || authUser?.LastName || 'Admin'}</h4>
                                            <p><i className="bi bi-person"></i> {authUser?.username || authUser?.Username || 'Super Admin'}</p>
                                            <p><i className="bi bi-shield-check"></i> Super Admin</p>
                                            <p><i className="bi bi-people"></i> Admin management overview</p>
                                        </div>
                                        <div className="admin-stats">
                                            <div className="stat-box">
                                                <span className="stat-number">{admins.length}</span>
                                                <span className="stat-label">Total Admins</span>
                                            </div>
                                            <div className="stat-box active">
                                                <span className="stat-number">{admins.filter((admin) => valueOf(admin, 'isActive', 'IsActive') === true).length}</span>
                                                <span className="stat-label">Active</span>
                                            </div>
                                            <div className="stat-box inactive">
                                                <span className="stat-number">{admins.filter((admin) => valueOf(admin, 'isActive', 'IsActive') !== true).length}</span>
                                                <span className="stat-label">Inactive</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="table-responsive">
                                        <table className="users-table">
                                            <thead>
                                                <tr>
                                                    <th>Admin</th>
                                                    <th>Username</th>
                                                    <th>Email</th>
                                                    <th>Phone</th>
                                                    <th>Status</th>
                                                    <th>Created Date</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentPageAdmins.map((admin) => {
                                                    const adminId = valueOf(admin, 'id', 'Id');
                                                    const firstName = valueOf(admin, 'firstName', 'FirstName') || '';
                                                    const lastName = valueOf(admin, 'lastName', 'LastName') || '';
                                                    const isActive = valueOf(admin, 'isActive', 'IsActive') === true;

                                                    return (
                                                        <tr key={adminId}>
                                                            <td>
                                                                <div className="user-info">
                                                                    <div className="user-avatar-small">
                                                                        {initials(firstName, lastName, 'A')}
                                                                    </div>
                                                                    <span className="user-name">{firstName} {lastName}</span>
                                                                </div>
                                                            </td>
                                                            <td>{valueOf(admin, 'username', 'Username')}</td>
                                                            <td>{valueOf(admin, 'email', 'Email')}</td>
                                                            <td>{valueOf(admin, 'phoneNumber', 'PhoneNumber')}</td>
                                                            <td>
                                                                <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                                                                    {isActive ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td>{formatCreatedDate(valueOf(admin, 'createdAt', 'CreatedAt'))}</td>
                                                            <td>
                                                                <div className="action-buttons">
                                                                    <button className="btn-icon" onClick={() => editSetting(adminId)} title="View Settings">
                                                                        <i className="bi bi-gear"></i>
                                                                    </button>
                                                                    <button className="btn-icon" onClick={() => viewAdminDetails(adminId)} title="View Details">
                                                                        <i className="bi bi-eye"></i>
                                                                    </button>
                                                                    <button className="btn-icon" onClick={() => editAdmin(adminId)} title="Edit">
                                                                        <i className="bi bi-pencil"></i>
                                                                    </button>
                                                                    <button className="btn-icon btn-delete" onClick={() => deleteAdmin(adminId)} title="Delete Admin">
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

export default AdminList;
