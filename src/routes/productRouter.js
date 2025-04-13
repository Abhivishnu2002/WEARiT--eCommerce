const express = require('express');
const productController = require('../controllers/productController.js');

const router = express.Router();

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductDetails);

module.exports = router;