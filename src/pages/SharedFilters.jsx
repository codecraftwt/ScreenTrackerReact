import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import './SharedFilters.css';

export const SharedFiltersProvider = ({ children }) => children;

export const PageHeaderActions = ({ children }) => {
    const [target, setTarget] = useState(null);
    useEffect(() => {
        setTarget(document.getElementById('shared-page-filter-slot'));
        return () => setTarget(null);
    }, []);
    return target ? createPortal(children, target) : null;
};

export const SharedFilterHeader = () => {
    const { pathname } = useLocation();
    const title = pathname === '/users' ? 'Dashboard'
        : pathname === '/active-users' ? 'Active Users'
            : pathname === '/settings' ? 'Settings'
                : pathname.startsWith('/admin-users') ? 'User List'
                    : (pathname.startsWith('/rptTime') || pathname.startsWith('/userreport')) ? 'Reports'
                        : 'Screen Tracker';

    return <header className="shared-filter-header">
        <div className="shared-filter-title"><small>Time and activity overview</small><h1>{title}</h1></div>
        <div id="shared-page-filter-slot" className="shared-page-filter-slot" />
    </header>;
};
