const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      fullname: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
      },
      district: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
      mobile: {
        type: Number,
        required: true,
      },
      landmark: {
        type: String,
      },
      type: {
        type: String,
        enum: ["Home", "Work", "Other"],
        default: "Home",
      },
    }, {
      timestamps: true
});

module.exports = mongoose.model("Address", addressSchema);