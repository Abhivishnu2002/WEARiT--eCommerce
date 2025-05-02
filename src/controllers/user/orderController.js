const Order = require("../../models/orderModel")
const Product = require("../../models/productModel")
const User = require("../../models/userModel")
const Cart = require("../../models/cartModel")
const mongoose = require("mongoose")
const PDFDocument = require("pdfkit")
const fs = require("fs")
const path = require("path")

function getStatusClass(status) {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'status-pending';
    case 'shipped':
      return 'status-shipped';
    case 'out for delivery':
      return 'status-out-for-delivery';
    case 'delivered':
      return 'status-delivered';
    case 'cancelled':
      return 'status-cancelled';
    case 'return pending':
      return 'status-return-pending';
    case 'returned':
      return 'status-returned';
    default:
      return 'status-pending';
  }
}

function isStepActive(currentStatus, step) {
  const statusOrder = {
    'pending': 0,
    'shipped': 1,
    'out for delivery': 2,
    'delivered': 3,
    'cancelled': -1,
    'return pending': 4,
    'returned': 5
  };

  const currentStatusValue = statusOrder[currentStatus.toLowerCase()] || 0;
  const stepValue = statusOrder[step.toLowerCase()] || 0;

  return currentStatusValue === stepValue;
}

function isStepComplete(currentStatus, step) {
  const statusOrder = {
    'pending': 0,
    'shipped': 1,
    'out for delivery': 2,
    'delivered': 3,
    'cancelled': -1,
    'return pending': 4,
    'returned': 5
  };

  const currentStatusValue = statusOrder[currentStatus.toLowerCase()] || 0;
  const stepValue = statusOrder[step.toLowerCase()] || 0;
  if (currentStatus.toLowerCase() === 'cancelled') {
    return step.toLowerCase() === 'pending';
  }

  return currentStatusValue > stepValue;
}

function canCancelOrder(status) {
  const nonCancellableStatuses = ['delivered', 'cancelled', 'returned', 'return pending'];
  return !nonCancellableStatuses.includes(status.toLowerCase());
}

