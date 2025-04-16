const express = require('express');
const router = express.Router();
const { auth } = require('../../controllers');
const { isAdminAuthenticated } = require('../../middlewares/authMiddleware');

// Auth routes
router.get('/login', auth.loadLogin);
router.post('/login', auth.verifyLogin);
router.get('/logout', auth.logout);
router.get('/change-password', isAdminAuthenticated, auth.loadChangePassword);
router.post('/update-password', isAdminAuthenticated, auth.updatePassword);

module.exports = router;