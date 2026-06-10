import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    getAllUsers,
    getAdminsCreatedBy,
    getUserById,
    deleteUser,
    updateUser,
    updateActiveStatus,
    promoteToAdmin,
    updateManualTrackingAuth,
    updateAutoTrackingAuth,
    updateDeleteAuth,
    getActiveUsers,
    getActiveSessions,
    getTodayDailyTracker,
    startDailyTracker,
    endDailyTracker,
    getAllUsersReport,
    getImagesByDate,
    getAvailableScreenshotDates,
    deleteScreenshot,
    getAllUsersByAdmin,
    getAllUsersByAdminForSetting,
    getUserLoginTimeFormatted,
    getAfkLogsTotal,
    getAppUsageData,
    getGroupedCategoryKeywords,
    getAppUsageByUserId,
    getAppTitleByDate,
    getAppTitleDetails,
    addAppTitleUsage,
    getCategoryByAppName,
    getDayUsageCount,
    getDailyTrackerAggregate,
    getTodaysStartTracker,
    getAppTitleByUserId,
    clearUserError,
    uploadScreenshot,
    getScreenshotById,
    // sendTokenToWorker,
    clearCurrentUser
} from './userSlice';

export const useUser = () => {
    const dispatch = useDispatch();
    const {
        users,
        currentUser,
        admins,
        activeUsers,
        dailyTracker,
        activeTracker,
        allUsersReport,
        images,
        availableScreenshotDates,
        usersByAdmin,
        usersByAdminForSetting,
        loginTime,
        afkLogsTotal,
        appUsageData,
        groupedCategoryKeywords,
        appUsageByUserId,
        appTitles,
        appTitleDetails,
        categoryByAppName,
        dayUsageCount,
        dailyTrackerAggregate,
        todaysStartTracker,
        loading,
        error
    } = useSelector((state) => state.user);

    const actions = useMemo(() => ({
        getAllUsers: () => dispatch(getAllUsers()).unwrap(),
        getAdminsCreatedBy: (superAdminId) => dispatch(getAdminsCreatedBy(superAdminId)).unwrap(),
        getUserById: (id) => dispatch(getUserById(id)).unwrap(),
        deleteUser: (id) => dispatch(deleteUser(id)),
        updateUser: (user, updatedBy) => dispatch(updateUser({ user, updatedBy })),
        updateActiveStatus: (userId, updatedBy, isActive) => dispatch(updateActiveStatus({ userId, updatedBy, isActive })),
        promoteToAdmin: (targetUserId, authorizedBy) => dispatch(promoteToAdmin({ targetUserId, authorizedBy })),
        updateManualTrackingAuth: (id, manualTrackingAuthBy, isManualTrackingEnabled) => dispatch(updateManualTrackingAuth({ id, manualTrackingAuthBy, isManualTrackingEnabled })),
        updateAutoTrackingAuth: (id, autoTrackingAuthBy, isAutoTrackingEnabled) => dispatch(updateAutoTrackingAuth({ id, autoTrackingAuthBy, isAutoTrackingEnabled })),
        updateDeleteAuth: (id, deleteAuthBy, isSelected) => dispatch(updateDeleteAuth({ id, deleteAuthBy, isSelected })),
        uploadScreenshot: (data) => dispatch(uploadScreenshot(data)).unwrap(),
        getAppTitleByUserId: (userId) => dispatch(getAppTitleByUserId(userId)).unwrap(),
        getActiveUsers: (adminId = null) => dispatch(getActiveUsers(adminId)).unwrap(),
        getActiveSessions: (adminId = null) => dispatch(getActiveSessions(adminId)).unwrap(),
        // Background worker token action is intentionally disabled.
        // sendTokenToWorker: () => dispatch(sendTokenToWorker()).unwrap(),
        getScreenshotById: (id) => dispatch(getScreenshotById(id)).unwrap(),
        getTodayDailyTracker: (userId, fromDate, toDate, searchString, page, pageSize, usageType = 'all') => {
            if (typeof userId === 'object') {
                return dispatch(getTodayDailyTracker(userId)).unwrap();
            }
            return dispatch(getTodayDailyTracker({ userId, fromDate, toDate, searchString, page, pageSize, usageType })).unwrap();
        },
        startDailyTracker: (userId, startMode = 'automatic') => {
            if (typeof userId === 'object') {
                return dispatch(startDailyTracker(userId)).unwrap();
            }
            return dispatch(startDailyTracker({ userId, startMode })).unwrap();
        },
        endDailyTracker: () => dispatch(endDailyTracker()).unwrap(),
        
        getAllUsersReport: (fromDate, toDate, searchString, adminId, page, pageSize, usageType = 'all') => {
            if (typeof fromDate === 'object') {
                return dispatch(getAllUsersReport(fromDate)).unwrap();
            }
            return dispatch(getAllUsersReport({ fromDate, toDate, searchString, adminId, page, pageSize, usageType })).unwrap();
        },
        getImagesByDate: (userId, date, skip = 1, take = 6, usageType = 'all', startTime = null, endTime = null) => {
            if (typeof userId === 'object') {
                return dispatch(getImagesByDate(userId)).unwrap();
            }
            return dispatch(getImagesByDate({ userId, date, skip, take, usageType, startTime, endTime })).unwrap();
        },
        getAvailableScreenshotDates: (userId) => dispatch(getAvailableScreenshotDates(userId)).unwrap(),
        deleteScreenshot: (screenshotId) => dispatch(deleteScreenshot(screenshotId)),
        getAllUsersByAdmin: (adminId, role) => {
            if (typeof adminId === 'object') {
                return dispatch(getAllUsersByAdmin(adminId)).unwrap();
            }
            return dispatch(getAllUsersByAdmin({ adminId, role })).unwrap();
        },
        getAllUsersByAdminForSetting: (adminId, role, searchTerm = '') => {
            if (typeof adminId === 'object') {
                return dispatch(getAllUsersByAdminForSetting(adminId)).unwrap();
            }
            return dispatch(getAllUsersByAdminForSetting({ adminId, role, searchTerm })).unwrap();
        },
        getUserLoginTimeFormatted: (userId) => dispatch(getUserLoginTimeFormatted(userId)).unwrap(),
        getAfkLogsTotal: (userId, date, userRole, startMode = 'all') => {
            if (typeof userId === 'object') {
                return dispatch(getAfkLogsTotal(userId)).unwrap();
            }
            return dispatch(getAfkLogsTotal({ userId, date, userRole, startMode })).unwrap();
        },
        getAppUsageData: (id, usageType = 'all', userRole = 'user') => {
            if (typeof id === 'object') {
                return dispatch(getAppUsageData(id)).unwrap();
            }
            return dispatch(getAppUsageData({ id, usageType, userRole })).unwrap();
        },
        getGroupedCategoryKeywords: (id, date, page = 1, take = 5) => {
            if (typeof id === 'object') {
                return dispatch(getGroupedCategoryKeywords(id)).unwrap();
            }
            return dispatch(getGroupedCategoryKeywords({ id, date, page, take })).unwrap();
        },
        getAppUsageByUserId: (userId, date, page = 1, take = 5, usageType = 'all', userRole = 'user') => {
            if (typeof userId === 'object') {
                return dispatch(getAppUsageByUserId(userId)).unwrap();
            }
            return dispatch(getAppUsageByUserId({ userId, date, page, take, usageType, userRole })).unwrap();
        },
        getAppTitleByDate: (date, userId, page = 1, take = 5) => {
            if (typeof date === 'object') {
                return dispatch(getAppTitleByDate(date)).unwrap();
            }
            return dispatch(getAppTitleByDate({ date, userId, page, take })).unwrap();
        },
        getAppTitleDetails: (date, userId, appName, page = 1, take = 5) => {
            if (typeof date === 'object') {
                return dispatch(getAppTitleDetails(date)).unwrap();
            }
            return dispatch(getAppTitleDetails({ date, userId, appName, page, take })).unwrap();
        },
        addAppTitleUsage: (data) =>
    dispatch(addAppTitleUsage(data)).unwrap(),

getCategoryByAppName: (appName) => dispatch(getCategoryByAppName(appName)).unwrap(),
        getCategoryByAppName: (appName) => dispatch(getCategoryByAppName(appName)).unwrap(),
        getDayUsageCount: (date, userId, usageType = 'all') => {
            if (typeof date === 'object') {
                return dispatch(getDayUsageCount(date)).unwrap();
            }
            return dispatch(getDayUsageCount({ date, userId, usageType })).unwrap();
        },
        getDailyTrackerAggregate: (userId, date, startMode = 'all') => {
            if (typeof userId === 'object') {
                return dispatch(getDailyTrackerAggregate(userId)).unwrap();
            }
            return dispatch(getDailyTrackerAggregate({ userId, date, startMode })).unwrap();
        },
        getTodaysStartTracker: (userId) => dispatch(getTodaysStartTracker(userId)).unwrap(),
        clearError: () => dispatch(clearUserError()),
        clearCurrentUser: () => dispatch(clearCurrentUser())
    }), [dispatch]);

    return useMemo(() => ({
        users,
        currentUser,
        admins,
        activeUsers,
        dailyTracker,
        activeTracker,
        allUsersReport,
        images,
        availableScreenshotDates,
        usersByAdmin,
        usersByAdminForSetting,
        loginTime,
        afkLogsTotal,
        appUsageData,
        groupedCategoryKeywords,
        appUsageByUserId,
        appTitles,
        appTitleDetails,
        categoryByAppName,
        dayUsageCount,
        dailyTrackerAggregate,
        todaysStartTracker,
        loading,
        error,
        ...actions
    }), [
        users,
        currentUser,
        admins,
        activeUsers,
        dailyTracker,
        activeTracker,
        allUsersReport,
        images,
        availableScreenshotDates,
        usersByAdmin,
        usersByAdminForSetting,
        loginTime,
        afkLogsTotal,
        appUsageData,
        groupedCategoryKeywords,
        appUsageByUserId,
        appTitles,
        appTitleDetails,
        categoryByAppName,
        dayUsageCount,
        dailyTrackerAggregate,
        todaysStartTracker,
        loading,
        error,
        actions
    ]);
};
