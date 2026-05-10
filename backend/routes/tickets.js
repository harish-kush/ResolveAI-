const router = require('express').Router();
const { getTickets, getTicket, createTicket, updateTicket, addNote, getAISummary, getTicketStats } = require('../controllers/ticketController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getTickets);
router.get('/stats', protect, getTicketStats);
router.get('/:id', protect, getTicket);
router.post('/', protect, createTicket);
router.put('/:id', protect, updateTicket);
router.post('/:id/notes', protect, addNote);
router.get('/:id/ai-summary', protect, getAISummary);

module.exports = router;
