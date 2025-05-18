// controllers/user/walletController.js
const User = require("../../models/userModel")
const mongoose = require("mongoose")
const Transaction = require("../../models/transactionModel")
const getWishlistCount = require("../../utils/wishlistCount")
const paypal = require("@paypal/checkout-server-sdk")

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
  return `WALLET-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`
}

const walletController = {
  getWalletPage: async (req, res) => {
    try {
      const user = await User.findById(req.user._id)
      const wishlistCount = await getWishlistCount(req.user._id)
      if (!user.wallet) {
        user.wallet = {
          balance: 0,
          transactions: [],
        }
        await user.save()
      }
      const page = Number.parseInt(req.query.page) || 1
      const limit = 10
      const skip = (page - 1) * limit
      const totalTransactions = await Transaction.countDocuments({
        user: req.user._id,
      })

      const totalPages = Math.ceil(totalTransactions / limit)
      const transactions = await Transaction.find({
        user: req.user._id,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

      res.render("pages/wallet", {
        user,
        wishlistCount,
        transactions,
        activePage: "wallet",
        currentPage: page,
        totalPages,
        messages: req.flash(),
      })
    } catch (error) {
      console.error("Error loading wallet page:", error)
      req.flash("error_msg", "Error loading wallet page")
      res.redirect("/profile")
    }
  },
  createPaypalOrder: async (req, res) => {
    try {
      const { amount } = req.body
      const userId = req.user._id
      const baseUrl = getBaseUrl(req)

      if (!amount || Number.parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid amount",
        })
      }

      const paypalClient = getPayPalClient()
      const request = new paypal.orders.OrdersCreateRequest()
      const amountUSD = (Number.parseFloat(amount) / 75).toFixed(2)
      const returnUrl = `${baseUrl}/wallet/paypal/success`
      const cancelUrl = `${baseUrl}/wallet/paypal/cancel`
      request.prefer("return=representation")
      request.requestBody({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amountUSD,
            },
            description: "WEARiT Wallet Top-up",
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
      req.session.paypalWalletTopup = {
        paypalOrderId: response.result.id,
        amount: Number.parseFloat(amount),
        amountUSD: Number.parseFloat(amountUSD),
        createdAt: new Date(),
      }
      res.json({
        success: true,
        approvalUrl: approvalUrl,
      })
    } catch (error) {
      console.error("Error creating PayPal order for wallet top-up:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create PayPal payment: " + (error.message || "Unknown error"),
      })
    }
  },

  executePaypalPayment: async (req, res) => {
    try {
      const { token, PayerID } = req.query
      if (!token || !PayerID) {
        req.flash("error_msg", "Invalid payment information")
        return res.redirect("/wallet")
      }
      if (!req.session.paypalWalletTopup) {
        req.flash("error_msg", "Payment session expired")
        return res.redirect("/wallet")
      }

      const { amount } = req.session.paypalWalletTopup

      const paypalClient = getPayPalClient()
      const request = new paypal.orders.OrdersCaptureRequest(token)
      request.requestBody({})

      const response = await paypalClient.execute(request)

      if (response.result.status === "COMPLETED") {
        const user = await User.findById(req.user._id)

        if (!user.wallet) {
          user.wallet = {
            balance: 0,
            transactions: [],
          }
        }

        user.wallet.balance += amount
        user.wallet.transactions.push({
          amount: amount,
          type: "credit",
          description: `Added via PayPal (Order ID: ${token})`,
          date: new Date(),
        })

        await user.save()
        const transactionId = generateTransactionId()
        await Transaction.create({
          user: req.user._id,
          transactionId: transactionId,
          paymentMethod: "paypal",
          amount: amount,
          status: "completed",
          paymentDetails: {
            paymentId: token,
            payerId: PayerID,
            captureId: response.result.purchase_units[0]?.payments?.captures[0]?.id,
            type: "wallet_add",
            description: "Added money to wallet via PayPal",
          },
        })

        delete req.session.paypalWalletTopup

        req.flash("success_msg", `₹${amount.toFixed(2)} added to your wallet successfully`)
        return res.redirect("/wallet")
      } else {
        delete req.session.paypalWalletTopup
        req.flash("error_msg", `Payment was not completed. Status: ${response.result.status}`)
        return res.redirect("/wallet")
      }
    } catch (error) {
      console.error("Error executing PayPal payment for wallet top-up:", error)

      delete req.session.paypalWalletTopup

      req.flash("error_msg", "Failed to process payment: " + error.message)
      return res.redirect("/wallet")
    }
  },
  cancelPaypalPayment: async (req, res) => {
    try {
      delete req.session.paypalWalletTopup

      req.flash("error_msg", "Payment was cancelled")
      return res.redirect("/wallet")
    } catch (error) {
      console.error("Error handling PayPal cancellation for wallet top-up:", error)
      req.flash("error_msg", "An error occurred during payment cancellation: " + error.message)
      return res.redirect("/wallet")
    }
  },
  addMoney: async (req, res) => {
    try {
      const { amount, paymentMethod } = req.body

      if (!amount || Number.parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid amount",
        })
      }

      const parsedAmount = Number.parseFloat(amount)
      if (paymentMethod !== "paypal") {
        const user = await User.findById(req.user._id)
        if (!user.wallet) {
          user.wallet = {
            balance: 0,
            transactions: [],
          }
        }

        const transaction = {
          amount: parsedAmount,
          type: "credit",
          description: `Added via ${paymentMethod}`,
          date: new Date(),
        }

        user.wallet.balance += parsedAmount
        user.wallet.transactions.push(transaction)

        await user.save()
        await Transaction.create({
          user: req.user._id,
          transactionId: generateTransactionId(),
          paymentMethod: paymentMethod,
          amount: parsedAmount,
          status: "completed",
          paymentDetails: {
            type: "wallet_add",
            description: `Added money to wallet via ${paymentMethod}`,
          },
        })

        return res.json({
          success: true,
          message: "Money added to wallet successfully",
          newBalance: user.wallet.balance,
        })
      } else {
        return res.json({
          success: true,
          usePayPal: true,
          message: "Please complete payment with PayPal",
        })
      }
    } catch (error) {
      console.error("Error adding money to wallet:", error)
      res.status(500).json({
        success: false,
        message: "Error adding money to wallet",
      })
    }
  },
  useWalletBalance: async (req, res) => {
    try {
      const { amount, orderId, description } = req.body

      if (!amount || Number.parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid amount",
        })
      }

      const parsedAmount = Number.parseFloat(amount)

      const user = await User.findById(req.user._id)
      if (!user.wallet || user.wallet.balance < parsedAmount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
        })
      }

      const transaction = {
        amount: parsedAmount,
        type: "debit",
        description: description || `Payment for order #${orderId}`,
        date: new Date(),
      }

      user.wallet.balance -= parsedAmount
      user.wallet.transactions.push(transaction)

      await user.save()
      if (orderId) {
        await Transaction.create({
          user: req.user._id,
          order: orderId,
          transactionId: generateTransactionId(),
          paymentMethod: "wallet",
          amount: parsedAmount,
          status: "completed",
          paymentDetails: {
            type: "order_payment",
            description: description || `Payment for order #${orderId}`,
          },
        })
      }

      res.json({
        success: true,
        message: "Payment successful",
        remainingBalance: user.wallet.balance,
      })
    } catch (error) {
      console.error("Error using wallet balance:", error)
      res.status(500).json({
        success: false,
        message: "Error processing payment",
      })
    }
  },
}

module.exports = walletController
