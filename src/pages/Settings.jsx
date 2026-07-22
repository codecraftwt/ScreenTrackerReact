import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../features/user/userHooks';
import { decodeToken } from '../utils/jwtHelper';
import Select from 'react-select';
import './Settings.css';
import { PageHeaderActions } from './SharedFilters';

const Settings = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        getAllUsersByAdmin,
        getAllUsersByAdminForSetting,
        updateActiveStatus,
        updateManualTrackingAuth,
        updateAutoTrackingAuth,
        updateDeleteAuth
    } = useUser();

    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(0);
    const [currentUserRole, setCurrentUserRole] = useState('');

    const [selectedAdminId, setSelectedAdminId] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');

    const [admins, setAdmins] = useState([]);
    const [users, setUsers] = useState([]);
    const [pagedUsers, setPagedUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;
    const paginationDisplaySize = 5;
    const SELECTED_ADMIN_ID_KEY = 'SelectedAdminId';

    const currentPageUsers = pagedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalPages = Math.ceil(pagedUsers.length / pageSize);

    const valueOf = (entity, ...keys) => {
        for (const key of keys) {
            if (entity?.[key] !== undefined && entity?.[key] !== null) {
                return entity[key];
            }
        }

        return undefined;
    };

    const getId = (user) => Number(valueOf(user, 'id', 'Id')) || 0;
    const getUsername = (user) => valueOf(user, 'username', 'Username') || '';
    const getRole = (user) => String(valueOf(user, 'role', 'Role') || '').toLowerCase();
    const getBool = (user, ...keys) => valueOf(user, ...keys) === true;

    // Effect to parse token and set user role
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            const decodedUser = decodeToken(token);
            if (decodedUser) {
                const role = decodedUser.role || '';
                const userId = decodedUser.id || 0;

                const isAdminRole = role.toLowerCase() === 'admin';
                const isSuperAdminRole = role.toLowerCase() === 'superadmin';
                
                setIsAdmin(isAdminRole);
                setIsSuperAdmin(isSuperAdminRole);
                setCurrentUserId(userId);
                setCurrentUserRole(role);
            }
        }
    }, []);

    // Load admins if superadmin
    useEffect(() => {
        if (isSuperAdmin && currentUserId) {
            loadAdmins();
        }
    }, [isSuperAdmin, currentUserId]);

    // Initial data loading based on role and query params
    useEffect(() => {
        const initData = async () => {
            if (!currentUserRole || !currentUserId) return;

            const params = new URLSearchParams(location.search);
            const qAdminId = params.get('adminId');
            const qUserId = params.get('userId');
            const loadedAdmins = isSuperAdmin ? await loadAdmins() : admins;

            if (isSuperAdmin) {
                // If query param adminId exists, use it. Otherwise check localStorage.
                let adminIdToUse = qAdminId ? parseInt(qAdminId) : null;
                
                if (!adminIdToUse) {
                    const persistedAdminId = localStorage.getItem(SELECTED_ADMIN_ID_KEY) || localStorage.getItem('selectedAdminId');
                    if (persistedAdminId) adminIdToUse = parseInt(persistedAdminId);
                }

                if (adminIdToUse) {
                    setSelectedAdminId(adminIdToUse);
                    localStorage.setItem(SELECTED_ADMIN_ID_KEY, String(adminIdToUse));
                    
                    const loadedUsers = await loadUsers(adminIdToUse, loadedAdmins);
                    
                    if (qUserId) {
                        const userId = parseInt(qUserId);
                        setSelectedUserId(userId);
                        const specificUser = loadedUsers.find(u => getId(u) === userId);
                        if (specificUser) {
                            setPagedUsers([specificUser]);
                        }
                    }
                } else {
                    setIsLoading(false);
                }
            } else if (isAdmin) {
                const loadedUsers = await loadUsers(currentUserId);
                
                if (qUserId) {
                    const userId = parseInt(qUserId);
                    setSelectedUserId(userId);
                    const specificUser = loadedUsers.find(u => getId(u) === userId);
                    if (specificUser) {
                        setPagedUsers([specificUser]);
                    }
                }
            } else {
                setIsLoading(false);
            }
        };

        initData();
    }, [currentUserRole, currentUserId, isSuperAdmin, isAdmin, location.search]);

    const loadAdmins = async () => {
        try {
            const result = await getAllUsersByAdmin(currentUserId, currentUserRole);
            const filteredAdmins = (Array.isArray(result) ? result : [])
                .filter(admin => getRole(admin) !== 'superadmin');
            setAdmins(filteredAdmins);
            return filteredAdmins;
        } catch (error) {
            console.error('Error loading admins:', error);
            setAdmins([]);
            return [];
        }
    };

    const loadUsers = async (adminIdToUse, adminOptions = admins) => {
        setIsLoading(true);
        if (!adminIdToUse) {
            setUsers([]);
            setPagedUsers([]);
            setCurrentPage(1);
            setIsLoading(false);
            return [];
        }

        try {
            const result = await getAllUsersByAdminForSetting(adminIdToUse, 'user', searchTerm);
            
            let usersList = [];
            if (isAdmin) {
                // Admin should only see users under them, not themselves
                usersList = (Array.isArray(result) ? result : []).filter(user => getId(user) !== currentUserId);
            } else {
                usersList = Array.isArray(result) ? result : [];
            }

            // If superadmin is viewing an admin's users and the userId param matches the adminId, 
            // add the admin to the list (so they can be toggled too)
            const params = new URLSearchParams(location.search);
            const qUserId = params.get('userId');
            const qAdminId = params.get('adminId');
            if (isSuperAdmin && qUserId && qAdminId && qUserId === qAdminId) {
                const adminUser = adminOptions.find(admin => getId(admin) === parseInt(qUserId));
                if (adminUser && !usersList.some(user => getId(user) === getId(adminUser))) {
                    usersList.push(adminUser);
                }
            }

            setUsers(usersList);
            setPagedUsers(usersList);
            setCurrentPage(1);
            setIsLoading(false);
            return usersList;
        } catch (error) {
            console.error('Error loading users:', error);
            setUsers([]);
            setPagedUsers([]);
            setIsLoading(false);
            return [];
        }
    };

    const handleAdminSelect = async (adminId) => {
        if (!adminId) {
            setSelectedAdminId('');
            setSelectedUserId('');
            setUsers([]);
            setPagedUsers([]);
            localStorage.removeItem(SELECTED_ADMIN_ID_KEY);
            localStorage.removeItem('selectedAdminId');
            return;
        }

        setSelectedAdminId(adminId);
        setSelectedUserId('');
        localStorage.setItem(SELECTED_ADMIN_ID_KEY, String(adminId));
        await loadUsers(adminId);
    };

    const handleUserSelect = (userId) => {
        if (!userId) {
            setSelectedUserId('');
            setPagedUsers([...users]);
            setCurrentPage(1);
            return;
        }

        const parsedUserId = parseInt(userId);
        setSelectedUserId(parsedUserId);
        const selectedUser = users.find(user => getId(user) === parsedUserId);
        if (selectedUser) {
            setPagedUsers([selectedUser]);
        } else {
            setPagedUsers([...users]);
        }
        setCurrentPage(1);
    };

    const getUsernameInitial = (username) => {
        return username ? username.trim()[0].toUpperCase() : 'U';
    };

    const shouldShowUserSelect = isSuperAdmin || isAdmin;
    const isUserSelectDisabled = (isSuperAdmin && !selectedAdminId) || users.length === 0;
    const userSelectPlaceholder = isSuperAdmin && !selectedAdminId
        ? '--Select Admin First--'
        : users.length === 0
            ? '--No Users--'
            : '--Select User--';
    const adminOptions = admins.map(admin => ({
        value: getId(admin),
        label: getUsername(admin)
    }));
    const userOptions = [
        { value: 0, label: 'All Users' },
        ...users.map(user => ({
            value: getId(user),
            label: getUsername(user)
        }))
    ];
    const selectedAdminOption = adminOptions.find(option => option.value === Number(selectedAdminId)) || null;
    const selectedUserOption = users.length > 0
        ? userOptions.find(option => option.value === Number(selectedUserId || 0)) || userOptions[0]
        : null;

    const updateUserInLists = (userId, updates) => {
        const applyUpdates = (list) => list.map(user => (
            getId(user) === userId ? { ...user, ...updates } : user
        ));

        setUsers(prev => applyUpdates(prev));
        setPagedUsers(prev => applyUpdates(prev));
    };

    const handleToggle = async (user, field, currentValue) => {
        const userId = getId(user);
        const nextValue = !currentValue;
        const previousValue = currentValue;
        updateUserInLists(userId, { [field]: nextValue });

        let result;

        if (field === 'isManualTrackingEnabled') {
            result = await updateManualTrackingAuth(userId, currentUserId, nextValue);
        } else if (field === 'isAutoTrackingEnabled') {
            result = await updateAutoTrackingAuth(userId, currentUserId, nextValue);
        } else if (field === 'isActive') {
            result = await updateActiveStatus(userId, currentUserId, nextValue);
        } else if (field === 'isSelected') {
            result = await updateDeleteAuth(userId, currentUserId, nextValue);
        }

        if (result?.meta?.requestStatus !== 'fulfilled') {
            updateUserInLists(userId, { [field]: previousValue });
        }
    };

    const isTrackingToggleDisabled = (user) => {
        if (isSuperAdmin) return false;
        if (isAdmin && getId(user) === currentUserId) return true;
        return false;
    };

    const getPageNumbers = () => {
        const pages = [];
        let startPage = Math.max(1, currentPage - Math.floor(paginationDisplaySize / 2));
        let endPage = Math.min(totalPages, startPage + paginationDisplaySize - 1);

        if (endPage - startPage + 1 < paginationDisplaySize) {
            startPage = Math.max(1, endPage - paginationDisplaySize + 1);
        }

        if (startPage > 1) {
            pages.push(1);
            if (startPage > 2) pages.push(-1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pages.push(-1);
            pages.push(totalPages);
        }

        return pages;
    };

    const goBack = () => {
        navigate(-1);
    };

    return (
        <div className="settings-container">
            <div className="settings-header">
                <button onClick={goBack} className="btn-back me-3">
                    <i className="fa-solid fa-arrow-left me-2"></i>
                    Back
                </button>
                <h1>User Management</h1>
            </div>

            <PageHeaderActions><div className="settings-header-filters">
            {isSuperAdmin && (
                <div className="admin-selection mb-3">
                    <label>Select Admin:</label>
                    <Select
                        inputId="admin-select"
                        className="settings-searchable-select"
                        classNamePrefix="settings-select"
                        value={selectedAdminOption}
                        onChange={(option) => handleAdminSelect(option?.value || null)}
                        options={adminOptions}
                        placeholder="--Select Admin--"
                        isClearable
                        isSearchable
                    />
                </div>
            )}

            {shouldShowUserSelect && (
                <div className="user-selection mb-3">
                    <label>Select User:</label>
                    <Select
                        inputId="user-select"
                        className="settings-searchable-select"
                        classNamePrefix="settings-select"
                        value={selectedUserOption}
                        onChange={(option) => handleUserSelect(option?.value || null)}
                        options={userOptions}
                        placeholder={userSelectPlaceholder}
                        isClearable
                        isDisabled={isUserSelectDisabled}
                        isSearchable
                    />
                </div>
            )}
            </div></PageHeaderActions>

            <div className="user-management-card">
                {/* <div className="search-container mb-3">
                    <input
                        type="text"
                        style={{ width: '24%' }}
                        className="form-control search-input"
                        placeholder="Search by username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button 
                        className="btn btn-primary" 
                        onClick={() => loadUsers(isSuperAdmin ? selectedAdminId : currentUserId)}
                    >
                        Search
                    </button>
                </div> */}

                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading users...</p>
                    </div>
                ) : pagedUsers.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <h3>No users found</h3>
                        <p>There are no users to manage at this time.</p>
                    </div>
                ) : (
                    <>
                        <div className="users-table-container">
                            <table className="users-table" key={currentPage}>
                                <thead>
                                    <tr>
                                        <th className="text-start table-headers">Username</th>                                      
                                        <th className="text-center table-headers">Manual Tracking</th>
                                        <th className="text-center table-headers">Auto Tracking</th>
                                        <th className="text-center table-headers">Active Status</th>
                                          <th className="text-center table-headers">Delete Auth</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentPageUsers.map(user => (
                                        <tr key={getId(user)} className="user-row">
                                            <td className="settings-username-cell">
                                                <div className="settings-user-info">
                                                    <div className="settings-user-avatar">
                                                        {getUsernameInitial(getUsername(user))}
                                                    </div>
                                                    <span className="settings-username" title={getUsername(user)}>
                                                        {getUsername(user)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="permission-cell">
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={getBool(user, 'isManualTrackingEnabled', 'IsManualTrackingEnabled')}
                                                        onChange={() => handleToggle(user, 'isManualTrackingEnabled', getBool(user, 'isManualTrackingEnabled', 'IsManualTrackingEnabled'))}
                                                        disabled={isTrackingToggleDisabled(user)}
                                                    />
                                                    <span className="toggle-slider span-color"></span>
                                                </label>
                                            </td>
                                            <td className="permission-cell">
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={getBool(user, 'isAutoTrackingEnabled', 'IsAutoTrackingEnabled')}
                                                        onChange={() => handleToggle(user, 'isAutoTrackingEnabled', getBool(user, 'isAutoTrackingEnabled', 'IsAutoTrackingEnabled'))}
                                                        disabled={isTrackingToggleDisabled(user)}
                                                    />
                                                    <span className="toggle-slider span-color"></span>
                                                </label>
                                            </td>
                                            <td className="permission-cell">
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={getBool(user, 'isActive', 'IsActive')}
                                                        onChange={() => handleToggle(user, 'isActive', getBool(user, 'isActive', 'IsActive'))}
                                                    />
                                                    <span className="toggle-slider span-color"></span>
                                                </label>
                                            </td>
                                            <td className="permission-cell">
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={getBool(user, 'isSelected', 'IsSelected')}
                                                        onChange={() => handleToggle(user, 'isSelected', getBool(user, 'isSelected', 'IsSelected'))}
                                                    />
                                                    <span className="toggle-slider span-color"></span>
                                                </label>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <nav aria-label="Page navigation example" className="d-flex justify-content-center mt-4">
                                <ul className="pagination">
                                    <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                                        <button className="page-link" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>&laquo;</button>
                                    </li>

                                    {getPageNumbers().map((pageNumber, index) => (
                                        pageNumber === -1 ? (
                                            <li key={`ellipsis-${index}`} className="page-item disabled">
                                                <span className="page-link">...</span>
                                            </li>
                                        ) : (
                                            <li key={pageNumber} className={`page-item ${pageNumber === currentPage ? "active" : ""}`}>
                                                <button className="page-link" onClick={() => setCurrentPage(pageNumber)}>
                                                    {pageNumber}
                                                </button>
                                            </li>
                                        )
                                    ))}

                                    <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                                        <button className="page-link" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>&raquo;</button>
                                    </li>
                                </ul>
                            </nav>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Settings;
