async function getWishlistCount(userId) {
  try {
    const Wishlist = require("../models/wishlistModel")
    const wishlist = await Wishlist.findOne({ user: userId })
    return wishlist ? wishlist.products.length : 0
  } catch (error) {
    console.error("Error getting wishlist count:", error)
    return 0
  }
}

module.exports = getWishlistCount
