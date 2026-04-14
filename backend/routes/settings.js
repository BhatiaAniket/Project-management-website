const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { verifyCompanyScope } = require('../middleware/verifyCompanyScope');
const settingsController = require('../controllers/settingsController');

router.use(protect);
router.use(verifyCompanyScope);

router.get('/company', authorize('company_admin'), settingsController.getCompanyProfile);
router.put('/company', authorize('company_admin'), settingsController.updateCompanyProfile);

router.put(
  '/password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  settingsController.changePassword
);

router.put('/notifications', settingsController.updateNotificationPreferences);
router.post('/deactivate', authorize('company_admin'), settingsController.deactivateCompany);

module.exports = router;
