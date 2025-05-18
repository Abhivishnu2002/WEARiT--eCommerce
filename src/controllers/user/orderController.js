const Order = require("../../models/orderModel")
const Product = require("../../models/productModel")
const User = require("../../models/userModel")
const Cart = require("../../models/cartModel")
const Transaction = require("../../models/transactionModel")
const { generateInvoice } = require("../../utils/invoiceGenerator")
const mongoose = require("mongoose")
const getWishlistCount = require("../../utils/wishlistCount")

function getStatusClass(status) {
  switch (status.toLowerCase()) {
    case "pending":
      return "status-pending"
    case "processing":
      return "status-processing"
    case "shipped":
      return "status-shipped"
    case "out for delivery":
      return "status-out-for-delivery"
    case "delivered":
      return "status-delivered"
    case "cancelled":
      return "status-cancelled"
    case "return pending":
      return "status-return-pending"
    case "returned":
      return "status-returned"
    default:
      return "status-pending"
  }
}

function getStatusIcon(status) {
  switch (status.toLowerCase()) {
    case "pending":
      return "fa-clipboard-list"
    case "processing":
      return "fa-cogs"
    case "shipped":
      return "fa-shipping-fast"
    case "out for delivery":
      return "fa-truck"
    case "delivered":
      return "fa-box-open"
    case "cancelled":
      return "fa-times-circle"
    case "return pending":
      return "fa-undo-alt"
    case "returned":
      return "fa-check-circle"
    default:
      return "fa-clipboard-list"
  }
}

function isStepActive(currentStatus, step) {
  const statusOrder = {
    pending: 0,
    shipped: 1,
    "out for delivery": 2,
    delivered: 3,
    cancelled: -1,
    "return pending": 4,
    returned: 5,
  }

  const currentStatusValue = statusOrder[currentStatus.toLowerCase()] || 0
  const stepValue = statusOrder[step.toLowerCase()] || 0

  return currentStatusValue === stepValue
}

function isStepComplete(currentStatus, step) {
  const statusOrder = {
    pending: 0,
    shipped: 1,
    "out for delivery": 2,
    delivered: 3,
    cancelled: -1,
    "return pending": 4,
    returned: 5,
  }

  const currentStatusValue = statusOrder[currentStatus.toLowerCase()] || 0
  const stepValue = statusOrder[step.toLowerCase()] || 0

  if (currentStatus.toLowerCase() === "cancelled") {
    return step.toLowerCase() === "pending"
  }

  return currentStatusValue > stepValue
}

function canCancelOrder(status) {
  const nonCancellableStatuses = ["delivered", "cancelled", "returned", "return pending"]
  return !nonCancellableStatuses.includes(status.toLowerCase())
}

function normalizePaymentMethod(order) {
  if (!order.paymentMethod && order.paymentMentod) {
    order.paymentMethod = order.paymentMentod
  }
  return order.paymentMethod || "COD"
}

const getOrdersPage = async (req, res) => {
  try {
    const user = req.user

    if (!user) {
      return res.redirect("/login")
    }

    const page = Number.parseInt(req.query.page) || 1
    const limit = 10
    const skip = (page - 1) * limit

    const searchQuery = {}
    if (req.query.search) {
      searchQuery.$or = [
        { orderID: { $regex: req.query.search, $options: "i" } },
        { orderStatus: { $regex: req.query.search, $options: "i" } },
      ]
    }

    const query = {
      user: user._id,
      ...searchQuery,
    }

    const wishlistCount = await getWishlistCount(user._id)

    const totalOrders = await Order.countDocuments(query)
    const totalPages = Math.ceil(totalOrders / limit)

    const orders = await Order.find(query)
      .populate({
        path: "products.product",
        select: "name images price",
      })
      .populate("address")
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)

    orders.forEach((order) => {
      normalizePaymentMethod(order)
    })

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await Order.deleteMany({
      isTemporary: true,
      createdAt: { $lt: twentyFourHoursAgo },
    })

    res.render("pages/orders", {
      user,
      wishlistCount,
      orders,
      activePage: "orders",
      currentPage: page,
      totalPages,
      search: req.query.search || "",
    })
  } catch (error) {
    console.error("Error fetching orders:", error)
    req.flash("error_msg", "Error fetching orders")
    res.status(500).render("error", {
      message: "Error fetching orders",
      error,
    })
  }
}

