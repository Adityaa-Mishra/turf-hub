const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getTurfs, getTurf, createTurf, updateTurf,
  deleteTurf, getMyTurfs, getAvailableSlots, deleteTurfImage
} = require('../controllers/turfController');

// Public routes
router.get('/', getTurfs);
router.get('/slots', getAvailableSlots);
router.get('/:id', getTurf);

// Protected routes
router.use(protect);
router.get('/owner/my-turfs', authorize('owner', 'admin'), getMyTurfs);
router.post('/', authorize('owner', 'admin'), upload.array('images', 5), createTurf);
router.put('/:id', authorize('owner', 'admin'), upload.array('images', 5), updateTurf);
router.delete('/:id/images/:imageId', authorize('owner', 'admin'), deleteTurfImage);
router.delete('/:id', authorize('owner', 'admin'), deleteTurf);

module.exports = router;
