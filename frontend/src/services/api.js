import axios from 'axios';

// Live production Render backend API URL
const PRODUCTION_API_URL = 'https://ontime-backend-p4dk.onrender.com/api';

/**
 * Determine the robust API Base URL:
 * 1. Checks if running in production (Vercel deployment or built app)
 * 2. Validates and normalizes VITE_API_URL if provided
 * 3. Safely falls back to the live Render backend URL in production
 * 4. Ensures no duplicate /api/api, missing /api, or trailing slashes
 */
const resolveApiBaseUrl = () => {
  let envUrl = import.meta.env.VITE_API_URL;

  // Detect whether we are running in a deployed environment (e.g. Vercel)
  const isBrowser = typeof window !== 'undefined';
  const isLocalHost = isBrowser && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
  );
  const isProduction = import.meta.env.PROD || (isBrowser && !isLocalHost);

  // If in production and envUrl is missing, or points to localhost, or is just '/api', use production URL
  if (isProduction) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1') || envUrl === '/api') {
      return PRODUCTION_API_URL;
    }
  } else {
    // In local development
    if (!envUrl) {
      return 'http://localhost:5000/api';
    }
  }

  let finalUrl = envUrl.trim();

  // Strip trailing slashes
  finalUrl = finalUrl.replace(/\/+$/, '');

  // Guard against duplicate /api (e.g. .../api/api -> .../api)
  if (finalUrl.endsWith('/api/api')) {
    finalUrl = finalUrl.replace(/\/api\/api$/, '/api');
  }

  // Ensure it has /api if it's pointing to a backend host (like onrender.com) without /api
  if (finalUrl.startsWith('http') && !finalUrl.endsWith('/api') && !finalUrl.includes('/api/')) {
    finalUrl = `${finalUrl}/api`;
  }

  return finalUrl;
};

const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000 // 60s timeout to allow Render free tier cold-starts
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
