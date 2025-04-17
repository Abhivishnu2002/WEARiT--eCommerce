const express = require("express")
const router = express.Router()
const adminController = require("../../controllers/authController")
const { isAdminLoggedOut, isAdminLoggedIn } = require("../../middlewares/adminAuth")

// Auth routes
router.get("/login", isAdminLoggedOut, adminController.loadLogin)
router.post("/login", isAdminLoggedOut, adminController.verifyLogin)
router.get("/logout", isAdminLoggedIn, adminController.logout)
router.get("/change-password", isAdminLoggedIn, adminController.loadChangePassword)
router.post("/update-password", isAdminLoggedIn, adminController.updatePassword)

module.exports = router
