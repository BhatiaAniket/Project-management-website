import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Add a request interceptor to include the auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const managerAPI = {
  // Overview & Dashboard
  getOverviewStats: () => api.get('/manager/overview/stats'),
  getProjectTrajectory: () => api.get('/manager/overview/trajectory'),
  getTaskHealth: () => api.get('/manager/overview/task-health'),
  getRecentActivity: () => api.get('/manager/overview/activity'),

  // Project Management
  getProjects: () => api.get('/manager/projects'),
  getProjectDetails: (id: string) => api.get(`/manager/projects/${id}`),
  updateProject: (id: string, data: any) => api.patch(`/manager/projects/${id}`, data),

  // Task & Operational Management
  getTasks: (projectId?: string) => api.get('/manager/tasks', { params: { projectId } }),
  updateTaskStatus: (id: string, status: string) => api.patch(`/manager/tasks/${id}/status`, { status }),
  updateTask: (id: string, data: any) => api.patch(`/manager/tasks/${id}`, data),
  createTask: (data: any) => api.post('/manager/tasks', data),

  // Personnel / Employee Management
  getEmployees: () => api.get('/manager/employees'),
  getEmployeePerformance: (id: string) => api.get(`/manager/employees/${id}/performance`),

  // Intelligence Review (Daily Reports)
  getReports: () => api.get('/manager/reports'),
  updateReportStatus: (id: string, data: any) => api.patch(`/manager/reports/${id}/status`, data),

  // Intelligence & Analytics
  getPerformanceMetrics: () => api.get('/manager/performance/metrics'),
  getTeamVelocity: () => api.get('/manager/performance/velocity'),

  // Briefing Center (Meetings)
  getMeetings: () => api.get('/manager/meetings'),
  handleMeetingRequest: (id: string, data: any) => api.patch(`/manager/meetings/requests/${id}/handle`, data),
  getMeetingRequests: () => api.get('/manager/meetings/requests'),

  // Assets & Infrastructure
  getFiles: (projectId?: string) => api.get('/manager/files', { params: { projectId } }),
  uploadFile: (formData: FormData) => api.post('/manager/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Communication
  getConversations: () => api.get('/manager/chat/conversations'),
  getMessages: (conversationId: string) => api.get(`/manager/chat/messages/${conversationId}`),
  sendMessage: (data: any) => api.post('/manager/chat/messages', data),
};
