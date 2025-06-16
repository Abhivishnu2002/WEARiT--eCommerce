const mongoose = require("mongoose")
const Schema = mongoose.Schema

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumPurchase: {
      type: Number,
      default: 0,
      min: 0,
    },
    maximumDiscount: {
      type: Number,
      default: null,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number,
      default: 1,
    },
    perUserLimit: {
      type: Number,
      default: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    autoExpire: {
      type: Boolean,
      default: true,
    },
    userSpecific: {
      type: Boolean,
      default: false,
    },
    applicableUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    applicableCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    applicableProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

couponSchema.pre("save", function (next) {
  if (this.endDate <= this.startDate) {
    return next(new Error("End date must be after start date"))
  }

  if (this.discountType === "percentage" && (this.discountValue <= 0 || this.discountValue > 100)) {
    return next(new Error("Percentage discount must be between 1 and 100"))
  }

  if (this.discountType === "fixed" && this.discountValue <= 0) {
    return next(new Error("Fixed discount must be greater than 0"))
  }

  // Validate discount value vs minimum purchase amount
  if (this.minimumPurchase > 0) {
    if (this.discountType === "fixed") {
      if (this.discountValue >= this.minimumPurchase) {
        return next(new Error("Fixed discount value must be less than minimum purchase amount"))
      }
    } else if (this.discountType === "percentage") {
      // For percentage discounts, check if maximum discount (if set) is less than minimum purchase
      if (this.maximumDiscount && this.maximumDiscount >= this.minimumPurchase) {
        return next(new Error("Maximum discount amount must be less than minimum purchase amount"))
      }

      // Also check if the percentage could result in a discount >= minimum purchase
      // This is a theoretical maximum (percentage of minimum purchase amount)
      const theoreticalMaxDiscount = (this.minimumPurchase * this.discountValue) / 100
      if (theoreticalMaxDiscount >= this.minimumPurchase) {
        return next(new Error("Percentage discount is too high relative to minimum purchase amount"))
      }
    }
  }



  if (this.autoExpire && this.usedCount >= this.usageLimit) {
    this.isActive = false
  }

  next()
})

couponSchema.methods.isValidForUser = function (userId, purchaseAmount) {
  if (!this.isActive) return { valid: false, message: "Coupon is inactive" }

  const now = new Date()
  if (now < this.startDate || now > this.endDate) {
    return { valid: false, message: "Coupon is expired or not yet active" }
  }

  if (this.usedCount >= this.usageLimit) {
    return { valid: false, message: "Coupon usage limit reached" }
  }

  if (purchaseAmount < this.minimumPurchase) {
    return {
      valid: false,
      message: `Minimum purchase amount of ₹${this.minimumPurchase} required`,
    }
  }

  if (this.userSpecific && !this.applicableUsers.includes(userId)) {
    return { valid: false, message: "Coupon not applicable for this user" }
  }

  return { valid: true }
}

couponSchema.methods.hasUserExceededLimit = async function (userId) {
  try {
    const UserCoupon = mongoose.model("UserCoupon")
    const userCoupon = await UserCoupon.findOne({ user: userId, coupon: this._id })

    if (!userCoupon) return false

    return userCoupon.usedCount >= this.perUserLimit
  } catch (error) {
    return true
  }
}

couponSchema.methods.calculateDiscount = function (purchaseAmount) {
  let discountAmount = 0

  if (this.discountType === "percentage") {
    discountAmount = (purchaseAmount * this.discountValue) / 100

    if (this.maximumDiscount && discountAmount > this.maximumDiscount) {
      discountAmount = this.maximumDiscount
    }
  } else {
    discountAmount = this.discountValue

    if (discountAmount > purchaseAmount) {
      discountAmount = purchaseAmount
    }
  }

  return discountAmount
}

couponSchema.methods.incrementUsage = async function (userId, orderId) {
  try {
    this.usedCount += 1

    if (this.autoExpire && this.usedCount >= this.usageLimit) {
      this.isActive = false
    }

    await this.save()

    const UserCoupon = mongoose.model("UserCoupon")

    let userCoupon = await UserCoupon.findOne({ user: userId, coupon: this._id })

    if (!userCoupon) {
      userCoupon = new UserCoupon({
        user: userId,
        coupon: this._id,
        usedCount: 1,
        lastUsed: new Date(),
        orders: [orderId],
      })
    } else {
      userCoupon.usedCount += 1
      userCoupon.lastUsed = new Date()
      if (orderId && !userCoupon.orders.includes(orderId)) {
        userCoupon.orders.push(orderId)
      }
    }

    await userCoupon.save()

    return {
      success: true,
      remainingUses: Math.max(0, this.usageLimit - this.usedCount),
      isExpired: this.usedCount >= this.usageLimit,
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

const Coupon = mongoose.model("Coupon", couponSchema)
module.exports = Coupon
