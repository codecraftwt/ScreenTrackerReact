import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService } from '../../services/userService';

// Async thunks for user operations
export const getAllUsers = createAsyncThunk(
    'user/getAllUsers',
    async (_, { rejectWithValue }) => {
        try {
            const users = await userService.getAllUsers();
            return users;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch users');
        }
    }
);

export const getAdminsCreatedBy = createAsyncThunk(
    'user/getAdminsCreatedBy',
    async (superAdminId, { rejectWithValue }) => {
        try {
            const admins = await userService.getAdminsCreatedBy(superAdminId);
            return admins;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch admins');
        }
    }
);

export const getUserById = createAsyncThunk(
    'user/getUserById',
    async (id, { rejectWithValue }) => {
        try {
            const user = await userService.getUserById(id);
            return user;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch user');
        }
    }
);

export const deleteUser = createAsyncThunk(
    'user/deleteUser',
    async (id, { rejectWithValue }) => {
        try {
            const success = await userService.deleteUser(id);
            if (success) {
                return id;
            }
            return rejectWithValue('Failed to delete user');
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to delete user');
        }
    }
);

export const updateUser = createAsyncThunk(
    'user/updateUser',
    async ({ user, updatedBy }, { rejectWithValue }) => {
        try {
            const success = await userService.updateUser(user, updatedBy);
            if (success) {
                return user;
            }
            return rejectWithValue('Failed to update user');
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to update user');
        }
    }
);

export const updateActiveStatus = createAsyncThunk(
    'user/updateActiveStatus',
    async ({ userId, updatedBy, isActive }, { rejectWithValue }) => {
        try {
            const success = await userService.updateActiveStatus(userId, updatedBy, isActive);
            if (success) {
                return { userId, isActive };
            }
            return rejectWithValue('Failed to update active status');
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to update active status');
        }
    }
);

export const promoteToAdmin = createAsyncThunk(
    'user/promoteToAdmin',
    async ({ targetUserId, authorizedBy }, { rejectWithValue }) => {
        try {
            const success = await userService.promoteToAdmin(targetUserId, authorizedBy);
            if (success) {
                return targetUserId;
            }
            return rejectWithValue('Failed to promote to admin');
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to promote to admin');
        }
    }
);

export const updateManualTrackingAuth = createAsyncThunk(
    'user/updateManualTrackingAuth',
    async ({ id, manualTrackingAuthBy, isManualTrackingEnabled }, { rejectWithValue }) => {
        try {
            const success = await userService.updateManualTrackingAuth(id, manualTrackingAuthBy, isManualTrackingEnabled);
            if (success) {
                return { id, isManualTrackingEnabled };
            }
            return rejectWithValue('Failed to update manual tracking auth');
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to update manual tracking auth');
        }
    }
);

export const updateAutoTrackingAuth = createAsyncThunk(
    'user/updateAutoTrackingAuth',
    async ({ id, autoTrackingAuthBy, isAutoTrackingEnabled }, { rejectWithValue }) => {
        try {
            const success = await userService.updateAutoTrackingAuth(id, autoTrackingAuthBy, isAutoTrackingEnabled);
            if (success) {
                return { id, isAutoTrackingEnabled };
            }
            return rejectWithValue('Failed to update auto tracking auth');
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to update auto tracking auth');
        }
    }
);

export const updateDeleteAuth = createAsyncThunk(
    'user/updateDeleteAuth',
    async ({ id, deleteAuthBy, isSelected }, { rejectWithValue }) => {
        try {
            const success = await userService.updateDeleteAuth(id, deleteAuthBy, isSelected);
            if (success) {
                return { id, isSelected };
            }
            return rejectWithValue('Failed to update delete auth');
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to update delete auth');
        }
    }
);

// Daily Tracker thunks
export const getActiveUsers = createAsyncThunk(
    'user/getActiveUsers',
    async (adminId = null, { rejectWithValue }) => {
        try {
            const users = await userService.getActiveUsers(adminId);
            return users;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch active users');
        }
    }
);

export const getActiveSessions = createAsyncThunk(
    'user/getActiveSessions',
    async (adminId = null, { rejectWithValue }) => {
        try {
            const users = await userService.getActiveSessions(adminId);
            return users;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch active sessions');
        }
    }
);

export const getTodayDailyTracker = createAsyncThunk(
    'user/getTodayDailyTracker',
    async ({ userId, fromDate, toDate, searchString, page, pageSize, usageType }, { rejectWithValue }) => {
        try {
            const result = await userService.getTodayDailyTracker(userId, fromDate, toDate, searchString, page, pageSize, usageType);
            return result;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch daily tracker');
        }
    }
);

