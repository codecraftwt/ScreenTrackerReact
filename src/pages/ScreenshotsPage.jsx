import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useUser } from '../features/user/userHooks';
import { userService } from '../services/userService';
import { decodeToken } from '../utils/jwtHelper';
import './ScreenshotsPage.css';

const getValue = (entity, ...keys) => {
    for (const key of keys) {
        if (entity?.[key] !== undefined && entity?.[key] !== null) {
            return entity[key];
        }
    }

    return undefined;
};

const ScreenshotsPage = () => {
    const { date } = useParams();
    const [searchParams] = useSearchParams();
    const viewedUserId = searchParams.get('viewedUserId');
    const usageType = searchParams.get('usageType') || 'all';
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    
    const navigate = useNavigate();
   const {
  getImagesByDate,
  getAvailableScreenshotDates,
  deleteScreenshot: deleteScreenshotRedux,
  uploadScreenshot,
  images,
  availableScreenshotDates
} = useUser();

    const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0]);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date(date || new Date().toISOString().split('T')[0]));
    const [isLoading, setIsLoading] = useState(true);
    const [screenshots, setScreenshots] = useState([]);
    const [totalDuration, setTotalDuration] = useState('0h 0m');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [loggedInUserId, setLoggedInUserId] = useState(null);
    const [loggedInRole, setLoggedInRole] = useState('');
    const [deleteAuthority, setDeleteAuthority] = useState(false);
    const [themeVersion, setThemeVersion] = useState(0);
    const calendarRef = useRef(null);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setThemeVersion((v) => v + 1);
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const calculateActivityScore = (screenshot) => {
        const keyboardClicks = getValue(screenshot, 'keyboardClicks', 'KeyboardClicks') || 0;
        const mouseClicks = getValue(screenshot, 'mouseClicks', 'MouseClicks') || 0;
        const score = Math.floor(((keyboardClicks + mouseClicks) / 300) * 100);
        return Math.min(Math.max(score, 0), 100);
    };

    const getActiveBlocks = (screenshot) => {
        const keyboardClicks = getValue(screenshot, 'keyboardClicks', 'KeyboardClicks') || 0;
        const mouseClicks = getValue(screenshot, 'mouseClicks', 'MouseClicks') || 0;
        const blocks = Math.floor(((keyboardClicks + mouseClicks) / 300) * 10);
        return Math.min(Math.max(blocks, 0), 10);
    };

    const convertToIST = (captureTime) => {
        if (!captureTime) return '--:--';
        const date = new Date(captureTime);
        if (isNaN(date.getTime())) return '--:--';
        return date.toLocaleTimeString('en-US', { 
            timeZone: 'Asia/Kolkata',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    };

    const getCaptureDate = (screenshot) => {
        const captureTime = getValue(screenshot, 'captureTime', 'CaptureTime');
        const date = new Date(captureTime);
        return isNaN(date.getTime()) ? 0 : date.getTime();
    };

    const formatCalendarDate = (value) => {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const trackedDateSet = useMemo(
        () => new Set((availableScreenshotDates || []).map((item) => String(item).split('T')[0])),
        [availableScreenshotDates]
    );

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

    const calculateTotalDuration = (screenshotList) => {
        if (!screenshotList || screenshotList.length === 0) {
            setTotalDuration('0m');
            return;
        }
        const totalMinutes = screenshotList.length * 10;
        if (totalMinutes >= 60) {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            setTotalDuration(`${hours}h ${minutes}m`);
        } else {
            setTotalDuration(`${totalMinutes}m`);
        }
    };

    const loadScreenshots = useCallback(async () => {
        if (!currentUserId) return;

        setIsLoading(true);
        try {
            await getImagesByDate({
                userId: currentUserId,
                date: selectedDate,
                skip: 1,
                take: 10000,
                usageType,
                startTime,
                endTime
            });
        } catch (error) {
            console.error('Error loading screenshots:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentUserId, selectedDate, usageType, startTime, endTime, getImagesByDate]);
      const captureAndUpload = useCallback(async () => {
    if (!currentUserId || !uploadScreenshot) return;

    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true
        });

        const video = document.createElement("video");
        video.srcObject = stream;

        await video.play();

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        stream.getTracks().forEach(track => track.stop());

        canvas.toBlob(async (blob) => {
            if (!blob) return;

            const file = new File([blob], `screenshot-${Date.now()}.jpg`, {
                type: "image/jpeg"
            });

            await uploadScreenshot({
                userId: currentUserId,
                file,
                keyboardClicks: 0,
                mouseClicks: 0,
                minuteActivityData: "{}",
                startMode: "manual"
            });

            await loadScreenshots();
        }, "image/jpeg", 0.8);

    } catch (error) {
        console.error("Screenshot capture failed:", error);
    }
}, [currentUserId, uploadScreenshot, loadScreenshots]);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            const decodedUser = decodeToken(token);
            if (decodedUser) {
                let userId;

                if (viewedUserId) {
                    userId = parseInt(viewedUserId, 10);
                } else {
                    const dashboardKey = `dashboard-selected-user:${String(decodedUser.role || '').toLowerCase()}:${decodedUser.id || 0}`;
                    try {
                        const saved = JSON.parse(localStorage.getItem(dashboardKey));
                        const savedUserId = Number(saved?.selectedUserId) || 0;
                        if (savedUserId > 0) userId = savedUserId;
                    } catch {
                        // ignore parse errors
                    }
                }

                if (!userId) userId = decodedUser.id;
                setCurrentUserId(userId);
                
                // Store logged-in user info from token for permission checks
                setLoggedInUserId(decodedUser.id);
                setLoggedInRole(decodedUser.role || '');
                
                // Fetch logged-in user's full profile for delete authority check
                // Using userService directly (not Redux thunk) to avoid state interference
                userService.getUserById(decodedUser.id).then((userData) => {
                    if (userData) {
                        const isSelected = getValue(userData, 'isSelected', 'IsSelected') === true;
                        setDeleteAuthority(isSelected);
                    }
                }).catch(() => {
                    // Silently fail - delete button will be hidden for regular users
                });
            }
        }
    }, [viewedUserId]);

    useEffect(() => {
        if (currentUserId) {
            loadScreenshots();
        }
    }, [currentUserId, loadScreenshots]);

    useEffect(() => {
        if (!currentUserId) return;
        getAvailableScreenshotDates(currentUserId);
    }, [currentUserId, getAvailableScreenshotDates]);

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

    useEffect(() => {
        if (images && images.length > 0) {
            const processedScreenshots = [...images]
                .sort((a, b) => getCaptureDate(a) - getCaptureDate(b))
                .map((img) => ({
                    ...img,
                    activityScore: calculateActivityScore(img),
                    activeBlocks: getActiveBlocks(img),
                    captureTimeText: convertToIST(getValue(img, 'captureTime', 'CaptureTime'))
                }));
            setScreenshots(processedScreenshots);
            calculateTotalDuration(processedScreenshots);
        } else {
            setScreenshots([]);
            calculateTotalDuration([]);
        }
    }, [images]);

//     useEffect(() => {
//     if (!currentUserId) return;

//     const interval = setInterval(() => {
//         captureAndUpload();
//     }, 2 * 60 * 1000); 

//     return () => clearInterval(interval);
// }, [currentUserId, captureAndUpload]);

    const canDeleteScreenshot = (screenshot) => {
        const role = loggedInRole.toLowerCase();
        
        // Admins and superadmins can delete all screenshots
        if (role === 'admin' || role === 'superadmin') return true;
        
        // Regular users can only delete their own screenshots if delete authority is enabled
        const screenshotUserId = Number(getValue(screenshot, 'userId', 'UserId')) || 0;
        return deleteAuthority === true && loggedInUserId === screenshotUserId;
    };

    const deleteScreenshot = async (id) => {
        if (!window.confirm('Are you sure you want to delete this screenshot?')) return;
        
        const result = await deleteScreenshotRedux(id);
        if (result.meta.requestStatus === 'fulfilled') {
            window.alert('Screenshot deleted successfully.');
            await loadScreenshots();
        } else {
            window.alert('Failed to delete screenshot. You may not have delete authority.');
        }
    };

    const navigateToDetails = (id) => {
        navigate(`/screenshot-details/${id}?date=${selectedDate}&usageType=${usageType}&viewedUserId=${currentUserId}`);
    };

    const handleDateChange = (value) => {
        setSelectedDate(value);
        setCalendarMonth(new Date(value));
        setIsCalendarOpen(false);
    };
  

    return (
        <div className="screenshots-shell container mt-3">
            <div className="screenshots-card card shadow-sm">
                <div className="screenshots-toolbar card-header">
                    <div className="screenshots-date-wrap" ref={calendarRef}>
                        <button
                            type="button"
                            className="stitch-date-picker screenshots-date-picker screenshots-calendar-trigger"
                            onClick={() => setIsCalendarOpen((value) => !value)}
                        >
                            <span>{selectedDate}</span>
                            <i className="fas fa-calendar-alt"></i>
                        </button>
                        {isCalendarOpen && (
                            <div className="screenshots-calendar-popover screenshots-calendar-popover-screen">
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
                    </div>

                    <button className="stitch-refresh-btn screenshots-refresh-btn" onClick={loadScreenshots} disabled={isLoading}>
                        {isLoading ? (
                            <><i className="fas fa-spinner fa-spin me-2"></i> <span>Loading...</span></>
                        ) : (
                            <><i className="fas fa-sync-alt me-2"></i> <span>Refresh</span></>
                        )}
                    </button>
                </div>

                {isLoading ? (
                    <div className="d-flex justify-content-center p-5">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : screenshots.length > 0 ? (
                    <>
                        <div className="total-duration-banner">
                            <i className="fa fa-clock me-2"></i>
                            <span>Total Duration: <strong>{totalDuration}</strong></span>
                        </div>

                        <div className="row p-3 screenshot-grid">
                            {screenshots.map(screenshot => (
                                <div key={getValue(screenshot, 'id', 'Id')} className="col-6 col-sm-4 col-md-2 screenshot-item mb-4">
                                    <article className="screenshot-tile">
                                        <button
                                            type="button"
                                            className="image-container screenshot-preview-btn"
                                            onClick={() => navigateToDetails(getValue(screenshot, 'id', 'Id'))}
                                            aria-label={`View screenshot captured at ${screenshot.captureTimeText}`}
                                        >
                                            <img
                                                src={getValue(screenshot, 'imageUrl', 'ImageUrl')}
                                                alt="Screenshot"
                                                className="img-fluid screenshot-image"
                                            />
                                        </button>
                                        <div className="screenshot-info">
                                            <div className="screenshot-meta">
                                                <p className="screenshot-time mb-0">{screenshot.captureTimeText}</p>
                                            </div>
                                            <div className="screenshot-activity" aria-label={`Activity ${screenshot.activityScore}%`}>
                                                <div className="activity-blocks">
                                                    {[...Array(10)].map((_, i) => (
                                                        <span
                                                            key={i}
                                                            className={`block ${i < screenshot.activeBlocks ? "active" : ""}`}
                                                        ></span>
                                                    ))}
                                                </div>
                                                <p className="screenshot-score mb-0">{screenshot.activityScore}%</p>
                                            </div>
                                            {canDeleteScreenshot(screenshot) && (
                                                <button
                                                    type="button"
                                                    onClick={() => deleteScreenshot(getValue(screenshot, 'id', 'Id'))}
                                                    className="screenshot-delete-btn"
                                                    title="Delete screenshot"
                                                    aria-label="Delete screenshot"
                                                >
                                                    <i className="fa fa-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="no-screenshots text-center p-5">No screenshots found for this date.</p>
                )}
            </div>
        </div>
    );
};

export default ScreenshotsPage;
