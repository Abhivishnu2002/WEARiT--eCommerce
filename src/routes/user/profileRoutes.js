const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const { ensureAuthenticated } = require('../../middlewares/userAuth');


router.get('/account', ensureAuthenticated, userController.loadAccount);
router.get('/wishlist', ensureAuthenticated, userController.loadWishlist);
router.get('/cart', ensureAuthenticated, userController.loadCart);

module.exports = router;