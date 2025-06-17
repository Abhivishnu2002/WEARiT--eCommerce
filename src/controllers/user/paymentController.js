const Order = require("../../models/orderModel")
const Transaction = require("../../models/transactionModel")
const User = require("../../models/userModel")
const Cart = require("../../models/cartModel")
const Product = require("../../models/productModel")
const paypal = require("@paypal/checkout-server-sdk")
const Razorpay = require("razorpay")
const crypto = require("crypto")
const Address = require("../../models/addressModel")
const couponController = require("./couponController")
const PriceCalculator = require("../../utils/priceCalculator")

const priceCalculator = new PriceCalculator()

function getPayPalClient() {
  // Fallback to hardcoded values if environment variables are not available
  const clientId = process.env.PAYPAL_CLIENT_ID || "AdtZwCOrsHseqwIn1TNja60cn6WQrE-imJ53W1HwjBZND7TGbRqwH_z3ym4eWa1jV87wOyUAOIV6nvei"
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "EM2d1MgShWBV4608IgyXQsB2aEuQYJHnIms8wdUTFo3dWNUSkpUzSr73uUEz3Ll6JC-z1TCSnd7mFdzg"

  console.error("PayPal credentials check:", {
    hasClientId: !!clientId,
    clientIdLength: clientId ? clientId.length : 0,
    hasClientSecret: !!clientSecret,
    clientSecretLength: clientSecret ? clientSecret.length : 0,
    nodeEnv: process.env.NODE_ENV,
    usingFallback: !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET
  })

  if (!clientId || !clientSecret) {
    console.error("PayPal credentials missing:", {
      PAYPAL_CLIENT_ID: clientId ? "SET" : "MISSING",
      PAYPAL_CLIENT_SECRET: clientSecret ? "SET" : "MISSING"
    })
    throw new Error("PayPal credentials are missing")
  }

  const environment =
    process.env.NODE_ENV === "production"
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret)

  console.error("PayPal environment:", process.env.NODE_ENV === "production" ? "LIVE" : "SANDBOX")

  return new paypal.core.PayPalHttpClient(environment)
}

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are missing")
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

function getBaseUrl(req) {
  // If BASE_URL is explicitly set and not undefined, use it
  if (process.env.BASE_URL && process.env.BASE_URL !== "undefined" && process.env.BASE_URL.trim() !== "") {
    console.error("Using BASE_URL from environment:", process.env.BASE_URL)
    return process.env.BASE_URL.trim()
  }

  // Auto-detect from request headers (for hosted environments)
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https"
  const host = req.headers["x-forwarded-host"] || req.headers.host || req.get("host")

  // Special handling for known hosting platforms
  let baseUrl = `${protocol}://${host}`

  // If we detect localhost, but we're in a hosted environment, use a fallback
  if (host && host.includes('localhost') && req.headers['x-forwarded-host']) {
    baseUrl = `https://${req.headers['x-forwarded-host']}`
  }

  // Additional fallback for common hosting platforms
  if (host && host.includes('localhost')) {
    // If we're getting localhost in any environment, use the known hosted domain
    baseUrl = "https://www.wearitclothing.store"
    console.error("Localhost detected, using fallback domain:", baseUrl)
  }

  console.error("Auto-detected BASE_URL:", {
    protocol,
    host,
    'x-forwarded-host': req.headers['x-forwarded-host'],
    'x-forwarded-proto': req.headers['x-forwarded-proto'],
    finalBaseUrl: baseUrl
  })

  return baseUrl
}

function generateTransactionId(paymentMethod = "PAYMENT") {
  return `${paymentMethod.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`
}

