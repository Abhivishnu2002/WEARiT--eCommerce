const express = require("express")
const router = express.Router()
const customerController = require("../../controllers/customerController");
const { isAdminLoggedIn } = require("../../middlewares/adminAuth")

// Customer routes
router.get("/customer", isAdminLoggedIn, customerController.loadCustomer)
router.get("/customer/details", isAdminLoggedIn, customerController.loadCustomerDetails)
router.patch("/customer/block-unblock/:id", isAdminLoggedIn, customerController.blockUnblockUser)

module.exports = router
