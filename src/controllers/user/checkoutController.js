const Cart = require("../../models/cartModel")
const Address = require("../../models/addressModel")
const Product = require("../../models/productModel")
const Order = require("../../models/orderModel")
const User = require("../../models/userModel")
const Transaction = require("../../models/transactionModel")
const Coupon = require("../../models/couponModel")
const getWishlistCount = require("../../utils/wishlistCount")
const couponController = require("./couponController")
const PriceCalculator = require("../../utils/priceCalculator")

const priceCalculator = new PriceCalculator()

function generateOrderID() {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = ("0" + (date.getMonth() + 1)).slice(-2)
  const day = ("0" + date.getDate()).slice(-2)
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")
  return `ORD${year}${month}${day}${random}`
}

function normalizePaymentMethod(order) {
  if (!order.paymentMethod && order.paymentMentod) {
    order.paymentMethod = order.paymentMentod
  }
  return order.paymentMethod || "COD"
}

const loadCheckout = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id })

    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: "products.product",
      populate: {
        path: "categoryId",
      },
    })

    if (!cart || cart.products.length === 0) {
      req.flash("error_msg", "Your cart is empty")
      return res.redirect("/cart")
    }

    const validProducts = []
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
        })
        continue
      }

      if (variant.varientquatity === 0) {
        stockIssues.push({
          productName: freshProduct.name,
          size: item.size,
          requestedQuantity: item.quantity,
          availableStock: 0,
        })
        continue
      } else if (variant.varientquatity < item.quantity) {
        stockIssues.push({
          productName: freshProduct.name,
          size: item.size,
          requestedQuantity: item.quantity,
          availableStock: variant.varientquatity,
        })
        continue
      }

      // Product is valid and has sufficient stock
      item.product = freshProduct
      validProducts.push(item)
    }

    // If there are unavailable products or stock issues, redirect to cart with error messages
    if (unavailableProducts.length > 0) {
      let errorMessage = "Some products in your cart are no longer available: "
      errorMessage += unavailableProducts.map(item => `${item.productName} (${item.size})`).join(", ")
      req.flash("error_msg", errorMessage)
      return res.redirect("/cart")
    }

    if (stockIssues.length > 0) {
      let errorMessage = "Stock issues detected: "
      const outOfStockItems = stockIssues.filter(issue => issue.availableStock === 0)
      const partialStockItems = stockIssues.filter(issue => issue.availableStock > 0)

      if (outOfStockItems.length > 0) {
        errorMessage += outOfStockItems.map(item => `${item.productName} (${item.size}) is out of stock`).join(", ")
      }

      if (partialStockItems.length > 0) {
        if (outOfStockItems.length > 0) errorMessage += "; "
        errorMessage += partialStockItems.map(item =>
          `${item.productName} (${item.size}) - only ${item.availableStock} available`
        ).join(", ")
      }

      req.flash("error_msg", errorMessage)
      return res.redirect("/cart")
    }

    if (validProducts.length === 0) {
      req.flash("error_msg", "No valid products in your cart")
      return res.redirect("/cart")
    }
    const couponDiscount = Number(req.session.couponDiscount) || 0
    const appliedCoupon = req.session.coupon || null

    const totals = priceCalculator.calculateCheckoutTotals(validProducts, couponDiscount)

    const currentDate = new Date()
    const availableCouponsCount = await Coupon.countDocuments({
      isActive: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      $or: [{ userSpecific: false }, { userSpecific: true, applicableUsers: req.user._id }],
      minimumPurchase: { $lte: totals.saleTotal },
    })

    const wishlistCount = await getWishlistCount(req.user._id)

    res.render("pages/checkout", {
      addresses,
      cart: {
        products: validProducts,
      },
      totals: {
        subtotal: totals.subtotal,
        discount: totals.totalDiscount,
        shipping: totals.shippingCharge,
        finalAmount: totals.finalAmount,
        canUseCOD: totals.canUseCOD,
      },
      user: req.user,
      wishlistCount,
      availableCouponsCount,
      couponDiscount,
      appliedCoupon,
      messages: req.flash(),
      activePage: "checkout",
    })
  } catch (error) {
    console.error("User loadCheckout error:", error)
    req.flash("error_msg", "Failed to load checkout page")
    res.redirect("/cart")
  }
}

