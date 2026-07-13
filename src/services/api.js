import axios from 'axios';
import store from '../app/store';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const BASE_URL = configuredBaseUrl
    ? configuredBaseUrl.replace(/\/$/, '')
    : import.meta.env.PROD
        ? '/api'
        : 'http://10.0.3.55:90/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor to automatically attach the token to all requests
api.interceptors.request.use((config) => {
    // Try to get token from Redux store first, fallback to localStorage
    const state = store.getState();
    const token = state?.auth?.token || localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.setItem('IsOnState', 'false');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }

    return Promise.reject(error);
});

export default api;
