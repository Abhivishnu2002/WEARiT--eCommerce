const express = require('express');
const router = express.Router();
const searchController = require('../controllers/user/searchController');


router.get('/search', searchController.searchProducts);

module.exports = router;