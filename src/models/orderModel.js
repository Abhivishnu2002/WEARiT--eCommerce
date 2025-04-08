const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  paymentMethod: String,
  orderDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["pending", "shipped", "delivered", "cancelled", "returned"],
    default: "pending" 
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address"
  },
  transactionId: String,
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon"
  },
  total: Number,
  order_items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "OrderItem"
  }]
});

module.exports =  mongoose.model("Order", orderSchema);
