const router = require('express').Router();
const { register, login, getMe, refreshToken, inviteMember } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);
router.post('/invite', protect, authorize('admin', 'super_admin'), inviteMember);

module.exports = router;
