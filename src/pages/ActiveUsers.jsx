import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../features/user/userHooks';
import { decodeToken } from '../utils/jwtHelper';
import './ActiveUsers.css';
import { PageHeaderActions } from './SharedFilters';

const valueOf = (entity, ...keys) => {
    for (const key of keys) {
        if (entity?.[key] !== undefined && entity?.[key] !== null) {
            return entity[key];
        }
    }
    return undefined;
};

const getUserId = (user) => Number(valueOf(user, 'id', 'Id')) || 0;

const initials = (firstName, lastName, fallback) => {
    const first = firstName ? String(firstName)[0].toUpperCase() : fallback;
    const last = lastName ? String(lastName)[0].toUpperCase() : '';
    return `${first}${last}`;
};

const POLL_INTERVAL_MS = 30000;

const ActiveUsers = () => {
    const navigate = useNavigate();
    const { getActiveSessions } = useUser();
    const [activeUsers, setActiveUsers] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const pageSize = 10;
    const paginationDisplaySize = 5;

    useEffect(() => {
        const fetchActiveUsers = async () => {
            const token = localStorage.getItem('authToken');

            if (!token) {
                console.log('Token not found or expired');
                setActiveUsers([]);
                return;
            }

            try {
                const decodedUser = decodeToken(token);
                const currentAdminId = decodedUser?.id || null;
                const userRole = decodedUser?.role?.toLowerCase() || '';

                if (!currentAdminId) {
                    setActiveUsers([]);
                    return;
                }

                const adminIdParam = userRole === 'superadmin' ? null : currentAdminId;
                const users = await getActiveSessions(adminIdParam);
                const usersList = Array.isArray(users) ? users : [];
                const visibleUsers = userRole === 'admin'
                    ? usersList.filter((user) => {
                        const activeUserId = Number(user.id || user.Id);
                        const activeUserRole = String(user.role || user.Role || '').toLowerCase();

                        return activeUserId === Number(currentAdminId) || activeUserRole === 'user';
                    })
                    : usersList;

                setActiveUsers(visibleUsers);
            } catch (error) {
                console.error('Error loading active users:', error);
                setActiveUsers([]);
            }
        };

        fetchActiveUsers();
        const intervalId = setInterval(fetchActiveUsers, POLL_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [getActiveSessions]);

    const onCardClick = (userId) => {
        navigate(`/userreport/${userId}`);
    };

    const goBack = () => {
        navigate(-1);
    };

    const totalPages = activeUsers ? Math.ceil(activeUsers.length / pageSize) : 0;
    const currentPageUsers = activeUsers ? activeUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize) : [];

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

    const changePage = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    if (activeUsers === null) {
        return (
            <div className="active-users-container">
                <div className="right-panel">
                    <div className="form-container">
                        <div className="loading-container">
                            <div className="spinner"></div>
                            <p>Loading active users...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="active-users-container">
            <PageHeaderActions>
                <div className="active-header-summary">
                    <span className="status-dot"></span>
                    <strong>{activeUsers.length}</strong>
                    <span>active now</span>
                </div>
            </PageHeaderActions>
            <div className="right-panel">
                <div className="form-container">
                    <div className="page-header">
                        <button className="btn-back" onClick={goBack}>
                            <i className="bi bi-arrow-left"></i> Back
                        </button>
                    </div>

                    {activeUsers.length === 0 ? (
                        <div className="empty-state">
                            <i className="bi bi-person-x"></i>
                            <p>No active users found.</p>
                            <p className="sub-text">Users with tracking enabled will appear here when active.</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Username</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentPageUsers.map((user) => {
                                            const userId = getUserId(user);
                                            const firstName = valueOf(user, 'firstName', 'FirstName') || '';
                                            const lastName = valueOf(user, 'lastName', 'LastName') || '';
                                            const role = String(valueOf(user, 'role', 'Role') || '').toLowerCase();

                                            return (
                                                <tr key={userId}>
                                                    <td>
                                                        <div className="user-info" style={{ cursor: 'pointer' }} onClick={() => onCardClick(userId)}>
                                                            <div className="user-avatar-small">
                                                                {initials(firstName, lastName, 'U')}
                                                            </div>
                                                            <span className="user-name">{firstName} {lastName}</span>
                                                        </div>
                                                    </td>
                                                    <td>{valueOf(user, 'username', 'Username')}</td>
                                                    <td>{valueOf(user, 'email', 'Email')}</td>
                                                    <td>
                                                        <span className={`role-badge ${role}`}>
                                                            {role === 'admin' ? 'Admin' : role === 'superadmin' ? 'Super Admin' : 'User'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="status-badge active">
                                                            <span className="status-dot"></span>
                                                            Active
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button className="btn-icon" onClick={() => onCardClick(userId)} title="View Report">
                                                                <i className="bi bi-bar-chart"></i>
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
                </div>
            </div>
        </div>
    );
};

export default ActiveUsers;
