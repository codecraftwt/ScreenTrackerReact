import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/authHooks';

import './forgot-password.css';

const ForgotPassword = () => {
    const [otpSent, setOtpSent] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const navigate = useNavigate();
    const { sendOtp, verifyOtp } = useAuth();

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        const result = await sendOtp(email);
        
        if (result.meta.requestStatus === 'fulfilled') {
            setMessage('OTP sent successfully to your email');
            setOtpSent(true);
        } else {
            setMessage(result.payload || 'Failed to send OTP');
        }
        
        setIsLoading(false);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        const result = await verifyOtp({ email, otp, newPassword });
        
        if (result.meta.requestStatus === 'fulfilled') {
            setMessage('Password reset successful');
            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } else {
            setMessage(result.payload || 'OTP verification failed');
        }
        
        setIsLoading(false);
    };

    const goBack = () => {
        navigate('/login');
    };

    return (
        <div className="forgot-password-page">
            {/* Header */}
            <div className="fp-header">
                <button className="fp-back-btn" onClick={goBack}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
                <h1 className="fp-title">Reset Password</h1>
            </div>

            {/* Main Content */}
            <div className="fp-content">
                {/* Illustration */}
                <div className="fp-illustration">
                    <img src="https://img.freepik.com/premium-vector/password-reset-icon-apps-vector_116137-6219.jpg?w=740"
                         alt="Forgot Password Illustration"
                         className="fp-image" />
                </div>

                {!otpSent ? (
                    <>
                        <div className="fp-text-content">
                            <h2 className="fp-heading">Forgot Password?</h2>
                            <p className="fp-subtitle">No worries! Enter your email address below and we'll send a code to reset your password.</p>
                        </div>

                        <form onSubmit={handleSendOtp} className="fp-form">
                            <div className="fp-form-group">
                                <label className="fp-label">EMAIL ADDRESS</label>
                                <div className="fp-input-wrapper">
                                    <input 
                                        type="email" 
                                        className="fp-input" 
                                        placeholder="example@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <svg className="fp-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="5" width="20" height="14" rx="2"/>
                                        <polyline points="2,5 12,13 22,5"/>
                                    </svg>
                                </div>
                                <p className="fp-privacy-text">We will never share your email with anyone else.</p>
                            </div>

                            <button type="submit" className="fp-submit-btn" disabled={isLoading}>
                                {isLoading ? 'Sending...' : 'Send OTP'}
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9,18 15,12 9,6"/>
                                </svg>
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <div className="fp-text-content">
                            <h2 className="fp-heading">Verify Code</h2>
                            <p className="fp-subtitle">Enter the OTP code sent to your email and your new password.</p>
                        </div>

                        <form onSubmit={handleVerifyOtp} className="fp-form">
                            <div className="fp-form-group">
                                <label className="fp-label">OTP CODE</label>
                                <input 
                                    type="text" 
                                    className="fp-input" 
                                    placeholder="Enter OTP code"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="fp-form-group">
                                <label className="fp-label">NEW PASSWORD</label>
                                <input 
                                    type="password" 
                                    className="fp-input" 
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="fp-submit-btn" disabled={isLoading}>
                                {isLoading ? 'Verifying...' : 'Verify & Reset'}
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9,18 15,12 9,6"/>
                                </svg>
                            </button>
                        </form>
                    </>
                )}

                {message && (
                    <p className={`fp-message ${message.toLowerCase().includes('success') ? 'fp-success' : 'fp-error-text'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
