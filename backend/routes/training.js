const router = require('express').Router();
const { getTrainingData, addTrainingData, updateTrainingData, deleteTrainingData, crawlWebsite, testAI } = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getTrainingData);
router.post('/', protect, authorize('admin'), addTrainingData);
router.put('/:id', protect, authorize('admin'), updateTrainingData);
router.delete('/:id', protect, authorize('admin'), deleteTrainingData);
router.post('/crawl', protect, authorize('admin'), crawlWebsite);
router.post('/test', protect, testAI);

module.exports = router;
