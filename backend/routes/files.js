const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { verifyCompanyScope } = require('../middleware/verifyCompanyScope');
const fileController = require('../controllers/fileController');

// All routes require auth and company scope
router.use(protect);
router.use(verifyCompanyScope);

// File upload middleware
router.post('/upload', fileController.uploadMiddleware, fileController.uploadFile);

// File management routes
router.get('/', fileController.getUserFiles);
router.get('/stats', fileController.getFileStats);
router.get('/:fileId', fileController.getFileDetails);
router.get('/:fileId/download', fileController.downloadFile);
router.put('/:fileId', fileController.updateFile);
router.delete('/:fileId', fileController.deleteFile);

// File sharing
router.post('/:fileId/share', fileController.shareFile);

module.exports = router;
