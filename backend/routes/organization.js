const router = require('express').Router();
const {
  getOrganization,
  updateOrganization,
  getMembers,
  updateMember,
  removeMember,
  getWidgetConfig,
  getEmailStatus,
  sendTestEmail
} = require('../controllers/organizationController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getOrganization);
router.put('/', protect, authorize('admin'), updateOrganization);
router.get('/members', protect, getMembers);
router.put('/members/:memberId', protect, authorize('admin'), updateMember);
router.delete('/members/:memberId', protect, authorize('admin'), removeMember);
router.get('/email/status', protect, authorize('admin'), getEmailStatus);
router.post('/email/test', protect, authorize('admin'), sendTestEmail);
router.get('/widget/:slug', getWidgetConfig);

module.exports = router;
