const router = require('express').Router();
const { getConversations, getMessages, sendMessage, takeOver, resolveConversation } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getConversations);
router.get('/:id/messages', protect, getMessages);
router.post('/:id/messages', protect, sendMessage);
router.post('/:id/takeover', protect, takeOver);
router.post('/:id/resolve', protect, resolveConversation);

module.exports = router;
