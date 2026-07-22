import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useUser } from '../features/user/userHooks';
import { decodeToken } from '../utils/jwtHelper';
import './Report.css';
import { PageHeaderActions } from './SharedFilters';
import Select from 'react-select';

const PAGE_SIZE = 10;
const PAGINATION_DISPLAY_SIZE = 5;
const IST_TIME_ZONE = 'Asia/Kolkata';
const usageTypeOptions = [
    { value: 'all', label: 'All' },
    { value: 'manual', label: 'Manual' },
    { value: 'automatic', label: 'Automatic' }
];

const claim = {
    name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    id: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
    role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
};

const todayInput = () => new Date().toISOString().split('T')[0];

const dateInputDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
};

const valueOf = (object, ...keys) => {
    for (const key of keys) {
        if (object?.[key] !== undefined && object?.[key] !== null) {
            return object[key];
        }
    }

    return undefined;
};

const normalizeArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.users)) return value.users;
    if (Array.isArray(value?.Users)) return value.Users;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.Items)) return value.Items;
    return [];
};

const getTracker = (row) => valueOf(row, 'tracker', 'Tracker') || row || {};
const getUser = (row) => valueOf(row, 'user', 'User') || {};
const getId = (entity) => Number(valueOf(entity, 'id', 'Id') || 0);
const getRole = (entity) => String(valueOf(entity, 'role', 'Role') || '').toLowerCase();

const getFullName = (user) => {
    const firstName = valueOf(user, 'firstName', 'FirstName') || '';
    const lastName = valueOf(user, 'lastName', 'LastName') || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || valueOf(user, 'username', 'Username') || '-';
};

const formatIstDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
        timeZone: IST_TIME_ZONE,
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    });
};

const formatIstTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('en-US', {
        timeZone: IST_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const formatRouteDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return todayInput();
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: IST_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
};

const formatRouteTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: IST_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
};

const getDurationMs = (tracker) => {
    const start = valueOf(tracker, 'startTracker', 'StartTracker');
    const end = valueOf(tracker, 'endTracker', 'EndTracker');
    if (!start || !end) return 0;

    const duration = new Date(end).getTime() - new Date(start).getTime();
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
};

const formatDurationMs = (durationMs) => {
    const totalMinutes = Math.floor(Math.max(0, durationMs) / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
        return `${days} days ${hours} hours ${minutes} minutes`;
    }

    return `${hours} hours ${minutes} minutes`;
};

