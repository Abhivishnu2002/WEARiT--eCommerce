const walletController = require("../controllers/user/walletController")

/**
 * Process a refund to user's wallet
 * @param {string} userId - User ID
 * @param {number} amount - Refund amount
 * @param {string} orderId - Order ID (ObjectId)
 * @param {string} orderID - Order display ID
 * @param {string} description - Optional description
 * @returns {Promise<Object>} - Result of refund processing
 */
async function processRefundToWallet(userId, amount, orderId, orderID, description = null) {
  try {
    const result = await walletController.processRefund(userId, amount, orderId, orderID, description)
    return result
  } catch (error) {
    throw error
  }
}

module.exports = {
  processRefundToWallet,
}
