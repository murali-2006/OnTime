import axios from 'axios';

// Base API URL with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ontime_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Authentication Expiry & Format Clean Errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // If token expired or unauthorized, clear token and redirect to login if not already there
      if (error.response.status === 401) {
        localStorage.removeItem('ontime_token');
        localStorage.removeItem('ontime_user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login?expired=1';
        }
      }
      return Promise.reject(error.response.data || { message: 'An error occurred.' });
    } else if (error.request) {
      return Promise.reject({ message: 'Cannot connect to OnTime backend server. Please verify backend is running.' });
    }
    return Promise.reject({ message: error.message || 'Request failed.' });
  }
);

export default api;