function parseRazorpayError(error) {
  const errorMappings = {
    BAD_REQUEST_ERROR: {
      message: "Invalid payment request. Please check your payment details and try again.",
      userMessage: "Payment request failed. Please verify your details.",
      retryable: true,
    },
    GATEWAY_ERROR: {
      message: "Payment gateway error. Please try again in a few moments.",
      userMessage: "Payment gateway is temporarily unavailable. Please try again.",
      retryable: true,
    },
    SERVER_ERROR: {
      message: "Payment server error. Please try again later.",
      userMessage: "Payment service is temporarily down. Please try again later.",
      retryable: true,
    },
    AUTHENTICATION_ERROR: {
      message: "Payment authentication failed.",
      userMessage: "Payment authentication failed. Please contact support.",
      retryable: false,
    },
    PAYMENT_FAILED: {
      message: "Payment was declined by your bank or card issuer.",
      userMessage: "Payment was declined. Please check your payment method or try a different one.",
      retryable: true,
    },
    INSUFFICIENT_FUNDS: {
      message: "Insufficient funds in your account.",
      userMessage: "Insufficient funds. Please check your account balance or try a different payment method.",
      retryable: true,
    },
    CARD_DECLINED: {
      message: "Your card was declined by the bank.",
      userMessage: "Card declined. Please try a different card or contact your bank.",
      retryable: true,
    },
    NETWORK_ERROR: {
      message: "Network connectivity issue during payment.",
      userMessage: "Network error. Please check your internet connection and try again.",
      retryable: true,
    },
    TIMEOUT_ERROR: {
      message: "Payment request timed out.",
      userMessage: "Payment timed out. Please try again.",
      retryable: true,
    },
  }

  const defaultError = {
    message: "Payment failed due to an unknown error.",
    userMessage: "Payment failed. Please try again or contact support.",
    retryable: true,
  }

  if (error.error && error.error.code) {
    return errorMappings[error.error.code] || defaultError
  }

  if (error.message) {
    const message = error.message.toLowerCase()
    if (message.includes("insufficient")) {
      return errorMappings.INSUFFICIENT_FUNDS
    }
    if (message.includes("declined") || message.includes("reject")) {
      return errorMappings.CARD_DECLINED
    }
    if (message.includes("network") || message.includes("connection")) {
      return errorMappings.NETWORK_ERROR
    }
    if (message.includes("timeout")) {
      return errorMappings.TIMEOUT_ERROR
    }
  }

  return defaultError
}

