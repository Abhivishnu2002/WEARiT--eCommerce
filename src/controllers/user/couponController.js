const Coupon = require("../../models/couponModel")
const UserCoupon = require("../../models/userCouponModel")
const Cart = require("../../models/cartModel")

const getUserCoupons = async (req, res) => {
  try {
    const userId = req.user._id
    const currentDate = new Date()
    const availableCoupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      $or: [{ userSpecific: false }, { userSpecific: true, applicableUsers: userId }],
    })
    const couponsToUpdate = availableCoupons.filter(
      (coupon) => coupon.autoExpire && coupon.usedCount >= coupon.usageLimit,
    )

    if (couponsToUpdate.length > 0) {
      const updatePromises = couponsToUpdate.map((coupon) => {
        coupon.isActive = false
        return coupon.save()
      })

      await Promise.all(updatePromises)
    }
    const userCoupons = await UserCoupon.find({ user: userId })
    const userCouponMap = {}

    userCoupons.forEach((uc) => {
      userCouponMap[uc.coupon.toString()] = uc.usedCount
    })
    const formattedCoupons = availableCoupons
      .filter((coupon) => coupon.isActive)
      .map((coupon) => {
        const usedCount = userCouponMap[coupon._id.toString()] || 0
        const userRemainingUses = Math.max(0, coupon.perUserLimit - usedCount)
        const globalRemainingUses = Math.max(0, coupon.usageLimit - coupon.usedCount)
        const remainingUses = Math.min(userRemainingUses, globalRemainingUses)

        return {
          _id: coupon._id,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minimumPurchase: coupon.minimumPurchase,
          maximumDiscount: coupon.maximumDiscount,
          startDate: coupon.startDate,
          endDate: coupon.endDate,
          usageLimit: coupon.usageLimit,
          perUserLimit: coupon.perUserLimit,
          usedCount: usedCount,
          globalUsedCount: coupon.usedCount,
          remainingUses: remainingUses,
          isUsable: remainingUses > 0,
        }
      })

    const wishlistCount = await getWishlistCount(userId)

    res.render("pages/user-coupons", {
      user: req.user,
      coupons: formattedCoupons,
      wishlistCount,
      activePage: "coupons",
    })
  } catch (error) {
    req.flash("error_msg", "Failed to load coupons")
    res.redirect("/profile")
  }
}

const getAvailableCoupons = async (req, res) => {
  try {
    const userId = req.user._id
    const currentDate = new Date()
    const availableCoupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      $or: [{ userSpecific: false }, { userSpecific: true, applicableUsers: userId }],
    })
    const couponsToUpdate = availableCoupons.filter(
      (coupon) => coupon.autoExpire && coupon.usedCount >= coupon.usageLimit,
    )

    if (couponsToUpdate.length > 0) {
      const updatePromises = couponsToUpdate.map((coupon) => {
        coupon.isActive = false
        return coupon.save()
      })

      await Promise.all(updatePromises)
    }
    const userCoupons = await UserCoupon.find({ user: userId })
    const userCouponMap = {}

    userCoupons.forEach((uc) => {
      userCouponMap[uc.coupon.toString()] = uc.usedCount
    })
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "products.product",
      select: "name images price variants categoryId",
    })

    let cartTotal = 0

    if (cart && cart.products.length > 0) {
      for (const item of cart.products) {
        const product = item.product
        const variant = product.variants.find((v) => v.size === item.size)

        if (variant) {
          const itemTotal = variant.salePrice * item.quantity
          cartTotal += itemTotal
        }
      }
    }
    const formattedCoupons = availableCoupons
      .filter((coupon) => coupon.isActive)
      .map((coupon) => {
        const usedCount = userCouponMap[coupon._id.toString()] || 0
        const userRemainingUses = Math.max(0, coupon.perUserLimit - usedCount)
        const globalRemainingUses = Math.max(0, coupon.usageLimit - coupon.usedCount)
        const remainingUses = Math.min(userRemainingUses, globalRemainingUses)
        const isEligible = cartTotal >= coupon.minimumPurchase

        return {
          _id: coupon._id,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minimumPurchase: coupon.minimumPurchase,
          maximumDiscount: coupon.maximumDiscount,
          startDate: coupon.startDate,
          endDate: coupon.endDate,
          usageLimit: coupon.usageLimit,
          perUserLimit: coupon.perUserLimit,
          usedCount: usedCount,
          globalUsedCount: coupon.usedCount,
          remainingUses: remainingUses,
          isUsable: remainingUses > 0 && isEligible,
          isEligible: isEligible,
          ineligibilityReason: !isEligible
            ? `Minimum purchase amount of ₹${coupon.minimumPurchase} required`
            : remainingUses <= 0
              ? "Usage limit reached"
              : null,
        }
      })

    res.json({
      success: true,
      coupons: formattedCoupons,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load available coupons",
    })
  }
}

