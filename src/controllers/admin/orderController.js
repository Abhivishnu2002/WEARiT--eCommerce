const Order = require("../../models/orderModel")
const User = require("../../models/userModel")
const Product = require("../../models/productModel")
const Transaction = require("../../models/transactionModel")
const { generateInvoice } = require("../../utils/invoiceGenerator")
const PriceCalculator = require("../../utils/priceCalculator")
const mongoose = require("mongoose")
const fs = require("fs")
const path = require("path")

// Import enums and constants
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  ORDER_STATUS_HIERARCHY,
  VALID_STATUS_TRANSITIONS,
  ORDER_STATUS_DISPLAY
} = require("../../utils/enums")
const {
  ORDER_STATUS_MESSAGES,
  PAYMENT_MESSAGES,
  INVOICE_MESSAGES
} = require("../../utils/messages")

const priceCalculator = new PriceCalculator()
function generateTransactionId() {
  return `REFUND-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`
}

// Use imported status hierarchy from enums
const STATUS_HIERARCHY = ORDER_STATUS_HIERARCHY

// Function to validate status transitions
function isValidStatusTransition(currentStatus, newStatus) {
  // Allow same status (no change)
  if (currentStatus === newStatus) {
    return { valid: true }
  }

  // Get status hierarchy levels
  const currentLevel = STATUS_HIERARCHY[currentStatus]
  const newLevel = STATUS_HIERARCHY[newStatus]

  // If either status is not recognized, allow the change (for backward compatibility)
  if (currentLevel === undefined || newLevel === undefined) {
    return { valid: true }
  }

  // Allow cancellation from any status except delivered
  if (newStatus === ORDER_STATUS.CANCELLED && currentStatus !== ORDER_STATUS.DELIVERED) {
    return { valid: true }
  }

  // Prevent changing from cancelled status
  if (currentStatus === ORDER_STATUS.CANCELLED) {
    return {
      valid: false,
      message: ORDER_STATUS_MESSAGES.TRANSITION_ERROR.FINAL_STATE(currentStatus),
      allowedTransitions: []
    }
  }

  // Prevent changing from returned status
  if (currentStatus === ORDER_STATUS.RETURNED) {
    return {
      valid: false,
      message: ORDER_STATUS_MESSAGES.TRANSITION_ERROR.FINAL_STATE(currentStatus),
      allowedTransitions: []
    }
  }

  // Prevent changing from delivered status (except through return process)
  if (currentStatus === ORDER_STATUS.DELIVERED) {
    return {
      valid: false,
      message: ORDER_STATUS_MESSAGES.TRANSITION_ERROR.USE_RETURN_PROCESS,
      allowedTransitions: []
    }
  }

  // Allow forward progression (higher level numbers)
  if (newLevel > currentLevel && newStatus !== ORDER_STATUS.CANCELLED) {
    return { valid: true }
  }

  // Prevent backwards progression
  if (newLevel < currentLevel) {
    const allowedStatuses = Object.keys(STATUS_HIERARCHY).filter(status => {
      const level = STATUS_HIERARCHY[status]
      return (level > currentLevel && status !== ORDER_STATUS.CANCELLED) || (status === ORDER_STATUS.CANCELLED && currentStatus !== ORDER_STATUS.DELIVERED)
    })

    return {
      valid: false,
      message: ORDER_STATUS_MESSAGES.TRANSITION_ERROR.INVALID(currentStatus, newStatus),
      allowedTransitions: allowedStatuses
    }
  }

  // Default allow (shouldn't reach here with current logic)
  return { valid: true }
}

