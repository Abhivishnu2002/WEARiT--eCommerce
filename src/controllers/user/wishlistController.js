const Wishlist = require("../../models/wishlistModel")
const Product = require("../../models/productModel")
const Cart = require("../../models/cartModel")

const loadWishlist = async (req, res) => {
  if (!req.user || !req.user._id) {
    req.flash("error_msg", "Please login to view your wishlist")
    return res.redirect("/login")
  }

  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
      path: "products",
      populate: {
        path: "categoryId",
      },
    })

    if (!wishlist) {
      wishlist = { products: [] }
    }
    const validProducts = wishlist.products.filter(
      (product) => product && product.isActive && product.categoryId && product.categoryId.isListed,
    )

    res.render("pages/wishlist", { wishlist: { products: validProducts } })
  } catch (error) {
    console.error("Load wishlist error:", error)
    req.flash("error_msg", "Failed to load wishlist")
    res.redirect("/")
  }
}

const addToWishlist = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to add items to your wishlist",
      })
    }

    const { productId } = req.body

    const product = await Product.findById(productId).populate("categoryId")

    if (!product || !product.isActive || !product.categoryId || !product.categoryId.isListed) {
      return res.status(400).json({
        success: false,
        message: "Product is not available",
      })
    }
    let wishlist = await Wishlist.findOne({ user: req.user._id })

    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user._id, products: [] })
    }
    if (wishlist.products.includes(productId)) {
      return res.status(200).json({
        success: true,
        message: "Product already in wishlist",
        wishlistCount: wishlist.products.length,
      })
    }

    wishlist.products.push(productId)
    await wishlist.save()

    return res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      wishlistCount: wishlist.products.length,
    })
  } catch (error) {
    console.error("Add to wishlist error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}

const removeFromWishlist = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to remove items from your wishlist",
      })
    }

    const { productId } = req.body

    const wishlist = await Wishlist.findOne({ user: req.user._id })
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      })
    }

    wishlist.products = wishlist.products.filter((id) => id.toString() !== productId)

    await wishlist.save()

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      wishlistCount: wishlist.products.length,
    })
  } catch (error) {
    console.error("Remove from wishlist error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}

module.exports = {
  loadWishlist,
  addToWishlist,
  removeFromWishlist,
}