const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body
    const userId = req.user._id

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      })
    }
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
    })

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code",
      })
    }
    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "This coupon is no longer active",
      })
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      if (coupon.autoExpire && coupon.isActive) {
        coupon.isActive = false
        await coupon.save()
      }

      return res.status(400).json({
        success: false,
        message: "This coupon has reached its usage limit",
      })
    }
    const currentDate = new Date()
    if (currentDate < coupon.startDate || currentDate > coupon.endDate) {
      return res.status(400).json({
        success: false,
        message: "Coupon is expired or not yet active",
      })
    }
    if (coupon.userSpecific && !coupon.applicableUsers.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "This coupon is not applicable for your account",
      })
    }
    const userCoupon = await UserCoupon.findOne({ user: userId, coupon: coupon._id })
    if (userCoupon && userCoupon.usedCount >= coupon.perUserLimit) {
      return res.status(400).json({
        success: false,
        message: `You have already used this coupon the maximum number of times (${coupon.perUserLimit})`,
      })
    }
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "products.product",
      select: "name images price variants categoryId",
    })

    if (!cart || cart.products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      })
    }

    let cartTotal = 0
    let eligibleTotal = 0

    for (const item of cart.products) {
      const product = item.product
      const variant = product.variants.find((v) => v.size === item.size)

      if (variant) {
        const itemTotal = variant.salePrice * item.quantity
        cartTotal += itemTotal

        const isProductEligible = !coupon.applicableProducts.length || coupon.applicableProducts.includes(product._id)
        const isCategoryEligible =
          !coupon.applicableCategories.length || coupon.applicableCategories.includes(product.categoryId)

        if (isProductEligible && isCategoryEligible) {
          eligibleTotal += itemTotal
        }
      }
    }

    if (cartTotal < coupon.minimumPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase amount of ₹${coupon.minimumPurchase} required`,
      })
    }
    let discountAmount = 0

    if (coupon.discountType === "percentage") {
      discountAmount = (eligibleTotal * coupon.discountValue) / 100
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount
      }
    } else {
      discountAmount = coupon.discountValue
      if (discountAmount > eligibleTotal) {
        discountAmount = eligibleTotal
      }
    }

    discountAmount = Math.round(discountAmount * 100) / 100
    req.session.coupon = {
      id: coupon._id,
      code: coupon.code,
      discountAmount: discountAmount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      description: coupon.description,
    }
    req.session.couponDiscount = discountAmount

    const newTotal = cartTotal - discountAmount

    res.json({
      success: true,
      message: "Coupon applied successfully",
      coupon: {
        code: coupon.code,
        discountAmount: discountAmount,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description,
      },
      cart: {
        subtotal: cartTotal,
        discount: discountAmount,
        total: newTotal,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to apply coupon",
    })
  }
}

const removeCoupon = async (req, res) => {
  try {
    if (req.session.coupon) {
      delete req.session.coupon
    }

    req.session.couponDiscount = 0

    const userId = req.user._id
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "products.product",
      select: "name images price variants",
    })

    if (!cart || cart.products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      })
    }

    let cartTotal = 0

    for (const item of cart.products) {
      const product = item.product
      const variant = product.variants.find((v) => v.size === item.size)

      if (variant) {
        cartTotal += variant.salePrice * item.quantity
      }
    }

    res.json({
      success: true,
      message: "Coupon removed successfully",
      cart: {
        subtotal: cartTotal,
        discount: 0,
        total: cartTotal,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to remove coupon",
    })
  }
}

const getSessionCoupon = async (req, res) => {
  try {
    if (req.session.coupon) {
      const coupon = await Coupon.findById(req.session.coupon.id)
      if (!coupon || !coupon.isActive || coupon.usedCount >= coupon.usageLimit) {
        delete req.session.coupon
        req.session.couponDiscount = 0

        return res.json({
          success: false,
          message: "The applied coupon is no longer valid and has been removed",
          couponRemoved: true,
        })
      }

      res.json({
        success: true,
        coupon: req.session.coupon,
      })
    } else {
      res.json({
        success: false,
        message: "No coupon in session",
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get session coupon",
    })
  }
}

const processCouponUsage = async (userId, couponId, orderId) => {
  try {
    if (!couponId) return { success: true, message: "No coupon to process" }

    const coupon = await Coupon.findById(couponId)
    if (!coupon) return { success: false, message: "Coupon not found" }
    coupon.usedCount += 1
    let isExpired = false
    if (coupon.autoExpire && coupon.usedCount >= coupon.usageLimit) {
      coupon.isActive = false
      isExpired = true
    }

    await coupon.save()
    const userCoupon = await UserCoupon.findOne({ user: userId, coupon: couponId })

    if (userCoupon) {
      userCoupon.usedCount += 1
      userCoupon.lastUsed = new Date()
      userCoupon.orders.push(orderId)
      await userCoupon.save()
    } else {
      await UserCoupon.create({
        user: userId,
        coupon: couponId,
        usedCount: 1,
        lastUsed: new Date(),
        orders: [orderId],
      })
    }

    return {
      success: true,
      message: "Coupon usage processed successfully",
      isExpired,
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function getWishlistCount(userId) {
  try {
    const Wishlist = require("../../models/wishlistModel")
    const wishlist = await Wishlist.findOne({ user: userId })
    return wishlist ? wishlist.products.length : 0
  } catch (error) {
    return 0
  }
}

module.exports = {
  getUserCoupons,
  getAvailableCoupons,
  applyCoupon,
  removeCoupon,
  getSessionCoupon,
  processCouponUsage,
}