const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    })
      .populate({
        path: "products.product",
        select: "name images price variants brand",
      })
      .populate("address")

    if (!order) {
      req.flash("error_msg", "Order not found")
      return res.redirect("/orders")
    }

    const paymentMethod = normalizePaymentMethod(order)
    if (order.paymentMethod !== paymentMethod) {
      order.paymentMethod = paymentMethod
      await order.save()
    }

    const wishlistCount = await getWishlistCount(req.user._id)

    let regularTotal = 0
    let discountTotal = 0
    let saleTotal = 0

    const statusCounts = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
      "return pending": 0,
    }

    order.products.forEach((product) => {
      const status = product.status || "pending"
      statusCounts[status.toLowerCase()] = (statusCounts[status.toLowerCase()] || 0) + 1

      if (product.status !== "cancelled" && product.status !== "returned") {
        const regularPrice = product.variant.varientPrice * product.quantity
        const salePrice = product.variant.salePrice * product.quantity
        regularTotal += regularPrice
        discountTotal += regularPrice - salePrice
        saleTotal += salePrice
      }
    })

    let overallStatus = order.orderStatus
    const totalProducts = order.products.length

    if (statusCounts.cancelled === totalProducts) {
      overallStatus = "cancelled"
    } else if (statusCounts.returned === totalProducts) {
      overallStatus = "returned"
    } else if (statusCounts["return pending"] > 0) {
      overallStatus = "return pending"
    } else if (statusCounts.delivered === totalProducts) {
      overallStatus = "delivered"
    } else if (statusCounts.shipped > 0) {
      overallStatus = "shipped"
    } else if (statusCounts.processing > 0) {
      overallStatus = "processing"
    } else {
      overallStatus = "pending"
    }

    if (order.orderStatus !== overallStatus) {
      order.orderStatus = overallStatus
      await order.save()
    }

    const shippingCharge = saleTotal > 2000 ? 0 : 50

    const couponDiscount = order.coupon ? order.coupon.discountAmount : 0
    const couponInfo = order.coupon
      ? {
          code: order.coupon.code,
          discountAmount: order.coupon.discountAmount,
          discountType: order.coupon.discountType,
          discountValue: order.coupon.discountValue,
          description: order.coupon.description,
        }
      : null

    const grandTotal = saleTotal - couponDiscount + shippingCharge

    const canBeCancelled =
      statusCounts.delivered === 0 &&
      statusCounts.returned === 0 &&
      statusCounts["return pending"] === 0 &&
      overallStatus !== "cancelled" &&
      order.paymentStatus !== "failed"

    const canBeReturned =
      statusCounts.delivered === totalProducts &&
      statusCounts.cancelled === 0 &&
      statusCounts.returned === 0 &&
      statusCounts["return pending"] === 0

    const formattedOrder = {
      _id: order._id,
      orderID: order.orderID,
      orderDate: order.orderDate,
      status: overallStatus,
      products: order.products,
      address: order.address,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      regularTotal: regularTotal,
      itemsTotal: saleTotal,
      discount: discountTotal,
      couponDiscount: couponDiscount,
      couponInfo: couponInfo,
      shippingCharge: shippingCharge,
      grandTotal: grandTotal,
      trackingDetails: order.trackingDetails || null,
      canBeCancelled: canBeCancelled,
      canBeReturned: canBeReturned,
      canDownloadInvoice: order.paymentStatus !== "pending" && order.paymentStatus !== "failed",
    }

    res.render("pages/order-details", {
      user: req.user,
      order: formattedOrder,
      wishlistCount,
      activePage: "orders",
    })
  } catch (error) {
    console.error("Error fetching order details:", error)
    req.flash("error_msg", "Error fetching order details")
    res.status(500).render("error", {
      message: "Error fetching order details",
      error,
    })
  }
}

