import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import NavMenu from './NavMenu';
import { useAuth } from '../features/auth/authHooks';
import './MainLayout.css';
import { SharedFilterHeader, SharedFiltersProvider } from './SharedFilters';

const HEARTBEAT_INTERVAL_MS = 60000;

const MainLayout = () => {
    const { isAuthenticated, sendHeartbeat } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) return;

        sendHeartbeat();
        const intervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [isAuthenticated, sendHeartbeat]);

    return (
        <div className="page">
            <div className="sidebar">
                <NavMenu />
            </div>

            <main><SharedFiltersProvider><article className="content px-4">
                <SharedFilterHeader />
                <Outlet />
            </article></SharedFiltersProvider></main>
        </div>
    );
};

export default MainLayout;
