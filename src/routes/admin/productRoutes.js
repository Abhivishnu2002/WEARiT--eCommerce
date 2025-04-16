const express = require('express');
const router = express.Router();
const { product } = require('../../controllers');
const { isAdminAuthenticated } = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/uploadMiddleware');

// Product routes
router.get('/products', isAdminAuthenticated, product.loadProducts);
router.get('/add-product', isAdminAuthenticated, product.loadAddProducts);
router.post('/add-product', isAdminAuthenticated, upload.array('images', 5), product.addProduct);
router.get('/edit-product', isAdminAuthenticated, product.loadEditProducts);
router.post('/update-product/:id', isAdminAuthenticated, upload.array('images', 5), product.updateProduct);
router.delete('/delete-product/:id', isAdminAuthenticated, product.deleteProduct);
router.patch('/toggle-product-listing/:id', isAdminAuthenticated, product.toggleProductListing);

module.exports = router;