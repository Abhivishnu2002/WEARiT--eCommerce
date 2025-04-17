const express = require("express")
const router = express.Router()
const profileController = require("../../controllers/profileController")
const { isAdminLoggedIn } = require("../../middlewares/adminAuth")
const upload = require("../../middlewares/upload/index")
const { product } = require("../../controllers")
const productUpload = require("../../middlewares/upload/productUpload")

// Profile routes
router.get("/account", isAdminLoggedIn, profileController.loadAccount)
router.get("/edit-account", isAdminLoggedIn, profileController.loadEditAccount)
router.post("/update-account", isAdminLoggedIn, productUpload.single("profileImage"), profileController.updateAccount)

module.exports = router