const getOrdersPage = async (req, res) => {
  try {
    const user = req.user

    if (!user) {
      return res.redirect("/login")
    }

    const page = Number.parseInt(req.query.page) || 1
    const limit = 5
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
        select: "name images price variants",
      })
      .populate("address")

    if (!order) {
      req.flash("error_msg", "Order not found")
      return res.redirect("/orders")
    }

    const wishlistCount = await getWishlistCount(req.user._id)

    const itemsTotal = order.totalAmount
    const shippingCharge = order.finalAmount - order.totalAmount + order.discount
    const total = itemsTotal
    const grandTotal = order.finalAmount

    const formattedOrder = {
      _id: order._id,
      orderID: order.orderID,
      orderDate: order.orderDate,
      status: order.orderStatus,
      products: order.products,
      address: order.address,
      paymentMethod: order.paymentMethod,
      itemsTotal,
      shippingCharge,
      total,
      grandTotal,
      trackingDetails: order.trackingDetails || null
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

    const doc = new PDFDocument({ margin: 50 })

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${order.orderID}.pdf`)

    doc.pipe(res)

    doc.font("Helvetica-Bold").fontSize(20).text("WEARIT", 50, 50)
    doc.font("Helvetica").fontSize(10).text("Fashion E-commerce", 50, 75)

    doc.font("Helvetica-Bold").fontSize(16).text("INVOICE", 50, 120)
    doc.font("Helvetica").fontSize(10).text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 140)
    doc.text(`Order ID: ${order.orderID}`, 50, 155)
    doc.text(`Order Date: ${order.orderDate.toLocaleDateString()}`, 50, 170)

    doc.font("Helvetica-Bold").fontSize(12).text("Customer Details:", 50, 200)
    doc.font("Helvetica").fontSize(10).text(`Name: ${req.user.name}`, 50, 215)
    doc.text(`Email: ${req.user.email}`, 50, 230)

    if (order.address) {
      doc.font("Helvetica-Bold").fontSize(12).text("Shipping Address:", 50, 255)
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(`${order.address.name}`, 50, 270)
        .text(
          `${order.address.street || order.address.house || ""}, ${order.address.city || order.address.place || ""}`,
          50,
          285,
        )
        .text(`${order.address.state || ""}, ${order.address.zipCode || order.address.pincode || ""}`, 50, 300)
        .text(`Phone: ${order.address.mobile || order.address.phone || ""}`, 50, 315)
    }

    doc.font("Helvetica-Bold").fontSize(12).text("Order Items:", 50, 350)

    let y = 375
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Product", 50, y)
      .text("Size", 250, y)
      .text("Price", 300, y)
      .text("Qty", 350, y)
      .text("Total", 400, y)

    y += 15
    doc.moveTo(50, y).lineTo(550, y).stroke()
    y += 15

    doc.font("Helvetica").fontSize(10)
    let totalAmount = 0

    order.products.forEach((item) => {
      const product = item.product
      const variant = item.variant
      const itemTotal = variant.salePrice * item.quantity
      totalAmount += itemTotal

      doc.text(product.name, 50, y, { width: 180 })
      doc.text(variant.size, 250, y)
      doc.text(`₹${variant.salePrice.toFixed(2)}`, 300, y)
      doc.text(item.quantity.toString(), 350, y)
      doc.text(`₹${itemTotal.toFixed(2)}`, 400, y)

      y += 20
      if (y > 700) {
        doc.addPage()
        y = 50
      }
    })

    doc.moveTo(50, y).lineTo(550, y).stroke()
    y += 15

    doc.font("Helvetica-Bold").text("Order Summary", 50, y)
    y += 20

    doc
      .font("Helvetica")
      .text("Subtotal:", 300, y)
      .text(`₹${order.totalAmount.toFixed(2)}`, 400, y)
    y += 15

    doc.text("Discount:", 300, y).text(`-₹${order.discount.toFixed(2)}`, 400, y)
    y += 15

    doc
      .font("Helvetica-Bold")
      .text("Total:", 300, y)
      .text(`₹${order.finalAmount.toFixed(2)}`, 400, y)

    doc.font("Helvetica").fontSize(10).text("Thank you for shopping with WEARIT!", 50, 730, { align: "center" })

    doc.end()
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
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (order.orderStatus === "delivered" || order.orderStatus === "returned") {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled at this stage",
      })
    }

    order.orderStatus = "cancelled"
    order.products.forEach((product) => {
      product.status = "cancelled"
      product.cancellationReason = reason || "No reason provided"
    })

    await order.save()
    for (const item of order.products) {
      const product = await Product.findById(item.product)
      if (product) {
        const variant = product.variants.find((v) => v.size === item.variant.size)
        if (variant) {
          variant.varientquatity += item.quantity
          await product.save()
        }
      }
    }
    if (order.paymentMethod === 'online') {
      const user = await User.findById(req.user._id);
      if (user) {
        user.wallet.balance += order.finalAmount;
        user.wallet.transactions.push({
          amount: order.finalAmount,
          type: 'credit',
          description: `Refund for cancelled order #${order.orderID}`
        });
        await user.save();
      }
    }

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

    if (!reason) {
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
    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned",
      })
    }

    order.orderStatus = "return pending"
    order.products.forEach((product) => {
      product.status = "return pending"
      product.returnReason = reason
      product.returnRequestDate = Date.now()
    })

    await order.save()

    res.json({
      success: true,
      message: "Return request processed successfully",
    })
  } catch (error) {
    console.error("Error processing return:", error)
    res.status(500).json({
      success: false,
      message: "Error processing return request",
    })
  }
}

