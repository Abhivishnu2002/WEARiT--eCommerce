const express = require("express")
const router = express.Router()
const productController = require("../../controllers/productController")
const { isAdminLoggedIn } = require("../../middlewares/adminAuth")
const upload = require("../../middlewares/upload/index")
const productUpload = require("../../middlewares/upload/productUpload")

// Product routes
router.get("/products", isAdminLoggedIn, productController.loadProducts)
router.get("/add-product", isAdminLoggedIn, productController.loadAddProducts)
router.post("/add-product", isAdminLoggedIn, productUpload.array("images", 5), productController.addProduct)
router.get("/edit-product", isAdminLoggedIn, productController.loadEditProducts)
router.post("/update-product/:id", isAdminLoggedIn, productUpload.array("images", 5), productController.updateProduct)
router.delete("/delete-product/:id", isAdminLoggedIn, productController.deleteProduct)
router.patch("/toggle-product-listing/:id", isAdminLoggedIn, productController.loadProducts)

module.exports = router
