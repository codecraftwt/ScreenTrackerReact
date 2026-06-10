import React from 'react';
import { Outlet } from 'react-router-dom';

const NoNavLayout = () => {
    return (
        <div className="no-nav-page">
            <Outlet />
        </div>
    );
};

export default NoNavLayout;
