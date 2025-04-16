// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdminLoggedIn, isAdminLoggedOut, verifyAdminSession } = require('../middlewares/auth');
const upload = require('../middlewares/uploadMiddleware');


router.get("/login", isAdminLoggedOut, adminController.loadLogin);
router.post("/login", isAdminLoggedOut, adminController.verifyLogin);
router.get("/logout", isAdminLoggedIn, adminController.logout);
router.get("/dashboard", verifyAdminSession, adminController.loadDashboard);
router.get("/account", verifyAdminSession, adminController.loadAccount);
router.get("/editaccount", verifyAdminSession, adminController.loadEditAccount);
router.post("/editaccount", verifyAdminSession, adminController.updateAccount);
router.get("/changepassword", verifyAdminSession, adminController.loadChangePassword);
router.post("/changepassword", verifyAdminSession, adminController.updatePassword);
router.get("/customer", verifyAdminSession, adminController.loadCustomer);
router.get("/customerdetails", verifyAdminSession, adminController.loadCustomerDetails);
router.post("/block-unblock-user/:id", verifyAdminSession, adminController.blockUnblockUser);
router.get("/category", verifyAdminSession, adminController.loadCategory);
router.get("/addcategory", verifyAdminSession, adminController.loadAddCategory);
router.post("/addcategory", verifyAdminSession, upload.single('image'), adminController.addCategory);
router.get("/editcategory", verifyAdminSession, adminController.loadEditCategory);
router.post("/editcategory", verifyAdminSession, upload.single('image'), adminController.updateCategory);
router.delete("/deletecategory/:id", verifyAdminSession, adminController.deleteCategory);
router.get("/products", verifyAdminSession, adminController.loadProducts);
router.get("/addproducts", verifyAdminSession, adminController.loadAddProducts);
router.post("/addproducts", verifyAdminSession, upload.array('images', 4), adminController.addProduct);
router.get("/editproducts", verifyAdminSession, adminController.loadEditProducts);
router.post("/editproducts", verifyAdminSession, upload.array('images', 4), adminController.updateProduct);
router.delete("/deleteproduct/:id", verifyAdminSession, adminController.deleteProduct);
router.put("/toggle-product-listing/:id", verifyAdminSession, adminController.toggleProductListing);

module.exports = router;