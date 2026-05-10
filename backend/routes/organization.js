const router = require('express').Router();
const { getOrganization, updateOrganization, getMembers, updateMember, removeMember, getWidgetConfig } = require('../controllers/organizationController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getOrganization);
router.put('/', protect, authorize('admin', 'super_admin'), updateOrganization);
router.get('/members', protect, getMembers);
router.put('/members/:memberId', protect, authorize('admin', 'super_admin'), updateMember);
router.delete('/members/:memberId', protect, authorize('admin', 'super_admin'), removeMember);
router.get('/widget/:slug', getWidgetConfig);

module.exports = router;