const getOrderInvoice = async (req, res) => {
  try {
    const orderId = req.params.id

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    })
      .populate({
        path: "products.product",
        select: "name images price variants",
      })
      .populate("address")

    if (!order) {
      req.flash("error_msg", "Order not found")
      return res.redirect("/orders")
    }

    if (order.paymentStatus === "pending" || order.paymentStatus === "failed") {
      req.flash("error_msg", "Invoice is only available after payment is completed")
      return res.redirect(`/orders/details/${orderId}`)
    }

    const paymentMethod = normalizePaymentMethod(order)
    if (order.paymentMethod !== paymentMethod) {
      order.paymentMethod = paymentMethod
      await order.save()
    }

    await generateInvoice({
      order,
      user: req.user,
      res,
      isAdmin: false,
    })
  } catch (error) {
    console.error("Error generating invoice:", error)
    req.flash("error_msg", "Error generating invoice")
    res.status(500).render("error", {
      message: "Error generating invoice",
      error,
    })
  }
}

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id
    const { reason } = req.body

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    }).populate({
      path: "products.product",
      select: "name variants",
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (order.paymentStatus === "failed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel order with failed payment. Please retry payment first.",
      })
    }

    const hasDeliveredProducts = order.products.some(
      (product) =>
        product.status === "delivered" || product.status === "returned" || product.status === "return pending",
    )

    if (hasDeliveredProducts) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel order with delivered or returned products",
      })
    }

    if (order.orderStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      })
    }

    const paymentMethod = normalizePaymentMethod(order)
    if (order.paymentMethod !== paymentMethod) {
      order.paymentMethod = paymentMethod
    }

    order.orderStatus = "cancelled"
    order.cancellationReason = reason || "No reason provided"
    order.products.forEach((product) => {
      product.status = "cancelled"
      product.cancellationReason = reason || "Order cancelled"
    })

    for (const product of order.products) {
      const productDoc = await Product.findById(product.product)
      if (productDoc) {
        const variant = productDoc.variants.find((v) => v.size === product.variant.size)
        if (variant) {
          variant.varientquatity += product.quantity
          await productDoc.save()
        }
      }
    }

    if (order.paymentMethod === "online" || order.paymentMethod === "paypal") {
      const refundAmount = order.finalAmount

      const user = await User.findById(req.user._id)
      if (user) {
        if (!user.wallet) {
          user.wallet = {
            balance: 0,
            transactions: [],
          }
        }

        user.wallet.balance += refundAmount
        user.wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          description: `Refund for cancelled order #${order.orderID}`,
          date: new Date(),
        })

        await user.save()

        await Transaction.create({
          user: req.user._id,
          order: order._id,
          transactionId: `REFUND-${Date.now()}`,
          paymentMethod: "wallet",
          amount: refundAmount,
          status: "completed",
          paymentDetails: {
            type: "refund",
            description: `Refund for cancelled order #${order.orderID}`,
          },
        })
      }
    }

    await order.save()

    res.json({
      success: true,
      message: "Order cancelled successfully",
    })
  } catch (error) {
    console.error("Error cancelling order:", error)
    res.status(500).json({
      success: false,
      message: "Error cancelling order",
    })
  }
}