export const startDailyTracker = createAsyncThunk(
    'user/startDailyTracker',
    async ({ userId, startMode }, { rejectWithValue }) => {
        try {
            const tracker = await userService.startDailyTracker(userId, startMode);
            if (tracker) {
                return tracker;
            }
            return rejectWithValue('Failed to start daily tracker');
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to start daily tracker');
        }
    }
);

export const endDailyTracker = createAsyncThunk(
    'user/endDailyTracker',
    async (_, { rejectWithValue }) => {
        try {
            const tracker = await userService.endDailyTracker();
            if (tracker) {
                return tracker;
            }
            return rejectWithValue('Failed to end daily tracker');
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to end daily tracker');
        }
    }
);

export const getAllUsersReport = createAsyncThunk(
    'user/getAllUsersReport',
    async ({ fromDate, toDate, searchString, adminId, page, pageSize, usageType }, { rejectWithValue }) => {
        try {
            const result = await userService.getAllUsersReport(fromDate, toDate, searchString, adminId, page, pageSize, usageType);
            return result;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch all users report');
        }
    }
);

// Image/Screenshots thunks
export const getImagesByDate = createAsyncThunk(
    'user/getImagesByDate',
    async ({ userId, date, skip, take, usageType, startTime, endTime }, { rejectWithValue }) => {
        try {
            const images = await userService.getImagesByDate(userId, date, skip, take, usageType, startTime, endTime);
            return images;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch images');
        }
    }
);

export const getAvailableScreenshotDates = createAsyncThunk(
    'user/getAvailableScreenshotDates',
    async (userId, { rejectWithValue }) => {
        try {
            const dates = await userService.getAvailableScreenshotDates(userId);
            return dates;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch available screenshot dates');
        }
    }
);

export const deleteScreenshot = createAsyncThunk(
    'user/deleteScreenshot',
    async (screenshotId, { rejectWithValue }) => {
        try {
            const success = await userService.deleteScreenshot(screenshotId);
            if (success) {
                return screenshotId;
            }
            return rejectWithValue('Failed to delete screenshot');
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to delete screenshot');
        }
    }
);

// Admin hierarchy thunks
export const getAllUsersByAdmin = createAsyncThunk(
    'user/getAllUsersByAdmin',
    async ({ adminId, role }, { rejectWithValue }) => {
        try {
            const users = await userService.getAllUsersByAdmin(adminId, role);
            return users;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch users by admin');
        }
    }
);

export const getAllUsersByAdminForSetting = createAsyncThunk(
    'user/getAllUsersByAdminForSetting',
    async ({ adminId, role, searchTerm }, { rejectWithValue }) => {
        try {
            const users = await userService.getAllUsersByAdminForSetting(adminId, role, searchTerm);
            return users;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch users by admin for setting');
        }
    }
);

// Dashboard Statistics thunks
export const getUserLoginTimeFormatted = createAsyncThunk(
    'user/getUserLoginTimeFormatted',
    async (userId, { rejectWithValue }) => {
        try {
            const loginTime = await userService.getUserLoginTimeFormatted(userId);
            return loginTime;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch login time');
        }
    }
);

export const getAfkLogsTotal = createAsyncThunk(
    'user/getAfkLogsTotal',
    async ({ userId, date, userRole, startMode }, { rejectWithValue }) => {
        try {
            const total = await userService.getAfkLogsTotal(userId, date, userRole, startMode);
            return total;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch AFK logs total');
        }
    }
);

export const getAppUsageData = createAsyncThunk(
    'user/getAppUsageData',
    async ({ id, usageType, userRole }, { rejectWithValue }) => {
        try {
            const data = await userService.getAppUsageData(id, usageType, userRole);
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch app usage data');
        }
    }
);

export const getGroupedCategoryKeywords = createAsyncThunk(
    'user/getGroupedCategoryKeywords',
    async ({ id, date, page, take, usageType, appName }, { rejectWithValue }) => {
        try {
            const data = await userService.getGroupedCategoryKeywords(id, date, page, take, usageType, appName);
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch grouped categories');
        }
    }
);

export const getAppUsageByUserId = createAsyncThunk(
    'user/getAppUsageByUserId',
    async ({ userId, date, page, take, usageType, userRole }, { rejectWithValue }) => {
        try {
            const data = await userService.getAppUsageByUserId(userId, date, page, take, usageType, userRole);
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch app usage by user');
        }
    }
);

