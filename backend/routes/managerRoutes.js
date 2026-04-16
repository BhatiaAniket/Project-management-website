const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const managerController = require('../controllers/managerController');

// All manager routes require authentication and manager (or company_admin) role
router.use(protect);
router.use(authorize('manager', 'company_admin'));

// ── Overview / Dashboard ──────────────────────────────────────────────────────
router.get('/overview-stats', managerController.getOverviewStats);
router.get('/overview/stats', managerController.getOverviewStats);         // alias
router.get('/overview/activity', managerController.getRecentActivity);

// ── Projects ──────────────────────────────────────────────────────────────────
router.get('/projects/progress', managerController.getProjectsProgress);
router.patch('/projects/:id', managerController.updateProject);

// ── Tasks ─────────────────────────────────────────────────────────────────────
router.get('/tasks', managerController.getTasks);
router.post('/tasks', managerController.createTask);
router.patch('/tasks/:id', managerController.updateTask);
router.patch('/tasks/:id/status', managerController.updateTask);
router.patch('/tasks/:id/review', managerController.reviewTask);
router.get('/tasks/status-summary', managerController.getTasksStatusSummary);
// Unassigned tasks
router.get('/tasks/unassigned', managerController.getUnassignedTasks);
router.patch('/tasks/:id/assign', managerController.assignTask);

// ── Employees ─────────────────────────────────────────────────────────────────
router.get('/employees', managerController.getEmployees);
router.patch('/employees/:id/rate', managerController.rateEmployee);

// ── Rating endpoint (new — POST with body) ────────────────────────────────────
router.post('/rate-employee', managerController.rateEmployee);

// ── Performance ───────────────────────────────────────────────────────────────
router.get('/performance/me', managerController.getPerformanceMe);
router.get('/performance/team', managerController.getPerformanceTeam);
router.get('/performance/employee/:id', managerController.getEmployeePerformanceDetail);
router.get('/performance/ai-report', managerController.getManagerAIReport);
// Aliases for frontend compatibility
router.get('/performance/metrics', managerController.getPerformanceTeam);
router.get('/performance/velocity', managerController.getPerformanceMe);

// ── Daily Reports ─────────────────────────────────────────────────────────────
router.get('/reports', managerController.getDailyReports);
router.patch('/reports/:id/status', managerController.updateDailyReportStatus);
router.get('/daily-reports', managerController.getDailyReports);
router.patch('/daily-reports/:id/review', managerController.updateDailyReportStatus);

// ── Meeting Requests ──────────────────────────────────────────────────────────
router.get('/meetings/requests', managerController.getMeetingRequests);
router.post('/meetings/handle-request', managerController.handleMeetingRequest);

module.exports = router;