const loadPayment = async (req, res) => {
  try {
    const { addressId, orderId } = req.query

    if (!addressId && !orderId) {
      req.flash("error_msg", "Please select a delivery address")
      return res.redirect("/checkout")
    }

    let address, order

    if (orderId) {
      order = await Order.findOne({
        _id: orderId,
        user: req.user._id,
        paymentStatus: { $in: ["pending", "failed"] },
      })

      if (!order) {
        req.flash("error_msg", "Order not found or cannot be modified")
        return res.redirect("/checkout")
      }
      address = await Address.findById(order.address)
    } else {
      address = await Address.findOne({ _id: addressId, user: req.user._id })
      if (!address) {
        req.flash("error_msg", "Invalid address selected")
        return res.redirect("/checkout")
      }
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: "products.product",
      populate: {
        path: "categoryId",
      },
    })

    if (!cart || cart.products.length === 0) {
      req.flash("error_msg", "Your cart is empty")
      return res.redirect("/cart")
    }

    const validProducts = []
    for (const item of cart.products) {
      const freshProduct = await Product.findById(item.product._id).populate("categoryId")
      if (freshProduct && freshProduct.isActive && freshProduct.categoryId && freshProduct.categoryId.isListed) {
        const variant = freshProduct.variants.find((v) => v.size === item.size)
        if (variant && variant.varientquatity >= item.quantity) {
          item.product = freshProduct
          validProducts.push(item)
        } else {
          req.flash(
            "error_msg",
            `Not enough stock for ${freshProduct.name} (${item.size}). Only ${variant ? variant.varientquatity : 0} available.`,
          )
          return res.redirect("/cart")
        }
      }
    }
    const couponDiscount = Number(req.session.couponDiscount) || 0
    const appliedCoupon = req.session.coupon || null

    const totals = priceCalculator.calculateCheckoutTotals(validProducts, couponDiscount)

    const wishlistCount = await getWishlistCount(req.user._id)

    res.render("pages/payment", {
      addressId: address._id,
      orderId: orderId || null,
      cart: {
        products: validProducts,
      },
      totals: {
        subtotal: totals.subtotal,
        discount: totals.totalDiscount,
        shipping: totals.shippingCharge,
        finalAmount: totals.finalAmount,
        canUseCOD: totals.canUseCOD,
      },
      couponDiscount,
      appliedCoupon,
      user: req.user,
      wishlistCount,
      messages: req.flash(),
      activePage: "payment",
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error("User loadPayment error:", error)
    req.flash("error_msg", "Failed to load payment page")
    res.redirect("/checkout")
  }
}

const placeOrder = async (req, res) => {
  try {
    let { addressId, paymentMethod } = req.body
    if (Array.isArray(paymentMethod)) {
      paymentMethod = paymentMethod[0]
    }

    if (!addressId) {
      req.flash("error_msg", "Please select a delivery address")
      return res.redirect("/checkout")
    }

    if (!paymentMethod) {
      req.flash("error_msg", "Please select a payment method")
      return res.redirect("/payment?addressId=" + addressId)
    }

    const address = await Address.findOne({ _id: addressId, user: req.user._id })
    if (!address) {
      req.flash("error_msg", "Invalid address selected")
      return res.redirect("/checkout")
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate("products.product")
    if (!cart || cart.products.length === 0) {
      req.flash("error_msg", "Your cart is empty")
      return res.redirect("/cart")
    }

    const validProducts = []
    let subtotal = 0
    let totalDiscount = 0

    for (const item of cart.products) {
      const product = await Product.findById(item.product._id)
      if (!product || !product.isActive) continue

      const variant = product.variants.find((v) => v.size === item.size)
      if (!variant || variant.varientquatity < item.quantity) {
        req.flash(
          "error_msg",
          `Not enough stock for ${product.name} (${item.size}). Only ${variant ? variant.varientquatity : 0} available.`,
        )
        return res.redirect("/checkout")
      }

      const itemTotal = variant.varientPrice * item.quantity
      const discountAmount = (variant.varientPrice - variant.salePrice) * item.quantity

      subtotal += itemTotal
      totalDiscount += discountAmount

      validProducts.push({
        product: product._id,
        variant: {
          size: item.size,
          varientPrice: variant.varientPrice,
          salePrice: variant.salePrice,
        },
        quantity: item.quantity,
        status: "pending",
      })
    }

    const couponDiscount = Number(req.session.couponDiscount) || 0
    const appliedCoupon = req.session.coupon || null
    const saleTotal = subtotal - totalDiscount
    const shippingCharge = saleTotal >= 1000 ? 0 : 200
    const finalAmount = saleTotal - couponDiscount + shippingCharge
    const paymentValidation = priceCalculator.validatePaymentMethod(paymentMethod, saleTotal)
    if (!paymentValidation.valid) {
      req.flash("error_msg", paymentValidation.message)
      return res.redirect("/payment?addressId=" + addressId)
    }

    const orderID = generateOrderID()
    const orderData = {
      user: req.user._id,
      orderID: orderID,
      products: validProducts,
      address: {
        addressId: addressId,
        name: address.name,
        mobile: address.mobile,
        pincode: address.pincode,
        address: address.address,
        city: address.city,
        state: address.state,
      },
      totalAmount: subtotal,
      discount: totalDiscount,
      finalAmount: Math.round(finalAmount * 100) / 100,
      paymentMethod: paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      orderDate: new Date(),
      isTemporary: ["paypal", "razorpay"].includes(paymentMethod),
    }

    if (appliedCoupon) {
      orderData.coupon = {
        couponId: appliedCoupon.id,
        code: appliedCoupon.code,
        discountAmount: appliedCoupon.discountAmount,
        discountType: appliedCoupon.discountType,
        discountValue: appliedCoupon.discountValue,
        description: appliedCoupon.description,
      }
    }

    const order = new Order(orderData)
    await order.save()

    if (paymentMethod === "COD") {
      const stockUpdateOperations = []
      for (const item of cart.products) {
        const product = await Product.findById(item.product._id)
        if (!product || !product.isActive) continue

        const variant = product.variants.find((v) => v.size === item.size)
        if (variant) {
          variant.varientquatity -= item.quantity
          stockUpdateOperations.push(product.save())
        }
      }
      await Promise.all(stockUpdateOperations)

      await Transaction.create({
        user: req.user._id,
        order: order._id,
        transactionId: `COD-${Date.now()}`,
        paymentMethod: "COD",
        amount: finalAmount,
        status: "pending",
        paymentDetails: {
          type: "order_payment",
          description: `Cash on Delivery payment for order #${orderID}`,
        },
      })

      if (appliedCoupon) {
        await couponController.processCouponUsage(req.user._id, appliedCoupon.id, order._id)
      }

      if (req.session.coupon) {
        delete req.session.coupon
      }
      req.session.couponDiscount = 0

      await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { products: [] } })
      return res.redirect(`/order-success/${order._id}`)
    } else if (paymentMethod === "wallet") {
      const user = await User.findById(req.user._id)

      if (!user.wallet || user.wallet.balance < finalAmount) {
        order.paymentStatus = "failed"
        await order.save()

        req.flash("error_msg", "Insufficient wallet balance")
        return res.redirect(`/order-failure/${order._id}`)
      }

      const stockUpdateOperations = []
      for (const item of cart.products) {
        const product = await Product.findById(item.product._id)
        if (!product || !product.isActive) continue

        const variant = product.variants.find((v) => v.size === item.size)
        if (variant) {
          variant.varientquatity -= item.quantity
          stockUpdateOperations.push(product.save())
        }
      }
      await Promise.all(stockUpdateOperations)

      user.wallet.balance -= finalAmount
      user.wallet.transactions.push({
        amount: finalAmount,
        type: "debit",
        description: `Payment for order #${orderID}`,
        date: new Date(),
      })

      await user.save()

      order.paymentStatus = "completed"
      order.isTemporary = false
      order.paymentDetails = {
        transactionId: `WALLET-${Date.now()}`,
        paymentMethod: "wallet",
        amount: finalAmount,
        currency: "INR",
        status: "completed",
        createdAt: new Date(),
      }

      await order.save()

      await Transaction.create({
        user: req.user._id,
        order: order._id,
        transactionId: `WALLET-${Date.now()}`,
        paymentMethod: "wallet",
        amount: finalAmount,
        status: "completed",
        paymentDetails: {
          type: "order_payment",
          description: `Payment for order #${orderID}`,
        },
      })

      if (appliedCoupon) {
        await couponController.processCouponUsage(req.user._id, appliedCoupon.id, order._id)
      }

      if (req.session.coupon) {
        delete req.session.coupon
      }
      req.session.couponDiscount = 0

      await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { products: [] } })
      return res.redirect(`/order-success/${order._id}`)
    } else if (paymentMethod === "paypal" || paymentMethod === "razorpay") {
      return res.redirect(`/payment?orderId=${order._id}`)
    } else {
      return res.redirect(`/payment?orderId=${order._id}`)
    }
  } catch (error) {
    console.error("User placeOrder error:", error)
    req.flash("error_msg", "Failed to place order: " + error.message)
    res.redirect("/checkout")
  }
}

