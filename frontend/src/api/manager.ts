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

export const managerAPI = {
  // ── Overview & Dashboard ──────────────────────────────────────────────────
  getOverviewStats: () => api.get('/manager/overview-stats'),
  getProjectsProgress: () => api.get('/manager/projects/progress'),
  getTasksStatusSummary: () => api.get('/manager/tasks/status-summary'),
  getRecentActivity: () => api.get('/manager/overview/activity'),

  // ── Projects ──────────────────────────────────────────────────────────────
  getProjects: (params?: any) => api.get('/projects', { params }),
  getProjectDetails: (id: string) => api.get(`/projects/${id}`),
  updateProject: (id: string, data: any) => api.patch(`/manager/projects/${id}`, data),

  // ── Tasks ─────────────────────────────────────────────────────────────────
  getTasks: (projectId?: string) => api.get('/manager/tasks', { params: { projectId } }),
  createTask: (data: any) => api.post('/manager/tasks', data),
  updateTask: (id: string, data: any) => api.patch(`/manager/tasks/${id}`, data),
  updateTaskStatus: (id: string, status: string) => api.patch(`/manager/tasks/${id}/status`, { status }),
  reviewTask: (id: string, data: any) => api.patch(`/manager/tasks/${id}/review`, data),
  // Unassigned tasks
  getUnassignedTasks: () => api.get('/manager/tasks/unassigned'),
  assignTask: (id: string, employeeId: string) => api.patch(`/manager/tasks/${id}/assign`, { employeeId }),

  // ── Employees ─────────────────────────────────────────────────────────────
  getEmployees: () => api.get('/manager/employees'),
  // Rate an employee (with taskId for proper ManagerRating model)
  rateEmployee: (employeeId: string, rating: number, taskId?: string, comment?: string, category?: string) =>
    taskId
      ? api.post('/manager/rate-employee', { employeeId, taskId, rating, comment, category })
      : api.patch(`/manager/employees/${employeeId}/rate`, { rating }),

  // ── Performance ───────────────────────────────────────────────────────────
  getPerformanceTeam: () => api.get('/manager/performance/team'),
  getPerformanceMe: (_userId?: string) => api.get('/manager/performance/me'),
  getEmployeePerformanceDetail: (id: string) => api.get(`/manager/performance/employee/${id}`),
  getManagerAIReport: () => api.get('/manager/performance/ai-report'),
  // Legacy aliases
  getPerformanceMetrics: () => api.get('/manager/performance/team'),
  getTeamVelocity: () => api.get('/manager/performance/me'),
  getEmployeePerformance: (id: string) => api.get(`/manager/performance/employee/${id}`),

  // ── Daily Reports ─────────────────────────────────────────────────────────
  getReports: () => api.get('/manager/reports'),
  getDailyReports: () => api.get('/manager/daily-reports'),
  updateReportStatus: (id: string, data: any) => api.patch(`/manager/reports/${id}/status`, data),
  reviewDailyReport: (id: string, data: any) => api.patch(`/manager/daily-reports/${id}/review`, data),

  // ── Meetings ──────────────────────────────────────────────────────────────
  getMeetings: () => api.get('/manager/meetings'),
  getMeetingRequests: () => api.get('/manager/meetings/requests'),
  handleMeetingRequest: (id: string, data: any) => api.post('/manager/meetings/handle-request', data),

  // ── Files ─────────────────────────────────────────────────────────────────
  getFiles: (projectId?: string) => api.get('/files', { params: { projectId } }),

  // ── Chat ──────────────────────────────────────────────────────────────────
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (conversationId: string) => api.get(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, data: any) => api.post(`/chat/conversations/${conversationId}/messages`, data),
};
