import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const employeeAPI = {
  getOverviewStats: () => api.get('/employee/overview/stats'),
  getUpcomingDeadlines: () => api.get('/employee/overview/deadlines'),
  getUpcomingMeetings: () => api.get('/employee/overview/meetings'),

  getTasks: () => api.get('/employee/tasks'),
  updateTaskStatus: (id: string, status: string) => api.patch(`/employee/tasks/${id}/status`, { status }),

  getDailyReports: () => api.get('/employee/reports'),
  submitDailyReport: (data: any) => api.post('/employee/reports', data),

  getMeetings: () => api.get('/employee/meetings'),
  requestMeeting: (data: any) => api.post('/employee/meetings/request', data),
  getMeetingRequests: () => api.get('/employee/meetings/requests'),

  getPerformance: () => api.get('/employee/performance'),

  getColleagues: () => api.get('/employee/colleagues'),

  // Assuming notifications and chat come from generic endpoints:
  getNotifications: () => api.get('/notifications'),
};
