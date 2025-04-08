const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { route } = require('./userRoutes');

router.get("/login", adminController.loadLogin);
router.get("/dashboard", adminController.loadDashboard);
router.get("/category", adminController.loadCategory);
router.get("/products", adminController.loadProducts);

module.exports = router;