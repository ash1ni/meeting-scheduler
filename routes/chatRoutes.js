const express = require('express');
const { chatWithUser, saveConversation, summarizeUserMessage, saveMeetingDetails } = require('../controllers/chatController');
const router = express.Router();

router.post('/chat', chatWithUser);
router.post('/save-conversation', saveConversation);
router.post('/summarize', summarizeUserMessage);
router.post('/save-meeting-details', saveMeetingDetails);

module.exports = router;