const Report = () => {
    const { userId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const {
        getAllUsersByAdmin,
        getUserById,
        getAllUsersReport,
        getTodayDailyTracker,
        getAllUsers,
        currentUser,
        usersByAdmin
    } = useUser();

    const routeUserId = Number(userId || 0);
    const queryUsageType = searchParams.get('usageType') || searchParams.get('UsageType') || 'all';

    const [authUser, setAuthUser] = useState(null);
    const [fromDate, setFromDate] = useState(() => dateInputDaysAgo(30));
    const [toDate, setToDate] = useState(() => todayInput());
    const [selectedAdminId, setSelectedAdminId] = useState(0);
    const [selectedUserId, setSelectedUserId] = useState(routeUserId);
    const [selectedUsageType, setSelectedUsageType] = useState(queryUsageType);
    const [allAdmins, setAllAdmins] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [listsReady, setListsReady] = useState(false);
    const [trackers, setTrackers] = useState(null);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);


    const userRole = authUser?.role || '';
    const canFilterUsers = userRole === 'admin' || userRole === 'superadmin';
    const totalPages = Math.ceil(totalRecords / PAGE_SIZE);

  const loadUsersForAdmin = async (adminId) => {
    if (!adminId) {
        setAllUsers([]);
        return [];
    }

    try {
        const usersResult = await getAllUsersByAdmin({ adminId, role: 'admin' });
        const adminResult = await getUserById(adminId);

        const users = normalizeArray(usersResult);
        const adminDetails = adminResult;

        const combinedUsers = [...users];

        if (adminDetails && !combinedUsers.some((user) => getId(user) === adminId)) {
            combinedUsers.unshift(adminDetails);
        }

        setAllUsers(combinedUsers);
        return combinedUsers;
    } catch (error) {
        console.error('Error loading users for admin:', error);
        setAllUsers([]);
        return [];
    }
};

   const loadHistory = async (pageNumber = 1) => {
    if (!authUser) return;

    try {
        setCurrentPage(pageNumber);
        setTrackers(null);

        const apiFromDate = `${fromDate}T00:00:00`;
        const apiToDate = `${toDate}T23:59:59`;
        const role = authUser.role;

        let pagedResult = { items: [], totalCount: 0 };

        if (role === 'superadmin') {
            if (selectedAdminId === 0 && selectedUserId === 0) {
                const result = await getAllUsersReport({
                    fromDate: apiFromDate,
                    toDate: apiToDate,
                    searchString: '',
                    adminId: null,
                    page: 1,
                    pageSize: 1000,
                    usageType: selectedUsageType
                });

                const adminIds = new Set(allAdmins.map((admin) => getId(admin)));
                const adminTrackers = normalizeArray(result?.items).filter((row) =>
                    adminIds.has(getId(getUser(row)))
                );

                pagedResult = {
                    items: adminTrackers.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE),
                    totalCount: adminTrackers.length
                };
            } else if (selectedAdminId > 0 && selectedUserId === 0) {
                pagedResult = await getAllUsersReport({
                    fromDate: apiFromDate,
                    toDate: apiToDate,
                    searchString: '',
                    adminId: selectedAdminId,
                    page: pageNumber,
                    pageSize: PAGE_SIZE,
                    usageType: selectedUsageType
                });
            } else {
                pagedResult = await getTodayDailyTracker({
                    userId: selectedUserId,
                    fromDate: apiFromDate,
                    toDate: apiToDate,
                    searchString: '',
                    page: pageNumber,
                    pageSize: PAGE_SIZE,
                    usageType: selectedUsageType
                });
            }
        }
        else if (role === 'admin') {
    if (selectedUserId === 0) {
        pagedResult = await getAllUsersReport({
            fromDate: apiFromDate,
            toDate: apiToDate,
            searchString: '',
            adminId: authUser.id,
            page: pageNumber,
            pageSize: PAGE_SIZE,
            usageType: selectedUsageType
        });
    } else {
        pagedResult = await getTodayDailyTracker({
            userId: selectedUserId,
            fromDate: apiFromDate,
            toDate: apiToDate,
            searchString: '',
            page: pageNumber,
            pageSize: PAGE_SIZE,
            usageType: selectedUsageType
        });
    }
} else {
    pagedResult = await getTodayDailyTracker({
        userId: authUser.id,
        fromDate: apiFromDate,
        toDate: apiToDate,
        searchString: '',
        page: pageNumber,
        pageSize: PAGE_SIZE,
        usageType: selectedUsageType
    });
}

        setTrackers(normalizeArray(pagedResult?.items));
        setTotalRecords(Number(pagedResult?.totalCount || 0));
    } catch (error) {
        console.error('Error loading history:', error);
        setTrackers([]);
        setTotalRecords(0);
    }
};

    useEffect(() => {
        const decodedUser = decodeToken(localStorage.getItem('authToken'));
        if (!decodedUser?.id) {
            navigate('/login');
            return;
        }

        setAuthUser(decodedUser);
    }, [navigate]);

  useEffect(() => {
    if (!authUser) return;

    const loadFilterData = async () => {
        setListsReady(false);

        try {
            if (authUser.role === 'superadmin') {
                const result = await getAllUsers();
                const admins = normalizeArray(result).filter((user) => getRole(user) === 'admin');

                setAllAdmins(admins);

                if (routeUserId > 0) {
                    const userResult = await getUserById(routeUserId);
                    setAllUsers(userResult ? [userResult] : []);
                } else {
                    setAllUsers([]);
                }
            } else if (authUser.role === 'admin') {
                await loadUsersForAdmin(authUser.id);
                if (!routeUserId) setSelectedUserId(0);
            } else {
                setAllAdmins([]);
                setAllUsers([]);
                setSelectedUserId(authUser.id);
            }
        } catch (error) {
            console.error('Error loading report filters:', error);
            setAllAdmins([]);
            setAllUsers([]);
        } finally {
            setListsReady(true);
        }
    };

    loadFilterData();
}, [authUser, routeUserId]);

