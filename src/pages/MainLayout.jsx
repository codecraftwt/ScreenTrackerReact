import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import NavMenu from './NavMenu';
import { useAuth } from '../features/auth/authHooks';
import './MainLayout.css';

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

            <main>
                <article className="content px-4">
                    <Outlet />
                </article>
            </main>
        </div>
    );
};

export default MainLayout;
