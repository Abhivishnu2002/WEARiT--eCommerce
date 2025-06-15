const mongoose = require("mongoose")
const Schema = mongoose.Schema

const transactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      // Not required for wallet top-ups
    },
    transactionId: {
      type: String,
      default: () =>
        `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")}`,
    },
    paymentMethod: {
      type: String,
      enum: ["paypal", "wallet", "COD", "card", "razorpay"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentDetails: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

if (mongoose.connection.models["Transaction"]) {
  delete mongoose.connection.models["Transaction"]
}
transactionSchema.index({ user: 1, createdAt: -1 })
transactionSchema.index({ "paymentDetails.type": 1 })
const Transaction = mongoose.model("Transaction", transactionSchema)
module.exports = Transaction
