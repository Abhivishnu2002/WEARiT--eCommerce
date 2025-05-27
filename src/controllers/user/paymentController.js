const Order = require("../../models/orderModel")
const Transaction = require("../../models/transactionModel")
const User = require("../../models/userModel")
const Cart = require("../../models/cartModel")
const Product = require("../../models/productModel")
const UserCoupon = require("../../models/userCouponModel")
const Coupon = require("../../models/couponModel")
const paypal = require("@paypal/checkout-server-sdk")
const Address = require("../../models/addressModel")
const couponController = require("./couponController")
const PriceCalculator = require("../../utils/priceCalculator")

const priceCalculator = new PriceCalculator()

function getPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error("PayPal credentials missing. Check environment variables.")
    throw new Error("PayPal credentials are missing")
  }

  const environment =
    process.env.NODE_ENV === "production"
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret)

  return new paypal.core.PayPalHttpClient(environment)
}

function getBaseUrl(req) {
  if (process.env.BASE_URL && process.env.BASE_URL !== "undefined") {
    return process.env.BASE_URL
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol
  const host = req.headers["x-forwarded-host"] || req.get("host")
  return `${protocol}://${host}`
}

function generateTransactionId() {
  return `PAYPAL-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`
}

const createPaypalPayment = async (req, res) => {
  try {
    const { orderId, addressId } = req.body
    const userId = req.user._id
    const baseUrl = getBaseUrl(req)

    let order

    if (orderId) {
      order = await Order.findOne({
        _id: orderId,
        user: userId,
        paymentStatus: { $in: ["pending", "failed"] },
      })

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found or already paid",
        })
      }
    } else if (addressId) {
      const cart = await Cart.findOne({ user: userId }).populate("products.product")

      if (!cart || cart.products.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Your cart is empty",
        })
      }

      const address = await Address.findOne({ _id: addressId, user: userId })

      if (!address) {
        return res.status(400).json({
          success: false,
          message: "Invalid address selected",
        })
      }

      const validProducts = []
      let subtotal = 0
      let totalDiscount = 0
      for (const item of cart.products) {
        const product = await Product.findById(item.product._id)
        if (!product || !product.isActive) continue

        const variant = product.variants.find((v) => v.size === item.size)
        if (!variant || variant.varientquatity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock for ${product.name} (${item.size}). Only ${variant ? variant.varientquatity : 0} available.`,
          })
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
      const saleTotal = subtotal - totalDiscount
      const shippingCharge = saleTotal >= 1000 ? 0 : 200
      const finalAmount = saleTotal - couponDiscount + shippingCharge

      const date = new Date()
      const year = date.getFullYear().toString().slice(-2)
      const month = ("0" + (date.getMonth() + 1)).slice(-2)
      const day = ("0" + date.getDate()).slice(-2)
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")
      const orderID = `ORD${year}${month}${day}${random}`

      const orderData = {
        user: userId,
        orderID: orderID,
        products: validProducts,
        address: addressId,
        totalAmount: subtotal,
        discount: totalDiscount,
        finalAmount: Math.round(finalAmount * 100) / 100,
        paymentMethod: "paypal",
        paymentStatus: "pending",
        orderStatus: "pending",
        isTemporary: true,
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

      order = new Order(orderData)
      await order.save()
    } else {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      })
    }

    const existingTransaction = await Transaction.findOne({
      order: order._id,
      status: "pending",
      paymentMethod: "paypal",
    })

    if (existingTransaction) {
      existingTransaction.status = "failed"
      await existingTransaction.save()
    }

    const paypalClient = getPayPalClient()
    const request = new paypal.orders.OrdersCreateRequest()
    const amountUSD = (order.finalAmount / 75).toFixed(2)

    const returnUrl = `${baseUrl}/payment/paypal/success?orderId=${order._id}`
    const cancelUrl = `${baseUrl}/payment/paypal/cancel?orderId=${order._id}`

    request.prefer("return=representation")
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amountUSD,
          },
          description: `Order #${order.orderID}`,
          reference_id: order._id.toString(),
        },
      ],
      application_context: {
        brand_name: "WEARiT",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    })

    const response = await paypalClient.execute(request)
    const approvalUrl = response.result.links.find((link) => link.rel === "approve").href
    const transactionId = generateTransactionId()
    const transaction = await Transaction.create({
      user: userId,
      order: order._id,
      transactionId: transactionId,
      paymentMethod: "paypal",
      amount: order.finalAmount,
      status: "pending",
      paymentDetails: {
        paymentId: response.result.id,
      },
    })

    res.json({
      success: true,
      approvalUrl: approvalUrl,
      orderId: order._id,
    })
  } catch (error) {
    console.error("Error creating PayPal payment:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create PayPal payment: " + (error.message || "Unknown error"),
    })
  }
}

