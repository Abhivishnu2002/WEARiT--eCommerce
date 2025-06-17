const Coupon = require("../../models/couponModel")
const User = require("../../models/userModel")
const Category = require("../../models/categoryModel")
const Product = require("../../models/productModel")
const UserCoupon = require("../../models/userCouponModel")

const getAllCoupons = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const query = {}

    if (req.query.search) {
      query.code = { $regex: req.query.search, $options: "i" }
    }

    if (req.query.status) {
      if (req.query.status === "active") {
        query.isActive = true
      } else if (req.query.status === "inactive") {
        query.isActive = false
      }
    }

    if (req.query.type) {
      query.discountType = req.query.type
    }
    const currentDate = new Date()

    if (req.query.validity) {
      if (req.query.validity === "valid") {
        query.startDate = { $lte: currentDate }
        query.endDate = { $gte: currentDate }
      } else if (req.query.validity === "expired") {
        query.endDate = { $lt: currentDate }
      } else if (req.query.validity === "upcoming") {
        query.startDate = { $gt: currentDate }
      }
    }
    const totalCoupons = await Coupon.countDocuments(query)
    const totalPages = Math.ceil(totalCoupons / limit)
    const coupons = await Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
    const couponsToUpdate = coupons.filter(
      (coupon) => coupon.autoExpire && coupon.isActive && coupon.usedCount >= coupon.usageLimit,
    )

    if (couponsToUpdate.length > 0) {
      const updatePromises = couponsToUpdate.map((coupon) => {
        coupon.isActive = false
        return coupon.save()
      })

      await Promise.all(updatePromises)
    }
    const formattedCoupons = coupons.map((coupon) => {
      const isExpired = coupon.endDate < currentDate
      const isUpcoming = coupon.startDate > currentDate
      const isActive = coupon.isActive && !isExpired && !isUpcoming
      const usageLimitReached = coupon.usedCount >= coupon.usageLimit
      let status = isExpired ? "Expired" : isUpcoming ? "Upcoming" : isActive ? "Active" : "Inactive"
      if (usageLimitReached && coupon.autoExpire) {
        status = "Limit Reached"
      }

      return {
        ...coupon.toObject(),
        status,
        remainingUses: Math.max(0, coupon.usageLimit - coupon.usedCount),
        usageLimitReached,
      }
    })

    res.render("admin/pages/coupons", {
      coupons: formattedCoupons,
      currentPage: page,
      totalPages,
      totalCoupons,
      query: req.query,
      admin: req.session.admin,
      limit,
    })
  } catch (error) {
    console.error("Admin getAllCoupons error:", error)
    req.flash("error_msg", "Failed to fetch coupons")
    res.render("admin/pages/coupons", {
      coupons: [],
      admin: req.session.admin,
    })
  }
}
const loadAddCoupon = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true }).sort({ name: 1 })
    const products = await Product.find({ isActive: true }).sort({ name: 1 })
    const users = await User.find({ isBlocked: false }).select("name email").sort({ name: 1 })
    req.session.error_msg = null
    req.session.success_msg = null

    res.render("admin/pages/add-coupon", {
      categories,
      products,
      users,
      admin: req.session.admin,
      error_msg: req.flash("error_msg"),
    })
  } catch (error) {
    console.error("Admin loadAddCoupon error:", error)
    req.flash("error_msg", "Failed to load add coupon page")
    res.redirect("/admin/coupons")
  }
}
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumPurchase,
      maximumDiscount,
      startDate,
      endDate,
      usageLimit,
      perUserLimit,
      isActive,
      autoExpire,
      userSpecific,
      applicableUsers,
      applicableCategories,
      applicableProducts,
    } = req.body
    if (!code || !description || !discountType || !discountValue || !startDate || !endDate || !usageLimit) {
      req.flash("error_msg", "Please fill all required fields")
      return res.redirect("/admin/coupons/add")
    }
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() })
    if (existingCoupon) {
      req.flash("error_msg", "Coupon code already exists")
      return res.redirect("/admin/coupons/add")
    }
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end <= start) {
      req.flash("error_msg", "End date must be after start date")
      return res.redirect("/admin/coupons/add")
    }
    if (discountType === "percentage" && (discountValue <= 0 || discountValue > 100)) {
      req.flash("error_msg", "Percentage discount must be between 1 and 100")
      return res.redirect("/admin/coupons/add")
    }

    if (discountType === "fixed" && discountValue <= 0) {
      req.flash("error_msg", "Fixed discount must be greater than 0")
      return res.redirect("/admin/coupons/add")
    }
    const minPurchase = Number.parseFloat(minimumPurchase || 0)
    const discountVal = Number.parseFloat(discountValue)
    const maxDiscount = maximumDiscount ? Number.parseFloat(maximumDiscount) : null

    if (minPurchase > 0) {
      if (discountType === "fixed") {
        if (discountVal >= minPurchase) {
          req.flash("error_msg", "Fixed discount value must be less than minimum purchase amount")
          return res.redirect("/admin/coupons/add")
        }
      } else if (discountType === "percentage") {
        if (maxDiscount && maxDiscount >= minPurchase) {
          req.flash("error_msg", "Maximum discount amount must be less than minimum purchase amount")
          return res.redirect("/admin/coupons/add")
        }
        const theoreticalMaxDiscount = (minPurchase * discountVal) / 100
        if (theoreticalMaxDiscount >= minPurchase) {
          req.flash("error_msg", "Percentage discount is too high relative to minimum purchase amount")
          return res.redirect("/admin/coupons/add")
        }
      }
    }

    const newCoupon = new Coupon({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue: Number.parseFloat(discountValue),
      minimumPurchase: Number.parseFloat(minimumPurchase || 0),
      maximumDiscount: maximumDiscount ? Number.parseFloat(maximumDiscount) : null,
      startDate: start,
      endDate: end,
      isActive: isActive === "on",
      usageLimit: Number.parseInt(usageLimit || 1),
      perUserLimit: Number.parseInt(perUserLimit || 1),
      autoExpire: autoExpire === "on",
      userSpecific: userSpecific === "on",
      applicableUsers:
        userSpecific === "on" && applicableUsers
          ? Array.isArray(applicableUsers)
            ? applicableUsers
            : [applicableUsers]
          : [],
      applicableCategories: applicableCategories
        ? Array.isArray(applicableCategories)
          ? applicableCategories
          : [applicableCategories]
        : [],
      applicableProducts: applicableProducts
        ? Array.isArray(applicableProducts)
          ? applicableProducts
          : [applicableProducts]
        : [],
    })

    await newCoupon.save()

    req.flash("success_msg", "Coupon created successfully")
    res.redirect("/admin/coupons")
  } catch (error) {
    console.error("Admin createCoupon error:", error)
    req.flash("error_msg", `Failed to create coupon: ${error.message}`)
    res.redirect("/admin/coupons/add")
  }
}
const loadEditCoupon = async (req, res) => {
  try {
    const couponId = req.params.id
    const coupon = await Coupon.findById(couponId)
    if (!coupon) {
      req.flash("error_msg", "Coupon not found")
      return res.redirect("/admin/coupons")
    }
    const categories = await Category.find({ isListed: true }).sort({ name: 1 })
    const products = await Product.find({ isActive: true }).sort({ name: 1 })
    const users = await User.find({ isBlocked: false }).select("name email").sort({ name: 1 })
    const startDate = coupon.startDate.toISOString().split("T")[0]
    const endDate = coupon.endDate.toISOString().split("T")[0]
    const currentDate = new Date()
    const isExpired = coupon.endDate < currentDate
    const isUpcoming = coupon.startDate > currentDate
    const isActive = coupon.isActive && !isExpired && !isUpcoming
    const usageLimitReached = coupon.usedCount >= coupon.usageLimit

    let status = isExpired ? "Expired" : isUpcoming ? "Upcoming" : isActive ? "Active" : "Inactive"
    if (usageLimitReached && coupon.autoExpire) {
      status = "Limit Reached"
    }
    req.session.error_msg = null
    req.session.success_msg = null

    res.render("admin/pages/edit-coupon", {
      coupon: {
        ...coupon.toObject(),
        startDate,
        endDate,
        status,
        remainingUses: Math.max(0, coupon.usageLimit - coupon.usedCount),
        usageLimitReached,
      },
      categories,
      products,
      users,
      admin: req.session.admin,
      error_msg: req.flash("error_msg"),
    })
  } catch (error) {
    console.error("Admin loadEditCoupon error:", error)
    req.flash("error_msg", "Failed to load edit coupon page")
    res.redirect("/admin/coupons")
  }
}

