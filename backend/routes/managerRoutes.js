const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const managerController = require('../controllers/managerController');

// All manager routes require authentication
router.use(protect);
router.use(authorize('manager', 'company_admin')); // Assuming company_admin can also view this if they somehow hit the route, but primarily manager

// Overview stats
router.get('/overview-stats', managerController.getOverviewStats);

// Projects
router.get('/projects/progress', managerController.getProjectsProgress);
router.patch('/projects/:id', managerController.updateProject);

// Tasks
router.get('/tasks', managerController.getTasks);
router.patch('/tasks/:id', managerController.updateTask);
router.get('/tasks/status-summary', managerController.getTasksStatusSummary);

// Employees
router.get('/employees', managerController.getEmployees);

// Daily Reports
router.get('/reports', managerController.getDailyReports);
router.patch('/reports/:id/status', managerController.updateDailyReportStatus);

// Meeting Requests
router.get('/meetings/requests', managerController.getMeetingRequests);
router.post('/meetings/handle-request', managerController.handleMeetingRequest);

module.exports = router;
