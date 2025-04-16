const express = require('express');
const router = express.Router();
const { dashboard } = require('../../controllers');
const { isAdminAuthenticated } = require('../../middlewares/authMiddleware');

// Dashboard route
router.get('/dashboard', isAdminAuthenticated, dashboard.loadDashboard);

module.exports = router;