const returnOrder = async (req, res) => {
  try {
    const orderId = req.params.id
    const { reason } = req.body

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Return reason is required",
      })
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (order.paymentStatus === "failed") {
      return res.status(400).json({
        success: false,
        message: "Cannot return order with failed payment. Please retry payment first.",
      })
    }

    const paymentMethod = normalizePaymentMethod(order)
    if (order.paymentMethod !== paymentMethod) {
      order.paymentMethod = paymentMethod
      await order.save()
    }

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned",
      })
    }

    const deliveryDate = order.deliveryDate || order.updatedAt
    const returnWindowDays = 7
    const returnWindowClosed = new Date() > new Date(deliveryDate.getTime() + returnWindowDays * 24 * 60 * 60 * 1000)

    if (returnWindowClosed) {
      return res.status(400).json({
        success: false,
        message: `Return window of ${returnWindowDays} days has expired`,
      })
    }

    order.orderStatus = "return pending"
    order.returnReason = reason

    order.products.forEach((product) => {
      if (product.status === "delivered") {
        product.status = "return pending"
        product.returnReason = reason
        product.returnRequestDate = new Date()
      }
    })

    await order.save()

    if (order.paymentMethod === "online" || order.paymentMethod === "paypal") {
      let refundAmount = 0
      order.products.forEach((product) => {
        if (product.status === "return pending") {
          refundAmount += product.variant.salePrice * product.quantity
        }
      })

      if (refundAmount > 0) {
        const user = await User.findById(req.user._id)
        if (user) {
          if (!user.wallet) {
            user.wallet = {
              balance: 0,
              transactions: [],
            }
          }

          user.wallet.transactions.push({
            amount: refundAmount,
            type: "credit",
            description: `[PENDING] Refund for returned order #${order.orderID}`,
            date: new Date(),
          })

          await user.save()
        }
      }
    }

    res.json({
      success: true,
      message: "Return request submitted successfully",
    })
  } catch (error) {
    console.error("Error returning order:", error)
    res.status(500).json({
      success: false,
      message: "Error submitting return request",
    })
  }
}

const returnProduct = async (req, res) => {
  try {
    const orderId = req.params.orderId
    const productId = req.params.productId
    const { reason } = req.body

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Return reason is required",
      })
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    }).populate({
      path: "products.product",
      select: "name variants",
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (order.paymentStatus === "failed") {
      return res.status(400).json({
        success: false,
        message: "Cannot return products from an order with failed payment. Please retry payment first.",
      })
    }

    const paymentMethod = normalizePaymentMethod(order)
    if (order.paymentMethod !== paymentMethod) {
      order.paymentMethod = paymentMethod
      await order.save()
    }

    const productItem = order.products.id(productId)
    if (!productItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in order",
      })
    }

    if (productItem.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered products can be returned",
      })
    }

    const deliveryDate = order.deliveryDate || order.updatedAt
    const returnWindowDays = 7
    const returnWindowClosed = new Date() > new Date(deliveryDate.getTime() + returnWindowDays * 24 * 60 * 60 * 1000)

    if (returnWindowClosed) {
      return res.status(400).json({
        success: false,
        message: `Return window of ${returnWindowDays} days has expired`,
      })
    }

    productItem.status = "return pending"
    productItem.returnReason = reason
    productItem.returnRequestDate = new Date()

    const statusCounts = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
      "return pending": 0,
    }

    order.products.forEach((product) => {
      const status = product.status || "pending"
      statusCounts[status.toLowerCase()] = (statusCounts[status.toLowerCase()] || 0) + 1
    })

    if (statusCounts["return pending"] > 0) {
      order.orderStatus = "return pending"
    }

    await order.save()

    if (order.paymentMethod === "online" || order.paymentMethod === "paypal") {
      const refundAmount = productItem.variant.salePrice * productItem.quantity

      const user = await User.findById(req.user._id)
      if (user) {
        if (!user.wallet) {
          user.wallet = {
            balance: 0,
            transactions: [],
          }
        }

        user.wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          description: `[PENDING] Refund for returned item in order #${order.orderID}`,
          date: new Date(),
        })

        await user.save()
      }
    }

    res.json({
      success: true,
      message: "Return request submitted successfully",
    })
  } catch (error) {
    console.error("Error returning product:", error)
    res.status(500).json({
      success: false,
      message: "Error returning product",
    })
  }
}

