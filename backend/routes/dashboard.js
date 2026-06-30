const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getOwnerDashboard, getCustomerDashboard, getAdminDashboard } = require('../controllers/dashboardController');

router.use(protect);
router.get('/owner', authorize('owner', 'admin'), getOwnerDashboard);
router.get('/customer', authorize('customer'), getCustomerDashboard);
router.get('/admin', authorize('admin'), getAdminDashboard);

module.exports = router;
