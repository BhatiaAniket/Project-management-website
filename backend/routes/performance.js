const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { verifyCompanyScope } = require('../middleware/verifyCompanyScope');
const performanceController = require('../controllers/performanceController');

router.use(protect);
router.use(verifyCompanyScope);

router.get('/', authorize('company_admin'), performanceController.listPerformance);
router.get('/:userId', authorize('company_admin'), performanceController.getIndividualPerformance);
router.post('/:userId/ai-summary', authorize('company_admin'), performanceController.generateAISummary);

module.exports = router;
