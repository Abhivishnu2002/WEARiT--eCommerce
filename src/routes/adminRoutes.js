
const express = require('express');
const router = express.Router();
const authController = require('../controllers/admin/authController')
const productController = require('../controllers/admin/productController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const { ensureAuthenticated, isAdminLoggedIn, isAdminLoggedOut, verifyAdminSession } = require('../middlewares/auth');
const upload = require('../middlewares/uploadMiddleware');


router.get("/login", isAdminLoggedOut, authController.loadLogin);
router.post("/login", isAdminLoggedOut, authController.verifyLogin);
router.get("/logout", isAdminLoggedIn, authController.logout);
router.get("/dashboard", verifyAdminSession, authController.loadDashboard);
router.get("/account", verifyAdminSession, authController.loadAccount);
router.get("/editaccount", verifyAdminSession, authController.loadEditAccount);
router.post("/editaccount", verifyAdminSession, authController.updateAccount);
router.get("/changepassword", verifyAdminSession, authController.loadChangePassword);
router.post("/changepassword", verifyAdminSession, authController.updatePassword);


router.get("/customer", verifyAdminSession, customerController.loadCustomer);
router.get("/customerdetails/:id", verifyAdminSession, customerController.loadCustomerDetails);
router.post("/block-unblock-user/:id", verifyAdminSession, customerController.blockUnblockUser);


router.get("/category", verifyAdminSession, categoryController.loadCategory)
router.get("/addcategory", verifyAdminSession, categoryController.loadAddCategory)
router.post("/addcategory", verifyAdminSession, categoryController.addCategory)
router.get("/editcategory", verifyAdminSession, categoryController.loadEditCategory)
router.post("/editcategory/:id", verifyAdminSession, categoryController.updateCategory)
router.delete("/deletecategory/:id", verifyAdminSession, categoryController.deleteCategory)
router.post("/toggle-category-listing/:id", verifyAdminSession, categoryController.toggleCategoryListing)


router.get("/products", verifyAdminSession, productController.loadProducts);
router.get("/addproducts", verifyAdminSession, productController.loadAddProducts);
router.post('/addproducts', verifyAdminSession, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'additionalImage1', maxCount: 1 },
  { name: 'additionalImage2', maxCount: 1 },
  { name: 'additionalImage3', maxCount: 1 }
]), productController.addProduct);
router.get("/editproducts", verifyAdminSession, productController.loadEditProducts);
router.post('/editproducts', verifyAdminSession, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'additionalImage1', maxCount: 1 },
  { name: 'additionalImage2', maxCount: 1 },
  { name: 'additionalImage3', maxCount: 1 }
]), productController.updateProduct);
router.delete("/deleteproduct/:id", verifyAdminSession, productController.deleteProduct);
router.put("/toggle-product-listing/:id", verifyAdminSession, productController.toggleProductListing);

module.exports = router;