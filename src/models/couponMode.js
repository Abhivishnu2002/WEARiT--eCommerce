const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  coupencode: { type: String, required: true, unique: true },
  couponpercent: { type: Number, required: true },
  minimumPurchase: Number,
  startingDate: Date,
  expiryDate: Date,
  description: String,
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("Coupon", couponSchema);
