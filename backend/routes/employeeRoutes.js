const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');
const verifyOwnership = require('../middleware/verifyOwnership');

// Restrict all routes to employees
router.use(protect);
router.use(authorize('employee'));

// Ensure company context
router.use((req, res, next) => {
  req.companyId = req.user.company;
  next();
});

// Overview
router.get('/overview/stats', employeeController.getOverviewStats);
router.get('/overview/deadlines', employeeController.getUpcomingDeadlines);
router.get('/overview/meetings', employeeController.getUpcomingMeetings);

// Tasks
router.get('/tasks', employeeController.getTasks);
router.patch('/tasks/:id/status', verifyOwnership('Task', 'assignedTo'), employeeController.updateTaskStatus);

// Daily Reports
router.get('/reports', employeeController.getDailyReports);
router.post('/reports', employeeController.submitDailyReport);

// Meetings
router.get('/meetings', employeeController.getMeetings);
router.post('/meetings/request', employeeController.requestMeeting);
router.get('/meetings/requests', employeeController.getMeetingRequests);

// Colleagues (for drop downs)
router.get('/colleagues', employeeController.getColleagues);

// Performance
router.get('/performance', employeeController.getPerformance);

module.exports = router;