const orderSuccess = async (req, res) => {
  try {
    const orderId = req.params.id

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      paymentStatus: { $ne: "failed" },
    }).populate("address")

    if (!order) {
      req.flash("error_msg", "Order not found or payment failed")
      return res.redirect("/orders")
    }

    const paymentMethod = normalizePaymentMethod(order)
    if (order.paymentMethod !== paymentMethod) {
      order.paymentMethod = paymentMethod
      await order.save()
    }

    if (order.paymentMethod === "COD" && order.paymentStatus !== "pending") {
      order.paymentStatus = "pending"
      await order.save()
    }

    if (["wallet", "razorpay"].includes(order.paymentMethod) && order.paymentStatus !== "completed") {
      order.paymentStatus = "completed"
      await order.save()
    }

    if (order.isTemporary) {
      order.isTemporary = false
      await order.save()
    }

    const wishlistCount = await getWishlistCount(req.user._id)

    res.render("pages/order-success", {
      user: req.user,
      order: order,
      wishlistCount,
      activePage: "orders",
      messages: req.flash(),
    })
  } catch (error) {
    console.error("User loadOrderSuccess error:", error)
    req.flash("error_msg", "Error loading order success page: " + error.message)
    res.redirect("/orders")
  }
}

module.exports = {
  loadCheckout,
  loadPayment,
  placeOrder,
  orderSuccess,
  normalizePaymentMethod,
}
