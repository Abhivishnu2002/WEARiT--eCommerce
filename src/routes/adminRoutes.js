const express = require('express');
const router = express.Router();
const authController = require('../controllers/admin/authController')
const productController = require('../controllers/admin/productController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const orderController = require('../controllers/admin/orderController');
const couponController = require('../controllers/admin/couponController');
const salesReportController = require('../controllers/admin/salesReportController');
const { ensureAuthenticated, isAdminLoggedIn, isAdminLoggedOut, verifyAdminSession } = require('../middlewares/auth');
const csrf = require("../middlewares/csrfMiddleware")
const upload = require('../middlewares/uploadMiddleware');

router.use(csrf.generateToken)

router.get("/login", isAdminLoggedOut, authController.loadLogin);
router.post("/login", isAdminLoggedOut, authController.verifyLogin);
router.get("/logout", isAdminLoggedIn, authController.logout);
router.get("/dashboard", verifyAdminSession, authController.loadDashboard)
router.get("/dashboard/data", verifyAdminSession, authController.getDashboardData)
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
router.post("/update-product-offer", verifyAdminSession, productController.updateProductOffer);
router.delete("/deleteproduct/:id", verifyAdminSession, productController.deleteProduct);
router.put("/toggle-product-listing/:id", verifyAdminSession, productController.toggleProductListing);

router.get('/orders', verifyAdminSession, orderController.getAllOrders);
router.get('/orders/clear-filters', verifyAdminSession, orderController.clearFilters);
router.get('/orders/:id', verifyAdminSession, orderController.getOrderDetails);
router.post('/orders/update-status/:id', verifyAdminSession, orderController.updateOrderStatus);
router.post('/orders/process-return', verifyAdminSession, orderController.processReturnRequest);
router.get('/orders/:id/invoice', verifyAdminSession, orderController.generateInvoice);

router.get("/coupons", verifyAdminSession, couponController.getAllCoupons)
router.get("/coupons/add", verifyAdminSession, couponController.loadAddCoupon)
router.post("/coupons/add", verifyAdminSession, couponController.createCoupon)
router.get("/coupons/edit/:id", verifyAdminSession, couponController.loadEditCoupon)
router.post("/coupons/edit/:id", verifyAdminSession, couponController.updateCoupon)
router.post("/coupons/toggle-status/:id", verifyAdminSession, couponController.toggleCouponStatus)
router.delete("/coupons/delete/:id", verifyAdminSession, couponController.deleteCoupon)

router.get("/sales-report", verifyAdminSession, salesReportController.getSalesReport)
router.get("/sales-report/download-pdf", verifyAdminSession, salesReportController.downloadPDF)
router.get("/sales-report/download-excel", verifyAdminSession, salesReportController.downloadExcel)

router.get('/inventory', verifyAdminSession, orderController.getInventoryStatus);
router.post('/inventory/update-stock', verifyAdminSession, orderController.updateProductStock);

module.exports = router;