const reorderItems = async (req, res) => {
  try {
    const orderId = req.params.id

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    }).populate({
      path: "products.product",
      select: "name images price variants",
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    let cart = await Cart.findOne({ user: req.user._id })
    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        products: [],
      })
    }

    let productsAdded = 0

    for (const orderProduct of order.products) {
      if (!orderProduct.product) continue
      const product = await Product.findById(orderProduct.product._id)
      if (!product) continue
      const variant = product.variants.find((v) => v.size === orderProduct.variant.size)
      if (!variant || variant.varientquatity < 1) continue

      const existingProductIndex = cart.products.findIndex(
        (p) => p.product.toString() === product._id.toString() && p.size === orderProduct.variant.size,
      )
      if (existingProductIndex > -1) {
        const availableQuantity = Math.min(variant.varientquatity, orderProduct.quantity)
        cart.products[existingProductIndex].quantity += availableQuantity
      } else {
        const availableQuantity = Math.min(variant.varientquatity, orderProduct.quantity)
        cart.products.push({
          product: product._id,
          size: orderProduct.variant.size,
          quantity: availableQuantity,
        })
      }

      productsAdded++
    }

    await cart.save()
    const cartCount = cart.products.reduce((total, item) => total + item.quantity, 0)

    res.json({
      success: true,
      message:
        productsAdded > 0
          ? `${productsAdded} product(s) added to your cart`
          : "No products could be added to your cart",
      cartCount: cartCount,
    })
  } catch (error) {
    console.error("Error reordering items:", error)
    res.status(500).json({
      success: false,
      message: "Error adding products to cart",
    })
  }
}

const cancelProduct = async (req, res) => {
  try {
    const orderId = req.params.orderId
    const productId = req.params.productId
    const { reason } = req.body

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    }).populate({
      path: "products.product",
      select: "name variants",
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (order.paymentStatus === "failed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel products from an order with failed payment. Please retry payment first.",
      })
    }

    const paymentMethod = normalizePaymentMethod(order)
    if (order.paymentMethod !== paymentMethod) {
      order.paymentMethod = paymentMethod
    }

    const productItem = order.products.id(productId)
    if (!productItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in order",
      })
    }

    if (
      productItem.status === "delivered" ||
      productItem.status === "returned" ||
      productItem.status === "cancelled" ||
      productItem.status === "return pending"
    ) {
      return res.status(400).json({
        success: false,
        message: "Product cannot be cancelled at this stage",
      })
    }

    productItem.status = "cancelled"
    productItem.cancellationReason = reason || "No reason provided"
    const refundAmount = productItem.variant.salePrice * productItem.quantity

    const product = await Product.findById(productItem.product)
    if (product) {
      const variant = product.variants.find((v) => v.size === productItem.variant.size)
      if (variant) {
        variant.varientquatity += productItem.quantity
        await product.save()
      }
    }

    const statusCounts = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
      "return pending": 0,
    }

    order.products.forEach((product) => {
      const status = product.status || "pending"
      statusCounts[status.toLowerCase()] = (statusCounts[status.toLowerCase()] || 0) + 1
    })

    const totalProducts = order.products.length

    if (statusCounts.cancelled === totalProducts) {
      order.orderStatus = "cancelled"
    } else if (statusCounts.returned === totalProducts) {
      order.orderStatus = "returned"
    } else if (statusCounts["return pending"] > 0) {
      order.orderStatus = "return pending"
    } else if (statusCounts.delivered === totalProducts) {
      order.orderStatus = "delivered"
    } else if (statusCounts.shipped > 0) {
      order.orderStatus = "shipped"
    } else if (statusCounts.processing > 0) {
      order.orderStatus = "processing"
    } else {
      order.orderStatus = "pending"
    }

    let regularTotal = 0
    let discountTotal = 0
    let activeProductsTotal = 0

    order.products.forEach((product) => {
      if (product.status !== "cancelled" && product.status !== "returned") {
        const regularPrice = product.variant.varientPrice * product.quantity
        const salePrice = product.variant.salePrice * product.quantity
        regularTotal += regularPrice
        discountTotal += regularPrice - salePrice
        activeProductsTotal += salePrice
      }
    })

    const couponDiscount = order.coupon ? order.coupon.discountAmount : 0
    const shippingCharge = activeProductsTotal > 2000 ? 0 : 50

    order.totalAmount = activeProductsTotal
    order.discount = discountTotal
    order.finalAmount = activeProductsTotal - couponDiscount + shippingCharge

    await order.save()

    if (order.paymentMethod === "online" || order.paymentMethod === "paypal") {
      const user = await User.findById(req.user._id)
      if (user) {
        if (!user.wallet) {
          user.wallet = {
            balance: 0,
            transactions: [],
          }
        }

        user.wallet.balance += refundAmount
        user.wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          description: `Refund for cancelled item in order #${order.orderID}`,
          date: new Date(),
        })

        await user.save()

        await Transaction.create({
          user: req.user._id,
          order: order._id,
          transactionId: `REFUND-ITEM-${Date.now()}`,
          paymentMethod: "wallet",
          amount: refundAmount,
          status: "completed",
          paymentDetails: {
            type: "refund",
            description: `Refund for cancelled item in order #${order.orderID}`,
          },
        })
      }
    }

    res.json({
      success: true,
      message: "Product cancelled successfully",
      refundAmount: refundAmount,
      newOrderTotal: order.finalAmount,
    })
  } catch (error) {
    console.error("Error cancelling product:", error)
    res.status(500).json({
      success: false,
      message: "Error cancelling product",
    })
  }
}

