const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createReview, getTurfReviews, replyToReview, deleteReview } = require('../controllers/reviewController');

router.get('/:turfId', getTurfReviews);
router.use(protect);
router.post('/', authorize('customer'), createReview);
router.put('/:id/reply', authorize('owner'), replyToReview);
router.delete('/:id', deleteReview);

module.exports = router;
