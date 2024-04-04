const express = require('express');
const { chatWithUser, saveConversation, summarizeUserMessage } = require('../controllers/chatController');
const router = express.Router();

router.post('/chat', chatWithUser);
router.post('/save-conversation', saveConversation);
router.post('/summarize', summarizeUserMessage);

module.exports = router;