async function createOrderFromCart(userId, addressId, paymentMethod, req) {
  const cart = await Cart.findOne({ user: userId }).populate("products.product")

  if (!cart || cart.products.length === 0) {
    throw new Error("Your cart is empty")
  }

  const address = await Address.findOne({ _id: addressId, user: userId })
  if (!address) {
    throw new Error("Invalid address selected")
  }

  const validProducts = []
  let subtotal = 0
  let totalDiscount = 0

  for (const item of cart.products) {
    const product = await Product.findById(item.product._id)
    if (!product || !product.isActive) continue

    const variant = product.variants.find((v) => v.size === item.size)
    if (!variant || variant.varientquatity < item.quantity) {
      throw new Error(
        `Not enough stock for ${product.name} (${item.size}). Only ${variant ? variant.varientquatity : 0} available.`,
      )
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

  const order = new Order(orderData)
  await order.save()

  return order
}

const createPaypalPayment = async (req, res) => {
  try {
    console.error("PayPal payment creation started:", {
      body: req.body,
      userId: req.user._id
    })

    // Validate environment variables
    console.error("Environment variables check:", {
      PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID ? "SET" : "MISSING",
      PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET ? "SET" : "MISSING",
      NODE_ENV: process.env.NODE_ENV || "undefined"
    })

    const { orderId, addressId } = req.body
    const userId = req.user._id
    const baseUrl = getBaseUrl(req)

    let order

    if (orderId) {
      console.error("Finding existing order:", orderId)
      order = await Order.findOne({
        _id: orderId,
        user: userId,
        paymentStatus: { $in: ["pending", "failed"] },
      })

      if (!order) {
        console.error("Order not found:", { orderId, userId })
        return res.status(404).json({
          success: false,
          message: "Order not found or already paid",
        })
      }
    } else if (addressId) {
      console.error("Creating order from cart:", { addressId, userId })
      order = await createOrderFromCart(userId, addressId, "paypal", req)
    } else {
      console.error("Missing required parameters:", { orderId, addressId })
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
      existingTransaction.failureReason = "New payment attempt initiated"
      await existingTransaction.save()
    }

    console.error("Creating PayPal client and order request")
    const paypalClient = getPayPalClient()
    const request = new paypal.orders.OrdersCreateRequest()
    const amountUSD = (order.finalAmount / 75).toFixed(2)

    const returnUrl = `${baseUrl}/payment/paypal/success?orderId=${order._id}`
    const cancelUrl = `${baseUrl}/payment/paypal/cancel?orderId=${order._id}`

    console.error("PayPal URLs:", { baseUrl, returnUrl, cancelUrl })
    console.error("PayPal order details:", {
      orderId: order._id,
      orderID: order.orderID,
      finalAmount: order.finalAmount,
      amountUSD: amountUSD
    })

    request.prefer("return=representation")
    const requestBody = {
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
    }

    console.error("PayPal request body:", JSON.stringify(requestBody, null, 2))
    request.requestBody(requestBody)

    console.error("Executing PayPal order creation request")
    const response = await paypalClient.execute(request)
    console.error("PayPal order creation response:", {
      status: response.statusCode,
      id: response.result.id,
      status_detail: response.result.status
    })

    const approvalUrl = response.result.links.find((link) => link.rel === "approve").href
    console.error("PayPal approval URL:", approvalUrl)

    const transactionId = generateTransactionId("PAYPAL")

    await Transaction.create({
      user: userId,
      order: order._id,
      transactionId: transactionId,
      paymentMethod: "paypal",
      amount: order.finalAmount,
      status: "pending",
      paymentDetails: {
        paymentId: response.result.id,
        paypalOrderId: response.result.id,
      },
    })

    res.json({
      success: true,
      approvalUrl: approvalUrl,
      orderId: order._id,
      paypalOrderId: response.result.id,
    })
  } catch (error) {
    console.error("PayPal payment creation error:", {
      error: error.message,
      stack: error.stack,
      orderId: req.body.orderId,
      addressId: req.body.addressId
    })

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

    console.error("PayPal execution started:", { orderId, token, PayerID })

    if (!orderId || !token || !PayerID) {
      console.error("Missing PayPal payment parameters:", { orderId, token, PayerID })
      req.flash("error_msg", "Invalid payment information")
      return res.redirect(`/order-failure/${orderId || ""}`)
    }

    order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      paymentStatus: { $in: ["pending", "failed"] },
    })

    if (!order) {
      console.error("Order not found:", { orderId, userId: req.user._id })
      req.flash("error_msg", "Order not found or already paid")
      return res.redirect(`/order-failure/${orderId}`)
    }

    // Find transaction by PayPal order ID (token) first, then by order ID
    transaction = await Transaction.findOne({
      $or: [
        { "paymentDetails.paypalOrderId": token, paymentMethod: "paypal", status: "pending" },
        { order: orderId, paymentMethod: "paypal", status: "pending" }
      ]
    })

    console.error("Transaction found:", {
      transactionId: transaction?._id,
      paypalOrderId: transaction?.paymentDetails?.paypalOrderId,
      status: transaction?.status
    })

    if (!transaction) {
      console.error("Creating new transaction for PayPal execution")
      transaction = new Transaction({
        user: req.user._id,
        order: orderId,
        transactionId: generateTransactionId("PAYPAL"),
        paymentMethod: "paypal",
        amount: order.finalAmount,
        status: "pending",
        paymentDetails: {
          paymentId: token,
          paypalOrderId: token,
        },
      })
      await transaction.save()
    } else {
      // Update transaction with PayPal order ID if not already set
      if (!transaction.paymentDetails.paypalOrderId) {
        transaction.paymentDetails.paypalOrderId = token
        await transaction.save()
      }
    }

    const paypalClient = getPayPalClient()
    const request = new paypal.orders.OrdersCaptureRequest(token)
    request.requestBody({})

    console.error("Executing PayPal capture request for token:", token)
    const response = await paypalClient.execute(request)
    console.error("PayPal capture response status:", response.result.status)
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
      transaction.failureReason = `PayPal payment failed with status: ${response.result.status}`
      await transaction.save()

      order.paymentStatus = "failed"
      order.failureReason = `PayPal payment failed with status: ${response.result.status}`
      await order.save()

      req.flash("error_msg", `Payment was not completed. Status: ${response.result.status}`)
      return res.redirect(`/order-failure/${orderId}`)
    }
  } catch (error) {
    console.error("PayPal execution error:", {
      error: error.message,
      stack: error.stack,
      orderId: req.query.orderId,
      token: req.query.token,
      PayerID: req.query.PayerID
    })

    if (transaction) {
      transaction.status = "failed"
      transaction.paymentDetails = transaction.paymentDetails || {}
      transaction.paymentDetails.errorMessage = error.message
      transaction.failureReason = `PayPal execution error: ${error.message}`
      await transaction.save().catch(() => {})
    }
    if (order) {
      order.paymentStatus = "failed"
      order.failureReason = `PayPal execution error: ${error.message}`
      await order.save().catch(() => {})
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
      transaction.failureReason = "User cancelled PayPal payment"
      await transaction.save()
    }

    const order = await Order.findById(orderId)
    if (order) {
      order.paymentStatus = "failed"
      order.failureReason = "User cancelled PayPal payment"
      await order.save()
    }

    req.flash("error_msg", "Payment was cancelled")
    return res.redirect(`/order-failure/${orderId}`)
  } catch (error) {
    req.flash("error_msg", "An error occurred during payment cancellation: " + error.message)
    return res.redirect(`/order-failure/${req.query.orderId || ""}`)
  }
}

