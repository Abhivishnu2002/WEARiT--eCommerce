const Order = require("../../models/orderModel")
const Transaction = require("../../models/transactionModel")
const User = require("../../models/userModel")
const Wallet = require("../../models/walletModel")
const WalletTransaction = require("../../models/walletTransactionModel")
const { createLogger } = require("../../utils/logger")
const logger = createLogger("refundController")
const paypal = require("@paypal/checkout-server-sdk")
const { getPayPalClient } = require("../../config/paypal")

exports.processPayPalRefund = async (orderId, reason = "Order cancelled") => {
  try {
    logger.info(`Processing PayPal refund for order ${orderId}`)

    const order = await Order.findById(orderId)
    if (!order) {
      logger.error(`Order not found: ${orderId}`)
      throw new Error("Order not found")
    }

    if (!["CANCELLED", "RETURNED"].includes(order.status)) {
      logger.error(`Order ${orderId} is not eligible for refund. Status: ${order.status}`)
      throw new Error("Order is not eligible for refund")
    }

    const transaction = await Transaction.findOne({
      orderId: orderId,
      paymentMethod: "PAYPAL",
      status: "COMPLETED",
    })

    if (!transaction) {
      logger.error(`No completed PayPal transaction found for order ${orderId}`)
      throw new Error("No completed PayPal transaction found")
    }

    if (transaction.refundStatus === "REFUNDED") {
      logger.info(`Refund already processed for order ${orderId}`)
      return { success: true, message: "Refund already processed", alreadyProcessed: true }
    }

    const paypalClient = getPayPalClient()

    const request = new paypal.payments.CapturesRefundRequest(transaction.transactionId)
    request.requestBody({
      amount: {
        currency_code: "USD",
        value: order.totalAmount.toFixed(2),
      },
      note_to_payer: reason,
    })

    const response = await paypalClient.execute(request)

    if (response.statusCode === 201) {
      transaction.refundStatus = "REFUNDED"
      transaction.refundId = response.result.id
      transaction.refundAmount = order.totalAmount
      transaction.refundDate = new Date()
      transaction.refundReason = reason
      await transaction.save()

      const user = await User.findById(order.userId)
      if (user) {
        let wallet = await Wallet.findOne({ userId: user._id })
        if (!wallet) {
          wallet = new Wallet({
            userId: user._id,
            balance: 0,
          })
        }

        wallet.balance += order.totalAmount
        await wallet.save()

        await WalletTransaction.create({
          userId: user._id,
          amount: order.totalAmount,
          type: "CREDIT",
          description: `Refund for order #${order.orderNumber}`,
          reference: orderId,
          status: "COMPLETED",
        })

        logger.info(
          `Refund processed successfully for order ${orderId}. Amount ${order.totalAmount} added to user wallet.`,
        )
        return {
          success: true,
          message: "Refund processed successfully",
          refundId: response.result.id,
          walletBalance: wallet.balance,
        }
      } else {
        logger.error(`User not found for order ${orderId}`)
        return {
          success: true,
          message: "Refund processed but user wallet not updated",
          refundId: response.result.id,
        }
      }
    } else {
      logger.error(`Failed to process refund for order ${orderId}. Status: ${response.statusCode}`)
      throw new Error(`Failed to process refund. Status: ${response.statusCode}`)
    }
  } catch (error) {
    logger.error(`Error processing PayPal refund for order ${orderId}: ${error.message}`)
    throw error
  }
}

exports.adminRefundOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required" })
    }

    const result = await this.processPayPalRefund(orderId, reason || "Refund initiated by admin")

    return res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: result,
    })
  } catch (error) {
    logger.error(`Admin refund error: ${error.message}`)
    return res.status(500).json({
      success: false,
      message: "Failed to process refund",
      error: error.message,
    })
  }
}

exports.checkRefundStatus = async (req, res) => {
  try {
    const { orderId } = req.params

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required" })
    }

    const transaction = await Transaction.findOne({
      orderId: orderId,
      paymentMethod: "PAYPAL",
    })

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" })
    }

    return res.status(200).json({
      success: true,
      data: {
        refundStatus: transaction.refundStatus || "NOT_REFUNDED",
        refundId: transaction.refundId,
        refundAmount: transaction.refundAmount,
        refundDate: transaction.refundDate,
      },
    })
  } catch (error) {
    logger.error(`Check refund status error: ${error.message}`)
    return res.status(500).json({
      success: false,
      message: "Failed to check refund status",
      error: error.message,
    })
  }
}
