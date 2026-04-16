const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { verifyCompanyScope } = require('../middleware/verifyCompanyScope');
const peopleController = require('../controllers/peopleController');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for file import
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv', '.docx', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported. Allowed: ${allowed.join(', ')}`));
    }
  },
});

router.use(protect);
router.use(verifyCompanyScope);

router.get('/', authorize('company_admin', 'manager'), peopleController.listPeople);
router.get('/:id', authorize('company_admin', 'manager'), peopleController.getPersonDetail);

router.post(
  '/',
  authorize('company_admin'),
  [
    body('fullName').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('role').isIn(['manager', 'employee', 'client']).withMessage('Invalid role'),
  ],
  peopleController.addPerson
);

router.post('/import', authorize('company_admin'), upload.single('file'), peopleController.bulkImport);

router.put('/:id', authorize('company_admin'), peopleController.updatePerson);
router.put('/:id/deactivate', authorize('company_admin'), peopleController.deactivatePerson);
router.post('/:id/resend-email', authorize('company_admin'), peopleController.resendWelcomeEmail);

module.exports = router;