const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId, addressId } = req.body
    const userId = req.user._id

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
          errorCode: "ORDER_NOT_FOUND",
        })
      }
    } else if (addressId) {
      order = await createOrderFromCart(userId, addressId, "razorpay", req)
    } else {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        errorCode: "MISSING_PARAMETERS",
      })
    }

    const existingTransaction = await Transaction.findOne({
      order: order._id,
      status: "pending",
      paymentMethod: "razorpay",
    })

    if (existingTransaction) {
      existingTransaction.status = "failed"
      existingTransaction.failureReason = "New payment attempt initiated"
      await existingTransaction.save()
    }

    const razorpayClient = getRazorpayClient()
    const amountInPaise = Math.round(order.finalAmount * 100)

    const razorpayOrder = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: order.orderID,
      notes: {
        orderId: order._id.toString(),
        userId: userId.toString(),
      },
    })

    const transactionId = generateTransactionId("RAZORPAY")
    await Transaction.create({
      user: userId,
      order: order._id,
      transactionId: transactionId,
      paymentMethod: "razorpay",
      amount: order.finalAmount,
      status: "pending",
      paymentDetails: {
        razorpayOrderId: razorpayOrder.id,
        currency: "INR",
      },
    })

    res.json({
      success: true,
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
      name: "WEARiT",
      description: `Order #${order.orderID}`,
      prefill: {
        name: req.user.name,
        email: req.user.email,
        contact: req.user.mobile || "",
      },
      theme: {
        color: "#1a1a1a",
      },
    })
  } catch (error) {
    console.error("Razorpay order creation error:", {
      error: error.message,
      stack: error.stack,
      orderId: req.body.orderId,
      addressId: req.body.addressId
    })

    const parsedError = parseRazorpayError(error)

    res.status(500).json({
      success: false,
      message: parsedError.userMessage,
      errorCode: "RAZORPAY_ORDER_CREATION_FAILED",
      retryable: parsedError.retryable,
      technicalMessage: parsedError.message,
    })
  }
}

