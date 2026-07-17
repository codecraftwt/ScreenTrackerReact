import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Select from 'react-select';
import { useUser } from '../features/user/userHooks';
import GroupedBarChart from './GroupedBarChart';

import './Users.css';

const PAGE_SIZE = 5;
const usageTypeOptions = [
    { value: 'all', label: 'All' },
    { value: 'manual', label: 'Manual' },
    { value: 'automatic', label: 'Automatic' }
];
const refreshIntervalOptions = [
    { value: 0, label: 'Off' },
    { value: 10, label: '10s' },
    { value: 20, label: '20s' },
    { value: 30, label: '30s' }
];
const DASHBOARD_SELECTION_KEY_PREFIX = 'dashboard-selected-user';

const emptyAggregate = { totalDurationMinutes: 0, activeDurationMinutes: 0, afkDurationMinutes: 0 };

const toLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const dateKey = (value) => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value).slice(0, 10);
    }

    return toLocalDateInputValue(date);
};

const localDayRange = (dateValue) => {
    const [year, month, day] = dateKey(dateValue).split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
    return { start, end };
};

const isWithinLocalDay = (timestamp, dateValue) => {
    if (!timestamp) return false;
    const time = new Date(timestamp);
    if (Number.isNaN(time.getTime())) return false;

    const { start, end } = localDayRange(dateValue);
    return time >= start && time < end;
};

const numberValue = (value) => Number(value ?? 0) || 0;

const valueOf = (entity, ...keys) => {
    for (const key of keys) {
        if (entity?.[key] !== undefined && entity?.[key] !== null) {
            return entity[key];
        }
    }
    return undefined;
};

const getEntityId = (entity) => Number(valueOf(entity, 'id', 'Id')) || 0;

const getEntityUsername = (entity) => valueOf(entity, 'username', 'Username', 'name', 'Name') || '';

const matchesUsageType = (entity, usageType) => {
    if (usageType === 'all') return true;

    const startMode = valueOf(entity, 'startMode', 'StartMode', 'usageType', 'UsageType');
    return typeof startMode === 'string' && startMode.toLowerCase() === usageType;
};

const getDashboardSelectionKey = (authUser) => {
    if (!authUser) return '';
    return `${DASHBOARD_SELECTION_KEY_PREFIX}:${String(authUser.role || '').toLowerCase()}:${authUser.id || 0}`;
};

const readDashboardSelection = (authUser) => {
    const key = getDashboardSelectionKey(authUser);
    if (!key) return null;

    try {
        return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
        return null;
    }
};

const saveDashboardSelection = (authUser, selection) => {
    const key = getDashboardSelectionKey(authUser);
    if (!key) return;

    localStorage.setItem(key, JSON.stringify({
        selectedAdminUsername: selection.selectedAdminUsername || '',
        selectedUserId: Number(selection.selectedUserId) || 0,
        selectedUsername: selection.selectedUsername || ''
    }));
};

const arrayValue = (value) => {
    if (Array.isArray(value)) return value;

    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.Items)) return value.Items;

    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.Data)) return value.Data;

    if (Array.isArray(value?.result)) return value.result;
    if (Array.isArray(value?.Result)) return value.Result;

    if (Array.isArray(value?.appTitles)) return value.appTitles;
    if (Array.isArray(value?.AppTitles)) return value.AppTitles;

    if (Array.isArray(value?.users)) return value.users;
    if (Array.isArray(value?.Users)) return value.Users;

    if (Array.isArray(value?.$values)) return value.$values;
    if (Array.isArray(value?.data?.$values)) return value.data.$values;

    return [];
};
const settledValue = (result, fallback) => (result.status === 'fulfilled' ? result.value : fallback);

const minutesFromTime = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const text = String(value).replaceAll('"', '');
    const parts = text.split(':').map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return 0;
    return (parts[0] * 60) + parts[1] + (parts[2] / 60);
};

