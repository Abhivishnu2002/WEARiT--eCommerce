const Cart = require("../../models/cartModel")
const Address = require("../../models/addressModel")
const Product = require("../../models/productModel")
const Order = require("../../models/orderModel")
const User = require("../../models/userModel")
const Transaction = require("../../models/transactionModel")
const Coupon = require("../../models/couponModel")
const UserCoupon = require("../../models/userCouponModel")
const getWishlistCount = require("../../utils/wishlistCount")
const couponController = require("./couponController")

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
    for (const item of cart.products) {
      const freshProduct = await Product.findById(item.product._id).populate("categoryId")
      if (freshProduct && freshProduct.isActive && freshProduct.categoryId && freshProduct.categoryId.isListed) {
        item.product = freshProduct
        validProducts.push(item)
      }
    }

    if (validProducts.length === 0) {
      req.flash("error_msg", "No valid products in your cart")
      return res.redirect("/cart")
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

    const couponDiscount = req.session.couponDiscount || 0
    const appliedCoupon = req.session.coupon || null
    const shippingCharge = subtotal - totalDiscount > 500 ? 0 : 50
    const finalAmount = (subtotal - totalDiscount - couponDiscount + shippingCharge).toFixed(2)
    const currentDate = new Date()
    const availableCouponsCount = await Coupon.countDocuments({
      isActive: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      $or: [{ userSpecific: false }, { userSpecific: true, applicableUsers: req.user._id }],
      minimumPurchase: { $lte: subtotal - totalDiscount },
    })

    const wishlistCount = await getWishlistCount(req.user._id)

    res.render("pages/checkout", {
      addresses,
      cart: {
        products: validProducts,
      },
      totals: {
        subtotal,
        discount: totalDiscount,
        shipping: shippingCharge,
        finalAmount,
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
    console.error("Checkout error:", error)
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

    const couponDiscount = req.session.couponDiscount || 0
    const appliedCoupon = req.session.coupon || null

    const shippingCharge = subtotal - totalDiscount > 500 ? 0 : 50
    const finalAmount = (subtotal - totalDiscount - couponDiscount + shippingCharge).toFixed(2)

    const wishlistCount = await getWishlistCount(req.user._id)

    res.render("pages/payment", {
      addressId: address._id,
      orderId: orderId || null,
      cart: {
        products: validProducts,
      },
      totals: {
        subtotal,
        discount: totalDiscount,
        shipping: shippingCharge,
        finalAmount,
      },
      couponDiscount,
      appliedCoupon,
      user: req.user,
      wishlistCount,
      messages: req.flash(),
      activePage: "payment",
    })
  } catch (error) {
    console.error("Payment page error:", error)
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
    const couponDiscount = req.session.couponDiscount || 0
    const appliedCoupon = req.session.coupon || null

    const shippingCharge = subtotal - totalDiscount > 500 ? 0 : 50
    const finalAmount = subtotal - totalDiscount - couponDiscount + shippingCharge
    const orderID = generateOrderID()
    const orderData = {
      user: req.user._id,
      orderID: orderID,
      products: validProducts,
      address: addressId,
      totalAmount: subtotal,
      discount: totalDiscount,
      finalAmount: finalAmount,
      paymentMethod: paymentMethod,
      paymentStatus: "pending",
      orderStatus: "pending",
      orderDate: new Date(),
      isTemporary: paymentMethod === "paypal",
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
    } else if (paymentMethod === "paypal") {
      return res.redirect(`/payment?orderId=${order._id}`)
    } else {
      return res.redirect(`/payment?orderId=${order._id}`)
    }
  } catch (error) {
    console.error("Place order error:", error)
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

    if (order.paymentMethod === "wallet" && order.paymentStatus !== "completed") {
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
    console.error("Error loading order success page:", error)
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
