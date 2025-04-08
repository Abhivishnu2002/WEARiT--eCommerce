const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  size: Number,
  regularPrice: Number,
  salePrice: Number,
  quantity: Number
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  brand: String,
  offer: Number,
  images: [String],  // paths/URLs of images
  rating: Number,
  count: Number,
  isActive: { type: Boolean, default: true },
  variants: [variantSchema],
}, {
  timestamps: true
});

module.exports = mongoose.model("Product", productSchema);
