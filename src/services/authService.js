import api from './api';

const getApiErrorMessage = (error, fallback) => {
    const responseData = error.response?.data;

    if (typeof responseData === 'string') {
        const message = responseData.trim();
        const isHtmlResponse = /^\s*<!doctype html|^\s*<html/i.test(message);

        if (!isHtmlResponse && message) return message;
    }

    if (responseData?.message) return responseData.message;
    return fallback;
};

export const authService = {

    login: async (username, password) => {

        try {
           
            const response = await api.post('/Auth/login', { Username: username, Password: password, SessionType: 'Web' });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                message: getApiErrorMessage(
                    error,
                    error.response?.status === 404
                        ? 'Login API endpoint was not found. Please check the deployed API URL.'
                        : 'Login failed. Please try again.'
                )
            };
        }
    },

    register: async (registerModel) => {
        try {
            const response = await api.post('/Auth/register', registerModel);
            // Handle specific status codes based on backend design
            if (response.status === 200 || response.status === 201) {
                return { success: true, message: 'Registration successful' };
            } else if (response.status === 204) {
                return { success: false, message: 'You are already registered.' };
            }
            return { success: true, data: response.data };
        } catch (error) {
            let message = 'Registration failed. Please try again.';
            if (error.response?.status === 409) {
                message = error.response.data?.message || 'Registration failed due to a unique conflict.';
            } else if (error.response?.status === 400) {
                message = 'Registration failed. Please check input values.';
            }
            return { success: false, message };
        }
    },

    sendOtp: async (email) => {
        try {
            const response = await api.post('/Auth/sendOTP', { email });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                message: error.response?.status === 400 ? 'Failed to send OTP. Invalid email address.' : 'Failed to send OTP. Please try again.'
            };
        }
    },

    verifyOtp: async (email, otp, newPassword) => {
        try {
            const response = await api.post('/Auth/verifyOTP', { email, otp, newPassword });
            return { success: true, data: response.data };
        } catch (error) {
            let message = 'OTP verification failed. Please try again.';
            if (error.response?.status === 400) message = 'Invalid OTP, email, or password format.';
            else if (error.response?.status === 401) message = 'OTP expired or unauthorized.';
            return { success: false, message };
        }
    },

    logout: async () => {
        try {
            const response = await api.post('/Auth/logout');
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Logout API call failed:', error);
            return { success: false };
        }
    },

    heartbeat: async () => {
        try {
            await api.post('/Auth/heartbeat');
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }
};
