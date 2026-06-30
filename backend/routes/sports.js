// sports.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { addSport, getTurfSports, updateSport, deleteSport, getPredefinedSports } = require('../controllers/sportController');

router.get('/predefined', getPredefinedSports);
router.get('/turf/:turfId', getTurfSports);
router.use(protect);
router.post('/', authorize('owner', 'admin'), addSport);
router.put('/:id', authorize('owner', 'admin'), updateSport);
router.delete('/:id', authorize('owner', 'admin'), deleteSport);

module.exports = router;
