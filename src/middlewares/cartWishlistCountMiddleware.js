const Cart = require("../models/cartModel")
const Wishlist = require("../models/wishlistModel")

/**
 * Middleware to get cart and wishlist counts for authenticated users
 * and make them available in all templates
 */
const getCartWishlistCounts = async (req, res, next) => {
  try {
    // Initialize counts
    let cartCount = 0
    let wishlistCount = 0

    // Only get counts for authenticated users
    if (req.user && req.user._id) {
      // Get cart count
      const cart = await Cart.findOne({ user: req.user._id })
      if (cart && cart.products) {
        cartCount = cart.products.length
      }

      // Get wishlist count
      const wishlist = await Wishlist.findOne({ user: req.user._id })
      if (wishlist && wishlist.products) {
        wishlistCount = wishlist.products.length
      }
    }

    // Make counts available in all templates
    res.locals.cartCount = cartCount
    res.locals.wishlistCount = wishlistCount

    next()
  } catch (error) {
    // Set default values on error
    res.locals.cartCount = 0
    res.locals.wishlistCount = 0
    next()
  }
}

/**
 * Get cart count for a specific user
 */
const getCartCount = async (userId) => {
  try {
    const cart = await Cart.findOne({ user: userId })
    return cart && cart.products ? cart.products.length : 0
  } catch (error) {
    return 0
  }
}

/**
 * Get wishlist count for a specific user
 */
const getWishlistCount = async (userId) => {
  try {
    const wishlist = await Wishlist.findOne({ user: userId })
    return wishlist && wishlist.products ? wishlist.products.length : 0
  } catch (error) {
    return 0
  }
}

module.exports = {
  getCartWishlistCounts,
  getCartCount,
  getWishlistCount,
}