const verifyRazorpayPayment = async (req, res) => {
  let order = null
  let transaction = null

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body

    console.error("Razorpay verification started:", {
      razorpay_order_id,
      razorpay_payment_id,
      orderId,
      hasSignature: !!razorpay_signature
    })

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      console.error("Missing Razorpay payment parameters:", {
        razorpay_order_id: !!razorpay_order_id,
        razorpay_payment_id: !!razorpay_payment_id,
        razorpay_signature: !!razorpay_signature,
        orderId: !!orderId
      })
      return res.status(400).json({
        success: false,
        message: "Missing required payment parameters",
        errorCode: "MISSING_PAYMENT_PARAMETERS",
        retryable: true,
      })
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      console.error("Razorpay signature verification failed:", {
        expected: expectedSignature,
        received: razorpay_signature,
        body: body
      })
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. This could be due to a security issue.",
        errorCode: "SIGNATURE_VERIFICATION_FAILED",
        retryable: true,
        userMessage: "Payment verification failed. Please try again or contact support.",
      })
    }

    order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      paymentStatus: { $in: ["pending", "failed"] },
    })

    if (!order) {
      console.error("Order not found for Razorpay verification:", { orderId, userId: req.user._id })
      return res.status(404).json({
        success: false,
        message: "Order not found or already paid",
        errorCode: "ORDER_NOT_FOUND",
        retryable: false,
      })
    }

    // Find transaction by Razorpay order ID first, then by order ID
    transaction = await Transaction.findOne({
      $or: [
        { "paymentDetails.razorpayOrderId": razorpay_order_id, paymentMethod: "razorpay", status: "pending" },
        { order: orderId, paymentMethod: "razorpay", status: "pending" }
      ]
    })

    console.error("Transaction found for Razorpay:", {
      transactionId: transaction?._id,
      razorpayOrderId: transaction?.paymentDetails?.razorpayOrderId,
      status: transaction?.status
    })

    if (!transaction) {
      console.error("Creating new transaction for Razorpay verification")
      transaction = new Transaction({
        user: req.user._id,
        order: orderId,
        transactionId: generateTransactionId("RAZORPAY"),
        paymentMethod: "razorpay",
        amount: order.finalAmount,
        status: "pending",
        paymentDetails: {
          razorpayOrderId: razorpay_order_id,
          currency: "INR",
        },
      })
      await transaction.save()
    } else {
      // Update transaction with Razorpay order ID if not already set
      if (!transaction.paymentDetails.razorpayOrderId) {
        transaction.paymentDetails.razorpayOrderId = razorpay_order_id
        await transaction.save()
      }
    }

    const razorpayClient = getRazorpayClient()
    console.error("Fetching Razorpay payment:", razorpay_payment_id)
    const payment = await razorpayClient.payments.fetch(razorpay_payment_id)
    console.error("Razorpay payment status:", payment.status)

    if (payment.status === "captured") {
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
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentMethod: "razorpay",
        amount: order.finalAmount,
        currency: "INR",
        status: "completed",
        createdAt: new Date(),
      }

      await order.save()

      transaction.status = "completed"
      transaction.paymentDetails = {
        ...transaction.paymentDetails,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentStatus: payment.status,
        paymentMethod: payment.method,
      }

      await transaction.save()

      if (order.coupon && order.coupon.couponId && !order.couponProcessed) {
        await couponController.processCouponUsage(req.user._id, order.coupon.couponId, order._id)
        order.couponProcessed = true
        await order.save()
      }

      const orderAge = Date.now() - new Date(order.orderDate).getTime()
      const isRetryPayment = orderAge > 60000 // If order is older than 1 minute, it's likely a retry

      if (!isRetryPayment) {
        await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { products: [] } })

        if (req.session.couponDiscount) {
          req.session.couponDiscount = 0
        }
        if (req.session.coupon) {
          delete req.session.coupon
        }
      }

      return res.json({
        success: true,
        message: "Payment verified successfully",
        orderId: order._id,
        redirectUrl: `/order-success/${order._id}`,
      })
    } else {
      const errorInfo = parseRazorpayError({
        error: { code: payment.error_code, description: payment.error_description },
      })

      transaction.status = "failed"
      transaction.paymentDetails = {
        ...transaction.paymentDetails,
        razorpayPaymentId: razorpay_payment_id,
        errorMessage: payment.error_description || `Payment failed with status: ${payment.status}`,
        errorCode: payment.error_code,
      }
      transaction.failureReason = errorInfo.message
      await transaction.save()

      order.paymentStatus = "failed"
      order.failureReason = errorInfo.message
      await order.save()

      return res.status(400).json({
        success: false,
        message: errorInfo.userMessage,
        orderId: order._id,
        redirectUrl: `/order-failure/${order._id}`,
        errorCode: payment.error_code || "PAYMENT_FAILED",
        retryable: errorInfo.retryable,
      })
    }
  } catch (error) {
    console.error("Razorpay verification error:", {
      error: error.message,
      stack: error.stack,
      orderId: req.body.orderId,
      razorpay_order_id: req.body.razorpay_order_id,
      razorpay_payment_id: req.body.razorpay_payment_id
    })

    const parsedError = parseRazorpayError(error)

    if (transaction) {
      transaction.status = "failed"
      transaction.paymentDetails = {
        ...transaction.paymentDetails,
        errorMessage: error.message,
      }
      transaction.failureReason = parsedError.message
      await transaction.save().catch(() => {})
    }

    if (order) {
      order.paymentStatus = "failed"
      order.failureReason = parsedError.message
      await order.save().catch(() => {})
    }

    return res.status(500).json({
      success: false,
      message: parsedError.userMessage,
      orderId: req.body.orderId || "",
      redirectUrl: `/order-failure/${req.body.orderId || ""}`,
      errorCode: "PAYMENT_VERIFICATION_ERROR",
      retryable: parsedError.retryable,
    })
  }
}

