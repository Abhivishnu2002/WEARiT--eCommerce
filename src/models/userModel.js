const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  mobile: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId
    },
  },
  googleId: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
  },
  tempEmail: {
    type: String,
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  wallet: {
    balance: {
        type: Number,
        default: 0
    },
    transactions: [
        {
            amount: {
                type: Number,
                required: true
            },
            type: {
                type: String,
                enum: ['credit', 'debit'],
                required: true
            },
            description: {
                type: String,
                required: true
            },
            date: {
                type: Date,
                default: Date.now
            }
        }
    ]
},
  isAdmin: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

userSchema.statics.validatePasswordComplexity = (password) => {
  if (!password || password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long" }
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must include at least one capital letter" }
  }

  if (!/\d/.test(password)) {
    return { isValid: false, message: "Password must include at least one number" }
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { isValid: false, message: "Password must include at least one symbol" }
  }

  return { isValid: true }
}

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  next()
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  this.otp = otp
  this.otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  return otp
}

userSchema.methods.verifyOTP = function (otpToVerify) {
  if (!this.otp || !this.otpExpires) {
    return false
  }

  if (this.otpExpires < new Date()) {
    return false
  }

  return this.otp === otpToVerify
}

const User = mongoose.model("User", userSchema)

module.exports = User