const searchOrders = async (req, res) => {
  try {
    const { query } = req.query

    if (!query) {
      return res.redirect("/orders")
    }

    res.redirect(`/orders?search=${encodeURIComponent(query)}`)
  } catch (error) {
    console.error("Error searching orders:", error)
    res.status(500).json({
      success: false,
      message: "Error searching orders",
    })
  }
}

const trackOrder = async (req, res) => {
  try {
    const orderId = req.params.id

    if (!orderId || orderId === "null" || orderId === "undefined") {
      req.flash("error_msg", "Invalid order ID")
      return res.redirect("/orders")
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    })
      .populate({
        path: "products.product",
        select: "name images price variants brand",
      })
      .populate("address")

    if (!order) {
      req.flash("error_msg", "Order not found")
      return res.redirect("/orders")
    }

    if (order.paymentStatus === "failed") {
      req.flash("error_msg", "Cannot track order with failed payment. Please complete payment first.")
      return res.redirect(`/orders/details/${orderId}`)
    }

    const paymentMethod = normalizePaymentMethod(order)
    if (order.paymentMethod !== paymentMethod) {
      order.paymentMethod = paymentMethod
      await order.save()
    }

    const wishlistCount = await getWishlistCount(req.user._id)
    let regularTotal = 0
    let discountTotal = 0
    let saleTotal = 0

    if (order.products && order.products.length > 0) {
      order.products.forEach((product) => {
        if (product.status !== "cancelled" && product.status !== "returned" && product.product && product.variant) {
          const regularPrice = product.variant.varientPrice * product.quantity
          const salePrice = product.variant.salePrice * product.quantity
          regularTotal += regularPrice
          discountTotal += regularPrice - salePrice
          saleTotal += salePrice
        }
      })
    }

    if (!order.totalAmount) order.totalAmount = saleTotal
    if (!order.discount) order.discount = discountTotal

    const couponDiscount = order.coupon ? order.coupon.discountAmount : 0

    if (!order.finalAmount) {
      const shippingCharge = saleTotal > 2000 ? 0 : 50
      order.finalAmount = saleTotal - couponDiscount + shippingCharge
    }

    const couponInfo = order.coupon
      ? {
          code: order.coupon.code,
          discountAmount: order.coupon.discountAmount,
          discountType: order.coupon.discountType,
          discountValue: order.coupon.discountValue,
          description: order.coupon.description,
        }
      : null

    if (!order.trackingDetails || !order.trackingDetails.updates || order.trackingDetails.updates.length === 0) {
      const defaultTracking = {
        courier: "WEARIT Logistics",
        trackingNumber: order.orderID,
        trackingUrl: "#",
        updates: [],
      }

      switch (order.orderStatus.toLowerCase()) {
        case "pending":
          defaultTracking.updates.push({
            status: "Order Placed",
            location: "Online",
            timestamp: order.orderDate,
            description: "Your order has been received and is being processed",
          })
          break
        case "processing":
          defaultTracking.updates.push({
            status: "Order Placed",
            location: "Online",
            timestamp: order.orderDate,
            description: "Your order has been received and is being processed",
          })
          break
        case "shipped":
          defaultTracking.updates.push({
            status: "Order Placed",
            location: "Online",
            timestamp: order.orderDate,
            description: "Your order has been received and is being processed",
          })
          defaultTracking.updates.push({
            status: "Processing",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 1 * 24 * 60 * 60 * 1000),
            description: "Your order is being prepared for shipment",
          })
          defaultTracking.updates.push({
            status: "Order Shipped",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 2 * 24 * 60 * 60 * 1000),
            description: "Your order has been shipped and is on its way",
          })
          break
        case "out for delivery":
          defaultTracking.updates.push({
            status: "Order Placed",
            location: "Online",
            timestamp: order.orderDate,
            description: "Your order has been received and is being processed",
          })
          defaultTracking.updates.push({
            status: "Processing",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 1 * 24 * 60 * 60 * 1000),
            description: "Your order is being prepared for shipment",
          })
          defaultTracking.updates.push({
            status: "Order Shipped",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 2 * 24 * 60 * 60 * 1000),
            description: "Your order has been shipped and is on its way",
          })
          defaultTracking.updates.push({
            status: "Out for Delivery",
            location: "Local Hub",
            timestamp: new Date(order.orderDate.getTime() + 3 * 24 * 60 * 60 * 1000),
            description: "Your order is out for delivery",
          })
          break
        case "delivered":
          defaultTracking.updates.push({
            status: "Order Placed",
            location: "Online",
            timestamp: order.orderDate,
            description: "Your order has been received and is being processed",
          })
          defaultTracking.updates.push({
            status: "Processing",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 1 * 24 * 60 * 60 * 1000),
            description: "Your order is being prepared for shipment",
          })
          defaultTracking.updates.push({
            status: "Order Shipped",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 2 * 24 * 60 * 60 * 1000),
            description: "Your order has been shipped and is on its way",
          })
          defaultTracking.updates.push({
            status: "Out for Delivery",
            location: "Local Hub",
            timestamp: new Date(order.orderDate.getTime() + 3 * 24 * 60 * 60 * 1000),
            description: "Your order is out for delivery",
          })
          defaultTracking.updates.push({
            status: "Delivered",
            location: "Delivery Address",
            timestamp: new Date(order.orderDate.getTime() + 4 * 24 * 60 * 60 * 1000),
            description: "Your order has been delivered successfully",
          })
          break
        case "cancelled":
          defaultTracking.updates.push({
            status: "Order Placed",
            location: "Online",
            timestamp: order.orderDate,
            description: "Your order has been received and is being processed",
          })
          defaultTracking.updates.push({
            status: "Order Cancelled",
            location: "Online",
            timestamp: new Date(order.orderDate.getTime() + 1 * 24 * 60 * 60 * 1000),
            description: "Your order has been cancelled",
          })
          break
        case "return pending":
        case "returned":
          defaultTracking.updates.push({
            status: "Order Placed",
            location: "Online",
            timestamp: order.orderDate,
            description: "Your order has been received and is being processed",
          })
          defaultTracking.updates.push({
            status: "Processing",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 1 * 24 * 60 * 60 * 1000),
            description: "Your order is being prepared for shipment",
          })
          defaultTracking.updates.push({
            status: "Order Shipped",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 2 * 24 * 60 * 60 * 1000),
            description: "Your order has been shipped and is on its way",
          })
          defaultTracking.updates.push({
            status: "Out for Delivery",
            location: "Local Hub",
            timestamp: new Date(order.orderDate.getTime() + 3 * 24 * 60 * 60 * 1000),
            description: "Your order is out for delivery",
          })
          defaultTracking.updates.push({
            status: "Delivered",
            location: "Delivery Address",
            timestamp: new Date(order.orderDate.getTime() + 4 * 24 * 60 * 60 * 1000),
            description: "Your order has been delivered successfully",
          })
          if (order.orderStatus === "return pending") {
            defaultTracking.updates.push({
              status: "Return Requested",
              location: "Online",
              timestamp: new Date(),
              description: "Return requested for this order",
            })
          } else {
            defaultTracking.updates.push({
              status: "Return Requested",
              location: "Online",
              timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              description: "Return requested for this order",
            })
            defaultTracking.updates.push({
              status: "Returned",
              location: "Warehouse",
              timestamp: new Date(),
              description: "Your order has been returned successfully",
            })
          }
          break
        default:
          defaultTracking.updates.push({
            status: "Order Placed",
            location: "Online",
            timestamp: order.orderDate,
            description: "Your order has been received and is being processed",
          })
      }

      order.trackingDetails = defaultTracking
      try {
        await order.save()
      } catch (saveError) {
        console.error("Warning: Could not save tracking details:", saveError.message)
      }
    }

    order.couponInfo = couponInfo
    order.couponDiscount = couponDiscount
    order.canDownloadInvoice = order.paymentStatus !== "pending" && order.paymentStatus !== "failed"

    res.render("pages/track-order", {
      user: req.user,
      order: order,
      wishlistCount,
      activePage: "orders",
      getStatusClass,
      getStatusIcon,
      isStepActive,
      isStepComplete,
      canCancelOrder,
    })
  } catch (error) {
    console.error("Error tracking order:", error)
    req.flash("error_msg", "Error tracking order")
    return res.redirect("/orders")
  }
}

