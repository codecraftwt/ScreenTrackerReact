import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const normalizeRoles = (roles) => roles.map((role) => String(role).toLowerCase());

const ProtectedRoute = ({ allowedRoles }) => {
    const location = useLocation();
    const { isAuthenticated, currentUser, user } = useSelector((state) => state.auth);
    const authUser = currentUser || user;
    const role = authUser?.role ? String(authUser.role).toLowerCase() : '';

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (allowedRoles?.length && !normalizeRoles(allowedRoles).includes(role)) {
        return <Navigate to="/users" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