const executePaypalPayment = async (req, res) => {
  let order = null
  let transaction = null

  try {
    const { orderId } = req.query
    const { token, PayerID } = req.query

    if (!orderId || !token || !PayerID) {
      req.flash("error_msg", "Invalid payment information")
      return res.redirect(`/order-failure/${orderId || ""}`)
    }

    order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      paymentStatus: { $in: ["pending", "failed"] },
    })

    if (!order) {
      req.flash("error_msg", "Order not found or already paid")
      return res.redirect(`/order-failure/${orderId}`)
    }

    transaction = await Transaction.findOne({
      order: orderId,
      status: "pending",
      paymentMethod: "paypal",
    })

    if (!transaction) {
      transaction = new Transaction({
        user: req.user._id,
        order: orderId,
        transactionId: generateTransactionId(),
        paymentMethod: "paypal",
        amount: order.finalAmount,
        status: "pending",
        paymentDetails: {
          paymentId: token,
        },
      })
      await transaction.save()
    }

    const paypalClient = getPayPalClient()
    const request = new paypal.orders.OrdersCaptureRequest(token)
    request.requestBody({})

    const response = await paypalClient.execute(request)
    if (response.result.status === "COMPLETED") {
      const stockUpdateOperations = []
      for (const orderProduct of order.products) {
        const product = await Product.findById(orderProduct.product)
        if (product) {
          const variant = product.variants.find((v) => v.size === orderProduct.variant.size)
          if (variant) {
            variant.varientquatity -= orderProduct.quantity
            stockUpdateOperations.push(product.save())
          }
        }
      }
      await Promise.all(stockUpdateOperations)

      order.paymentStatus = "completed"
      order.isTemporary = false
      order.paymentDetails = {
        transactionId: transaction.transactionId,
        paymentId: token,
        payerId: PayerID,
        paymentMethod: "paypal",
        amount: order.finalAmount,
        currency: "INR",
        status: "completed",
        createdAt: new Date(),
      }

      await order.save()
      transaction.status = "completed"
      transaction.paymentDetails = transaction.paymentDetails || {}
      transaction.paymentDetails.payerId = PayerID

      if (
        response.result.purchase_units &&
        response.result.purchase_units[0] &&
        response.result.purchase_units[0].payments &&
        response.result.purchase_units[0].payments.captures &&
        response.result.purchase_units[0].payments.captures[0]
      ) {
        transaction.paymentDetails.captureId = response.result.purchase_units[0].payments.captures[0].id
      }

      await transaction.save()

      if (order.coupon && order.coupon.couponId) {
        await couponController.processCouponUsage(req.user._id, order.coupon.couponId, order._id)
      }

      await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { products: [] } })

      if (req.session.couponDiscount) {
        req.session.couponDiscount = 0
      }
      if (req.session.coupon) {
        delete req.session.coupon
      }
      return res.redirect(`/order-success/${orderId}`)
    } else {
      transaction.status = "failed"
      transaction.paymentDetails = transaction.paymentDetails || {}
      transaction.paymentDetails.errorMessage = `Payment failed with status: ${response.result.status}`
      await transaction.save()

      order.paymentStatus = "failed"
      await order.save()

      req.flash("error_msg", `Payment was not completed. Status: ${response.result.status}`)
      return res.redirect(`/order-failure/${orderId}`)
    }
  } catch (error) {
    console.error("Error executing PayPal payment:", error)
    if (transaction) {
      transaction.status = "failed"
      transaction.paymentDetails = transaction.paymentDetails || {}
      transaction.paymentDetails.errorMessage = error.message
      await transaction.save().catch((err) => console.error("Error saving transaction:", err))
    }
    if (order) {
      order.paymentStatus = "failed"
      await order.save().catch((err) => console.error("Error saving order:", err))
    }

    req.flash("error_msg", "Failed to process payment: " + error.message)
    return res.redirect(`/order-failure/${req.query.orderId || ""}`)
  }
}

const cancelPaypalPayment = async (req, res) => {
  try {
    const { orderId } = req.query

    if (!orderId) {
      req.flash("error_msg", "Order ID is missing")
      return res.redirect("/orders")
    }

    const transaction = await Transaction.findOne({
      order: orderId,
      status: "pending",
      paymentMethod: "paypal",
    })

    if (transaction) {
      transaction.status = "failed"
      transaction.paymentDetails = transaction.paymentDetails || {}
      transaction.paymentDetails.cancelReason = "User cancelled the payment"
      await transaction.save()
    }

    const order = await Order.findById(orderId)
    if (order) {
      order.paymentStatus = "failed"
      await order.save()
    }

    req.flash("error_msg", "Payment was cancelled")
    return res.redirect(`/order-failure/${orderId}`)
  } catch (error) {
    console.error("Error handling PayPal cancellation:", error)
    req.flash("error_msg", "An error occurred during payment cancellation: " + error.message)
    return res.redirect(`/order-failure/${req.query.orderId || ""}`)
  }
}

