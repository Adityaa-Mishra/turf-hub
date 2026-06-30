const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createBooking, getBookings, getBooking,
  acceptBooking, declineBooking, cancelBooking
} = require('../controllers/bookingController');

router.use(protect);

router.post('/', authorize('customer'), createBooking);
router.get('/', getBookings);
router.get('/:id', getBooking);
router.put('/:id/accept', authorize('owner', 'admin'), acceptBooking);
router.put('/:id/decline', authorize('owner', 'admin'), declineBooking);
router.delete('/:id', cancelBooking);

module.exports = router;
