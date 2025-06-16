const Cart = require("../../models/cartModel")
const Product = require("../../models/productModel")
const Category = require("../../models/categoryModel")
const Wishlist = require("../../models/wishlistModel")

const loadCart = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      req.flash("error_msg", "Please login to view your cart")
      return res.redirect("/login")
    }

    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: "products.product",
      populate: {
        path: "categoryId",
      },
    })

    if (!cart) {
      cart = { products: [] }
    }

    const validProducts = []
    for (const item of cart.products) {
      if (!item.product || !item.product.isActive || !item.product.categoryId || !item.product.categoryId.isListed) {
        continue
      }
      const freshProduct = await Product.findById(item.product._id).populate("categoryId")

      if (!freshProduct || !freshProduct.isActive || !freshProduct.categoryId || !freshProduct.categoryId.isListed) {
        continue
      }
      const variant = freshProduct.variants.find((v) => v.size === item.size)

      if (!variant) {
        continue
      }
      item.product = freshProduct
      item.inStock = variant.varientquatity > 0
      item.availableQuantity = variant.varientquatity
      if (item.quantity > variant.varientquatity) {
        item.quantity = Math.max(1, variant.varientquatity)
        await Cart.updateOne(
          { user: req.user._id, "products._id": item._id },
          { $set: { "products.$.quantity": item.quantity } },
        )
      }

      validProducts.push(item)
    }

    let subtotal = 0
    let totalDiscount = 0

    validProducts.forEach((item) => {
      const variant = item.product.variants.find((v) => v.size === item.size)
      if (variant) {
        const itemTotal = variant.varientPrice * item.quantity
        const discountAmount = (variant.varientPrice - variant.salePrice) * item.quantity

        subtotal += itemTotal
        totalDiscount += discountAmount
      }
    })

    const total = subtotal - totalDiscount

    res.render("pages/cart", {
      cart: {
        products: validProducts,
      },
      totals: {
        subtotal,
        discount: totalDiscount,
        total,
      },
    })
  } catch (error) {
    console.error("User loadCart error:", error)
    req.flash("error_msg", "Failed to load cart")
    res.redirect("/")
  }
}

