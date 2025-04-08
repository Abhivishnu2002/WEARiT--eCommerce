const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  offer: Number,
  description: String,
  sales: Number,
  stock: Number,
  addedDate: { type: Date, default: Date.now },
  isListed: { type: Boolean, default: true }
});

module.exports =  mongoose.model("Category", categorySchema);
