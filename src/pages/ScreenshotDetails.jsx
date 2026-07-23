import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { userService } from '../services/userService';
import { decodeToken } from '../utils/jwtHelper';
import './ScreenshotDetails.css';

const getValue = (entity, ...keys) => {
    for (const key of keys) {
        if (entity?.[key] !== undefined && entity?.[key] !== null) {
            return entity[key];
        }
    }

    return undefined;
};

const formatDateParam = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).split('T')[0];
    return date.toISOString().split('T')[0];
};

const formatTimestamp = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
};

const formatTimeOnly = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
};

const parseMinuteActivity = (value) => {
    if (!value) return [];

    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return Object.values(parsed || {})
            .map((entry) => ({
                timestamp: getValue(entry, 'timestamp', 'Timestamp'),
                keyboard: getValue(entry, 'keyboard', 'Keyboard') ?? 0,
                mouse: getValue(entry, 'mouse', 'Mouse') ?? 0
            }))
            .filter((entry) => entry.timestamp)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
        console.error('Error parsing minute activity data:', error);
        return [];
    }
};

const ScreenshotDetails = () => {
    const { imageId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const queryDate = searchParams.get('date');
    const usageType = searchParams.get('usageType') || 'all';
    const viewedUserId = searchParams.get('viewedUserId');

    const [screenshot, setScreenshot] = useState(null);
    const [minuteActivity, setMinuteActivity] = useState([]);
    const [targetUserId, setTargetUserId] = useState(null);
    const [hasNextScreenshot, setHasNextScreenshot] = useState(false);
    const [hasPreviousScreenshot, setHasPreviousScreenshot] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const numericImageId = useMemo(() => Number(imageId), [imageId]);

    const resolveTargetUserId = useCallback(() => {
        if (viewedUserId) return Number(viewedUserId);

        const token = localStorage.getItem('authToken');
        const decodedUser = decodeToken(token);
        return decodedUser?.id || null;
    }, [viewedUserId]);

    const checkRelativeScreenshots = useCallback(async (imageData, userId) => {
        const captureTime = getValue(imageData, 'captureTime', 'CaptureTime');
        const id = getValue(imageData, 'id', 'Id');

        if (!userId || !id || !captureTime) {
            setHasPreviousScreenshot(false);
            setHasNextScreenshot(false);
            return;
        }

        const dateParam = formatDateParam(captureTime);
        const [next, previous] = await Promise.all([
            userService.getRelativeScreenshot(userId, id, dateParam, 'next', usageType),
            userService.getRelativeScreenshot(userId, id, dateParam, 'previous', usageType)
        ]);

        setHasNextScreenshot(Boolean(next?.id || next?.Id));
        setHasPreviousScreenshot(Boolean(previous?.id || previous?.Id));
    }, [usageType]);

    const loadImageData = useCallback(async () => {
        if (!numericImageId) {
            setErrorMessage('Invalid screenshot id.');
            setIsLoading(false);
            return;
        }

        const userId = resolveTargetUserId();
        setTargetUserId(userId);
        setIsLoading(true);
        setErrorMessage('');

        try {
            const imageData = await userService.getScreenshotById(numericImageId);

            if (!imageData) {
                setErrorMessage('No data found for the selected screenshot.');
                setScreenshot(null);
                setMinuteActivity([]);
                return;
            }

            setScreenshot(imageData);
            setMinuteActivity(parseMinuteActivity(getValue(imageData, 'minuteActivityData', 'MinuteActivityData')));
            await checkRelativeScreenshots(imageData, userId);
        } catch (error) {
            setErrorMessage(`Error loading screenshot details: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [checkRelativeScreenshots, numericImageId, resolveTargetUserId]);

    useEffect(() => {
        loadImageData();
    }, [loadImageData]);

    const loadRelativeScreenshot = async (direction) => {
        if (!screenshot || !targetUserId) {
            setErrorMessage('Cannot navigate without a valid screenshot and user.');
            return;
        }

        const id = getValue(screenshot, 'id', 'Id');
        const captureTime = getValue(screenshot, 'captureTime', 'CaptureTime');
        const dateParam = formatDateParam(captureTime);
        const relativeScreenshot = await userService.getRelativeScreenshot(targetUserId, id, dateParam, direction, usageType);

        if (relativeScreenshot?.id || relativeScreenshot?.Id) {
            const nextId = getValue(relativeScreenshot, 'id', 'Id');
            const selectedDate = queryDate || dateParam;
            navigate(`/screenshot-details/${nextId}?date=${selectedDate}&usageType=${usageType}&viewedUserId=${targetUserId}`, { replace: true });
            return;
        }

        setErrorMessage(`No ${direction} screenshot found.`);
        if (direction === 'previous') {
            setHasPreviousScreenshot(false);
        } else {
            setHasNextScreenshot(false);
        }
    };

const backToScreenshots = () => {
    const historyIndex = window.history.state?.idx;

    /* Go back 1 step in history (like navigationHistory.goBack) */
    if (typeof historyIndex === 'number' && historyIndex > 0) {
        navigate(-1);
        return;
    }

    /* Fallback: navigate to screenshots page (same as Windows app) */
    const selectedDate =
        queryDate ||
        formatDateParam(getValue(screenshot, 'captureTime', 'CaptureTime')) ||
        '';

    const params = new URLSearchParams({ usageType });

    if (targetUserId) {
        params.set('viewedUserId', targetUserId);
    }

    navigate(
        `/screenshots/${selectedDate}?${params.toString()}`,
        { replace: true }
    );
};

    if (errorMessage && !screenshot) {
        return <p className="text-danger mt-3">{errorMessage}</p>;
    }

    if (isLoading) {
        return <p className="mt-3">Loading...</p>;
    }

    const imageUrl = getValue(screenshot, 'imageUrl', 'ImageUrl');
    const captureTime = getValue(screenshot, 'captureTime', 'CaptureTime');
    const keyboardClicks = getValue(screenshot, 'keyboardClicks', 'KeyboardClicks') ?? 0;
    const mouseClicks = getValue(screenshot, 'mouseClicks', 'MouseClicks') ?? 0;

    return (
        <div className="screenshot-details container mt-3">
            {errorMessage ? <p className="text-danger">{errorMessage}</p> : null}

            <button
                type="button"
                onClick={backToScreenshots}
                className="btn-back screenshots-back-btn"
                aria-label="Go back to the screenshots page"
            >
                <i className="fas fa-arrow-left" aria-hidden="true"></i>
                <span>Back</span>
            </button>

            <div className="row">
                <div className="col-md-9">
                    {imageUrl ? (
                        <div className="screenshot-details-image-wrap text-center">
                            <button
                                onClick={() => loadRelativeScreenshot('previous')}
                                className="btn screenshot-details-nav position-absolute top-50 start-0 translate-middle-y"
                                disabled={!hasPreviousScreenshot}
                                title="Previous"
                            >
                                <i className="fa fa-chevron-left"></i>
                            </button>

                            <img src={imageUrl} alt="Screenshot" className="img-fluid screenshot-details-image" />

                            <button
                                onClick={() => loadRelativeScreenshot('next')}
                                className="btn screenshot-details-nav position-absolute top-50 end-0 translate-middle-y"
                                disabled={!hasNextScreenshot}
                                title="Next"
                            >
                                <i className="fa fa-chevron-right"></i>
                            </button>
                        </div>
                    ) : (
                        <p>No image available.</p>
                    )}
                </div>

                <div className="col-md-3">
                    <div className="card mb-3">
                        <div className="card-header card-header-background">
                            <h5 className="card-title mb-0">Screenshot Details</h5>
                        </div>
                        <div className="card-body">
                            <p><strong>Time:</strong> {formatTimestamp(captureTime)}</p>
                            <p><strong>Keyboard Clicks:</strong> {keyboardClicks}</p>
                            <p><strong>Mouse Clicks:</strong> {mouseClicks}</p>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header card-header-background">
                            <h5 className="card-title mb-0">Activity Details</h5>
                        </div>
                        <div className="card-body p-0">
                            {minuteActivity.length > 0 ? (
                                <div className="screenshot-details-activity-scroll">
                                    <table className="table table-sm mb-0">
                                        <thead className="sticky-top">
                                            <tr>
                                                <th>Time</th>
                                                <th>K</th>
                                                <th>M</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {minuteActivity.map((entry, index) => (
                                                <tr key={`${entry.timestamp}-${index}`}>
                                                    <td>{formatTimeOnly(entry.timestamp)}</td>
                                                    <td>{entry.keyboard}</td>
                                                    <td>{entry.mouse}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="p-3 mb-0">No activity data</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScreenshotDetails;
