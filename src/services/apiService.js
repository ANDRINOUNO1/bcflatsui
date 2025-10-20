import axios from 'axios';


const ENV_BASE = import.meta?.env?.VITE_API_BASE_URL;
const FALLBACK_BASE = `${window.location?.protocol || 'http:'}//${window.location?.hostname || 'localhost'}:${window.location?.port || '5173'}`;
const DEFAULT_API = 'http://localhost:3000/api';

// Normalize to ensure "/api" suffix is present exactly once
function normalizeApiBase(baseUrl) {
    if (!baseUrl) return DEFAULT_API;
    const trimmed = baseUrl.replace(/\/$/, '');
    if (/\/api$/i.test(trimmed)) return trimmed;
    return `${trimmed}/api`;
}

const resolvedBaseURL = normalizeApiBase(ENV_BASE || FALLBACK_BASE.replace(/:\\d+$/, ':3000'));

// Create axios instance with base configuration
const apiService = axios.create({
    baseURL: resolvedBaseURL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token (per-tab using sessionStorage)
apiService.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log(' Adding token to request:', config.url);
            console.log(' Token:', token.substring(0, 20) + '...');
        } else {
            console.log(' No token found for request:', config.url);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle auth errors
apiService.interceptors.response.use(
    (response) => {
        console.log(' API Response:', response.config.url, response.status);
        return response;
    },
    (error) => {
        console.log(' API Error:', error.config?.url, error.response?.status, error.response?.data);
        
        if (error.response?.status === 401) {
            console.log(' Authentication failed, clearing token');
            // Token expired or invalid, clear session storage (per-tab)
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            
            // Don't redirect automatically - let components handle it
            console.log(' Token cleared, but not redirecting');
        }
        return Promise.reject(error);
    }
);

export { apiService };

