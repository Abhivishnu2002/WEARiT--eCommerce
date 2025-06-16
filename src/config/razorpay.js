const Razorpay = require("razorpay")

const getRazorpayClient = () => {
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

module.exports = { getRazorpayClient }