const updateCoupon = async (req, res) => {
  try {
    const couponId = req.params.id
    const {
      description,
      discountType,
      discountValue,
      minimumPurchase,
      maximumDiscount,
      startDate,
      endDate,
      usageLimit,
      perUserLimit,
      isActive,
      autoExpire,
      userSpecific,
      applicableUsers,
      applicableCategories,
      applicableProducts,
    } = req.body
    const coupon = await Coupon.findById(couponId)
    if (!coupon) {
      req.flash("error_msg", "Coupon not found")
      return res.redirect("/admin/coupons")
    }
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end <= start) {
      req.flash("error_msg", "End date must be after start date")
      return res.redirect(`/admin/coupons/edit/${couponId}`)
    }
    if (discountType === "percentage" && (discountValue <= 0 || discountValue > 100)) {
      req.flash("error_msg", "Percentage discount must be between 1 and 100")
      return res.redirect(`/admin/coupons/edit/${couponId}`)
    }
    if (discountType === "fixed" && discountValue <= 0) {
      req.flash("error_msg", "Fixed discount must be greater than 0")
      return res.redirect(`/admin/coupons/edit/${couponId}`)
    }
    if (Number.parseInt(usageLimit) < coupon.usedCount) {
      req.flash("error_msg", "Usage limit cannot be less than current usage count")
      return res.redirect(`/admin/coupons/edit/${couponId}`)
    }
    const minPurchase = Number.parseFloat(minimumPurchase || 0)
    const discountVal = Number.parseFloat(discountValue)
    const maxDiscount = maximumDiscount ? Number.parseFloat(maximumDiscount) : null

    if (minPurchase > 0) {
      if (discountType === "fixed") {
        if (discountVal >= minPurchase) {
          req.flash("error_msg", "Fixed discount value must be less than minimum purchase amount")
          return res.redirect(`/admin/coupons/edit/${couponId}`)
        }
      } else if (discountType === "percentage") {
        if (maxDiscount && maxDiscount >= minPurchase) {
          req.flash("error_msg", "Maximum discount amount must be less than minimum purchase amount")
          return res.redirect(`/admin/coupons/edit/${couponId}`)
        }
        const theoreticalMaxDiscount = (minPurchase * discountVal) / 100
        if (theoreticalMaxDiscount >= minPurchase) {
          req.flash("error_msg", "Percentage discount is too high relative to minimum purchase amount")
          return res.redirect(`/admin/coupons/edit/${couponId}`)
        }
      }
    }

    coupon.description = description
    coupon.discountType = discountType
    coupon.discountValue = Number.parseFloat(discountValue)
    coupon.minimumPurchase = Number.parseFloat(minimumPurchase || 0)
    coupon.maximumDiscount = maximumDiscount ? Number.parseFloat(maximumDiscount) : null
    coupon.startDate = start
    coupon.endDate = end
    coupon.isActive = isActive === "on"
    coupon.usageLimit = Number.parseInt(usageLimit || 1)
    coupon.perUserLimit = Number.parseInt(perUserLimit || 1)
    coupon.autoExpire = autoExpire === "on"
    coupon.userSpecific = userSpecific === "on"
    if (coupon.autoExpire && coupon.usedCount >= coupon.usageLimit) {
      coupon.isActive = false
    }

    coupon.applicableUsers =
      userSpecific === "on" && applicableUsers
        ? Array.isArray(applicableUsers)
          ? applicableUsers
          : [applicableUsers]
        : []

    coupon.applicableCategories = applicableCategories
      ? Array.isArray(applicableCategories)
        ? applicableCategories
        : [applicableCategories]
      : []

    coupon.applicableProducts = applicableProducts
      ? Array.isArray(applicableProducts)
        ? applicableProducts
        : [applicableProducts]
      : []

    await coupon.save()

    req.flash("success_msg", "Coupon updated successfully")
    res.redirect("/admin/coupons")
  } catch (error) {
    console.error("Admin updateCoupon error:", error)
    req.flash("error_msg", `Failed to update coupon: ${error.message}`)
    res.redirect(`/admin/coupons/edit/${req.params.id}`)
  }
}
const toggleCouponStatus = async (req, res) => {
  try {
    const couponId = req.params.id
    const coupon = await Coupon.findById(couponId)

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      })
    }
    const currentDate = new Date()
    const isExpired = coupon.endDate < currentDate

    if (isExpired && !coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot activate an expired coupon",
      })
    }
    const usageLimitReached = coupon.autoExpire && coupon.usedCount >= coupon.usageLimit

    if (usageLimitReached && !coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot activate a coupon that has reached its usage limit",
      })
    }
    coupon.isActive = !coupon.isActive
    await coupon.save()

    const statusText = coupon.isActive ? "activated" : "deactivated"

    return res.status(200).json({
      success: true,
      isActive: coupon.isActive,
      message: `Coupon "${coupon.code}" has been ${statusText}`,
    })
  } catch (error) {
    console.error("Admin toggleCouponStatus error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}
const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id
    const coupon = await Coupon.findById(couponId)
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      })
    }
    if (coupon.usedCount > 0) {
      coupon.isActive = false
      await coupon.save()

      return res.status(200).json({
        success: true,
        message: `Coupon "${coupon.code}" has been used and cannot be deleted. It has been deactivated instead.`,
      })
    }
    await Coupon.findByIdAndDelete(couponId)
    await UserCoupon.deleteMany({ coupon: couponId })

    return res.status(200).json({
      success: true,
      message: `Coupon "${coupon.code}" deleted successfully`,
    })
  } catch (error) {
    console.error("Admin deleteCoupon error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}
const getUsers = async (req, res) => {
  try {
    const query = { isAdmin: false }
    if (req.query.active === "true") {
      query.isBlocked = false
    }
    const users = await User.find(query).select("name email").sort({ name: 1 }).limit(100) // Limit to prevent loading too many

    res.json({
      success: true,
      users: users,
    })
  } catch (error) {
    console.error("Admin searchUsers error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    })
  }
}
const checkCouponStatus = async (req, res) => {
  try {
    const { code } = req.params

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      })
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() })

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      })
    }

    const currentDate = new Date()
    const isExpired = coupon.endDate < currentDate
    const isUpcoming = coupon.startDate > currentDate
    const isActive = coupon.isActive && !isExpired && !isUpcoming
    const usageLimitReached = coupon.usedCount >= coupon.usageLimit

    let status = isExpired ? "Expired" : isUpcoming ? "Upcoming" : isActive ? "Active" : "Inactive"
    if (usageLimitReached && coupon.autoExpire) {
      status = "Limit Reached"
    }

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        status,
        isActive: isActive && !usageLimitReached,
        usedCount: coupon.usedCount,
        usageLimit: coupon.usageLimit,
        remainingUses: Math.max(0, coupon.usageLimit - coupon.usedCount),
        startDate: coupon.startDate,
        endDate: coupon.endDate,
      },
    })
  } catch (error) {
    console.error("Admin checkCouponStatus error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to check coupon status",
    })
  }
}

module.exports = {
  getAllCoupons,
  loadAddCoupon,
  createCoupon,
  loadEditCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getUsers,
  checkCouponStatus,
}
