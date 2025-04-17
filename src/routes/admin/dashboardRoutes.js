const express = require("express")
const router = express.Router()
const dashboardController = require("../../controllers/dashboardController")
const { isAdminLoggedIn } = require("../../middlewares/adminAuth")

// Dashboard route
router.get("/dashboard", isAdminLoggedIn, dashboardController.loadDashboard)

module.exports = router
