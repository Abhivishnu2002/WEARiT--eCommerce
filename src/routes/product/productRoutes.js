const express = require("express")
const router = express.Router()
const productController = require("../../controllers/productController")

// Product routes
router.get("/", productController.loadProducts)
router.get("/:id", productController.loadAddProducts)

module.exports = router
