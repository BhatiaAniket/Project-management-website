import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Add auth header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_BASE}/auth/refresh-token`, {}, { withCredentials: true });
        const { accessToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// ━━━ Company Dashboard API ━━━
export const companyAPI = {
  // Overview
  getOverview: () => api.get('/company/overview'),
  getCompanyDetails: () => api.get('/company/details'),
  updateProfile: (data: any) => api.put('/company/profile', data),
  getActivityLog: (page = 1) => api.get(`/company/activity?page=${page}`),

  // People
  listPeople: (params: any) => api.get('/people', { params }),
  addPerson: (data: any) => api.post('/people', data),
  importPeople: (formData: FormData, preview = false) =>
    api.post(`/people/import?preview=${preview}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updatePerson: (id: string, data: any) => api.put(`/people/${id}`, data),
  deactivatePerson: (id: string) => api.put(`/people/${id}/deactivate`),
  resendEmail: (id: string) => api.post(`/people/${id}/resend-email`),
  getPersonDetail: (id: string) => api.get(`/people/${id}`),

  // Projects
  listProjects: (params?: any) => api.get('/projects', { params }),
  createProject: (data: any) => api.post('/projects', data),
  getProject: (id: string) => api.get(`/projects/${id}`),
  updateProject: (id: string, data: any) => api.put(`/projects/${id}`, data),
  deleteProject: (id: string) => api.delete(`/projects/${id}`),
  addTask: (projectId: string, data: any) => api.post(`/projects/${projectId}/tasks`, data),
  updateTask: (projectId: string, taskId: string, data: any) => api.put(`/projects/${projectId}/tasks/${taskId}`, data),
  deleteTask: (projectId: string, taskId: string) => api.delete(`/projects/${projectId}/tasks/${taskId}`),
  listAllTasks: (params?: any) => api.get('/projects/tasks/all', { params }),

  // Performance
  listPerformance: (params?: any) => api.get('/performance', { params }),
  getIndividualPerformance: (userId: string) => api.get(`/performance/${userId}`),
  generateAISummary: (userId: string) => api.post(`/performance/${userId}/ai-summary`),

  // Meetings
  listMeetings: (params?: any) => api.get('/meetings', { params }),
  createMeeting: (data: any) => api.post('/meetings', data),
  getMeeting: (id: string) => api.get(`/meetings/${id}`),
  updateMeeting: (id: string, data: any) => api.put(`/meetings/${id}`, data),
  cancelMeeting: (id: string) => api.delete(`/meetings/${id}`),
  generateMeetingSummary: (id: string, transcript: string) => api.post(`/meetings/${id}/summary`, { transcript }),
  requestAdminMeeting: (data: any) => api.post('/meetings/request-admin', data),

  // Chat
  listConversations: () => api.get('/chat/conversations'),
  createConversation: (data: any) => api.post('/chat/conversations', data),
  getMessages: (conversationId: string, page = 1) => api.get(`/chat/conversations/${conversationId}/messages?page=${page}`),
  sendMessage: (conversationId: string, data: any) => api.post(`/chat/conversations/${conversationId}/messages`, data),

  // Notifications
  broadcastNotification: (data: { title: string, message?: string }) => api.post('/notifications/broadcast', data),
  deleteBroadcast: (id: string) => api.delete(`/notifications/broadcast/${id}`),
  listNotifications: (params?: any) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),

  // Settings
  getCompanyProfile: () => api.get('/settings/company'),
  updateCompanyProfile: (data: any) => api.put('/settings/company', data),
  changePassword: (data: any) => api.put('/settings/password', data),
  updateNotificationPrefs: (data: any) => api.put('/settings/notifications', data),
  deactivateCompany: (password: string) => api.post('/settings/deactivate', { password }),

  // Overview Stats
  getOverviewStats: () => api.get('/company/overview/stats'),
  getProjectsProgress: () => api.get('/company/overview/projects/progress'),
  getTasksStatusSummary: () => api.get('/company/overview/tasks/status-summary'),
  getWeeklyProductivity: () => api.get('/company/overview/productivity/weekly'),
  getUpcomingDeadlines: () => api.get('/company/overview/deadlines/upcoming'),
  getRecentActivity: () => api.get('/company/overview/activity/recent'),
  getPerformanceSummary: () => api.get('/company/overview/performance-summary'),
  getHoverDetails: (type: string) => api.get(`/company/overview/hover/${type}`),

  // Subscription (Razorpay)
  getSubscription: () => api.get('/subscription'),
  getPlans: () => api.get('/subscription/plans'),
  createOrder: (planType: string) => api.post('/subscription/create-order', { planType }),
  verifyPayment: (data: any) => api.post('/subscription/verify-payment', data),

  // Auth
  changePasswordFirstLogin: (newPassword: string) => api.post('/auth/change-password', { newPassword }),
};

export default api;
