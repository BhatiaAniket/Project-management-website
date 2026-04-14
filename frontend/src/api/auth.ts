import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/auth` : 'http://localhost:5000/api/auth';

// Create axios instance with credentials for refresh tokens (cookies)
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // required for httpOnly cookies (refresh token)
});

// Interceptor to add access token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_URL}/refresh-token`, {}, { withCredentials: true });
        const { accessToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        // Refresh AuthContext seamlessly in actual app if needed, handled passively here
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token expired or invalid, forced logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: any) => api.post('/register', data),
  login: (data: any) => api.post('/login', data),
  verifyEmail: (token: string) => api.get(`/verify-email/${token}`),
  resendVerification: (email: string) => api.post('/resend-verification', { email }),
  logout: () => api.post('/logout'),
};
