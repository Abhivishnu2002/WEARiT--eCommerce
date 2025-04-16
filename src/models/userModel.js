const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
      type: String,
      required: true,
      trim: true
  },
  email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
  },
  mobile: {
      type: String,
      trim: true
  },
  password: {
      type: String,
      required: function() {
          return !this.googleId; // Password is required unless user signed up with Google
      }
  },
  googleId: {
      type: String
  },
  isVerified: {
      type: Boolean,
      default: true
  },
  isBlocked: {
      type: Boolean,
      default: false
  },
  otp: {
      code: String,
      expiresAt: Date
  },
  referralCode: {
      type: String,
      unique: true,
      sparse: true
  },
  referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  createdAt: {
      type: Date,
      default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP
userSchema.methods.generateOTP = function() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp = {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(otpToVerify) {
    if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
        return false;
    }
    
    if (this.otp.expiresAt < new Date()) {
        return false; // OTP expired
    }
    
    return this.otp.code === otpToVerify;
};

const User = mongoose.model('User', userSchema);

module.exports =  User;