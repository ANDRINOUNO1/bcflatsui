import axios from 'axios';

// Create axios instance with base configuration
const apiService = axios.create({
    baseURL: 'http://localhost:3000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
apiService.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
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
            // Token expired or invalid, clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Don't redirect automatically - let components handle it
            console.log(' Token cleared, but not redirecting');
        }
        return Promise.reject(error);
    }
);

export { apiService };

