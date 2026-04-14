const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { verifyCompanyScope } = require('../middleware/verifyCompanyScope');
const companyOverviewController = require('../controllers/companyOverviewController');

// All routes require auth, company admin role, and company scope
router.use(protect);
router.use(authorize('company_admin'));
router.use(verifyCompanyScope);

// Overview stats routes
router.get('/stats', companyOverviewController.getOverviewStats);
router.get('/projects/progress', companyOverviewController.getProjectsProgress);
router.get('/tasks/status-summary', companyOverviewController.getTasksStatusSummary);
router.get('/productivity/weekly', companyOverviewController.getWeeklyProductivity);
router.get('/deadlines/upcoming', companyOverviewController.getUpcomingDeadlines);
router.get('/activity/recent', companyOverviewController.getRecentActivity);
router.get('/performance-summary', companyOverviewController.getPerformanceSummary);
router.get('/hover/:type', companyOverviewController.getHoverDetails);

module.exports = router;
