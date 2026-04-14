const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { verifyCompanyScope } = require('../middleware/verifyCompanyScope');
const chatController = require('../controllers/chatController');

// Chat file uploads
const chatUploadsDir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}

const upload = multer({
  dest: chatUploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.use(protect);
router.use(verifyCompanyScope);

router.get('/conversations', chatController.listConversations);
router.post('/conversations', chatController.createConversation);
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/conversations/:conversationId/messages', upload.single('file'), chatController.sendMessage);

module.exports = router;