const handleRazorpayFailure = async (req, res) => {
  try {
    const { error, orderId } = req.body

    console.error("Razorpay failure handling:", { error, orderId })

    if (!orderId) {
      console.error("Missing order ID in Razorpay failure")
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
        errorCode: "MISSING_ORDER_ID",
      })
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    })

    if (order) {
      const parsedError = parseRazorpayError(error)

      order.paymentStatus = "failed"
      order.failureReason = parsedError.message
      await order.save()

      const transaction = await Transaction.findOne({
        order: orderId,
        status: "pending",
        paymentMethod: "razorpay",
      })

      if (transaction) {
        transaction.status = "failed"
        transaction.failureReason = parsedError.message
        transaction.paymentDetails = {
          ...transaction.paymentDetails,
          errorCode: error.code,
          errorDescription: error.description,
          errorSource: error.source,
          errorStep: error.step,
          errorReason: error.reason,
        }
        await transaction.save()
      }

      return res.json({
        success: false,
        message: parsedError.userMessage,
        orderId: order._id,
        redirectUrl: `/order-failure/${order._id}`,
        errorCode: error.code || "RAZORPAY_PAYMENT_FAILED",
        retryable: parsedError.retryable,
      })
    }

    return res.status(404).json({
      success: false,
      message: "Order not found",
      errorCode: "ORDER_NOT_FOUND",
    })
  } catch (error) {
    console.error("Error in handleRazorpayFailure:", {
      error: error.message,
      stack: error.stack,
      orderId: req.body.orderId
    })

    return res.status(500).json({
      success: false,
      message: "Error processing payment failure",
      errorCode: "FAILURE_PROCESSING_ERROR",
    })
  }
}

const razorpaySuccess = async (req, res) => {
  try {
    const { orderId } = req.query

    if (!orderId) {
      req.flash("error_msg", "Order ID is missing")
      return res.redirect("/orders")
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      paymentStatus: "completed",
    })

    if (!order) {
      req.flash("error_msg", "Order not found or payment not completed")
      return res.redirect(`/order-failure/${orderId}`)
    }

    return res.redirect(`/order-success/${orderId}`)
  } catch (error) {
    req.flash("error_msg", "An error occurred: " + error.message)
    return res.redirect(`/order-failure/${req.query.orderId || ""}`)
  }
}

