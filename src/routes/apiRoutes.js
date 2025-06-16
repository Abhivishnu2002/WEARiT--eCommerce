const express = require('express');
const router = express.Router();
const searchController = require('../controllers/user/searchController');
const { ensureAuthenticated } = require('../middlewares/auth');
const { getCartCount, getWishlistCount } = require('../middlewares/cartWishlistCountMiddleware');

router.get('/search', searchController.searchProducts);

// Get cart and wishlist counts for authenticated users
router.get('/cart-wishlist-counts', async (req, res) => {
  try {
    let cartCount = 0;
    let wishlistCount = 0;

    if (req.user && req.user._id) {
      cartCount = await getCartCount(req.user._id);
      wishlistCount = await getWishlistCount(req.user._id);
    }

    res.json({
      success: true,
      cartCount,
      wishlistCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get counts',
      cartCount: 0,
      wishlistCount: 0
    });
  }
});

module.exports = router;