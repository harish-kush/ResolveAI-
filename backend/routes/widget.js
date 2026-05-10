const router = require('express').Router();
const { widgetStartConversation, widgetSendMessage, contactForm } = require('../controllers/widgetController');
const { widgetLimiter } = require('../middleware/rateLimiter');

router.post('/start', widgetLimiter, widgetStartConversation);
router.post('/message', widgetLimiter, widgetSendMessage);
router.post('/contact', widgetLimiter, contactForm);

module.exports = router;