const adminOrderController = {
  getAllOrders: async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const skip = (page - 1) * limit
      const query = {}
      if (req.query.search) {
        query.$or = [{ orderID: { $regex: req.query.search, $options: "i" } }]
      }
      if (req.query.timeFilter) {
        const now = new Date()
        let startDate

        switch (req.query.timeFilter) {
          case "24hour":
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            break
          case "7days":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case "30days":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case "12months":
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
            break
        }

        if (startDate) {
          query.orderDate = { $gte: startDate }
        }
      }
      if (req.query.status) {
        query.orderStatus = req.query.status
      }
      if (req.query.returnStatus === "return pending") {
        query["products.status"] = "return pending"
      } else if (req.query.returnStatus === "returned") {
        query["products.status"] = "returned"
      }
      if (req.query.paymentMethod) {
        query.paymentMethod = new RegExp(`^${req.query.paymentMethod}$`, "i")
      }
      const totalOrders = await Order.countDocuments(query)
      const totalPages = Math.ceil(totalOrders / limit)
      let sort = { orderDate: -1 }
      if (req.query.sortBy) {
        sort = { [req.query.sortBy]: req.query.sortOrder === "asc" ? 1 : -1 }
      }
      const orders = await Order.find(query)
        .populate({
          path: "user",
          select: "name email mobile",
          options: { strictPopulate: false },
        })
        .populate({
          path: "products.product",
          select: "name images",
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
      const processedOrders = orders.map((order) => ({
        ...order,
        user: order.user || {
          name: "Unknown User",
          email: "N/A",
          mobile: "N/A",
        },
      }))

      const paymentMethods = ["wallet", "paypal", "COD"]

      res.render("admin/pages/adminOrders", {
        orders: processedOrders,
        currentPage: page,
        totalPages,
        totalOrders,
        limit,
        query: req.query,
        paymentMethods,
        admin: req.session.admin,
      })
    } catch (error) {
      console.error("Admin getAllOrders error:", error)
      res.render("admin/pages/adminOrders", {
        error_msg: "Failed to fetch orders",
        orders: [],
        admin: req.session.admin,
      })
    }
  },

  getOrderDetails: async (req, res) => {
    try {
      const orderId = req.params.id
      let order = null
      if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findById(orderId)
          .populate("user", "name email mobile")
          .populate({
            path: "products.product",
            select: "name images color variants",
          })
      }
      if (!order) {
        order = await Order.findOne({ orderID: orderId })
          .populate("user", "name email mobile")
          .populate({
            path: "products.product",
            select: "name images color variants",
          })
      }

      if (!order) {
        return res.status(404).render("errors/404", {
          error_msg: "Order not found",
          admin: req.session.admin,
        })
      }
      const calculatedTotals = priceCalculator.calculateOrderDetailsTotals(order)
      const orderSummary = {
        regularTotal: calculatedTotals.regularTotal,
        itemsTotal: calculatedTotals.itemsTotal,
        productDiscount: calculatedTotals.discount,
        couponDiscount: calculatedTotals.couponDiscount,
        couponInfo: order.coupon
          ? {
              code: order.coupon.code,
              discountAmount: order.coupon.discountAmount,
              discountType: order.coupon.discountType,
              discountValue: order.coupon.discountValue,
              description: order.coupon.description,
            }
          : null,
        shippingCharge: calculatedTotals.shippingCharge,
        grandTotal: calculatedTotals.grandTotal,
        activeProductsCount: order.products.filter((p) => p.status !== "cancelled" && p.status !== "returned").length,
        totalProductsCount: order.products.length,
        canUseCOD: calculatedTotals.itemsTotal < 1000,
        subtotal: calculatedTotals.regularTotal,
        shippingCost: calculatedTotals.shippingCharge,
      }

      const orderStatus = {
        placed: true,
        placedDate: formatDate(order.createdAt),
        processing: ["shipped", "out for delivery", "delivered"].includes(order.orderStatus),
        processingDate: order.orderStatus !== "pending" ? formatDate(order.updatedAt) : "",
        shipped: ["shipped", "out for delivery", "delivered"].includes(order.orderStatus),
        shippedDate: ["shipped", "out for delivery", "delivered"].includes(order.orderStatus)
          ? formatDate(order.updatedAt)
          : "",
        outForDelivery: ["out for delivery", "delivered"].includes(order.orderStatus),
        outForDeliveryDate: ["out for delivery", "delivered"].includes(order.orderStatus)
          ? formatDate(order.updatedAt)
          : "",
        delivered: order.orderStatus === "delivered",
        deliveredDate: order.orderStatus === "delivered" ? formatDate(order.updatedAt) : "",
      }
      const productBreakdown = order.products.map((product, index) => {
        const regularPrice = (Number(product.variant?.varientPrice) || 0) * (Number(product.quantity) || 0)
        const salePrice = (Number(product.variant?.salePrice) || 0) * (Number(product.quantity) || 0)
        const itemDiscount = regularPrice - salePrice

        return {
          ...product.toObject(),
          regularPrice: Math.round(regularPrice * 100) / 100,
          salePrice: Math.round(salePrice * 100) / 100,
          itemDiscount: Math.round(itemDiscount * 100) / 100,
          isActive: product.status !== "cancelled" && product.status !== "returned",
          variantIndex: index,
          uniqueId: `${product.product._id}_${product.variant?.size || "default"}_${index}`,
        }
      })

      res.render("admin/pages/adminOrderDetails", {
        order: {
          ...order.toObject(),
          products: productBreakdown,
        },
        orderSummary,
        orderStatus,
        admin: req.session.admin,
      })
    } catch (error) {
      console.error("Admin getOrderDetails error:", error)
      res.render("errors/404", {
        error_msg: "Failed to fetch order details",
        admin: req.session.admin,
      })
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const orderId = req.params.id
      const { status, note, productId, variantSize, variantIndex, trackingNumber, courier } = req.body
      const validStatuses = Object.values(ORDER_STATUS)

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`,
        })
      }
      let order = null
      if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findById(orderId).populate({
          path: "products.product",
          select: "name variants",
        })
      }

      if (!order) {
        order = await Order.findOne({ orderID: orderId }).populate({
          path: "products.product",
          select: "name variants",
        })
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        })
      }
      if (productId) {
        let productItem = null
        if (variantIndex !== undefined && variantIndex !== null) {
          productItem = order.products[Number.parseInt(variantIndex)]
          if (
            !productItem ||
            productItem.product._id.toString() !== productId ||
            (variantSize && productItem.variant?.size !== variantSize)
          ) {
            return res.status(404).json({
              success: false,
              message: "Product variant not found or mismatch in order",
            })
          }
        } else if (variantSize) {
          productItem = order.products.find(
            (p) => p.product._id.toString() === productId && p.variant?.size === variantSize,
          )
        } else {
          productItem = order.products.find((p) => p.product._id.toString() === productId)
        }

        if (!productItem) {
          return res.status(404).json({
            success: false,
            message: "Product variant not found in order",
          })
        }

        const previousStatus = productItem.status

        // Validate status transition for individual product
        const transitionValidation = isValidStatusTransition(previousStatus, status)
        if (!transitionValidation.valid) {
          return res.status(400).json({
            success: false,
            message: `Product status transition error: ${transitionValidation.message}`,
            currentStatus: previousStatus,
            requestedStatus: status,
            allowedTransitions: transitionValidation.allowedTransitions
          })
        }
        productItem.status = status
        if (status === ORDER_STATUS.DELIVERED && previousStatus !== ORDER_STATUS.DELIVERED) {
          productItem.deliveredAt = new Date()
        }
        if (status === ORDER_STATUS.CANCELLED && [ORDER_STATUS.PENDING, ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY].includes(previousStatus)) {
          try {
            const product = await Product.findById(productId)
            if (product && productItem.variant?.size) {
              const variant = product.variants.find((v) => v.size === productItem.variant.size)
              if (variant) {
                variant.varientquatity += productItem.quantity
                await product.save()
              }
            }
          } catch (e) {
            console.error("Admin updateOrderStatus stock update error:", e)
          }
        }
        const productStatuses = order.products.map((p) => p.status)
        const uniqueStatuses = [...new Set(productStatuses)]

        // Count different status types
        const statusCounts = {
          [ORDER_STATUS.DELIVERED]: productStatuses.filter(s => s === ORDER_STATUS.DELIVERED).length,
          [ORDER_STATUS.RETURNED]: productStatuses.filter(s => s === ORDER_STATUS.RETURNED).length,
          [ORDER_STATUS.CANCELLED]: productStatuses.filter(s => s === ORDER_STATUS.CANCELLED).length,
          [ORDER_STATUS.RETURN_PENDING]: productStatuses.filter(s => s === ORDER_STATUS.RETURN_PENDING).length,
          [ORDER_STATUS.PENDING]: productStatuses.filter(s => s === ORDER_STATUS.PENDING).length,
          [ORDER_STATUS.SHIPPED]: productStatuses.filter(s => s === ORDER_STATUS.SHIPPED).length,
          [ORDER_STATUS.OUT_FOR_DELIVERY]: productStatuses.filter(s => s === ORDER_STATUS.OUT_FOR_DELIVERY).length
        }

        const totalProducts = order.products.length

        // Determine order status based on product statuses
        if (statusCounts[ORDER_STATUS.RETURNED] === totalProducts) {
          // All products returned
          order.orderStatus = ORDER_STATUS.RETURNED
        } else if (statusCounts[ORDER_STATUS.CANCELLED] === totalProducts) {
          // All products cancelled
          order.orderStatus = ORDER_STATUS.CANCELLED
        } else if (statusCounts[ORDER_STATUS.DELIVERED] === totalProducts) {
          // All products delivered
          order.orderStatus = ORDER_STATUS.DELIVERED
          // Update payment status for COD orders when all products are delivered
          if ((order.paymentMethod === PAYMENT_METHOD.COD || order.paymentMentod === PAYMENT_METHOD.COD) && order.paymentStatus === PAYMENT_STATUS.PENDING) {
            order.paymentStatus = PAYMENT_STATUS.COMPLETED
            order.deliveryDate = new Date()

            // Update the transaction status as well
            await Transaction.updateOne(
              { order: order._id, paymentMethod: PAYMENT_METHOD.COD, status: PAYMENT_STATUS.PENDING },
              { status: PAYMENT_STATUS.COMPLETED }
            )
          }
        } else if (statusCounts[ORDER_STATUS.RETURN_PENDING] > 0) {
          // Some products have pending returns
          order.orderStatus = ORDER_STATUS.RETURN_PENDING
        } else if (statusCounts[ORDER_STATUS.PENDING] === totalProducts) {
          // All products pending
          order.orderStatus = ORDER_STATUS.PENDING
        } else if (statusCounts[ORDER_STATUS.DELIVERED] > 0) {
          // Some products delivered (mixed status)
          order.orderStatus = ORDER_STATUS.DELIVERED
        } else if (statusCounts[ORDER_STATUS.OUT_FOR_DELIVERY] > 0) {
          // Some products out for delivery
          order.orderStatus = ORDER_STATUS.OUT_FOR_DELIVERY
        } else if (statusCounts[ORDER_STATUS.SHIPPED] > 0) {
          // Some products shipped
          order.orderStatus = ORDER_STATUS.SHIPPED
        } else {
          // Default fallback
          order.orderStatus = ORDER_STATUS.PENDING
        }
        if (!order.trackingDetails) {
          order.trackingDetails = { updates: [] }
        }

        order.trackingDetails.updates.push({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          location: req.body.location || "Processing Center",
          timestamp: new Date(),
          description:
            `${productItem.product.name} (${productItem.variant?.size || "N/A"}) status updated to ${status}. ${note || ""}`.trim(),
        })
      } else {
        const previousStatus = order.orderStatus

        // Validate status transition for entire order
        const transitionValidation = isValidStatusTransition(previousStatus, status)
        if (!transitionValidation.valid) {
          return res.status(400).json({
            success: false,
            message: `Order status transition error: ${transitionValidation.message}`,
            currentStatus: previousStatus,
            requestedStatus: status,
            allowedTransitions: transitionValidation.allowedTransitions
          })
        }

        order.orderStatus = status
        order.products.forEach((product) => {
          const previousProductStatus = product.status
          product.status = status
          if (status === "delivered" && previousProductStatus !== "delivered") {
            product.deliveredAt = new Date()
          }
        })
        if (status === "delivered") {
          order.deliveryDate = new Date()
          // Update payment status for COD orders when delivered
          if ((order.paymentMethod === "COD" || order.paymentMentod === "COD") && order.paymentStatus === "pending") {
            order.paymentStatus = "completed"

            // Update the transaction status as well
            await Transaction.updateOne(
              { order: order._id, paymentMethod: "COD", status: "pending" },
              { status: "completed" }
            )
          }
        }
        if (status === "cancelled" && ["pending", "shipped", "out for delivery"].includes(previousStatus)) {
          for (const item of order.products) {
            try {
              const product = await Product.findById(item.product._id)
              if (product && item.variant?.size) {
                const variant = product.variants.find((v) => v.size === item.variant.size)
                if (variant) {
                  variant.varientquatity += item.quantity
                  await product.save()
                }
              }
            } catch (e) {
              console.error("Admin updateOrderStatus stock update error 2:", e)
            }
          }
        }
        if (!order.trackingDetails) {
          order.trackingDetails = { updates: [] }
        }

        order.trackingDetails.updates.push({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          location: req.body.location || "Processing Center",
          timestamp: new Date(),
          description: note || `Entire order status updated to ${status}`,
        })
      }
      if (trackingNumber) {
        if (!order.trackingDetails) {
          order.trackingDetails = { updates: [] }
        }
        order.trackingDetails.trackingNumber = trackingNumber
        order.trackingDetails.courier = courier || "Default Courier"
      }
      if (!order.statusHistory) {
        order.statusHistory = []
      }
      order.statusHistory.push({
        status: status,
        timestamp: new Date(),
        note: note || `Status updated to ${status}`,
        productId: productId || null,
        variantSize: variantSize || null,
        variantIndex: variantIndex || null,
      })
      const updatedTotals = priceCalculator.recalculateOrderTotals(order)
      order.totalAmount = updatedTotals.totalAmount
      order.discount = updatedTotals.discount
      order.finalAmount = updatedTotals.finalAmount
      order.updatedAt = new Date()

      await order.save()
      const newCalculatedTotals = priceCalculator.calculateOrderDetailsTotals(order)

      res.json({
        success: true,
        message: productId ? `Product variant status updated successfully` : `Order status updated successfully`,
        updatedTotals: {
          regularTotal: newCalculatedTotals.regularTotal,
          itemsTotal: newCalculatedTotals.itemsTotal,
          productDiscount: newCalculatedTotals.discount,
          couponDiscount: newCalculatedTotals.couponDiscount,
          shippingCharge: newCalculatedTotals.shippingCharge,
          grandTotal: newCalculatedTotals.grandTotal,
          activeProductsCount: order.products.filter((p) => p.status !== "cancelled" && p.status !== "returned").length,
        },
      })
    } catch (error) {
      console.error("Admin updateOrderStatus error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update order status",
      })
    }
  },

  processReturnRequest: async (req, res) => {
    try {
      const { orderId, productId, variantSize, variantIndex, action, reason } = req.body

      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Invalid action",
        })
      }
      let order = null
      if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findById(orderId).populate("user").populate({
          path: "products.product",
          select: "name variants",
        })
      }

      if (!order) {
        order = await Order.findOne({ orderID: orderId }).populate("user").populate({
          path: "products.product",
          select: "name variants",
        })
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        })
      }
      let productItem = null

      if (variantIndex !== undefined && variantIndex !== null) {
        productItem = order.products[Number.parseInt(variantIndex)]
        if (
          !productItem ||
          productItem.product._id.toString() !== productId ||
          (variantSize && productItem.variant?.size !== variantSize)
        ) {
          return res.status(404).json({
            success: false,
            message: "Product variant not found or mismatch in order",
          })
        }
      } else if (variantSize) {
        productItem = order.products.find(
          (p) => p.product._id.toString() === productId && p.variant?.size === variantSize,
        )
      } else {
        productItem = order.products.find((p) => p.product._id.toString() === productId)
      }

      if (!productItem) {
        return res.status(404).json({
          success: false,
          message: "Product variant not found in order",
        })
      }

      if (productItem.status !== "return pending") {
        return res.status(400).json({
          success: false,
          message: "No return request found for this product variant",
        })
      }

      if (action === "approve") {
        productItem.status = "returned"
        const refundAmount = priceCalculator.calculateRefundAmount([productItem], order)
        if (!order.user.wallet) {
          order.user.wallet = {
            balance: 0,
            transactions: [],
          }
        }
        order.user.wallet.balance += refundAmount
        order.user.wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          description: `Refund for product return - Order #${order.orderID}`,
          date: new Date(),
        })

        await order.user.save()
        const transactionId = generateTransactionId()
        await Transaction.create({
          user: order.user._id,
          order: order._id,
          transactionId: transactionId,
          paymentMethod: "wallet",
          amount: refundAmount,
          status: "completed",
          paymentDetails: {
            type: "refund",
            subType: "product_return",
            description: `Refund for product return - Order #${order.orderID}`,
            orderID: order.orderID,
            refundDate: new Date(),
            returnedItems: [
              {
                productId: productItem.product._id,
                productName: productItem.product?.name || "Unknown Product",
                quantity: productItem.quantity,
                refundAmount: refundAmount,
                reason: reason || "Return approved",
              },
            ],
            refundReason: reason || "Return approved",
            isPartialRefund: true,
            returnType: "individual_products",
          },
        })
        try {
          const product = await Product.findById(productId)
          if (product && productItem.variant?.size) {
            const variant = product.variants.find((v) => v.size === productItem.variant.size)
            if (variant) {
              variant.varientquatity += productItem.quantity
              await product.save()
            }
          }
        } catch (e) {
          console.error("Admin processReturnRequest stock update error:", e)
        }
        if (!order.trackingDetails) {
          order.trackingDetails = { updates: [] }
        }

        order.trackingDetails.updates.push({
          status: "Return Approved",
          location: "Return Center",
          timestamp: new Date(),
          description: `Return request approved for ${productItem.product.name} (${productItem.variant?.size || "N/A"}). Refund of ₹${refundAmount.toFixed(2)} issued to wallet.`,
        })
      } else {
        productItem.status = "delivered"
        if (!order.trackingDetails) {
          order.trackingDetails = { updates: [] }
        }

        order.trackingDetails.updates.push({
          status: "Return Rejected",
          location: "Return Center",
          timestamp: new Date(),
          description: `Return request rejected for ${productItem.product.name} (${productItem.variant?.size || "N/A"}). Reason: ${reason || "No reason provided"}`,
        })
      }

      if (reason) {
        productItem.returnReason = reason
      }
      const pendingReturns = order.products.some((p) => p.status === "return pending")

      if (!pendingReturns) {
        const returnedProducts = order.products.filter((p) => p.status === "returned")
        const deliveredProducts = order.products.filter((p) => p.status === "delivered")
        const cancelledProducts = order.products.filter((p) => p.status === "cancelled")

        if (returnedProducts.length === order.products.length) {
          // All products returned - set order status to "returned"
          order.orderStatus = "returned"

          if (!order.trackingDetails) {
            order.trackingDetails = { updates: [] }
          }

          order.trackingDetails.updates.push({
            status: "Order Returned",
            location: "System",
            timestamp: new Date(),
            description: `All items in this order have been returned.`,
          })
        } else if (cancelledProducts.length === order.products.length) {
          // All products cancelled - set order status to "cancelled"
          order.orderStatus = "cancelled"
        } else if (returnedProducts.length > 0 && deliveredProducts.length > 0) {
          // Mixed status - some returned, some delivered - keep as "delivered" with partial return note
          order.orderStatus = "delivered"

          if (!order.trackingDetails) {
            order.trackingDetails = { updates: [] }
          }

          order.trackingDetails.updates.push({
            status: "Partial Return Processed",
            location: "System",
            timestamp: new Date(),
            description: `Some items in this order have been returned.`,
          })
        } else if (deliveredProducts.length > 0) {
          // Some products delivered, others might be cancelled/returned
          order.orderStatus = "delivered"
        } else {
          // Fallback - if no clear status, keep as delivered
          order.orderStatus = "delivered"
        }
      }
      const updatedTotals = priceCalculator.recalculateOrderTotals(order)
      order.totalAmount = updatedTotals.totalAmount
      order.discount = updatedTotals.discount
      order.finalAmount = updatedTotals.finalAmount

      await order.save()
      const newCalculatedTotals = priceCalculator.calculateOrderDetailsTotals(order)

      res.json({
        success: true,
        message: `Return request ${action === "approve" ? "approved" : "rejected"} successfully for ${productItem.product.name} (${productItem.variant?.size || "N/A"})`,
        updatedTotals: {
          regularTotal: newCalculatedTotals.regularTotal,
          itemsTotal: newCalculatedTotals.itemsTotal,
          productDiscount: newCalculatedTotals.discount,
          couponDiscount: newCalculatedTotals.couponDiscount,
          shippingCharge: newCalculatedTotals.shippingCharge,
          grandTotal: newCalculatedTotals.grandTotal,
          activeProductsCount: order.products.filter((p) => p.status !== "cancelled" && p.status !== "returned").length,
        },
      })
    } catch (error) {
      console.error("Admin processReturnRequest error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to process return request",
      })
    }
  },

  generateInvoice: async (req, res) => {
    try {
      const orderId = req.params.id
      let order = null
      if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findById(orderId)
          .populate("user", "name email mobile")
          .populate({
            path: "products.product",
            select: "name images color variants",
          })
      }

      if (!order) {
        order = await Order.findOne({ orderID: orderId })
          .populate("user", "name email mobile")
          .populate({
            path: "products.product",
            select: "name images color variants",
          })
      }

      if (!order) {
        return res.status(404).render("errors/404", {
          error_msg: "Order not found",
          admin: req.session.admin,
        })
      }

      // Enhanced invoice availability conditions for admin
      const paymentMethod = (order.paymentMethod || order.paymentMentod || '').toLowerCase()
      let canDownloadInvoice = false
      let errorMessage = "Invoice is not available for this order"

      if (order.paymentStatus === "failed") {
        errorMessage = "Invoice is not available for failed payments"
      } else if (paymentMethod === 'cod') {
        // For COD orders, invoice available after delivery (when payment status becomes completed)
        if (order.orderStatus === 'delivered' || order.paymentStatus === 'completed') {
          canDownloadInvoice = true
        } else {
          errorMessage = "Invoice for COD orders is only available after delivery"
        }
      } else {
        // For other payment methods, invoice available after payment completion
        if (order.paymentStatus === 'completed') {
          canDownloadInvoice = true
        } else {
          errorMessage = "Invoice is only available after payment is completed"
        }
      }

      if (!canDownloadInvoice) {
        return res.status(400).render("errors/404", {
          error_msg: errorMessage,
          admin: req.session.admin,
        })
      }

      await generateInvoice({
        order,
        user: order.user,
        res,
        isAdmin: true,
      })
    } catch (error) {
      console.error("Admin generateInvoice error:", error)
      res.status(500).render("errors/404", {
        error_msg: "Failed to generate invoice",
        admin: req.session.admin,
      })
    }
  },

  clearFilters: (req, res) => {
    res.redirect("/admin/orders")
  },

  getInventoryStatus: async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const skip = (page - 1) * limit
      const lowStockThreshold = Number.parseInt(req.query.threshold) || 5
      const lowStockProducts = await Product.aggregate([
        { $unwind: "$variants" },
        { $match: { "variants.varientquatity": { $lte: lowStockThreshold } } },
        {
          $group: {
            _id: "$_id",
            name: { $first: "$name" },
            color: { $first: "$color" },
            images: { $first: "$images" },
            lowStockVariants: {
              $push: {
                size: "$variants.size",
                quantity: "$variants.varientquatity",
                price: "$variants.varientPrice",
                salePrice: "$variants.salePrice",
              },
            },
            totalLowStockCount: { $sum: 1 },
          },
        },
      ])
      const totalProducts = lowStockProducts.length
      const totalPages = Math.ceil(totalProducts / limit)
      const paginatedProducts = lowStockProducts.slice(skip, skip + limit)
      res.render("admin/pages/adminInventory", {
        products: paginatedProducts,
        currentPage: page,
        totalPages,
        totalProducts,
        limit,
        threshold: lowStockThreshold,
        admin: req.session.admin,
      })
    } catch (error) {
      console.error("Admin getInventoryStatus error:", error)
      res.render("admin/pages/adminInventory", {
        error_msg: "Failed to fetch inventory status",
        products: [],
        admin: req.session.admin,
      })
    }
  },

  updateProductStock: async (req, res) => {
    try {
      const { productId, size, quantity } = req.body

      const product = await Product.findById(productId)

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        })
      }
      const variant = product.variants.find((v) => v.size === size)

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Variant not found",
        })
      }
      variant.varientquatity = Number.parseInt(quantity)

      await product.save()

      res.json({
        success: true,
        message: "Stock updated successfully",
      })
    } catch (error) {
      console.error("Admin updateProductStock error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update product stock",
      })
    }
  },
}

function formatDate(date) {
  if (!date) return ""

  const d = new Date(date)
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

module.exports = adminOrderController