const razorpayFailure = async (req, res) => {
  try {
    const { orderId } = req.query

    if (!orderId) {
      req.flash("error_msg", "Order ID is missing")
      return res.redirect("/orders")
    }

    const order = await Order.findById(orderId)
    if (order) {
      order.paymentStatus = "failed"
      order.failureReason = "Payment failed or was cancelled by user"
      await order.save()
    }

    req.flash("error_msg", "Payment failed or was cancelled")
    return res.redirect(`/order-failure/${orderId}`)
  } catch (error) {
    req.flash("error_msg", "An error occurred during payment failure handling: " + error.message)
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
    }).populate({
      path: "products.product",
      select: "name variants isActive",
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or already paid",
        errorCode: "ORDER_NOT_FOUND",
      })
    }

    const stockIssues = []
    const unavailableProducts = []

    for (const item of order.products) {
      const product = item.product

      if (!product || !product.isActive) {
        unavailableProducts.push({
          productName: item.productName || "Unknown Product",
          size: item.variant.size,
          reason: "Product no longer available",
        })
        continue
      }

      const variant = product.variants.find((v) => v.size === item.variant.size)
      if (!variant) {
        stockIssues.push({
          productName: product.name,
          size: item.variant.size,
          requestedQuantity: item.quantity,
          availableStock: 0,
          isPartialStock: false,
        })
        continue
      }

      if (variant.varientquatity === 0) {
        stockIssues.push({
          productName: product.name,
          size: item.variant.size,
          requestedQuantity: item.quantity,
          availableStock: 0,
          isPartialStock: false,
        })
      } else if (variant.varientquatity < item.quantity) {
        stockIssues.push({
          productName: product.name,
          size: item.variant.size,
          requestedQuantity: item.quantity,
          availableStock: variant.varientquatity,
          isPartialStock: true,
        })
      }
    }

    if (stockIssues.length > 0 || unavailableProducts.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Stock validation failed",
        errorCode: "STOCK_VALIDATION_FAILED",
        hasStockIssues: stockIssues.length > 0,
        hasUnavailableProducts: unavailableProducts.length > 0,
        stockIssues,
        unavailableProducts,
      })
    }

    if (paymentMethod) {
      const paymentValidation = priceCalculator.validatePaymentMethod(paymentMethod, order.finalAmount)
      if (!paymentValidation.valid) {
        return res.status(400).json({
          success: false,
          message: paymentValidation.message,
          errorCode: "INVALID_PAYMENT_METHOD",
        })
      }
    }

    if (paymentMethod && ["online", "paypal", "razorpay", "wallet", "COD"].includes(paymentMethod)) {
      order.paymentMethod = paymentMethod
      order.failureReason = null
      await order.save()
    }

    if (order.paymentMethod === "paypal") {
      console.error("PayPal retry payment started:", {
        orderId: order._id,
        baseUrl: baseUrl,
        headers: {
          host: req.headers.host,
          'x-forwarded-host': req.headers['x-forwarded-host'],
          'x-forwarded-proto': req.headers['x-forwarded-proto'],
          protocol: req.protocol
        }
      })

      const existingTransaction = await Transaction.findOne({
        order: order._id,
        status: "pending",
        paymentMethod: "paypal",
      })

      if (existingTransaction) {
        existingTransaction.status = "failed"
        existingTransaction.failureReason = "Retry payment initiated"
        await existingTransaction.save()
      }

      const paypalClient = getPayPalClient()
      const request = new paypal.orders.OrdersCreateRequest()
      const amountUSD = (order.finalAmount / 75).toFixed(2)
      const returnUrl = `${baseUrl}/payment/paypal/success?orderId=${order._id}`
      const cancelUrl = `${baseUrl}/payment/paypal/cancel?orderId=${order._id}`

      console.error("PayPal retry URLs:", { baseUrl, returnUrl, cancelUrl })

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
      const transactionId = generateTransactionId("PAYPAL")

      await Transaction.create({
        user: req.user._id,
        order: order._id,
        transactionId: transactionId,
        paymentMethod: "paypal",
        amount: order.finalAmount,
        status: "pending",
        paymentDetails: {
          paymentId: response.result.id,
          paypalOrderId: response.result.id,
        },
      })

      return res.json({
        success: true,
        redirect: approvalUrl,
        paypalOrderId: response.result.id,
      })
    } else if (order.paymentMethod === "razorpay") {
      const existingTransaction = await Transaction.findOne({
        order: order._id,
        status: "pending",
        paymentMethod: "razorpay",
      })

      if (existingTransaction) {
        existingTransaction.status = "failed"
        existingTransaction.failureReason = "Retry payment initiated"
        await existingTransaction.save()
      }

      const razorpayClient = getRazorpayClient()
      const amountInPaise = Math.round(order.finalAmount * 100)

      const razorpayOrder = await razorpayClient.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: order.orderID,
        notes: {
          orderId: order._id.toString(),
          userId: req.user._id.toString(),
        },
      })

      const transactionId = generateTransactionId("RAZORPAY")
      await Transaction.create({
        user: req.user._id,
        order: order._id,
        transactionId: transactionId,
        paymentMethod: "razorpay",
        amount: order.finalAmount,
        status: "pending",
        paymentDetails: {
          razorpayOrderId: razorpayOrder.id,
          currency: "INR",
        },
      })

      return res.json({
        success: true,
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID,
        name: "WEARiT",
        description: `Order #${order.orderID}`,
        orderId: order._id,
        prefill: {
          name: req.user.name,
          email: req.user.email,
          contact: req.user.mobile || "",
        },
        theme: {
          color: "#1a1a1a",
        },
      })
    } else if (order.paymentMethod === "wallet") {
      const user = await User.findById(req.user._id)
      if (!user.wallet || user.wallet.balance < order.finalAmount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
          errorCode: "INSUFFICIENT_WALLET_BALANCE",
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
      order.failureReason = null
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
      order.failureReason = null
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
    console.error("Retry payment error:", {
      error: error.message,
      stack: error.stack,
      orderId: req.params.id,
      paymentMethod: req.body.paymentMethod
    })

    const parsedError = parseRazorpayError(error)

    res.status(500).json({
      success: false,
      message: parsedError.userMessage,
      errorCode: "RETRY_PAYMENT_ERROR",
      retryable: parsedError.retryable,
    })
  }
}

module.exports = {
  createPaypalPayment,
  executePaypalPayment,
  cancelPaypalPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayFailure,
  razorpaySuccess,
  razorpayFailure,
  retryPayment,
}
