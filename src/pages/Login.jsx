import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/authHooks';
import './Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated, loading, error, clearError } = useAuth();
    const redirectTo = location.state?.from?.pathname || '/users';
    
    const isFormValid = username.trim() !== '' && password.trim() !== '';

    useEffect(() => {
        if (isAuthenticated) {
            navigate(redirectTo, { replace: true });
        }

        const savedUsername = localStorage.getItem('saved_username');
     
        if (savedUsername) {
    setTimeout(() => {
        setUsername(savedUsername);
        setRememberMe(true);
    }, 0);
}
    }, [isAuthenticated, navigate, redirectTo]);

    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (!isFormValid) return;

        clearError();
        setErrorMessage('');

        try {
            console.log('Login - Attempting login with username:', username);
            const result = await login(username, password);
            console.log('Login - Result:', result);
            
            if (result.meta.requestStatus === 'fulfilled') {
                console.log('Login - Successful, navigating to /users');
                if (rememberMe) {
                    localStorage.setItem('saved_username', username);
                } else {
                    localStorage.removeItem('saved_username');
                }                
                navigate(redirectTo, { replace: true });
            } else {
                console.log('Login - Failed:', result.payload);
                setErrorMessage(result.payload || 'Login failed');
            }
        } catch (error) {
            console.error('Login - Error:', error);
            setErrorMessage('An unexpected error occurred during login.');
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-icon">
                        <i className="fas fa-users"></i>
                    </div>
                    <h1 className="login-title">Employee Tracking</h1>
                    <p className="login-subtitle">Sign in to access your account</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">Username </label>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Enter your username "
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="password-group">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                className="form-input" 
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button type="button" className="toggle-password" onClick={togglePasswordVisibility}>
                                <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                            </button>
                        </div>
                    </div>

                    <div className="form-options">
                        <div className="checkbox-container">
                            <input 
                                type="checkbox" 
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <label htmlFor="rememberMe" className="checkbox-label">Remember me</label>
                        </div>
                        <a href="/forgot-password" className="forgot-link">Forgot Password?</a>
                    </div>

                    {!isFormValid && !loading && (
                        <p className="form-hint">Please enter both Username and Password to continue.</p>
                    )}

                    <button type="submit" className="submit-btn" disabled={!isFormValid || loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="divider">
                    <div className="divider-line"></div>
                    <span className="divider-text">OR</span>
                    <div className="divider-line"></div>
                </div>

                {(errorMessage || error) && <p className="error-message">{errorMessage || error}</p>}

                <div className="login-footer">
                    <p className="footer-text">Don't have an account? <a href="#" className="footer-link">Contact your administrator</a></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
