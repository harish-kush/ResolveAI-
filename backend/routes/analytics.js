const router = require('express').Router();
const { getDashboardStats, getDetailedAnalytics } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, getDashboardStats);
router.get('/detailed', protect, authorize('admin', 'super_admin'), getDetailedAnalytics);

module.exports = router;