const orderSuccess = async (req, res) => {
  try {
    const orderId = req.params.id

    if (!orderId) {
      req.flash("error_msg", "Order ID is missing")
      return res.redirect("/orders")
    }

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

    const couponInfo = order.coupon
      ? {
          code: order.coupon.code,
          discountAmount: order.coupon.discountAmount,
          discountType: order.coupon.discountType,
          discountValue: order.coupon.discountValue,
          description: order.coupon.description,
        }
      : null

    try {
    } catch (analyticsError) {
      console.error("Analytics error:", analyticsError)
    }

    res.render("pages/order-success", {
      user: req.user,
      order: order,
      couponInfo: couponInfo,
      wishlistCount,
      activePage: "orders",
      messages: req.flash(),
      canDownloadInvoice: order.paymentStatus !== "pending" && order.paymentStatus !== "failed",
    })
  } catch (error) {
    console.error("Error loading order success page:", error)
    req.flash("error_msg", "Error loading order success page: " + error.message)
    res.redirect("/orders")
  }
}

const orderFailure = async (req, res) => {
  try {
    const orderId = req.params.id

    if (!orderId) {
      req.flash("error_msg", "Order ID is missing")
      return res.redirect("/orders")
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    })

    if (!order) {
      req.flash("error_msg", "Order not found")
      return res.redirect("/orders")
    }

    if (!order.paymentMethod && order.paymentMentod) {
      order.paymentMethod = order.paymentMentod
      await order.save()
    }

    if (order.paymentStatus !== "failed") {
      order.paymentStatus = "failed"
      await order.save()
    }

    const wishlistCount = await getWishlistCount(req.user._id)
    const user = await User.findById(req.user._id)
    const hasWalletBalance = user.wallet && user.wallet.balance >= order.finalAmount

    res.render("pages/order-failure", {
      user: req.user,
      order: order,
      wishlistCount,
      hasWalletBalance,
      activePage: "orders",
      messages: req.flash(),
    })
  } catch (error) {
    console.error("Error loading order failure page:", error)
    req.flash("error_msg", "Error loading order failure page: " + error.message)
    res.redirect("/orders")
  }
}

module.exports = {
  getStatusClass,
  getStatusIcon,
  isStepActive,
  isStepComplete,
  canCancelOrder,
  getOrderDetails,
  getOrdersPage,
  getOrderInvoice,
  cancelOrder,
  returnOrder,
  returnProduct,
  reorderItems,
  cancelProduct,
  searchOrders,
  trackOrder,
  orderSuccess,
  orderFailure,
}
