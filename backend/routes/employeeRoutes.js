const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');

// All routes require employee authentication
router.use(protect);
router.use(authorize('employee'));

// ── Overview ──────────────────────────────────────────────────────────────────
router.get('/overview/stats', employeeController.getOverviewStats);
router.get('/overview/deadlines', employeeController.getUpcomingDeadlines);
router.get('/overview/meetings', employeeController.getUpcomingMeetings);

// ── Tasks ─────────────────────────────────────────────────────────────────────
router.get('/tasks', employeeController.getTasks);
router.patch('/tasks/:id/status', employeeController.updateTaskStatus);

// ── Daily Reports ─────────────────────────────────────────────────────────────
router.get('/reports', employeeController.getDailyReports);
router.post('/reports', employeeController.submitDailyReport);
// Aliases
router.get('/daily-reports', employeeController.getDailyReports);
router.post('/daily-report', employeeController.submitDailyReport);

// ── Meetings ──────────────────────────────────────────────────────────────────
router.get('/meetings', employeeController.getMeetings);
router.post('/meetings/request', employeeController.requestMeeting);
router.get('/meetings/requests', employeeController.getMeetingRequests);

// ── Colleagues ────────────────────────────────────────────────────────────────
router.get('/colleagues', employeeController.getColleagues);

// ── Performance ───────────────────────────────────────────────────────────────
router.get('/performance', employeeController.getPerformance);
router.get('/performance/ai-report', employeeController.getPerformanceAIReport);

module.exports = router;
