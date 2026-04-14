const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { verifyCompanyScope } = require('../middleware/verifyCompanyScope');
const { cacheMiddleware } = require('../middleware/cache');
const companyController = require('../controllers/companyController');

// All routes require auth + company scope
router.use(protect);
router.use(verifyCompanyScope);

router.get('/overview', authorize('company_admin'), cacheMiddleware(60), companyController.getOverview);
router.get('/details', authorize('company_admin'), companyController.getCompanyDetails);
router.put('/profile', authorize('company_admin'), companyController.updateProfile);
router.get('/activity', authorize('company_admin'), companyController.getActivityLog);

// Chart data endpoints
router.get('/projects/progress', authorize('company_admin'), companyController.getProjectsProgress);
router.get('/tasks/status-summary', authorize('company_admin'), companyController.getTasksStatusSummary);
router.get('/productivity/weekly', authorize('company_admin'), companyController.getWeeklyProductivity);

// File import endpoint
router.post('/people/import', authorize('company_admin'), companyController.importPeople);

module.exports = router;
