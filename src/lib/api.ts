import axios from 'axios';

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_URL}/api`,
  withCredentials: true,
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