useEffect(() => {
    if (authUser && listsReady) {
        loadHistory(1);
    }
}, [
    authUser,
    listsReady,
    fromDate,
    toDate,
    selectedAdminId,
    selectedUserId,
    selectedUsageType,
    allAdmins
]);
    const handleAdminChange = async (event) => {
        const adminId = Number(event.target.value || 0);
        setSelectedAdminId(adminId);
        setSelectedUserId(0);

        if (adminId > 0) {
            await loadUsersForAdmin(adminId);
        } else {
            setAllUsers([]);
        }
    };

    const changePage = (page) => {
        if (page > 0 && page <= totalPages && page !== currentPage) {
            loadHistory(page);
        }
    };

    const getPageNumbers = () => {
        const pages = [];
        const startPage = Math.max(1, currentPage - Math.floor(PAGINATION_DISPLAY_SIZE / 2));
        const endPage = Math.min(totalPages, startPage + PAGINATION_DISPLAY_SIZE - 1);

        for (let page = startPage; page <= endPage; page += 1) {
            pages.push(page);
        }

        if (startPage > 1) pages.unshift(-1);
        if (endPage < totalPages) pages.push(-1);
        return pages;
    };

    const viewScreenshots = (row) => {
        const tracker = getTracker(row);
        const user = getUser(row);
        const trackerDate = valueOf(tracker, 'date', 'Date');
        const startTracker = valueOf(tracker, 'startTracker', 'StartTracker');
        const endTracker = valueOf(tracker, 'endTracker', 'EndTracker');

        if (!startTracker || !endTracker) return;

        const date = formatRouteDate(trackerDate || startTracker);
        const startTime = formatRouteTime(startTracker);
        const endTime = formatRouteTime(endTracker);
        const viewedUserId = getId(user) || Number(valueOf(tracker, 'userId', 'UserId')) || selectedUserId || authUser?.userId || 0;

        navigate(`/screenshots/${date}?viewedUserId=${viewedUserId}&startTime=${startTime}&endTime=${endTime}`);
    };

    const totalDuration = useMemo(() => {
        if (!trackers) return 0;
        return trackers.reduce((total, row) => total + getDurationMs(getTracker(row)), 0);
    }, [trackers]);

    return (
        <div className="report-container">
            <div className="card">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <button className="btn-back" onClick={() => navigate(-1)} title="Go Back">
                        <i className="fas fa-arrow-left"></i> Back
                    </button>
                    <h2 className="title mb-0">Daily Tracker History</h2>
                    <div></div>
                </div>

                <PageHeaderActions><div className="filters">
                    <div className="filters-row">
                        <div className="report-filter-field">
                            <label htmlFor="report-from-date">From</label>
                            <input id="report-from-date" type="date" className="input-date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                        </div>
                        <div className="report-filter-field">
                            <label htmlFor="report-to-date">To</label>
                            <input id="report-to-date" type="date" className="input-date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                        </div>

                        {canFilterUsers && (
                            <>
                                {userRole === 'superadmin' && (
                                    <>
                                        <label className="labels-colors" htmlFor="admin-dropdown">Select Admin</label>
                                    <div style={{ minWidth: '220px' }} className="ms-2">
    <Select
        inputId="admin-dropdown"
        className="report-searchable-select"
        classNamePrefix="report-select"
        value={
            selectedAdminId
                ? {
                    value: selectedAdminId,
                    label: getFullName(
                        allAdmins.find((a) => getId(a) === selectedAdminId)
                    )
                }
                : { value: 0, label: 'All Admins' }
        }
        onChange={async (option) => {
            const adminId = Number(option?.value || 0);

            setSelectedAdminId(adminId);
            setSelectedUserId(0);
            setCurrentPage(1);

            if (adminId > 0) {
                await loadUsersForAdmin(adminId);
            } else {
                setAllUsers([]);
            }
        }}
        options={[
            { value: 0, label: 'All Admins' },
            ...allAdmins.map((admin) => ({
                value: getId(admin),
                label: getFullName(admin)
            }))
        ]}
        placeholder="Search Admin..."
        isSearchable
    />
</div>
                                    </>
                                )}

                                <div className="report-filter-field"><label className="labels-colors" htmlFor="user-dropdown">Select User</label>
                              <div style={{ minWidth: '240px' }}>
    <Select
        inputId="user-dropdown"
        className="report-searchable-select"
        classNamePrefix="report-select"
        value={
            selectedUserId
                ? {
                    value: selectedUserId,
                    label:
                        allUsers.find((u) => getId(u) === selectedUserId)
                            ? `${getFullName(
                                  allUsers.find((u) => getId(u) === selectedUserId)
                              )} ${
                                  getRole(
                                      allUsers.find((u) => getId(u) === selectedUserId)
                                  ) === 'admin'
                                      ? '(Admin)'
                                      : ''
                              }`
                            : 'All Users'
                }
                : { value: 0, label: 'All Users' }
        }
        onChange={(option) => {
            setSelectedUserId(Number(option?.value || 0));
            setCurrentPage(1);
        }}
        options={[
            { value: 0, label: 'All Users' },
            ...allUsers.map((user) => ({
                value: getId(user),
                label: `${getFullName(user)} ${
                    getRole(user) === 'admin' ? '(Admin)' : ''
                }`
            }))
        ]}
        placeholder="Search User..."
        isSearchable
    />
</div></div>

                                <div className="report-filter-field"><label className="labels-colors" htmlFor="usage-type-dropdown">Usage Type</label>
                                <div style={{ minWidth: '180px' }}>
                                    <Select
                                        inputId="usage-type-dropdown"
                                        className="report-searchable-select"
                                        classNamePrefix="report-select"
                                        value={usageTypeOptions.find((option) => option.value === selectedUsageType) || usageTypeOptions[0]}
                                        onChange={(option) => setSelectedUsageType(option?.value || 'all')}
                                        options={usageTypeOptions}
                                        placeholder="Search Type..."
                                        isSearchable
                                    />
                                </div></div>
                            </>
                        )}

                    </div>
                </div></PageHeaderActions>

                {trackers === null ? (
                    <div className="loading">Loading...</div>
                ) : trackers.length === 0 ? (
                    <div className="no-data">No tracker data available for the selected range.</div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table className="tracker-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Name</th>
                                        <th>Start Time</th>
                                        <th>End Time</th>
                                        <th>Type</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trackers.map((row, index) => {
                                        const tracker = getTracker(row);
                                        const user = getUser(row);
                                        const startTracker = valueOf(tracker, 'startTracker', 'StartTracker');
                                        const endTracker = valueOf(tracker, 'endTracker', 'EndTracker');
                                        const durationMs = getDurationMs(tracker);
                                        const rowKey = valueOf(tracker, 'id', 'Id') || `${getId(user)}-${startTracker || index}`;

                                        return (
                                            <tr key={rowKey}>
                                                <td>{formatIstDate(valueOf(tracker, 'date', 'Date'))}</td>
                                                <td>{getFullName(user)}</td>
                                                <td>{formatIstTime(startTracker)}</td>
                                                <td>{formatIstTime(endTracker)}</td>
                                                <td>{valueOf(tracker, 'startMode', 'StartMode') || '-'}</td>
                                                <td className="duration">
                                                    {startTracker && endTracker && durationMs > 0 ? (
                                                        <span
                                                            onClick={() => viewScreenshots(row)}
                                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                            title="View screenshots for this time period"
                                                        >
                                                            {formatDurationMs(durationMs)}
                                                        </span>
                                                    ) : (
                                                        <span>-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <nav aria-label="Page navigation example" className="d-flex justify-content-center mt-4">
                                <ul className="pagination">
                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => changePage(currentPage - 1)} aria-label="Previous">
                                            <span aria-hidden="true">&laquo;</span>
                                        </button>
                                    </li>

                                    {getPageNumbers().map((pageNumber, index) => (
                                        pageNumber === -1 ? (
                                            <li key={`ellipsis-${index}`} className="page-item disabled">
                                                <button className="page-link">...</button>
                                            </li>
                                        ) : (
                                            <li key={pageNumber} className={`page-item ${pageNumber === currentPage ? 'active' : ''}`}>
                                                <button className="page-link" onClick={() => changePage(pageNumber)}>
                                                    {pageNumber}
                                                </button>
                                            </li>
                                        )
                                    ))}

                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => changePage(currentPage + 1)} aria-label="Next">
                                            <span aria-hidden="true">&raquo;</span>
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        )}

                        <div className="summary flex justify-between p-2 report-summary-box rounded-lg mt-4">
                            <span>Showing <b>{trackers.length}</b> of <b>{totalRecords}</b> records</span>
                            <span><b>{formatDurationMs(totalDuration)}</b> total</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Report;
