const express = require('express');
const router = express.Router();
const { customer } = require('../../controllers');
const { isAdminAuthenticated } = require('../../middlewares/authMiddleware');

// Customer routes
router.get('/customer', isAdminAuthenticated, customer.loadCustomer);
router.get('/customer/details', isAdminAuthenticated, customer.loadCustomerDetails);
router.patch('/customer/block-unblock/:id', isAdminAuthenticated, customer.blockUnblockUser);

module.exports = router;