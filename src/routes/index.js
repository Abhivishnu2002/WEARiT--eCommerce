const express = require("express")
const router = express.Router()

// Import route modules
const userAuthRoutes = require("./user/authRoutes")
const userProfileRoutes = require("./user/profileRoutes")
const pageRoutes = require("./user/pageRoutes")
const productRoutes = require("./product/productRoutes")

// Apply routes
// Page routes (home, about, contact)
router.use("/", pageRoutes)

// User authentication routes
router.use("/", userAuthRoutes)

// User profile routes
router.use("/", userProfileRoutes)

// Product routes
router.use("/products", productRoutes)

module.exports = router