const formatDuration = (minutes) => {
    const totalSeconds = Math.round(Math.max(0, numberValue(minutes)) * 60);

    const hours = Math.floor(totalSeconds / 3600);
    const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}h ${remainingMinutes}m ${seconds}s`;
};

const formatTimeOfDay = (dateValue) => {
    if (!dateValue) return 'No entry today';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'No entry today';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatTrackedDate = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const formatCalendarDate = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const dynamicColor = (key = '') => {
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash |= 0;
    }

    const r = 160 + (Math.abs(hash) & 0x3f) % 61;
    const g = 160 + ((Math.abs(hash) >> 6) & 0x3f) % 61;
    const b = 160 + ((Math.abs(hash) >> 12) & 0x3f) % 61;
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
};

const getAppIconClass = (appName = '') => {
    const normalizedName = appName.toLowerCase();
    if (normalizedName.includes('chrome')) return 'fab fa-chrome';
    if (normalizedName.includes('edge')) return 'fab fa-edge';
    if (normalizedName.includes('firefox')) return 'fab fa-firefox';
    if (normalizedName.includes('teams')) return 'fas fa-users';
    if (normalizedName.includes('outlook') || normalizedName.includes('mail')) return 'fas fa-envelope-open-text';
    if (normalizedName.includes('word') || normalizedName.includes('excel') || normalizedName.includes('powerpoint')) return 'fab fa-microsoft';
    if (normalizedName.includes('visual studio')) return 'fas fa-code';
    if (normalizedName.includes('code') || normalizedName.includes('vscode')) return 'fas fa-terminal';
    if (normalizedName.includes('slack')) return 'fab fa-slack';
    if (normalizedName.includes('zoom')) return 'fas fa-video';
    if (normalizedName.includes('reader') || normalizedName.includes('pdf')) return 'fas fa-file-pdf';
    if (normalizedName.includes('spotify') || normalizedName.includes('music')) return 'fab fa-spotify';
    if (normalizedName.includes('settings')) return 'fas fa-cog';
    if (normalizedName.includes('file explorer') || normalizedName.includes('explorer')) return 'fas fa-folder-open';
    if (normalizedName.includes('snipping') || normalizedName.includes('snip')) return 'fas fa-cut';
    if (normalizedName.includes('anydesk')) return 'fas fa-link';
    if (normalizedName.includes('photos')) return 'fas fa-image';
    if (normalizedName.includes('notepad')) return 'fas fa-file-alt';
    if (normalizedName.includes('calculator')) return 'fas fa-calculator';
    return 'fas fa-desktop';
};

const getAppIconUrl = (appName = '') => {
    const normalizedName = appName.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
    return normalizedName ? `/app-icons/${normalizedName}.png` : '';
};

const getAppIconUrls = (appName = '') => {
    const normalizedName = appName.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
    const compactName = appName.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '');
    return Array.from(new Set([normalizedName, compactName].filter(Boolean).map((name) => `/app-icons/${name}.png`)));
};

const normalizeChartData = (item) => ({
    date: dateKey(valueOf(item, 'date', 'Date')),
    total: numberValue(valueOf(item, 'totalDurationInMinutes', 'TotalDurationInMinutes', 'totalMinutes', 'TotalMinutes', 'duration', 'Duration')),
    afk: numberValue(valueOf(item, 'afkDurationInMinutes', 'AfkDurationInMinutes', 'afkMinutes', 'AfkMinutes')) || minutesFromTime(valueOf(item, 'afkTime', 'AfkTime')),
    active: numberValue(valueOf(item, 'activeDurationInMinutes', 'ActiveDurationInMinutes', 'activeMinutes', 'ActiveMinutes')) || minutesFromTime(valueOf(item, 'activeTime', 'ActiveTime'))
});

const applyDailyTotalsToChart = (chartRows, selectedDate, selectedAggregate, dailyTotalsByDate = {}) => {
    const selectedKey = dateKey(selectedDate);

    return chartRows.map((row) => {
        const rowKey = dateKey(row.date);
        const isSelectedDay = rowKey === selectedKey;
        const dayTotals = dailyTotalsByDate[rowKey];
        const source = isSelectedDay ? selectedAggregate : dayTotals;

        if (!source) {
            return {
                ...row,
                date: rowKey
            };
        }

        const afk = numberValue(source.afkDurationMinutes);
        const total = Math.max(numberValue(source.totalDurationMinutes), afk);
        const active = numberValue(source.activeDurationMinutes) > 0
            ? numberValue(source.activeDurationMinutes)
            : Math.max(0, total - afk);

        return {
            ...row,
            date: rowKey,
            total,
            afk,
            active
        };
    });
};

const Users = () => {
    const navigate = useNavigate();
    const authUser = useSelector((state) => state.auth.currentUser || state.auth.user);

const {
    getUserById,
    getAllUsersByAdmin,
    getAppTitleByUserId,
    getUserLoginTimeFormatted,
    getDailyTrackerAggregate,
    startDailyTracker,
    endDailyTracker,
    getAfkLogsTotal,
    getAppUsageData,
    getAppUsageByUserId,
    getAppTitleDetails,
    getDayUsageCount,
    getTodaysStartTracker,
    sendTokenToWorker,
    getCategoryByAppName,
    getGroupedCategoryKeywords,
    addAfkLog,
    currentUser
} = useUser();

    const [admins, setAdmins] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedAdminUsername, setSelectedAdminUsername] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(0);
    const [selectedUsername, setSelectedUsername] = useState('');
    const [selectedUsageType, setSelectedUsageType] = useState('all');
    const [selectedDate, setSelectedDate] = useState(toLocalDateInputValue());
    const [selectedInterval, setSelectedInterval] = useState(0);
    const [selectedTab, setSelectedTab] = useState('summary');
    const [selectedAppName, setSelectedAppName] = useState('');

    const [isOn, setIsOn] = useState(false);
    const [permissions, setPermissions] = useState({ manual: false, auto: false });
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [isAppUsageLoading, setIsAppUsageLoading] = useState(false);
    const [isAfkDataLoading, setIsAfkDataLoading] = useState(false);

    const [loginTime, setLoginTime] = useState('--:--');
    const [checkinTime, setCheckinTime] = useState('No entry today');
    const [trackedDate, setTrackedDate] = useState('');
    const [aggregate, setAggregate] = useState(emptyAggregate);
    const [topApps, setTopApps] = useState([]);
    const [totalActiveAppMinutes, setTotalActiveAppMinutes] = useState(0);
    const [allTopApps, setAllTopApps] = useState([]);
    const [initialTopApps, setInitialTopApps] = useState([]);
    const [currentAppUsagePage, setCurrentAppUsagePage] = useState(1);
    const [totalAppUsageRecords, setTotalAppUsageRecords] = useState(0);
    const [moreAppUsageAvailable, setMoreAppUsageAvailable] = useState(false);
    const [isFallbackAppUsage, setIsFallbackAppUsage] = useState(false);
    const [allAppTitleRows, setAllAppTitleRows] = useState([]);
    const [windowTitles, setWindowTitles] = useState([]);
    const [allWindowTitles, setAllWindowTitles] = useState([]);
    const [initialWindowTitles, setInitialWindowTitles] = useState([]);
    const [currentTitlePage, setCurrentTitlePage] = useState(1);
    const [totalAppTitleRecords, setTotalAppTitleRecords] = useState(0);
    const [moreTitlesAvailable, setMoreTitlesAvailable] = useState(false);
    const [customTooltip, setCustomTooltip] = useState(null);
    const [categories, setCategories] = useState([]);
    const [chartLabels, setChartLabels] = useState([]);
    const [totalData, setTotalData] = useState([]);
    const [afkData, setAfkData] = useState([]);
    const [activeData, setActiveData] = useState([]);
    const [themeVersion, setThemeVersion] = useState(0);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date(selectedDate));
    const calendarRef = useRef(null);
    const selectedUserDataRequestRef = useRef(0);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setThemeVersion((v) => v + 1);
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const [profileIsDarkTheme, setProfileIsDarkTheme] = useState(() => {
        const saved = localStorage.getItem('hs-theme') || 'system';
        if (saved === 'dark') return true;
        if (saved === 'light') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    const onProfileThemeToggle = () => {
        const newDark = !profileIsDarkTheme;
        setProfileIsDarkTheme(newDark);
        if (newDark) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        localStorage.setItem('hs-theme', newDark ? 'dark' : 'light');
    };

    const isAdmin = authUser?.role === 'admin' || authUser?.role === 'superadmin';
    const isSuperAdmin = authUser?.role === 'superadmin';

    const shouldShowTrackingButton = useMemo(() => {
        if (!authUser || authUser.role === 'superadmin') return false;
        if (!selectedUserId || selectedUserId !== authUser.id) return false;
        if (permissions.manual && !permissions.auto) return true;
        if (!permissions.manual && permissions.auto) return false;
        if (permissions.manual && permissions.auto) return true;
        return false;
    }, [authUser, permissions, selectedUserId]);

    const loadTrackingPermissions = async (userId) => {
        const result = await getUserById(userId);
        const manual = Boolean(result?.isManualTrackingEnabled ?? result?.IsManualTrackingEnabled);
        const auto = Boolean(result?.isAutoTrackingEnabled ?? result?.IsAutoTrackingEnabled);
        const savedIsOn = localStorage.getItem('IsOnState') === 'true';
        const nextPermissions = { manual, auto };

        setPermissions(nextPermissions);
        setIsOn(manual ? savedIsOn : false);

        return nextPermissions;
    };

    const recalculateAppPercents = (apps) => {
        const totalMinutes = apps.reduce((sum, app) => sum + app.duration, 0);
        return apps.map((app) => ({
            ...app,
            percent: totalMinutes > 0 ? (app.duration / totalMinutes) * 100 : 0
        }));
    };

    const recalculateTitlePercents = (titles) => {
        const totalMinutes = titles.reduce((sum, title) => sum + title.duration, 0);
        return titles.map((title) => ({
            ...title,
            percent: totalMinutes > 0 ? (title.duration / totalMinutes) * 100 : 0
        }));
    };

    const getTitlesMatchingTopAppDuration = (titles, topAppDuration) => {
        if (!titles?.length || topAppDuration <= 0) {
            return [];
        }

        const groupedTitles = Object.values(titles.reduce((acc, item) => {
            const title = valueOf(item, 'title', 'Title') || 'Unknown / No Window Title';
            const duration = numberValue(valueOf(item, 'durationInMinutes', 'DurationInMinutes'));

            if (duration <= 0) {
                return acc;
            }

            if (!acc[title]) {
                acc[title] = {
                    title,
                    duration: 0,
                    color: dynamicColor(title)
                };
            }

            acc[title].duration += duration;
            return acc;
        }, {}))
            .filter((title) => title.duration > 0)
            .sort((a, b) => b.duration - a.duration);

        const titlesTotal = groupedTitles.reduce((sum, title) => sum + title.duration, 0);
        if (titlesTotal <= 0) {
            return [];
        }

        const targetTotalSeconds = Math.round(topAppDuration * 60);
        const scaledTitles = groupedTitles.map((title) => {
            const scaledSeconds = (title.duration / titlesTotal) * targetTotalSeconds;
            const floorSeconds = Math.floor(scaledSeconds);

            return {
                ...title,
                floorSeconds,
                remainder: scaledSeconds - floorSeconds
            };
        });

        const usedSeconds = scaledTitles.reduce((sum, title) => sum + title.floorSeconds, 0);
        const remainingSeconds = targetTotalSeconds - usedSeconds;

        return scaledTitles
            .sort((a, b) => b.remainder - a.remainder)
            .map((title, index) => ({
                title: title.title,
                duration: (title.floorSeconds + (index < remainingSeconds ? 1 : 0)) / 60,
                percent: 0,
                color: title.color
            }))
            .filter((title) => Math.round(title.duration * 60) > 0)
            .sort((a, b) => b.duration - a.duration);
    };

    const loadSelectedUserData = async (userId, date, usageType, role) => {
        if (!userId) return;

        const requestId = ++selectedUserDataRequestRef.current;

        setIsChartLoading(true);
        setIsAppUsageLoading(true);
        setIsAfkDataLoading(true);

        try {
        const results = await Promise.allSettled([
    getUserLoginTimeFormatted(userId),
    getDailyTrackerAggregate({ userId, date, startMode: usageType }),
    getAppUsageData({ id: userId, usageType, userRole: role }),

    // First page for Top Applications UI
    getAppUsageByUserId({ userId, date, page: 1, take: PAGE_SIZE, usageType, userRole: role }),

    // Count for Show More
    getDayUsageCount({ date, userId, usageType }),

    // All Top Applications records for exact Active Time calculation
    getAppUsageByUserId({ userId, date, page: 1, take: 2147483647, usageType, userRole: role }),

    getAfkLogsTotal({ userId, date, userRole: role, startMode: usageType }),
    getAppTitleByUserId(userId),
    getGroupedCategoryKeywords({ id: userId, date, page: 1, take: PAGE_SIZE }),
    getTodaysStartTracker(userId)
]);

         const [
    loginResult,
    aggregateResult,
    chartResult,
    appUsageResult,
    usageCountResult,
    allAppUsageResult,
    afkTotalResult,
    appTitlesResult,
    categoriesResult,
    startTrackerResult
] = [
    settledValue(results[0], null),
    settledValue(results[1], emptyAggregate),
    settledValue(results[2], []),
    settledValue(results[3], []),
    settledValue(results[4], 0),
    settledValue(results[5], []),
    settledValue(results[6], 0),
    settledValue(results[7], []),
    settledValue(results[8], []),
    settledValue(results[9], null)
];

            const login = loginResult || '--:--';
            const aggregateResponse = aggregateResult || emptyAggregate;
            const chartResponse = arrayValue(chartResult);

            const appUsageResponse = arrayValue(appUsageResult);
            const usageCount = usageCountResult || 0;
            const allAppUsageResponse = arrayValue(allAppUsageResult);
            const selectedDayTitleRows = arrayValue(appTitlesResult).filter((item) => {
                const start = valueOf(item, 'startTime', 'StartTime');
                return isWithinLocalDay(start, date) && matchesUsageType(item, usageType);
            });

            const historicalAppUsage = Object.values(
                selectedDayTitleRows.reduce((acc, item) => {
                    const appName = valueOf(item, 'appName', 'AppName') ?? 'Unknown';
                    const duration = numberValue(valueOf(
                        item,
                        'durationInMinutes',
                        'DurationInMinutes',
                        'totalDurationInMinutes',
                        'TotalDurationInMinutes'
                    ));

                    if (!acc[appName]) {
                        acc[appName] = {
                            appName,
                            durationInMinutes: 0
                        };
                    }

                    acc[appName].durationInMinutes += duration;
                    return acc;
                }, {})
            );
            const appSourceRows = appUsageResponse.length > 0 ? appUsageResponse : historicalAppUsage;
            const appUsageCount = appUsageResponse.length > 0 ? numberValue(usageCount) : historicalAppUsage.length;
            const usingFallbackAppUsage = appUsageResponse.length === 0 && historicalAppUsage.length > 0;

            const aggregateAfkMinutes = numberValue(valueOf(aggregateResponse, 'afkDurationMinutes', 'AfkDurationMinutes'));
            const afkTotalMinutes = Math.max(numberValue(afkTotalResult), aggregateAfkMinutes);
            const startTracker = startTrackerResult || null;

            const normalizedAggregate = {
                totalDurationMinutes: numberValue(valueOf(aggregateResponse, 'totalDurationMinutes', 'TotalDurationMinutes')),
                activeDurationMinutes: numberValue(valueOf(aggregateResponse, 'activeDurationMinutes', 'ActiveDurationMinutes')),
                afkDurationMinutes: afkTotalMinutes
            };
            if (normalizedAggregate.totalDurationMinutes <= 0 && appUsageResponse.length > 0) {
                normalizedAggregate.totalDurationMinutes = appUsageResponse.reduce((sum, app) => (
                    sum + numberValue(valueOf(app, 'durationInMinutes', 'DurationInMinutes'))
                ), 0);
            }
            if (normalizedAggregate.totalDurationMinutes < normalizedAggregate.afkDurationMinutes) {
                normalizedAggregate.totalDurationMinutes = normalizedAggregate.afkDurationMinutes;
            }
            if (normalizedAggregate.activeDurationMinutes <= 0) {
                normalizedAggregate.activeDurationMinutes = Math.max(0, normalizedAggregate.totalDurationMinutes - normalizedAggregate.afkDurationMinutes);
            }

            const chartRows = chartResponse.map(normalizeChartData);
            const chartDates = Array.from(new Set(chartRows.map((row) => row.date).filter(Boolean)));
            const dailyTotalsByDate = {};
            const dailyTotals = await Promise.allSettled(
                chartDates.map((chartDate) => (
                    chartDate === dateKey(date)
                        ? Promise.resolve(normalizedAggregate)
                        : Promise.allSettled([
                            getDailyTrackerAggregate({ userId, date: chartDate, startMode: usageType }),
                            getAfkLogsTotal({ userId, date: chartDate, userRole: role, startMode: usageType })
                        ]).then(([dayAggregateResult, dayAfkResult]) => {
                            const dayAggregateResponse = settledValue(dayAggregateResult, emptyAggregate) || emptyAggregate;
                            const dayAfkMinutes = numberValue(settledValue(dayAfkResult, 0));
                            const totalDurationMinutes = numberValue(valueOf(dayAggregateResponse, 'totalDurationMinutes', 'TotalDurationMinutes'));
                            const aggregateActiveMinutes = numberValue(valueOf(dayAggregateResponse, 'activeDurationMinutes', 'ActiveDurationMinutes'));
                            const afkDurationMinutes = Math.max(
                                numberValue(valueOf(dayAggregateResponse, 'afkDurationMinutes', 'AfkDurationMinutes')),
                                dayAfkMinutes
                            );

                            return {
                                totalDurationMinutes: Math.max(totalDurationMinutes, afkDurationMinutes),
                                afkDurationMinutes,
                                activeDurationMinutes: aggregateActiveMinutes > 0
                                    ? aggregateActiveMinutes
                                    : Math.max(0, totalDurationMinutes - afkDurationMinutes)
                            };
                        })
                ))
            );

            chartDates.forEach((chartDate, index) => {
                dailyTotalsByDate[chartDate] = settledValue(dailyTotals[index], null);
            });

            if (requestId !== selectedUserDataRequestRef.current) return;

            const normalizedChart = applyDailyTotalsToChart(
                chartRows,
                date,
                normalizedAggregate,
                dailyTotalsByDate
            );

            const appRows = appSourceRows
                .map((app) => {
                    const appName = valueOf(app, 'appName', 'AppName') ?? 'Unknown';
                    const duration = numberValue(valueOf(
                        app,
                        'durationInMinutes',
                        'DurationInMinutes',
                        'totalDurationInMinutes',
                        'TotalDurationInMinutes'
                    ));

                    return {
                        name: appName,
                        duration,
                        percent: 0,
                        color: dynamicColor(appName),
                        iconUrl: getAppIconUrl(appName),
                        iconUrls: getAppIconUrls(appName),
                        iconClass: getAppIconClass(appName)
                    };
                })
                .sort((a, b) => b.duration - a.duration);

       const allAppRowsForTotal = allAppUsageResponse.length > 0
    ? allAppUsageResponse
    : appUsageResponse.length > 0
        ? appUsageResponse
        : historicalAppUsage;
const activeAppMinutes = allAppRowsForTotal.reduce((sum, app) => {
    return sum + numberValue(valueOf(
        app,
        'durationInMinutes',
        'DurationInMinutes',
        'totalDurationInMinutes',
        'TotalDurationInMinutes'
    ));
}, 0);

setTotalActiveAppMinutes(activeAppMinutes);

            const initialApps = recalculateAppPercents(appRows.slice(0, PAGE_SIZE));
            setLoginTime(login || '--:--');
            const hasSelectedModeData = normalizedAggregate.totalDurationMinutes > 0
                || normalizedAggregate.activeDurationMinutes > 0
                || normalizedAggregate.afkDurationMinutes > 0
                || activeAppMinutes > 0;
            const isTodaySelected = dateKey(date) === toLocalDateInputValue();

            setCheckinTime(
                isTodaySelected && hasSelectedModeData
                    ? formatTimeOfDay(startTracker)
                    : 'No entry today'
            );
            setTrackedDate(formatTrackedDate(startTracker));
            setAggregate(normalizedAggregate);
            setChartLabels(cardAlignedChart.map((x) => x.date));
            setTotalData(cardAlignedChart.map((x) => x.total));
            setAfkData(cardAlignedChart.map((x) => x.afk));
            setActiveData(cardAlignedChart.map((x) => x.active));
            setAllTopApps(appRows);
            setTopApps(initialApps);
            setInitialTopApps(initialApps);
            setCurrentAppUsagePage(1);
            setTotalAppUsageRecords(appUsageCount);
            setIsFallbackAppUsage(usingFallbackAppUsage);
            setMoreAppUsageAvailable(appRows.length > PAGE_SIZE || (appUsageResponse.length > 0 && initialApps.length < appUsageCount));
            setSelectedAppName('');
            setAllAppTitleRows(selectedDayTitleRows);
            setWindowTitles([]);
            setAllWindowTitles([]);
            setInitialWindowTitles([]);
            setCurrentTitlePage(1);
            setTotalAppTitleRecords(0);
            setMoreTitlesAvailable(false);
            setCategories(arrayValue(categoriesResult).map((category) => {
                const name = valueOf(category, 'category', 'Category') ?? 'Uncategorized';
                const duration = numberValue(valueOf(category, 'totalDurationInMinutes', 'TotalDurationInMinutes', 'durationInMinutes', 'DurationInMinutes'));
                return {
                    category: name,
                    duration,
                    percent: 100,
                    color: dynamicColor(name)
                };
            }));
        } finally {
            if (requestId === selectedUserDataRequestRef.current) {
                setIsChartLoading(false);
                setIsAppUsageLoading(false);
                setIsAfkDataLoading(false);
            }
        }
    };
useEffect(() => {
    if (!authUser) {
        navigate('/login');
        return;
    }

    const initializeDailyTracker = async () => {
        setLoginTime(authUser.loginTime || '--:--');

        if (authUser.role !== 'admin' && authUser.role !== 'superadmin') {
            setSelectedUserId(authUser.id);
            setSelectedUsername(authUser.name);
            saveDashboardSelection(authUser, {
                selectedUserId: authUser.id,
                selectedUsername: authUser.name
            });
        }

        await loadTrackingPermissions(authUser.id);

        // Auto-start tracking if the UI would show tracking as ON
        // This matches the same logic used in loadTrackingPermissions
        const shouldAutoStart = (permissions.manual && !permissions.auto) || localStorage.getItem('IsOnState') === 'true';
        if (authUser.role !== 'superadmin' && shouldAutoStart) {
            await startDailyTracker({
                userId: authUser.id,
                startMode: 'automatic'
            });
        }
    };

    initializeDailyTracker();
}, [authUser, navigate]);
useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
        console.error("authToken not found");
        return;
    }

    sendTokenToWorker()
        .then(() => console.log("JWT token sent to worker"))
        .catch((error) => console.error("Failed to send token to worker:", error));
}, [sendTokenToWorker]);

    useEffect(() => {
        const loadRoleLists = async () => {
            if (!authUser) return;

            if (authUser.role === 'superadmin') {
                const adminResult = await getAllUsersByAdmin({ adminId: authUser.id, role: 'ad' });
                const adminList = (adminResult || []).filter((user) => user.role?.toLowerCase() !== 'superadmin');
                const persistedSelection = readDashboardSelection(authUser);
                const persistedAdminUsername = persistedSelection?.selectedAdminUsername || '';
                const hasPersistedAdmin = adminList.some((admin) => getEntityUsername(admin) === persistedAdminUsername);

                setAdmins(adminList);
                setUsers([]);
                setSelectedAdminUsername(hasPersistedAdmin ? persistedAdminUsername : '');

                if (!hasPersistedAdmin) {
                    setSelectedUserId(0);
                    setSelectedUsername('');
                    saveDashboardSelection(authUser, {});
                }
            } else if (authUser.role === 'admin') {
                const [userList, currentUserResult] = await Promise.all([
                    getAllUsersByAdmin({ adminId: authUser.id, role: authUser.role }),
                    getUserById(authUser.id)
                ]);
                const mergedUsers = [currentUserResult || currentUser, ...(userList || [])].filter(Boolean);
                const uniqueUsers = Array.from(new Map(mergedUsers.map((user) => [getEntityId(user), user])).values());
                const persistedSelection = readDashboardSelection(authUser);
                const persistedUserId = Number(persistedSelection?.selectedUserId) || 0;
                const restoredUser = uniqueUsers.find((user) => getEntityId(user) === persistedUserId);
                const fallbackUser = uniqueUsers.find((user) => getEntityId(user) === Number(authUser.id)) || uniqueUsers[0];
                const nextUser = restoredUser || fallbackUser;
                const nextUserId = getEntityId(nextUser);
                const nextUsername = getEntityUsername(nextUser) || authUser.name || '';

                setUsers(uniqueUsers);
                setSelectedUserId(nextUserId);
                setSelectedUsername(nextUsername);
                saveDashboardSelection(authUser, {
                    selectedUserId: nextUserId,
                    selectedUsername: nextUsername
                });
            }
        };

        loadRoleLists();
    }, [authUser]);




    useEffect(() => {
        const loadUsersForAdmin = async () => {
            if (!selectedAdminUsername) return;
            const selectedAdmin = admins.find((admin) => getEntityUsername(admin) === selectedAdminUsername);
            if (!selectedAdmin) return;
            const userList = await getAllUsersByAdmin({ adminId: getEntityId(selectedAdmin), role: 'admin' });
            const nextUsers = userList || [];
            const persistedSelection = readDashboardSelection(authUser);
            const persistedUserId = Number(persistedSelection?.selectedUserId) || 0;
            const persistedUser = persistedSelection?.selectedAdminUsername === selectedAdminUsername
                ? nextUsers.find((user) => getEntityId(user) === persistedUserId)
                : null;
            const nextUserId = getEntityId(persistedUser);
            const nextUsername = getEntityUsername(persistedUser);

            setUsers(nextUsers);
            setSelectedUserId(nextUserId);
            setSelectedUsername(nextUsername);
            setSelectedAppName('');

            saveDashboardSelection(authUser, {
                selectedAdminUsername,
                selectedUserId: nextUserId,
                selectedUsername: nextUsername
            });
        };

        loadUsersForAdmin();
    }, [selectedAdminUsername, admins, authUser, getAllUsersByAdmin]);

    useEffect(() => {
        if (!authUser || !selectedUserId) return;
        loadSelectedUserData(selectedUserId, selectedDate, selectedUsageType, authUser.role);
    }, [authUser, selectedDate, selectedUsageType, selectedUserId]);

    useEffect(() => {
        if (!selectedInterval || !selectedUserId || !authUser) return undefined;

        const timer = window.setInterval(() => {
            loadSelectedUserData(selectedUserId, selectedDate, selectedUsageType, authUser.role);
        }, selectedInterval * 1000);

        return () => window.clearInterval(timer);
    }, [authUser, selectedDate, selectedInterval, selectedUsageType, selectedUserId]);

   useEffect(() => {
    const loadAppDetails = async () => {
        if (!selectedUserId) return;
        if (!selectedAppName) {
            setWindowTitles([]);
            setAllWindowTitles([]);
            setInitialWindowTitles([]);
            setCurrentTitlePage(1);
            setTotalAppTitleRecords(0);
            setMoreTitlesAvailable(false);
            setCategories([]);
            return;
        }

        const [groupedCategoriesResult, titleDetailsResult] = await Promise.all([
            getCategoryByAppName(selectedAppName),
            getAppTitleDetails({
                date: selectedDate,
                userId: selectedUserId,
                appName: selectedAppName,
                page: 1,
                take: 2147483647
            })
        ]);

        const fallbackSelectedAppTitles = allAppTitleRows.filter((title) => {
            const appName = valueOf(title, 'appName', 'AppName') ?? '';
            return appName.toLowerCase() === selectedAppName.toLowerCase();
        });

        const titleRows = arrayValue(titleDetailsResult).filter((title) => (
            matchesUsageType(title, selectedUsageType)
        ));
        const selectedAppTitles = titleRows.length > 0 ? titleRows : fallbackSelectedAppTitles;
        const selectedApp = allTopApps.find(
            (app) => app.name?.toLowerCase() === selectedAppName.toLowerCase()
        );
        const topAppDuration = selectedApp
            ? selectedApp.duration
            : selectedAppTitles.reduce((sum, item) => (
                sum + numberValue(valueOf(item, 'durationInMinutes', 'DurationInMinutes'))
            ), 0);
        const finalTitles = getTitlesMatchingTopAppDuration(selectedAppTitles, topAppDuration);
        
        
        const appCategories = arrayValue(groupedCategoriesResult);

        // const allTitles = recalculateTitlePercents(groupedTitles);
        // const initialTitles = recalculateTitlePercents(groupedTitles.slice(0, PAGE_SIZE));

        const allTitles = recalculateTitlePercents(finalTitles);
        const initialTitles = recalculateTitlePercents(finalTitles.slice(0, PAGE_SIZE));

        setAllWindowTitles(allTitles);
        setWindowTitles(initialTitles);
        setInitialWindowTitles(initialTitles);
        setCurrentTitlePage(1);
        setTotalAppTitleRecords(allTitles.length);
        setMoreTitlesAvailable(allTitles.length > PAGE_SIZE);

        setCategories(appCategories.map((category) => {
            const name = valueOf(category, 'category', 'Category') ?? 'Uncategorized';
            const duration = numberValue(valueOf(
                category,
                'totalDurationInMinutes',
                'TotalDurationInMinutes',
                'durationInMinutes',
                'DurationInMinutes'
            ));

            return {
                category: name,
                duration,
                percent: 100,
                color: dynamicColor(name)
            };
        }));
    };

    loadAppDetails();
}, [
    selectedAppName,
    selectedDate,
    selectedUsageType,
    selectedUsageType,
    selectedUserId,
    allAppTitleRows,
    allTopApps,
    getCategoryByAppName,
    getAppTitleDetails
]);

    const trackedDateSet = useMemo(() => {
        const set = new Set();
        chartLabels.forEach((label, index) => {
            if (label && (totalData[index] > 0 || activeData[index] > 0)) {
                set.add(label);
            }
        });
        return set;
    }, [chartLabels, totalData, activeData]);

    const calendarDays = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstOfMonth = new Date(year, month, 1);
        const startDate = new Date(year, month, 1 - firstOfMonth.getDay());

        return Array.from({ length: 42 }, (_, index) => {
            const current = new Date(startDate);
            current.setDate(startDate.getDate() + index);
            const value = formatCalendarDate(current);

            return {
                date: current,
                value,
                day: current.getDate(),
                isCurrentMonth: current.getMonth() === month,
                isSelected: value === selectedDate,
                hasTracking: trackedDateSet.has(value),
                isFuture: value > new Date().toISOString().split('T')[0]
            };
        });
    }, [calendarMonth, selectedDate, trackedDateSet]);

    useEffect(() => {
        if (!isCalendarOpen) return undefined;

        const handleOutsideClick = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setIsCalendarOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isCalendarOpen]);

    const handleDateChange = (value) => {
        setSelectedDate(value);
        setCalendarMonth(new Date(value));
        setIsCalendarOpen(false);
    };

    const handleAdminChange = (e) => {
        const nextAdminUsername = e.target.value;
        setSelectedAdminUsername(nextAdminUsername);
        setSelectedUserId(0);
        setSelectedUsername('');
        setSelectedAppName('');
        saveDashboardSelection(authUser, {
            selectedAdminUsername: nextAdminUsername
        });
    };

    const handleUserChange = (e) => {
        const nextUserId = Number(e.target.value) || 0;
        const nextUser = users.find((user) => getEntityId(user) === nextUserId);
        const nextUsername = getEntityUsername(nextUser);
        setSelectedUserId(nextUserId);
        setSelectedUsername(nextUsername);
        setSelectedAppName('');
        saveDashboardSelection(authUser, {
            selectedAdminUsername,
            selectedUserId: nextUserId,
            selectedUsername: nextUsername
        });
    };

    const handleRefresh = () => {
        if (!authUser || !selectedUserId) return;
        loadSelectedUserData(selectedUserId, selectedDate, selectedUsageType, authUser.role);
    };

    const loadMoreAppUsage = async () => {
        if (!selectedUserId || !authUser || !moreAppUsageAvailable) return;

        if (isFallbackAppUsage) {
            const nextCount = Math.min(topApps.length + PAGE_SIZE, allTopApps.length);
            const nextApps = recalculateAppPercents(allTopApps.slice(0, nextCount));

            setTopApps(nextApps);
            setCurrentAppUsagePage(Math.ceil(nextCount / PAGE_SIZE));
            setMoreAppUsageAvailable(nextCount < allTopApps.length);
            return;
        }

        const nextPage = currentAppUsagePage + 1;
        const moreResult = await getAppUsageByUserId({
            userId: selectedUserId,
            date: selectedDate,
            page: nextPage,
            take: PAGE_SIZE,
            usageType: selectedUsageType,
            userRole: authUser.role
        });

        const more = moreResult || [];

        if (!more?.length) {
            setMoreAppUsageAvailable(false);
            return;
        }

        const newApps = more.map((app) => {
            const appName = valueOf(app, 'appName', 'AppName') ?? 'Unknown';
            const duration = numberValue(valueOf(app, 'durationInMinutes', 'DurationInMinutes'));
            return {
                name: appName,
                duration,
                percent: 0,
                color: dynamicColor(appName),
                iconUrl: getAppIconUrl(appName),
                iconUrls: getAppIconUrls(appName),
                iconClass: getAppIconClass(appName)
            };
        });

        const allApps = [...topApps, ...newApps].sort((a, b) => b.duration - a.duration);
        const totalMinutes = allApps.reduce((sum, app) => sum + app.duration, 0);
        const recalculatedApps = allApps.map((app) => ({
            ...app,
            percent: totalMinutes > 0 ? (app.duration / totalMinutes) * 100 : 0
        }));

        setAllTopApps(recalculatedApps);
        setTopApps(recalculatedApps);
        setCurrentAppUsagePage(nextPage);
        setMoreAppUsageAvailable(recalculatedApps.length < totalAppUsageRecords);
    };

    const showLessAppUsage = () => {
        setTopApps(initialTopApps);
        setCurrentAppUsagePage(1);
        setMoreAppUsageAvailable(isFallbackAppUsage ? allTopApps.length > PAGE_SIZE : initialTopApps.length < totalAppUsageRecords);
    };

    const loadMoreTitles = async () => {
        if (!selectedUserId || !selectedAppName || !moreTitlesAvailable) return;

        const nextCount = Math.min(windowTitles.length + PAGE_SIZE, allWindowTitles.length);
        const recalculatedTitles = recalculateTitlePercents(allWindowTitles.slice(0, nextCount));

        setWindowTitles(recalculatedTitles);
        setCurrentTitlePage(Math.ceil(nextCount / PAGE_SIZE));
        setMoreTitlesAvailable(nextCount < totalAppTitleRecords);
    };

    const showLessTitles = () => {
        setWindowTitles(initialWindowTitles);
        setCurrentTitlePage(1);
        setMoreTitlesAvailable(allWindowTitles.length > PAGE_SIZE);
    };

    const showCustomTooltip = (event, text) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setCustomTooltip({
            text,
            top: rect.top - 12,
            left: rect.left + (rect.width / 2)
        });
    };

    const hideCustomTooltip = () => {
        setCustomTooltip(null);
    };

    const handleTrackingToggle = async () => {
        if (!selectedUserId || authUser?.role === 'superadmin') return;

        const nextValue = !isOn;

        try {
            if (permissions.manual && !permissions.auto) {
                if (nextValue) {
                    await startDailyTracker({ userId: selectedUserId, startMode: 'manual' });
                } else {
                    await endDailyTracker();
                }
            } else if (permissions.manual && permissions.auto) {
                await endDailyTracker();
                await startDailyTracker({
                    userId: selectedUserId,
                    startMode: nextValue ? 'manual' : 'automatic'
                });
            } else {
                return;
            }

            setIsOn(nextValue);
            localStorage.setItem('IsOnState', String(nextValue));
            await loadSelectedUserData(selectedUserId, selectedDate, selectedUsageType, authUser.role);
        } catch (error) {
            console.error('Error toggling tracking:', error);
        }
    };

    // const totalTime = formatDuration(aggregate.totalDurationMinutes);
    // const idealTime = formatDuration(aggregate.afkDurationMinutes);
    // const activeTime = formatDuration(aggregate.activeDurationMinutes || Math.max(0, aggregate.totalDurationMinutes - aggregate.afkDurationMinutes));

    const idealMinutes = numberValue(aggregate.afkDurationMinutes);

const activeTime = formatDuration(totalActiveAppMinutes);
const idealTime = formatDuration(idealMinutes);
const totalTime = formatDuration(totalActiveAppMinutes + idealMinutes);

    const maxSelectableDate = toLocalDateInputValue();
    const adminOptions = admins.map((admin) => ({ value: getEntityUsername(admin), label: getEntityUsername(admin) }));
    const userOptions = users.map((user) => ({ value: getEntityId(user), label: getEntityUsername(user) }));
    const selectedAdminOption = adminOptions.find((option) => option.value === selectedAdminUsername) || null;
    const selectedUserOption = userOptions.find((option) => Number(option.value) === Number(selectedUserId)) || null;
    const selectedUsageTypeOption = usageTypeOptions.find((option) => option.value === selectedUsageType) || usageTypeOptions[0];
    const selectedIntervalOption = refreshIntervalOptions.find((option) => option.value === Number(selectedInterval)) || refreshIntervalOptions[0];
    const trackingTooltipText = permissions.manual && permissions.auto
        ? `Switch to ${isOn ? 'automatic' : 'manual'} tracking`
        : 'Toggle manual tracking';

    return (
        <div className={`dashboard-page p-4 ${isAdmin ? 'dashboard-admin-page' : 'dashboard-user-page'}`} style={{ minHeight: '100vh' }}>
            <div className="dashboard-page-header">
                <div>
                    <p className="dashboard-eyebrow">Time and activity overview</p>
                    <h1>Dashboard</h1>
                    <p className="dashboard-subtitle">
                        {selectedUsername ? `Viewing ${selectedUsername}` : 'Select a user to view work time, activity, screenshots, and app usage.'}
                    </p>
                </div>
                <div className="dashboard-header-meta">
                    <span>{selectedDate}</span>
                    <strong>{selectedUsageTypeOption.label}</strong>
                </div>
                <div className="dashboard-first-card-actions">
                    <button
                        className="theme-toggle-single"
                        onClick={onProfileThemeToggle}
                        aria-label={profileIsDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                        data-dashboard-tooltip={profileIsDarkTheme ? 'Light theme' : 'Dark theme'}
                    >
                        <i className={`fas ${profileIsDarkTheme ? 'fa-sun' : 'fa-moon'}`}></i>
                    </button>
                </div>
            </div>

            {isAdmin && (
                <div className="selectbox">
                    {isSuperAdmin && (
                        <div className="toolbar-section">
                            <label className="label">Select Admin</label>
                            <div className="tooltip-container">
                                <Select
                                    inputId="admin-select"
                                    className="stitch-searchable-select"
                                    classNamePrefix="stitch-select"
                                    value={selectedAdminOption}
                                    onChange={(option) => handleAdminChange({ target: { value: option?.value || '' } })}
                                    options={adminOptions}
                                    placeholder="Select Admin"
                                    isClearable
                                    isSearchable
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                />
                            </div>
                        </div>
                    )}

                    {(!isSuperAdmin || users.length > 0) && (
                        <div className="toolbar-section toolbar-section-select-user">
                            <label className="label">Select User</label>
                            <div className="tooltip-container">
                                <Select
                                    inputId={isSuperAdmin ? 'user-select' : 'user-select-admin'}
                                    className="stitch-searchable-select ms-2"
                                    classNamePrefix="stitch-select"
                                    value={selectedUserOption}
                                    onChange={(option) => handleUserChange({ target: { value: option?.value || '' } })}
                                    options={userOptions}
                                    placeholder="Select User"
                                    isClearable
                                    isSearchable
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                />
                                <span className="tooltip-text tooltip-bottom">Choose a user from the list</span>
                            </div>
                        </div>
                    )}

                    {selectedUserId > 0 && (
                        <div className="toolbar-section">
                            <label className="label label-usage-type">Usage Type</label>
                            <div className="tooltip-container">
                                <Select
                                    inputId="usage-type-select"
                                    className="stitch-searchable-select ms-2"
                                    classNamePrefix="stitch-select"
                                    value={selectedUsageTypeOption}
                                    onChange={(option) => setSelectedUsageType(option?.value || 'all')}
                                    options={usageTypeOptions}
                                    isSearchable
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                />
                                <span className="tooltip-text tooltip-bottom">Filter data by usage type</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedUserId > 0 && (
                <div className="stitch-container">
                    <div className="toolbar-container grid-toolbar">
                        <div className="toolbar-left toolbar-AutoRefresh">
                            <div className="tooltip-container mr-4" ref={calendarRef}>
                                <button
                                    type="button"
                                    className="stitch-date-picker screenshots-date-picker screenshots-calendar-trigger"
                                    onClick={() => setIsCalendarOpen((value) => !value)}
                                >
                                    <span>{selectedDate}</span>
                                    <i className="fas fa-calendar-alt"></i>
                                </button>
                                {isCalendarOpen && (
                                    <div className="screenshots-calendar-popover">
                                        <div className="screenshots-calendar-header">
                                            <button
                                                type="button"
                                                className="screenshots-calendar-nav"
                                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                                aria-label="Previous month"
                                            >
                                                <i className="fas fa-chevron-left"></i>
                                            </button>
                                            <strong>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
                                            <button
                                                type="button"
                                                className="screenshots-calendar-nav"
                                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                                aria-label="Next month"
                                            >
                                                <i className="fas fa-chevron-right"></i>
                                            </button>
                                        </div>
                                        <div className="screenshots-calendar-weekdays">
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
                                                <span key={weekday}>{weekday}</span>
                                            ))}
                                        </div>
                                        <div className="screenshots-calendar-grid">
                                            {calendarDays.map((day) => (
                                                <button
                                                    type="button"
                                                    key={day.value}
                                                    className={[
                                                        'screenshots-calendar-day',
                                                        day.isCurrentMonth ? '' : 'muted',
                                                        day.isSelected ? 'selected' : '',
                                                        day.hasTracking ? 'tracked' : ''
                                                    ].filter(Boolean).join(' ')}
                                                    onClick={() => !day.isFuture && handleDateChange(day.value)}
                                                    disabled={day.isFuture}
                                                >
                                                    <span>{day.day}</span>
                                                    {day.hasTracking && <i className="tracked-dot"></i>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <span className="tooltip-text">Select a Date</span>
                            </div>

                            <div className="tooltip-container-Auto-Refresh">
                                <label className="label mr-2 label-Auto-Refresh">Auto Refresh</label>
                                <Select
                                    className="stitch-refresh-select"
                                    classNamePrefix="stitch-select"
                                    value={selectedIntervalOption}
                                    onChange={(option) => setSelectedInterval(Number(option?.value || 0))}
                                    options={refreshIntervalOptions}
                                    isSearchable
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                />
                                <span className="tooltip-text tooltip-text-Auto-Refresh">Interval to refresh</span>
                            </div>
                        </div>

                        <div className="toolbar-center">
                            {shouldShowTrackingButton && (
                                 <div className="toolbar-section toolbar-section-tracker">
                                    <label className="label">Tracking Status</label>
                                    <div className="tooltip-container">
                                        <button className={`tracking-toggle ${isOn ? 'tracking-on' : 'tracking-off'}`} onClick={handleTrackingToggle}>
                                            <span className={`tracking-indicator ${isOn ? 'tracking-active' : ''}`}></span>
                                            <span className="tracking-text">{isOn ? 'ON' : 'OFF'}</span>
                                        </button>
                                        <span className="tooltip-text tracking-tooltip-text">{trackingTooltipText}</span>
                                    </div>
                                    {isOn && trackedDate && (
                                        <div className="tracked-date-indicator">
                                            <span className="tracked-date-label">{trackedDate}</span>
                                            <span className={`tracked-dot ${isOn ? 'active' : ''}`}></span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="toolbar-right">
                            <div className="btn-group" role="group" aria-label="Toolbar Actions">
                                <div className="tooltip-container mr-2">
                                    <button className="stitch-refresh-btn btn btn-primary action-refresh" onClick={handleRefresh}>
                                        <i className="fas fa-sync-alt me-2"></i> Refresh
                                    </button>
                                    <span className="tooltip-text">Refresh page</span>
                                </div>
                                <div className="tooltip-container">
                                    <button className="stitch-refresh-btn btn btn-primary action-screen" onClick={() => {
                                        const params = new URLSearchParams({ usageType: selectedUsageType });
                                        if (selectedUserId > 0) params.set('viewedUserId', selectedUserId);
                                        navigate(`/screenshots?${params.toString()}`);
                                    }}>
                                        <i className="bi bi-camera"></i> Screen
                                    </button>
                                    <span className="tooltip-text">Screenshots</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="chart-container">
                        <div className="dashboard-grid-container">
                            <div className="login-card-item">
                                <div className="dashboard-card login-card h-100">
                                    <div className="card-header">
                                        <span className="card-icon"><i className="fas fa-sign-in-alt"></i></span>
                                        <span className="card-title">Login At</span>
                                        <span className="card-options">...</span>
                                    </div>
                                    <div className="card-body">
                                        <div className="main-value">{loginTime}</div>
                                        <div className="sub-text"><i className="fas fa-sun"></i><span>Time of Day</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="stats-grid-container">
                                {isAfkDataLoading ? (
                                    [0, 1, 2, 3].map((item) => <div key={item} className="stat-card-item"><div className="dashboard-card"></div></div>)
                                ) : (
                                    <>
                                        <div className="stat-card-item">
                                            <div className="dashboard-card dashboard-card-voilet">
                                                <div className="card-header"><span className="card-icon"><i className="fas fa-hourglass-half"></i></span><span className="card-title">Ideal Time</span><span className="card-options">...</span></div>
                                                <div className="card-body"><div className="main-value">{idealTime}</div><div className="sub-text"><i className="far fa-keyboard"></i><span>Time Away from Keyboard</span></div></div>
                                            </div>
                                        </div>
                                        <div className="stat-card-item">
                                            <div className="dashboard-card active-card dashboard-card-pink-voilet">
                                                <div className="card-header"><span className="card-icon"><i className="fas fa-running"></i></span><span className="card-title">Active Time</span><span className="card-options">...</span></div>
                                                <div className="card-body"><div className="main-value">{activeTime}</div><div className="sub-text"><i className="fas fa-bullseye"></i><span>Time On Task</span></div></div>
                                            </div>
                                        </div>
                                        <div className="stat-card-item">
                                            <div className="dashboard-card dashboard-card-voilet">
                                                <div className="card-header"><span className="card-icon"><i className="fas fa-clock"></i></span><span className="card-title">Total Time</span><span className="card-options">...</span></div>
                                                <div className="card-body"><div className="main-value">{totalTime}</div><div className="sub-text"><i className="fas fa-chart-pie"></i><span>Total Shift Duration</span></div></div>
                                            </div>
                                        </div>
                                        <div className="stat-card-item">
                                            <div className="dashboard-card dashboard-card-pink-voilet">
                                                <div className="card-header"><span className="card-icon"><i className="fas fa-sign-in-alt"></i></span><span className="card-title">Check-in Time</span><span className="card-options">...</span></div>
                                                <div className="card-body"><div className="main-value">{checkinTime}</div><div className="sub-text"><i className="far fa-calendar-alt"></i><span>Time of Day</span></div></div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <section className="dashboard-chart-panel">
                            <div className="panel-title-row">
                                <div>
                                    <h4>Activity Trend</h4>
                                    <p>Total, active, and AFK time across recent days.</p>
                                </div>
                            </div>
                            {isChartLoading ? (
                                <div className="card p-3 rounded-3 shadow-sm placeholder-glow dashboard-chart-placeholder">
                                    <h4 className="card-title"><span className="placeholder col-8"></span></h4>
                                    <p className="card-text"><span className="placeholder col-12"></span></p>
                                    <p className="card-text"><span className="placeholder col-10"></span></p>
                                    <div style={{ height: '200px' }}><span className="placeholder col-12 h-100"></span></div>
                                </div>
                            ) : (
                                <GroupedBarChart
                                    labels={chartLabels}
                                    totalData={totalData}
                                    afkData={afkData}
                                    activeData={activeData}
                                    key={`chart-${themeVersion}-${selectedUserId}-${selectedDate}-${selectedUsageType}-${chartLabels.join('|')}`}
                                />
                            )}
                        </section>
                    </div>

                    <div className="stitch-tabs">
                        <div className={`stitch-tab ${selectedTab === 'summary' ? 'active' : ''}`} onClick={() => setSelectedTab('summary')}>
                            <i className="fas fa-chart-line"></i>
                            Summary
                        </div>
                    </div>

                    <div className="stitch-tab-content">
                        {selectedTab === 'summary' && (
                            <div className="stitch-summary-grid">
                                <section className="stitch-card activity-panel">
                                    <div className="panel-title-row">
                                        <div>
                                            <h4>Top Applications</h4>
                                            <p>Most used apps for the selected day.</p>
                                        </div>
                                    </div>
                                    {isAppUsageLoading ? (
                                        <div className="card p-3 placeholder-glow"><h4 className="placeholder-glow"><span className="placeholder col-8"></span></h4></div>
                                    ) : topApps.length > 0 ? (
                                        <div className="activity-scroll-list">
                                            {topApps.map((app) => (
                                                <div key={app.name} className="stitch-bar" onClick={() => setSelectedAppName(app.name)}>
                                                    <div style={{ width: `${app.percent}%`, backgroundColor: app.color, height: '100%' }}></div>
                                                    <div className="progress-bar-fill" style={{ width: `${app.percent}%`, backgroundColor: app.color }}></div>
                                                    <div className="bar-content">
                                                        <span
                                                            className="label app-label-content custom-tooltip-anchor"
                                                            onMouseEnter={(event) => showCustomTooltip(event, app.name)}
                                                            onMouseLeave={hideCustomTooltip}
                                                        >
                                                            {app.iconUrls?.length > 0 && (
                                                                <img
                                                                    src={app.iconUrls[0]}
                                                                    alt=""
                                                                    className="app-icon real-app-icon"
                                                                    onError={(event) => {
                                                                        const currentIndex = numberValue(event.currentTarget.dataset.iconIndex);
                                                                        const nextIndex = currentIndex + 1;
                                                                        if (app.iconUrls[nextIndex]) {
                                                                            event.currentTarget.dataset.iconIndex = String(nextIndex);
                                                                            event.currentTarget.src = app.iconUrls[nextIndex];
                                                                            return;
                                                                        }

                                                                        event.currentTarget.style.display = 'none';
                                                                        const fallback = event.currentTarget.nextElementSibling;
                                                                        if (fallback) fallback.style.display = 'inline-block';
                                                                    }}
                                                                />
                                                            )}
                                                            <i
                                                                className={`${app.iconClass} app-icon fallback-app-icon`}
                                                                style={{ display: app.iconUrls?.length ? 'none' : 'inline-block' }}
                                                            ></i>
                                                            {app.name}
                                                        </span>
                                                        <span className="time">{formatDuration(app.duration)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p>No applications to display.</p>
                                    )}
                                    {topApps.length > 0 && (
                                        <div className="stitch-button-row">
                                            {moreAppUsageAvailable && (
                                                <button className="stitch-btn" onClick={loadMoreAppUsage}>Show More</button>
                                            )}
                                            {topApps.length > initialTopApps.length && (
                                                <button className="stitch-btn" onClick={showLessAppUsage}>Show Less</button>
                                            )}
                                        </div>
                                    )}
                                </section>

                               {selectedAppName && (
                                    <>
                                        <section className="stitch-card activity-panel">
                                            <div className="panel-title-row">
                                                <div>
                                                    <h4>Window Titles</h4>
                                                    <p>{selectedAppName}</p>
                                                </div>
                                            </div>
                                            {windowTitles.length > 0 ? (
                                                <div className="activity-scroll-list">
                                                    {windowTitles.map((title, index) => (
                                                        <div key={`${title.title}-${index}`} className={`stitch-bar ${index === 0 ? 'first-bar' : ''}`}>
                                                            <div style={{ width: `${title.percent}%`, backgroundColor: title.color, height: '100%' }}></div>
                                                            <span
                                                                className="label custom-tooltip-anchor"
                                                                onMouseEnter={(event) => showCustomTooltip(event, title.title)}
                                                                onMouseLeave={hideCustomTooltip}
                                                            >
                                                                <span className="label-text">{title.title}</span>
                                                            </span>
                                                            <span className="time">{formatDuration(title.duration)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p>No window titles available for this date.</p>}
                                            {windowTitles.length > 0 && (
                                                <div className="stitch-button-row">
                                                    {windowTitles.length >= PAGE_SIZE && moreTitlesAvailable && (
                                                        <button className="stitch-btn" onClick={loadMoreTitles}>Show More</button>
                                                    )}
                                                    {currentTitlePage > 1 && (
                                                        <button className="stitch-btn" onClick={showLessTitles}>Show Less</button>
                                                    )}
                                                </div>
                                            )}
                                        </section>

                                        <section className="stitch-card activity-panel">
                                            <div className="panel-title-row">
                                                <div>
                                                    <h4>Categories</h4>
                                                    <p>{selectedAppName}</p>
                                                </div>
                                            </div>
                                            {categories.length > 0 ? (
                                                <div className="activity-scroll-list">
                                                    {categories.map((category, index) => (
                                                        <div key={`${category.category}-${index}`} className="stitch-bar">
                                                            <div style={{ width: `${category.percent}%`, backgroundColor: category.color, height: '100%' }}></div>
                                                            <span className="label">{category.category}</span>
                                                            {category.duration > 0 && <span className="time">{formatDuration(category.duration)}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <p>No category data available for this date.</p>}
                                        </section>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {customTooltip && (
                <div
                    className="custom-dashboard-tooltip"
                    style={{
                        top: customTooltip.top,
                        left: customTooltip.left
                    }}
                >
                    {customTooltip.text}
                </div>
            )}
        </div>
    );
};

export default Users;
