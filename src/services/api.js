import axios from 'axios';
import store from '../app/store';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const SESSION_REDIRECT_MESSAGE_KEY = 'sessionRedirectMessage';
const OTHER_DEVICE_MESSAGE = 'You have logged in from another device.';
const BASE_URL = configuredBaseUrl
    ? configuredBaseUrl.replace(/\/+$/, '')
    : 'http://10.0.3.55:90/api';
    // :'http://localhost:5011/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const state = store.getState();
        const token =
            state?.auth?.token || localStorage.getItem('authToken');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const requestUrl = String(error.config?.url || '').toLowerCase();
        const isLoginRequest = requestUrl.includes('/auth/login');

        if (status === 401 && !isLoginRequest) {
            localStorage.removeItem('authToken');
            localStorage.setItem('IsOnState', 'false');
            sessionStorage.setItem(SESSION_REDIRECT_MESSAGE_KEY, OTHER_DEVICE_MESSAGE);

            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;
