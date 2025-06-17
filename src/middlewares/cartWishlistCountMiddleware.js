const Cart = require("../models/cartModel")
const Wishlist = require("../models/wishlistModel")

const getCartWishlistCounts = async (req, res, next) => {
  try {
    let cartCount = 0
    let wishlistCount = 0
    if (req.user && req.user._id) {
      const cart = await Cart.findOne({ user: req.user._id })
      if (cart && cart.products) {
        cartCount = cart.products.length
      }
      const wishlist = await Wishlist.findOne({ user: req.user._id })
      if (wishlist && wishlist.products) {
        wishlistCount = wishlist.products.length
      }
    }
    res.locals.cartCount = cartCount
    res.locals.wishlistCount = wishlistCount

    next()
  } catch (error) {
    res.locals.cartCount = 0
    res.locals.wishlistCount = 0
    next()
  }
}

const getCartCount = async (userId) => {
  try {
    const cart = await Cart.findOne({ user: userId })
    return cart && cart.products ? cart.products.length : 0
  } catch (error) {
    return 0
  }
}

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
