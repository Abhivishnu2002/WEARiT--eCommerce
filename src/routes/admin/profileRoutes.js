const express = require('express');
const router = express.Router();
const { profile } = require('../../controllers');
const { isAdminAuthenticated } = require('../../middlewares/authMiddleware');

// Profile routes
router.get('/account', isAdminAuthenticated, profile.loadAccount);
router.get('/edit-account', isAdminAuthenticated, profile.loadEditAccount);
router.post('/update-account', isAdminAuthenticated, profile.updateAccount);

module.exports = router;