const addToCart = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to add items to your cart",
      })
    }

    const { productId, size, quantity = 1 } = req.body

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      })
    }
    let selectedSize = size
    const product = await Product.findById(productId).populate("categoryId")

    if (!product || !product.isActive || !product.categoryId || !product.categoryId.isListed) {
      return res.status(400).json({
        success: false,
        message: "Product is not available",
      })
    }
    if (!selectedSize) {
      const availableVariant = product.variants.find((v) => v.varientquatity > 0)
      if (availableVariant) {
        selectedSize = availableVariant.size
      } else {
        return res.status(400).json({
          success: false,
          message: "No size selected and no sizes available in stock",
        })
      }
    }

    const variant = product.variants.find((v) => v.size === selectedSize)
    if (!variant) {
      return res.status(400).json({
        success: false,
        message: "Selected variant not available",
      })
    }

    if (variant.varientquatity < 1) {
      return res.status(400).json({
        success: false,
        message: "Selected variant is out of stock",
      })
    }

    let cart = await Cart.findOne({ user: req.user._id })

    if (!cart) {
      cart = new Cart({ user: req.user._id, products: [] })
    }

    const existingProduct = cart.products.find(
      (item) => item.product.toString() === productId && item.size === selectedSize,
    )

    if (existingProduct) {
      const newQuantity = existingProduct.quantity + Number.parseInt(quantity)
      const maxAllowed = Math.min(variant.varientquatity, 5)

      if (newQuantity > maxAllowed) {
        return res.status(400).json({
          success: false,
          message: `You can only add up to ${maxAllowed} units of this item (${variant.varientquatity} in stock)`,
        })
      }

      existingProduct.quantity = newQuantity
    } else {
      const requestedQuantity = Number.parseInt(quantity)
      if (requestedQuantity > variant.varientquatity) {
        return res.status(400).json({
          success: false,
          message: `Only ${variant.varientquatity} units available in stock`,
        })
      }

      cart.products.push({
        product: productId,
        size: selectedSize,
        quantity: requestedQuantity,
      })
    }

    await cart.save()
    try {
      const wishlist = await Wishlist.findOne({ user: req.user._id })
      if (wishlist && wishlist.products.includes(productId)) {
        wishlist.products = wishlist.products.filter((id) => id.toString() !== productId)
        await wishlist.save()
      }
    } catch (e) {
      console.error("User addToCart wishlist removal error:", e)
    }

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      cartCount: cart.products.length,
    })
  } catch (error) {
    console.error("User addToCart error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}

const updateCartQuantity = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to update your cart",
      })
    }

    const { productId, size, action } = req.body

    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      })
    }

    const cartItem = cart.products.find((item) => item.product.toString() === productId && item.size === size)

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      })
    }
    const product = await Product.findById(productId)
    if (!product || !product.isActive) {
      return res.status(400).json({
        success: false,
        message: "Product no longer available",
      })
    }

    const variant = product.variants.find((v) => v.size === size)

    if (!variant) {
      return res.status(400).json({
        success: false,
        message: "Product variant not available",
      })
    }
    if (variant.varientquatity < 1) {
      return res.status(400).json({
        success: false,
        message: "Product is out of stock",
      })
    }

    if (action === "increment") {
      const maxAllowed = Math.min(5, variant.varientquatity)

      if (cartItem.quantity >= maxAllowed) {
        return res.status(400).json({
          success: false,
          message: `Maximum quantity reached (${variant.varientquatity} in stock)`,
        })
      }

      cartItem.quantity += 1
    } else if (action === "decrement") {
      if (cartItem.quantity <= 1) {
        return res.status(400).json({
          success: false,
          message: "Minimum quantity is 1",
        })
      }

      cartItem.quantity -= 1
    }

    await cart.save()

    const price = variant.salePrice
    const itemTotal = price * cartItem.quantity

    return res.status(200).json({
      success: true,
      quantity: cartItem.quantity,
      itemTotal: itemTotal,
      inStock: variant.varientquatity > 0,
      availableStock: variant.varientquatity,
    })
  } catch (error) {
    console.error("User updateCartQuantity error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}

const removeFromCart = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to remove items from your cart",
      })
    }

    const { productId, size } = req.body

    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      })
    }

    cart.products = cart.products.filter((item) => !(item.product.toString() === productId && item.size === size))

    await cart.save()

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cartCount: cart.products.length,
    })
  } catch (error) {
    console.error("User removeFromCart error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}

const emptyCart = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Please sign in to empty your cart",
      })
    }

    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      })
    }

    cart.products = []
    await cart.save()

    return res.status(200).json({
      success: true,
      message: "Cart emptied successfully",
    })
  } catch (error) {
    console.error("User emptyCart error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}

const checkStock = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: "products.product",
      populate: {
        path: "categoryId",
      },
    })

    if (!cart || cart.products.length === 0) {
      return res.json({
        success: false,
        message: "Your cart is empty",
      })
    }

    const stockIssues = []
    const unavailableProducts = []

    for (const item of cart.products) {
      const freshProduct = await Product.findById(item.product._id).populate("categoryId")

      // Check if product is unlisted or inactive
      if (!freshProduct || !freshProduct.isActive) {
        unavailableProducts.push({
          productName: item.product.name,
          size: item.size,
          reason: "Product is no longer available",
        })
        continue
      }

      // Check if category is unlisted
      if (!freshProduct.categoryId || !freshProduct.categoryId.isListed) {
        unavailableProducts.push({
          productName: freshProduct.name,
          size: item.size,
          reason: "Product category is no longer available",
        })
        continue
      }

      // Check stock availability
      const variant = freshProduct.variants.find((v) => v.size === item.size)
      if (!variant) {
        stockIssues.push({
          productName: freshProduct.name,
          size: item.size,
          requestedQuantity: item.quantity,
          availableStock: 0,
          isPartialStock: false,
        })
        continue
      }

      if (variant.varientquatity === 0) {
        stockIssues.push({
          productName: freshProduct.name,
          size: item.size,
          requestedQuantity: item.quantity,
          availableStock: 0,
          isPartialStock: false,
        })
      } else if (variant.varientquatity < item.quantity) {
        stockIssues.push({
          productName: freshProduct.name,
          size: item.size,
          requestedQuantity: item.quantity,
          availableStock: variant.varientquatity,
          isPartialStock: true,
        })
      }
    }

    const hasStockIssues = stockIssues.length > 0
    const hasUnavailableProducts = unavailableProducts.length > 0

    return res.json({
      success: true,
      hasStockIssues,
      hasUnavailableProducts,
      stockIssues,
      unavailableProducts,
      message: hasStockIssues || hasUnavailableProducts
        ? "Some items in your cart have issues"
        : "All items are available",
    })
  } catch (error) {
    console.error("User checkStock error:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to validate stock",
    })
  }
}

module.exports = {
  loadCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  emptyCart,
  checkStock,
}
