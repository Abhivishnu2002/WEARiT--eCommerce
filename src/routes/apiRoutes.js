const express = require('express');
const router = express.Router();
const searchController = require('../controllers/user/searchController');
const { ensureAuthenticated } = require('../middlewares/auth');

router.get('/search', searchController.searchProducts);

module.exports = router;