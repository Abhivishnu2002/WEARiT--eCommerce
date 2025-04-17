const express = require("express")
const router = express.Router()
const userController = require("../../controllers/userController")
const { forwardAuthenticated } = require("../../middlewares/userAuth")

router.get("/account", forwardAuthenticated, userController.loadAccount)

module.exports = router
