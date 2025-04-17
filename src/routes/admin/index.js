const express = require("express")
const router = express.Router()

// Import all route modules
const authRoutes = require("./authRoutes")
const profileRoutes = require("./profileRoutes")
const dashboardRoutes = require("./dashboardRoutes")
const customerRoutes = require("./customerRoutes")
const categoryRoutes = require("./categoryRoutes")
const productRoutes = require("./productRoutes")

// Use the routes
// Auth routes
router.use("/", authRoutes)

// Profile routes
router.use("/", profileRoutes)

// Dashboard route
router.use("/", dashboardRoutes)

// Customer routes
router.use("/", customerRoutes)

// Category routes
router.use("/", categoryRoutes)

// Product routes
router.use("/", productRoutes)

module.exports = router
