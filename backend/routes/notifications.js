const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { verifyCompanyScope } = require('../middleware/verifyCompanyScope');
const notificationController = require('../controllers/notificationController');

router.use(protect);
router.use(verifyCompanyScope);

router.post('/broadcast', notificationController.broadcastNotification);
router.delete('/broadcast/:id', notificationController.deleteBroadcast);
router.get('/', notificationController.listNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
