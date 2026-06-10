import { useDispatch, useSelector } from 'react-redux';
import {
    login,
    register,
    sendOtp,
    verifyOtp,
    logout,
    sendHeartbeat,
    clearError,
    clearRegistrationSuccess,
    setToken
} from './authSlice';

export const useAuth = () => {
    const dispatch = useDispatch();
    const {
        user,
        currentUser,
        token,
        isAuthenticated,
        loading,
        error,
        otpSent,
        registrationSuccess
    } = useSelector((state) => state.auth);

    const handleLogin = (username, password) => {
        return dispatch(login({ username, password }));
    };

    const handleRegister = (registerModel) => {
        return dispatch(register(registerModel));
    };

    const handleSendOtp = (email) => {
        return dispatch(sendOtp(email));
    };

    const handleVerifyOtp = (email, otp, newPassword) => {
        return dispatch(verifyOtp({ email, otp, newPassword }));
    };

    const handleLogout = () => {
        return dispatch(logout());
    };

    const handleClearError = () => {
        dispatch(clearError());
    };

    const handleClearRegistrationSuccess = () => {
        dispatch(clearRegistrationSuccess());
    };  

    const handleSetToken = (token) => {
        dispatch(setToken(token));
    };

    const handleSendHeartbeat = () => {
        return dispatch(sendHeartbeat());
    };

    return {
        user,
        currentUser,
        token,
        isAuthenticated,
        loading,
        error,
        otpSent,
        registrationSuccess,
        login: handleLogin,
        register: handleRegister,
        sendOtp: handleSendOtp,
        verifyOtp: handleVerifyOtp,
        logout: handleLogout,
        sendHeartbeat: handleSendHeartbeat,
        clearError: handleClearError,
        clearRegistrationSuccess: handleClearRegistrationSuccess,
        setToken: handleSetToken
    };
};
