const express = require("express")
const router = express.Router()
const categoryController = require("../../controllers/categoryController")
const { isAdminLoggedIn } = require("../../middlewares/adminAuth")
const upload = require("../../middlewares/upload/index");
const categoryUpload = require("../../middlewares/upload/categoryUpload");

// Category routes
router.get("/category", isAdminLoggedIn, categoryController.loadCategory)
router.get("/add-category", isAdminLoggedIn, categoryController.loadAddCategory)
router.post("/add-category", isAdminLoggedIn, categoryUpload.single("image"), categoryController.addCategory)
router.get("/edit-category", isAdminLoggedIn, categoryController.loadEditCategory)
router.post("/update-category/:id", isAdminLoggedIn, categoryUpload.single("image"), categoryController.updateCategory)
router.delete("/delete-category/:id", isAdminLoggedIn, categoryController.deleteCategory)

module.exports = router
