import axios from 'axios';
import store from '../app/store';

// Base URL corresponding to App.xaml.cs in Windows app
// const BASE_URL = 'http://screentracker.walstargroup.org/api';
// const BASE_URL = 'http://localhost:5011/api';
//  public static string BaseUrl { get; set; } = "http://10.0.3.55:90";
 const BASE_URL = 'http://10.0.3.55:90/api';

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
