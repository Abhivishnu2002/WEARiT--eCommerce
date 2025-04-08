const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
      },
      mobile: {
        type: Number,
        required: true,
        unique: true,
      },
      password: {
        type: String,
        required: true,
      },
      isBlocked: {
        type: Boolean,
        default: false,
      },
      role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
      },
    }, {
      timestamps: true // for createdAt and updatedAt
});

module.exports =  mongoose.model("User", userSchema);