import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
const strippedBaseURL = (rawBaseURL || '').replace(/\/+$/, '');
const normalizedBaseURL = strippedBaseURL.endsWith('/api')
  ? strippedBaseURL
  : (strippedBaseURL ? `${strippedBaseURL}/api` : '/api');

const api = axios.create({
  baseURL: normalizedBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('eventhub_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to catch unauthorized or session expirations
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear expired credentials if any
      const currentPath = window.location.pathname;
      if (!['/login', '/register', '/', '/discover', '/calendar'].includes(currentPath)) {
        localStorage.removeItem('eventhub_token');
        localStorage.removeItem('eventhub_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

