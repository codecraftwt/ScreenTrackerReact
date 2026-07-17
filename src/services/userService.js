import api from './api';

const formatDateParam = (date) => {
    if (!date) return '';
    if (date instanceof Date) return date.toISOString();
    return String(date);
};

const normalizePagedTrackerResult = (data) => ({
    items: data?.items ?? data?.Items ?? data?.users ?? data?.Users ?? [],
    totalCount: data?.totalCount ?? data?.TotalCount ?? 0
});

const valueOf = (entity, ...keys) => {
    for (const key of keys) {
        if (entity?.[key] !== undefined && entity?.[key] !== null) {
            return entity[key];
        }
    }

    return undefined;
};

const timeSpanToMinutes = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    const text = String(value).replaceAll('"', '');
    const parts = text.split(':').map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return 0;

    return (parts[0] * 60) + parts[1] + (parts[2] / 60);
};

export const userService = {
    getAllUsers: async () => {
        try {
            const response = await api.get('/User/allUsers');
            return response.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    },

    getAdminsCreatedBy: async (superAdminId) => {
        try {
            const users = await userService.getAllUsers();
            const currentUserId = Number(superAdminId);

            return (users || []).filter((user) => {
                const role = String(valueOf(user, 'role', 'Role') || '').toLowerCase();
                const createdBy = Number(valueOf(user, 'isCreatedBy', 'IsCreatedBy'));

                return role === 'admin' && createdBy === currentUserId;
            });
        } catch (error) {
            console.error('Error fetching admins:', error);
            return [];
        }
    },

    getUserById: async (id) => {
        try {
            const response = await api.get(`/User/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching user ${id}:`, error);
            return null;
        }
    },

    deleteUser: async (id) => {
        try {
            const response = await api.delete(`/User/${id}`);
            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error(`Error deleting user ${id}:`, error);
            return false;
        }
    },

    updateUser: async (user, updatedBy) => {
        try {
            const response = await api.put(`/User/update?updatedBy=${updatedBy}`, user);
            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error('Error updating user:', error);
            return false;
        }
    },

    updateActiveStatus: async (userId, updatedBy, isActive) => {
        try {
            const response = await api.put(`/User/updateActiveStatus?id=${userId}&updatedBy=${updatedBy}&isActive=${isActive}`);
            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error('Error updating active status:', error);
            return false;
        }
    },

    promoteToAdmin: async (targetUserId, authorizedBy) => {
        try {
            const response = await api.put(`/User/promoteToAdmin?targetUserId=${targetUserId}&authorizedBy=${authorizedBy}`);
            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error('Error promoting to admin:', error);
            return false;
        }
    },

    updateManualTrackingAuth: async (id, manualTrackingAuthBy, isManualTrackingEnabled) => {
        try {
            const response = await api.put(`/User/updateManualTrackingAuth?id=${id}&manualTrackingAuthBy=${manualTrackingAuthBy}&isManualTrackingEnabled=${isManualTrackingEnabled}`);
            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error('Error updating manual tracking auth:', error);
            return false;
        }
    },

    updateAutoTrackingAuth: async (id, autoTrackingAuthBy, isAutoTrackingEnabled) => {
        try {
            const response = await api.put(`/User/updateAutoTrackingAuth?id=${id}&autoTrackingAuthBy=${autoTrackingAuthBy}&isAutoTrackingEnabled=${isAutoTrackingEnabled}`);
            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error('Error updating auto tracking auth:', error);
            return false;
        }
    },

    updateDeleteAuth: async (id, deleteAuthBy, isSelected) => {
        try {
            const response = await api.put(`/User/updateDeleteAuth?id=${id}&deleteAuthBy=${deleteAuthBy}&isSelected=${isSelected}`);
            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error('Error updating delete auth:', error);
            return false;
        }
    },

    // Daily Tracker endpoints
    getActiveUsers: async (adminId = null) => {
        try {
            let url = '/DailyTracker/ActiveUser';
            if (adminId) {
                url += `?adminId=${adminId}`;
            }
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching active users:', error);
            return [];
        }
    },

    getActiveSessions: async (adminId = null) => {
        try {
            let url = '/Auth/active-sessions';
            if (adminId) {
                url += `?adminId=${adminId}`;
            }
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching active sessions:', error);
            return [];
        }
    },

    getTodayDailyTracker: async (userId, fromDate, toDate, searchString, page, pageSize, usageType = 'all') => {
        try {
            const fromStr = encodeURIComponent(formatDateParam(fromDate));
            const toStr = encodeURIComponent(formatDateParam(toDate));
            const url = `/DailyTracker/today?userId=${userId}&fromDate=${fromStr}&toDate=${toStr}&searchString=${encodeURIComponent(searchString || '')}&pageNumber=${page}&pageSize=${pageSize}&usageType=${usageType}`;
            const response = await api.get(url);
            return normalizePagedTrackerResult(response.data);
        } catch (error) {
            console.error('Error fetching daily tracker:', error);
            return { items: [], totalCount: 0 };
        }
    },

    startDailyTracker: async (userId, startMode = 'automatic') => {
        try {
            const response = await api.post('/DailyTracker/start', {
                userId,
                startMode
            });
            return response.data;
        } catch (error) {
            console.error('Error starting daily tracker:', error);
            return null;
        }
    },

    endDailyTracker: async () => {
        try {
            const response = await api.post('/DailyTracker/end');
            return response.data;
        } catch (error) {
            console.error('Error ending daily tracker:', error);
            return null;
        }
    },

    getAllUsersReport: async (fromDate, toDate, searchString, adminId, page, pageSize, usageType = 'all') => {
        try {
            const fromStr = encodeURIComponent(formatDateParam(fromDate));
            const toStr = encodeURIComponent(formatDateParam(toDate));
            let url = `/DailyTracker/allUsersreport?fromDate=${fromStr}&toDate=${toStr}&searchString=${encodeURIComponent(searchString || '')}&pageNumber=${page}&pageSize=${pageSize}&usageType=${usageType}`;
            if (adminId) {
                url += `&adminId=${adminId}`;
            }
            const response = await api.get(url);
            return normalizePagedTrackerResult(response.data);
        } catch (error) {
            console.error('Error fetching all users report:', error);
            return { items: [], totalCount: 0 };
        }
    },

    // Image/Screenshots endpoints
    getImagesByDate: async (userId, date, skip = 1, take = 6, usageType = 'all', startTime = null, endTime = null) => {
        try {
            const formattedDate = date.split('T')[0];
            let url = `/Image/by-date?userId=${userId}&date=${formattedDate}&skip=${skip}&take=${take}&usageType=${usageType}`;
            if (startTime) url += `&startTime=${encodeURIComponent(startTime)}`;
            if (endTime) url += `&endTime=${encodeURIComponent(endTime)}`;
            
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching images:', error);
            return [];
        }
    },

    getAvailableScreenshotDates: async (userId) => {
        try {
            const response = await api.get(`/Image/available-dates?userId=${userId}`);
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error('Error fetching available screenshot dates:', error);
            return [];
        }
    },

    deleteScreenshot: async (screenshotId) => {
        try {
            const response = await api.delete(`/Image/${screenshotId}`);
            return response.status === 200 || response.status === 204;
        } catch (error) {
            console.error('Error deleting screenshot:', error);
            return false;
        }
    },

    // Admin hierarchy endpoints
    getAllUsersByAdmin: async (adminId, role) => {
        try {
            const response = await api.get(`/User/allUsersByAdmin?AdminId=${adminId}&Role=${role}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching users by admin:', error);
            return [];
        }
    },

    getAllUsersByAdminForSetting: async (adminId, role, searchTerm = '') => {
        try {
            let url = `/User/allUsersByAdminforsetting?AdminId=${adminId}&Role=${role}`;

            if (searchTerm) {
                url += `&searchTerm=${encodeURIComponent(searchTerm)}`;
            }

            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching users by admin for setting:', error);
            return [];
        }
    },

    // Dashboard Statistics endpoints
    getUserLoginTimeFormatted: async (userId) => {
        try {
            const response = await api.get(`/Auth/Users/${userId}/LoginTime`);
            return response.data;
        } catch (error) {
            console.error('Error fetching login time:', error);
            return null;
        }
    },

    getAfkLogsTotal: async (userId, date, userRole, startMode = "all") => {
        try {
            const formattedDate = date.split('T')[0];
            const response = await api.get(`/AfkLogs/total?userId=${userId}&date=${formattedDate}&mode=${startMode}`);
            return timeSpanToMinutes(response.data);
        } catch (error) {
            console.error('Error fetching afk logs total:', error);
            return 0;
        }
    },

    getAppUsageData: async (id, usageType = "all", userRole = "user") => {
        try {
            const response = await api.get(`/AppUsage/lastDaysTotal/${id}?usageType=${usageType}&userRole=${userRole}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching app usage data:', error);
            return [];
        }
    },
    
    getGroupedCategoryKeywords: async (id, date, page = 1, take = 5, usageType = 'all', appName = '') => {
        try {
            const formattedDate = date.split('T')[0];
            const encodedAppName = encodeURIComponent(appName);
            const response = await api.get(`/CategoryKeyword/groupedCategory/${id}/${formattedDate}?page=${page}&take=${take}&usageType=${usageType}&appName=${encodedAppName}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching grouped categories:', error);
            return [];
        }
    },

    getAppUsageByUserId: async (userId, date, page = 1, take = 5, usageType = 'all', userRole = 'user') => {
        try {
            const formattedDate = date.split('T')[0];
            const response = await api.get(`/AppUsage/day/${formattedDate}/${userId}?page=${page}&take=${take}&usageType=${usageType}&userRole=${userRole}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching app usage by user:', error);
            return [];
        }
    },

    getAppTitleByDate: async (date, userId, page = 1, take = 5) => {
        try {
            const formattedDate = date.split('T')[0];
            const response = await api.get(`/AppTitle/day/${formattedDate}/${userId}?page=${page}&take=${take}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching app titles:', error);
            return [];
        }
    },

    getAppTitleDetails: async (date, userId, appName, page = 1, take = 5, usageType = 'all') => {
        try {
            const formattedDate = date.split('T')[0];
            const encodedAppName = encodeURIComponent(appName);
            const response = await api.get(`/AppTitle/AppDetails/${formattedDate}/${userId}?appName=${encodedAppName}&page=${page}&take=${take}&usageType=${usageType}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching app title details:', error);
            return [];
        }
    },

    getCategoryByAppName: async (appName) => {
        try {
            const encodedAppName = encodeURIComponent(appName);
            const response = await api.get(`/CategoryKeyword/Category?Keyword=${encodedAppName}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching category by app name:', error);
            return [];
        }
    },

    getDayUsageCount: async (date, userId, usageType = 'all') => {
        try {
            const formattedDate = date.split('T')[0];
            const response = await api.get(`/AppUsage/day/${formattedDate}/${userId}/count?usageType=${usageType}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching day usage count:', error);
            return 0;
        }
    },

    getDailyTrackerAggregate: async (userId, date, startMode = 'all') => {
        try {
            const formattedDate = date.split('T')[0];
            const response = await api.get(`/DailyTracker/aggregate?userId=${userId}&date=${formattedDate}&startMode=${startMode}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching daily tracker aggregate:', error);
            return { totalDurationMinutes: 0, activeDurationMinutes: 0, afkDurationMinutes: 0 };
        }
    },

    getTodaysStartTracker: async (userId) => {
        try {
            const response = await api.get(`/DailyTracker/today/${userId}`);
            return response.data?.startTracker ?? response.data?.StartTracker ?? null;
        } catch (error) {
            console.error('Error fetching today start tracker:', error);
            return null;
        }
    }
    ,
    addAppTitleUsage: async ({ appName, title, startTime, endTime, durationInMinutes, startMode = 'manual' }) => {
    try {
        const response = await api.post('/AppTitle', {
            appName,
            title,
            startTime,
            endTime,
            durationInMinutes,
            startMode
        });

        return response.data;
    } catch (error) {
        console.error('Error adding app title usage:', error);
        return null;
    }
},
sendTokenToWorker: async () => {
    try {
        // Token passing to the background worker is intentionally disabled.
        // Keeping the original code commented so it can be restored if needed.
        /*
        const token = localStorage.getItem("authToken");

        if (!token) {
            console.log("No authToken found");
            return false;
        }

        const response = await fetch("http://localhost:5055/set-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ token })
        });

        console.log("Worker token response:", response.status);
        return response.ok;
        */
        return true;
    } catch (error) {
        console.error("Failed to send token to Worker:", error);
        return false;
    }
},
getAppTitleByUserId: async (userId) => {
    try {
        const response = await api.get(`/AppTitle/user/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching app titles by user:', error);
        return [];
    }
},
uploadScreenshot: async ({ userId, file, keyboardClicks = 0, mouseClicks = 0, minuteActivityData = "{}", startMode = "manual" }) => {
    const formData = new FormData();

    formData.append("userId", userId);
    formData.append("keyboardClicks", keyboardClicks);
    formData.append("mouseClicks", mouseClicks);
    formData.append("minuteActivityData", minuteActivityData);
    formData.append("startMode", startMode);
    formData.append("file", file);

    const response = await api.post("/Image/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });

    return response.data;
},
getScreenshotById: async (id) => {
    try {
        const response = await api.get(`/Image/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching screenshot detail:', error);
        return null;
    }
},
getRelativeScreenshot: async (userId, currentImageId, date, direction, usageType = 'all') => {
    try {
        const formattedDate = String(date).split('T')[0];
        const response = await api.get(`/Image/${userId}/${currentImageId}/${formattedDate}/${direction}/${usageType}`);
        return response.data;
    } catch (error) {
        if (error.response?.status !== 404) {
            console.error('Error fetching relative screenshot:', error);
        }
        return null;
    }
},
};
