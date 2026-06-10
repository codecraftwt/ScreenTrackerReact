import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// import MainLayout from './components/MainLayout';
// import NoNavLayout from './components/NoNavLayout';
import MainLayout from './pages/MainLayout';
import NoNavLayout from './pages/NoNavLayout';
import ProtectedRoute from './pages/ProtectedRoute';

// Mock components for pages we haven't converted yet
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Users from './pages/Users';
import Register from './pages/Register';
import Settings from './pages/Settings';
import ActiveUsers from './pages/ActiveUsers';
import AdminList from './pages/AdminList';
import AdminUsers from './pages/AdminUsers';
import Profile from './pages/Profile';
import Report from './pages/Report';
import ScreenshotsPage from './pages/ScreenshotsPage';
import ScreenshotDetails from './pages/ScreenshotDetails';

function App() {
  return (
    <Routes>
      {/* Routes without navigation */}
      <Route element={<NoNavLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Authenticated routes with Main Navigation */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/users" replace />} />
          <Route path="/users" element={<Users />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/rptTime" element={<Report />} />
          <Route path="/rptTime/:userId" element={<Report />} />
          <Route path="/userreport/:userId" element={<Report />} />
          <Route path="/screenshots" element={<ScreenshotsPage />} />
          <Route path="/screenshots/:date" element={<ScreenshotsPage />} />
          <Route path="/screenshot-details/:imageId" element={<ScreenshotDetails />} />

          <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin']} />}>
            <Route path="/settings" element={<Settings />} />
            <Route path="/active-users" element={<ActiveUsers />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/:adminId" element={<Register />} />
            <Route path="/register/edit/:userId" element={<Register />} />
            <Route path="/register/edit/:userId/:adminId" element={<Register />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
            <Route path="/admin-list" element={<AdminList />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin']} />}>
            <Route path="/admin-users/:adminId" element={<AdminUsers />} />
          </Route>
        </Route>
      </Route>
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