const reorder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason, productId } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Return reason is required",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    if (order.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned",
      });
    }
    if (productId) {
      const productItem = order.products.find(p => p.product.toString() === productId);
      
      if (!productItem) {
        return res.status(404).json({
          success: false,
          message: "Product not found in order",
        });
      }
      
      if (productItem.status !== "delivered") {
        return res.status(400).json({
          success: false,
          message: "Only delivered products can be returned",
        });
      }
      
      productItem.status = "return pending";
      productItem.returnReason = reason;
      productItem.returnRequestDate = Date.now();
      const allProductsReturning = order.products.every(p => 
        p.status === "return pending" || p.status === "returned"
      );
      
      if (allProductsReturning) {
        order.orderStatus = "return pending";
      }
    } else {
      order.orderStatus = "return pending";
      order.products.forEach((product) => {
        if (product.status === "delivered") {
          product.status = "return pending";
          product.returnReason = reason;
          product.returnRequestDate = Date.now();
        }
      });
    }

    await order.save();

    res.json({
      success: true,
      message: "Return request processed successfully",
    });
  } catch (error) {
    console.error("Error processing return:", error);
    res.status(500).json({
      success: false,
      message: "Error processing return request",
    });
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
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    const productItem = order.products.id(productId)
    if (!productItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in order",
      })
    }

    if (productItem.status === "delivered" || productItem.status === "returned" || productItem.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Product cannot be cancelled at this stage",
      })
    }

    productItem.status = "cancelled"
    productItem.cancellationReason = reason || "No reason provided"

    const allCancelled = order.products.every((p) => p.status === "cancelled")
    if (allCancelled) {
      order.orderStatus = "cancelled"
    }

    await order.save()

    const product = await Product.findById(productItem.product)
    if (product) {
      const variant = product.variants.find((v) => v.size === productItem.variant.size)
      if (variant) {
        variant.varientquatity += productItem.quantity
        await product.save()
      }
    }

    if (order.paymentMethod === 'online') {
      const itemRefundAmount = productItem.variant.salePrice * productItem.quantity;
      const user = await User.findById(req.user._id);
      if (user) {
        user.wallet.balance += itemRefundAmount;
        user.wallet.transactions.push({
          amount: itemRefundAmount,
          type: 'credit',
          description: `Refund for cancelled item in order #${order.orderID}`
        });
        await user.save();
      }
    }

    res.json({
      success: true,
      message: "Product cancelled successfully",
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
        select: "name images",
      })
      .populate("address")

    if (!order) {
      req.flash("error_msg", "Order not found")
      return res.redirect("/orders")
    }

    const wishlistCount = await getWishlistCount(req.user._id)

    if (!order.trackingDetails || !order.trackingDetails.updates || order.trackingDetails.updates.length === 0) {
      const defaultTracking = {
        courier: "WEARIT Logistics",
        trackingNumber: order.orderID,
        trackingUrl: "#",
        estimatedDelivery: new Date(order.orderDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        updates: [],
      }

      switch (order.orderStatus) {
        case "pending":
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
            status: "Order Shipped",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 1 * 24 * 60 * 60 * 1000),
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
            status: "Order Shipped",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 1 * 24 * 60 * 60 * 1000),
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
            status: "Order Shipped",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 1 * 24 * 60 * 60 * 1000),
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
            status: "Order Shipped",
            location: "Warehouse",
            timestamp: new Date(order.orderDate.getTime() + 1 * 24 * 60 * 60 * 1000),
            description: "Your order has been shipped and is on its way",
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
        if (order.paymentMethod || order.paymentMentod) {
          if (!order.paymentMethod && order.paymentMentod) {
            order.paymentMethod = order.paymentMentod
          }
          await order.save()
        } else {
          console.log("Order missing paymentMethod, using tracking details without saving")
        }
      } catch (saveError) {
        console.error("Warning: Could not save tracking details:", saveError.message)
      }
    }

    res.render("pages/track-order", {
      user: req.user,
      order: order,
      wishlistCount,
      activePage: "orders",
      getStatusClass,
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
async function getWishlistCount(userId) {
  try {
    const Wishlist = require("../../models/wishlistModel")
    const wishlist = await Wishlist.findOne({ user: userId })
    return wishlist ? wishlist.products.length : 0
  } catch (error) {
    console.error("Error getting wishlist count:", error)
    return 0
  }
}

module.exports = {
  getStatusClass,
  isStepActive,
  isStepComplete,
  canCancelOrder,
  getOrderDetails,
  getOrdersPage,
  getOrderInvoice,
  cancelOrder,
  returnOrder,
  reorder,
  cancelProduct,
  searchOrders,
  trackOrder
}