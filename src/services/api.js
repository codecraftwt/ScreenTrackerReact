import axios from 'axios';
import Swal from 'sweetalert2';
import store from '../app/store';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
let sessionExpiredPopupOpen = false;
const BASE_URL = configuredBaseUrl
    ? configuredBaseUrl.replace(/\/+$/, '')
    : 'http://10.0.3.55:90/api';
    // :'http://localhost:5011/api';
    // :'http://screentracker.walstargroup.org/api';

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

            if (window.location.pathname !== '/login' && !sessionExpiredPopupOpen) {
                sessionExpiredPopupOpen = true;
                Swal.fire({
                    title: 'Session Expired',
                    text: 'You have logged in from another device. Please log in again.',
                    confirmButtonText: 'OK',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    customClass: {
                        popup: 'session-expired-popup',
                        title: 'session-expired-title',
                        htmlContainer: 'session-expired-message',
                        actions: 'session-expired-actions',
                        confirmButton: 'session-expired-confirm'
                    }
                }).then(() => {
                    window.location.href = '/login';
                });
            }
        }

        return Promise.reject(error);
    }
);

export default api;
