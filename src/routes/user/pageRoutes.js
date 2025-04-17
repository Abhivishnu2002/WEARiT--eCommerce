const express = require("express")
const router = express.Router()
const userController = require("../../controllers/userController")

// Public page routes
router.get("/", userController.loadHome)
router.get("/about", userController.loadAbout)
router.get("/contact", userController.loadContact)

module.exports = router
