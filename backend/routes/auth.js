const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');

// ━━━ REGISTER ━━━
router.post(
  '/register',
  [
    body('companyName')
      .trim()
      .notEmpty()
      .withMessage('Company name is required'),
    body('companyLocation')
      .trim()
      .notEmpty()
      .withMessage('Company location is required'),
    body('employeeCount')
      .optional()
      .isIn(['1-10', '11-50', '51-200', '200+'])
      .withMessage('Invalid employee count range'),
    body('companyIndustry').optional().trim(),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  ],
  authController.register
);

// ━━━ LOGIN ━━━
router.post(
  '/login',
  loginLimiter,
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

// ━━━ VERIFY EMAIL ━━━
router.get('/verify-email/:token', authController.verifyEmail);

// ━━━ RESEND VERIFICATION ━━━
router.post(
  '/resend-verification',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
  ],
  authController.resendVerification
);

// ━━━ LOGOUT ━━━
router.post('/logout', authController.logout);

// ━━━ REFRESH TOKEN ━━━
router.post('/refresh-token', authController.refreshToken);

// ━━━ CHANGE PASSWORD (first login) ━━━
const { protect } = require('../middleware/auth');
router.post('/change-password', protect, authController.changePassword);

module.exports = router;
