import axios from 'axios';

const api = axios.create({
  baseURL: 'https://rsb-server.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the Bearer token
api.interceptors.request.use((config) => {
  // Try to get token from localStorage if it exists
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