export const getAppTitleByDate = createAsyncThunk(
    'user/getAppTitleByDate',
    async ({ date, userId, page, take }, { rejectWithValue }) => {
        try {
            const data = await userService.getAppTitleByDate(date, userId, page, take);
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch app titles');
        }
    }
);
export const getAppTitleByUserId = createAsyncThunk(
    'user/getAppTitleByUserId',
    async (userId, { rejectWithValue }) => {
        try {
            return await userService.getAppTitleByUserId(userId);
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const getAppTitleDetails = createAsyncThunk(
    'user/getAppTitleDetails',
    async ({ date, userId, appName, page, take, usageType }, { rejectWithValue }) => {
        try {
            const data = await userService.getAppTitleDetails(date, userId, appName, page, take, usageType);
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch app title details');
        }
    }
);

export const getCategoryByAppName = createAsyncThunk(
    'user/getCategoryByAppName',
    async (appName, { rejectWithValue }) => {
        try {
            const data = await userService.getCategoryByAppName(appName);
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch category by app name');
        }
    }
);

export const getDayUsageCount = createAsyncThunk(
    'user/getDayUsageCount',
    async ({ date, userId, usageType }, { rejectWithValue }) => {
        try {
            const count = await userService.getDayUsageCount(date, userId, usageType);
            return count;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch day usage count');
        }
    }
);

export const getDailyTrackerAggregate = createAsyncThunk(
    'user/getDailyTrackerAggregate',
    async ({ userId, date, startMode }, { rejectWithValue }) => {
        try {
            const aggregate = await userService.getDailyTrackerAggregate(userId, date, startMode);
            return aggregate;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch daily tracker aggregate');
        }
    }
);

export const getTodaysStartTracker = createAsyncThunk(
    'user/getTodaysStartTracker',
    async (userId, { rejectWithValue }) => {
        try {
            const startTracker = await userService.getTodaysStartTracker(userId);
            return startTracker;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch today start tracker');
        }
    }
);
export const addAppTitleUsage = createAsyncThunk(
    'user/addAppTitleUsage',
    async ({ appName, title, startTime, endTime, durationInMinutes, startMode }, { rejectWithValue }) => {
        try {
            const data = await userService.addAppTitleUsage({
                appName,
                title,
                startTime,
                endTime,
                durationInMinutes,
                startMode
            });

            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to add app title usage');
        }
    }
);



export const uploadScreenshot = createAsyncThunk(
    "user/uploadScreenshot",
    async (data, { rejectWithValue }) => {
        try {
            return await userService.uploadScreenshot(data);
        } catch (error) {
            return rejectWithValue(error.message || "Failed to upload screenshot");
        }
    }
);
export const sendTokenToWorker = createAsyncThunk(
    'user/sendTokenToWorker',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem("authToken");

            console.log("Token from localStorage:", token);

            if (!token) {
                return rejectWithValue("No auth token found in localStorage");
            }

            const response = await fetch("http://localhost:5055/set-token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ token })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return rejectWithValue(errorText || "Failed to send token");
            }
            return true;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);
export const getScreenshotById = createAsyncThunk(
    'user/getScreenshotById',
    async (id, { rejectWithValue }) => {
        try {
            return await userService.getScreenshotById(id);
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch screenshot detail');
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState: {
        users: [],
        currentUser: null,
        admins: [],
        activeUsers: [],
        dailyTracker: { items: [], totalCount: 0 },
        allUsersReport: { items: [], totalCount: 0 },
        images: [],
        availableScreenshotDates: [],
        usersByAdmin: [],
        usersByAdminForSetting: [],
        loginTime: null,
        afkLogsTotal: 0,
        appUsageData: [],
        groupedCategoryKeywords: [],
        appUsageByUserId: [],
        appTitles: [],
        appTitleDetails: [],
        addAppTitleResult: null,
        categoryByAppName: [],
        dayUsageCount: 0,
        dailyTrackerAggregate: { totalDurationMinutes: 0, activeDurationMinutes: 0, afkDurationMinutes: 0 },
        todaysStartTracker: null,
        activeTracker: null,
        selectedScreenshot: null,
        loading: false,
        error: null
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearCurrentUser: (state) => {
            state.currentUser = null;
        },
        
        resetUserState: (state) => {
            state.users = [];
            state.currentUser = null;
            state.admins = [];
            state.activeUsers = [];
            state.dailyTracker = { items: [], totalCount: 0 };
            state.allUsersReport = { items: [], totalCount: 0 };
            state.images = [];
            state.availableScreenshotDates = [];
            state.usersByAdmin = [];
            state.usersByAdminForSetting = [];
            state.loginTime = null;
            state.afkLogsTotal = 0;
            state.appUsageData = [];
            state.groupedCategoryKeywords = [];
            state.appUsageByUserId = [];
            state.appTitles = [];
            state.appTitleDetails = [];
            state.categoryByAppName = [];
            state.dayUsageCount = 0;
            state.dailyTrackerAggregate = { totalDurationMinutes: 0, activeDurationMinutes: 0, afkDurationMinutes: 0 };
            state.todaysStartTracker = null;
            state.activeTracker = null;
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // getAllUsers
            .addCase(getAllUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getAllUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.users = action.payload;
                state.error = null;
            })
            .addCase(getAllUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // getAdminsCreatedBy
            .addCase(getAdminsCreatedBy.fulfilled, (state, action) => {
                state.admins = action.payload;
            })
            // getUserById
            .addCase(getUserById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getUserById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentUser = action.payload;
                state.error = null;
            })
            .addCase(getUserById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getScreenshotById.fulfilled, (state, action) => {
    state.selectedScreenshot = action.payload;
})
            // deleteUser
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.users = state.users.filter(user => user.id !== action.payload);
            })
            // updateUser
            .addCase(updateUser.fulfilled, (state, action) => {
                const index = state.users.findIndex(user => user.id === action.payload.id);
                if (index !== -1) {
                    state.users[index] = action.payload;
                }
            })
            // updateActiveStatus
            .addCase(updateActiveStatus.fulfilled, (state, action) => {
                const index = state.users.findIndex(user => user.id === action.payload.userId);
                if (index !== -1) {
                    state.users[index].isActive = action.payload.isActive;
                }
            })
            // promoteToAdmin
            .addCase(promoteToAdmin.fulfilled, (state, action) => {
                const index = state.users.findIndex(user => user.id === action.payload);
                if (index !== -1) {
                    state.users[index].role = 'admin';
                }
            })
            // getActiveUsers
            .addCase(getActiveUsers.fulfilled, (state, action) => {
                state.activeUsers = action.payload;
            })
            // getActiveSessions
            .addCase(getActiveSessions.fulfilled, (state, action) => {
                state.activeUsers = action.payload;
            })
            // getTodayDailyTracker
            .addCase(getTodayDailyTracker.fulfilled, (state, action) => {
                state.dailyTracker = action.payload;
            })
            // startDailyTracker
            .addCase(startDailyTracker.fulfilled, (state, action) => {
                state.activeTracker = action.payload;
            })
            // endDailyTracker
            .addCase(endDailyTracker.fulfilled, (state, action) => {
                state.activeTracker = action.payload;
            })
            // getAllUsersReport
            .addCase(getAllUsersReport.fulfilled, (state, action) => {
                state.allUsersReport = action.payload;
            })
            // getImagesByDate
            .addCase(getImagesByDate.fulfilled, (state, action) => {
                state.images = action.payload;
            })
            .addCase(getAvailableScreenshotDates.fulfilled, (state, action) => {
                state.availableScreenshotDates = action.payload;
            })
            // deleteScreenshot
            .addCase(deleteScreenshot.fulfilled, (state, action) => {
                state.images = state.images.filter(img => img.id !== action.payload);
            })
            // getAllUsersByAdmin
            .addCase(getAllUsersByAdmin.fulfilled, (state, action) => {
                state.usersByAdmin = action.payload;
            })
            // getAllUsersByAdminForSetting
            .addCase(getAllUsersByAdminForSetting.fulfilled, (state, action) => {
                state.usersByAdminForSetting = action.payload;
            })
            // getUserLoginTimeFormatted
            .addCase(getUserLoginTimeFormatted.fulfilled, (state, action) => {
                state.loginTime = action.payload;
            })
            // getAfkLogsTotal
            .addCase(getAfkLogsTotal.fulfilled, (state, action) => {
                state.afkLogsTotal = action.payload;
            })
            // getAppUsageData
            .addCase(getAppUsageData.fulfilled, (state, action) => {
                state.appUsageData = action.payload;
            })
            // getGroupedCategoryKeywords
            .addCase(getGroupedCategoryKeywords.fulfilled, (state, action) => {
                state.groupedCategoryKeywords = action.payload;
            })
            // getAppUsageByUserId
            .addCase(getAppUsageByUserId.fulfilled, (state, action) => {
                state.appUsageByUserId = action.payload;
            })
            // getAppTitleByDate
            .addCase(getAppTitleByDate.fulfilled, (state, action) => {
                state.appTitles = action.payload;
            })
            // getAppTitleDetails
            .addCase(getAppTitleDetails.fulfilled, (state, action) => {
                state.appTitleDetails = action.payload;
            })
            // getCategoryByAppName
            .addCase(getCategoryByAppName.fulfilled, (state, action) => {
                state.categoryByAppName = action.payload;
            })
            // getDayUsageCount
            .addCase(getDayUsageCount.fulfilled, (state, action) => {
                state.dayUsageCount = action.payload;
            })
            // getDailyTrackerAggregate
            .addCase(getDailyTrackerAggregate.fulfilled, (state, action) => {
                state.dailyTrackerAggregate = action.payload;
            })
            // getTodaysStartTracker
            .addCase(getTodaysStartTracker.fulfilled, (state, action) => {
                state.todaysStartTracker = action.payload;
            });
    }
});

export const { clearError: clearUserError, clearCurrentUser, resetUserState } = userSlice.actions;
export default userSlice.reducer;