const retryPayment = async (req, res) => {
  try {
    const orderId = req.params.id
    const { paymentMethod } = req.body
    const baseUrl = getBaseUrl(req)

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      paymentStatus: { $in: ["pending", "failed"] },
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or already paid",
      })
    }
    if (paymentMethod) {
      const paymentValidation = priceCalculator.validatePaymentMethod(paymentMethod, order.finalAmount)
      if (!paymentValidation.valid) {
        return res.status(400).json({
          success: false,
          message: paymentValidation.message,
        })
      }
    }

    if (paymentMethod && ["online", "paypal", "wallet", "COD"].includes(paymentMethod)) {
      order.paymentMethod = paymentMethod
      await order.save()
    }

    if (order.paymentMethod === "paypal") {
      const existingTransaction = await Transaction.findOne({
        order: order._id,
        status: "pending",
        paymentMethod: "paypal",
      })

      if (existingTransaction) {
        existingTransaction.status = "failed"
        await existingTransaction.save()
      }

      const paypalClient = getPayPalClient()
      const request = new paypal.orders.OrdersCreateRequest()
      const amountUSD = (order.finalAmount / 75).toFixed(2)
      const returnUrl = `${baseUrl}/payment/paypal/success?orderId=${order._id}`
      const cancelUrl = `${baseUrl}/payment/paypal/cancel?orderId=${order._id}`

      request.prefer("return=representation")
      request.requestBody({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amountUSD,
            },
            description: `Order #${order.orderID}`,
            reference_id: order._id.toString(),
          },
        ],
        application_context: {
          brand_name: "WEARiT",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      })

      const response = await paypalClient.execute(request)
      const approvalUrl = response.result.links.find((link) => link.rel === "approve").href
      const transactionId = generateTransactionId()
      await Transaction.create({
        user: req.user._id,
        order: order._id,
        transactionId: transactionId,
        paymentMethod: "paypal",
        amount: order.finalAmount,
        status: "pending",
        paymentDetails: {
          paymentId: response.result.id,
        },
      })

      return res.json({
        success: true,
        redirect: approvalUrl,
      })
    } else if (order.paymentMethod === "wallet") {
      const user = await User.findById(req.user._id)
      if (!user.wallet || user.wallet.balance < order.finalAmount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
        })
      }

      const stockUpdateOperations = []
      for (const orderProduct of order.products) {
        const product = await Product.findById(orderProduct.product)
        if (product) {
          const variant = product.variants.find((v) => v.size === orderProduct.variant.size)
          if (variant) {
            variant.varientquatity -= orderProduct.quantity
            stockUpdateOperations.push(product.save())
          }
        }
      }
      await Promise.all(stockUpdateOperations)

      user.wallet.balance -= order.finalAmount
      user.wallet.transactions.push({
        amount: order.finalAmount,
        type: "debit",
        description: `Payment for order #${order.orderID}`,
        date: new Date(),
      })
      await user.save()

      order.paymentStatus = "completed"
      order.isTemporary = false
      order.paymentDetails = {
        transactionId: `WALLET-${Date.now()}`,
        paymentMethod: "wallet",
        amount: order.finalAmount,
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
        amount: order.finalAmount,
        status: "completed",
      })

      if (order.coupon && order.coupon.couponId) {
        await couponController.processCouponUsage(req.user._id, order.coupon.couponId, order._id)
      }

      return res.json({
        success: true,
        redirect: `/order-success/${order._id}`,
      })
    } else if (order.paymentMethod === "COD") {
      const stockUpdateOperations = []
      for (const orderProduct of order.products) {
        const product = await Product.findById(orderProduct.product)
        if (product) {
          const variant = product.variants.find((v) => v.size === orderProduct.variant.size)
          if (variant) {
            variant.varientquatity -= orderProduct.quantity
            stockUpdateOperations.push(product.save())
          }
        }
      }
      await Promise.all(stockUpdateOperations)

      order.paymentStatus = "pending"
      order.isTemporary = false
      await order.save()

      if (order.coupon && order.coupon.couponId) {
        await couponController.processCouponUsage(req.user._id, order.coupon.couponId, order._id)
      }

      return res.json({
        success: true,
        redirect: `/order-success/${order._id}`,
      })
    } else {
      return res.json({
        success: true,
        redirect: `/payment?orderId=${order._id}`,
      })
    }
  } catch (error) {
    console.error("Error retrying payment:", error)
    res.status(500).json({
      success: false,
      message: "Failed to process payment retry: " + error.message,
    })
  }
}

module.exports = {
  createPaypalPayment,
  executePaypalPayment,
  cancelPaypalPayment,
  retryPayment,
}
