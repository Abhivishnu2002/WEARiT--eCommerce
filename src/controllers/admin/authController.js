const User = require("../../models/userModel")
const Product = require("../../models/productModel")
const Category = require("../../models/categoryModel")
const Order = require("../../models/orderModel")
const moment = require("moment")

const loadLogin = (req, res) => {
  try {
    res.render("admin/pages/adminLogin")
  } catch (error) {
    console.error(error)
    res.status(500).render("admin/pages/adminLogin", { error_msg: "Server error" })
  }
}

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body

    const admin = await User.findOne({ email }).select("+password")

    if (!admin) {
      req.flash("error_msg", "Invalid email or password")
      return res.render("admin/pages/adminLogin", { error_msg: "Invalid email or password" })
    }

    if (!admin.isAdmin) {
      req.flash("error_msg", "You do not have admin privileges")
      return res.render("admin/pages/adminLogin", { error_msg: "You do not have admin privileges" })
    }

    const isPasswordMatch = await admin.comparePassword(password)
    if (!isPasswordMatch) {
      req.flash("error_msg", "Invalid email or password")
      return res.render("admin/pages/adminLogin", { error_msg: "Invalid email or password" })
    }

    req.session.admin = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
    }

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err)
        req.flash("error_msg", "Server error")
        return res.status(500).render("admin/pages/adminLogin", { error_msg: "Server error" })
      }
      return res.redirect("/admin/dashboard")
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Server error")
    res.status(500).render("admin/pages/adminLogin", { error_msg: "Server error" })
  }
}

const loadChangePassword = (req, res) => {
  res.render("admin/pages/adminChangePassword")
}

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (newPassword !== confirmPassword) {
      req.flash("error_msg", "New passwords do not match")
      return res.render("admin/pages/adminChangePassword", { error_msg: "New passwords do not match" })
    }

    const admin = await User.findById(req.session.admin.id).select("+password")
    if (!admin) {
      req.flash("error_msg", "Admin not found")
      return res.redirect("/admin/login")
    }

    const isPasswordMatch = await admin.comparePassword(currentPassword)
    if (!isPasswordMatch) {
      req.flash("error_msg", "Current password is incorrect")
      return res.render("admin/pages/adminChangePassword", { error_msg: "Current password is incorrect" })
    }

    admin.password = newPassword
    await admin.save()

    req.flash("success_msg", "Password updated successfully")
    res.render("admin/pages/adminChangePassword", { success_msg: "Password updated successfully" })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to update password")
    res.status(500).render("admin/pages/adminChangePassword", { error_msg: "Failed to update password" })
  }
}

const loadAccount = async (req, res) => {
  try {
    const admin = await User.findById(req.session.admin.id)
    if (!admin) {
      req.flash("error_msg", "Admin not found")
      return res.redirect("/admin/login")
    }
    res.render("admin/pages/adminAccount", { admin })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Server error")
    res.redirect("/admin/dashboard")
  }
}

const loadEditAccount = async (req, res) => {
  try {
    const admin = await User.findById(req.session.admin.id)
    if (!admin) {
      req.flash("error_msg", "Admin not found")
      return res.redirect("/admin/login")
    }
    res.render("admin/pages/adminEditAccount", { admin })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Server error")
    res.redirect("/admin/account")
  }
}

const updateAccount = async (req, res) => {
  try {
    const { name, email, phone } = req.body
    const admin = await User.findByIdAndUpdate(
      req.session.admin.id,
      {
        name,
        email,
        mobile: phone,
      },
      { new: true },
    )

    if (!admin) {
      req.flash("error_msg", "Admin not found")
      return res.redirect("/admin/login")
    }

    req.session.admin.name = name
    req.session.admin.email = email

    req.flash("success_msg", "Account updated successfully")
    res.redirect("/admin/account")
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to update account")
    res.status(500).render("admin/pages/adminEditAccount", { error_msg: "Failed to update account" })
  }
}

const getDateRange = (period, startDate, endDate) => {
  const today = new Date()
  if (period === "custom" && startDate && endDate) {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate + "T23:59:59.999Z"),
    }
  }
  switch (period) {
    case "daily":
      startDate = new Date(today)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(today)
      endDate.setHours(23, 59, 59, 999)
      break
    case "weekly":
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(today)
      endDate.setHours(23, 59, 59, 999)
      break
    case "monthly":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
      break
    case "yearly":
      startDate = new Date(today.getFullYear(), 0, 1)
      endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59)
      break
    default:
      startDate = new Date(today.getFullYear(), 0, 1)
      endDate = new Date(today)
      endDate.setHours(23, 59, 59, 999)
  }

  return { startDate, endDate }
}

const calculateDiscountData = async (orders) => {
  const discountData = []
  orders.forEach((order) => {
    const productDiscount = order.discount || 0
    const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
    const totalDiscount = productDiscount + couponDiscount

    discountData.push(totalDiscount)
  })

  return discountData
}

const getDashboardData = async (req, res) => {
  try {
    const period = req.query.period || "monthly"
    const { startDate: startDateParam, endDate: endDateParam } = req.query
    const { startDate, endDate } = getDateRange(period, startDateParam, endDateParam)
    const salesData = []
    const orderCountData = []
    const discountData = []
    const labels = []
    const today = new Date()
    if (period === "custom") {
      const diffTime = Math.abs(endDate - startDate)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays > 31) {
        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          const weekStart = new Date(currentDate)
          const weekEnd = new Date(currentDate)
          weekEnd.setDate(weekEnd.getDate() + 6)

          if (weekEnd > endDate) {
            weekEnd.setTime(endDate.getTime())
          }

          const weekOrders = await Order.find({
            orderDate: { $gte: weekStart, $lte: weekEnd },
            orderStatus: { $nin: ["cancelled"] },
          })

          const weekSales = weekOrders.reduce((total, order) => total + order.finalAmount, 0)
          const weekDiscounts = weekOrders.reduce((total, order) => {
            const productDiscount = order.discount || 0
            const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
            return total + productDiscount + couponDiscount
          }, 0)

          salesData.push(weekSales)
          orderCountData.push(weekOrders.length)
          discountData.push(weekDiscounts)
          labels.push(`${moment(weekStart).format("MMM DD")} - ${moment(weekEnd).format("MMM DD")}`)
          currentDate.setDate(currentDate.getDate() + 7)
        }
      } else {
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dayStart = new Date(d)
          dayStart.setHours(0, 0, 0, 0)
          const dayEnd = new Date(d)
          dayEnd.setHours(23, 59, 59, 999)

          const dailyOrders = await Order.find({
            orderDate: { $gte: dayStart, $lte: dayEnd },
            orderStatus: { $nin: ["cancelled"] },
          })

          const dailySales = dailyOrders.reduce((total, order) => total + order.finalAmount, 0)
          const dailyDiscounts = dailyOrders.reduce((total, order) => {
            const productDiscount = order.discount || 0
            const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
            return total + productDiscount + couponDiscount
          }, 0)

          salesData.push(dailySales)
          orderCountData.push(dailyOrders.length)
          discountData.push(dailyDiscounts)
          labels.push(moment(dayStart).format("MMM DD"))
        }
      }
    } else if (period === "yearly") {
      const currentYear = today.getFullYear()
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(currentYear, month, 1)
        const monthEnd = new Date(currentYear, month + 1, 0, 23, 59, 59)

        const monthlyOrders = await Order.find({
          orderDate: { $gte: monthStart, $lte: monthEnd },
          orderStatus: { $nin: ["cancelled"] },
        })

        const monthlySales = monthlyOrders.reduce((total, order) => total + order.finalAmount, 0)
        const monthlyDiscounts = monthlyOrders.reduce((total, order) => {
          const productDiscount = order.discount || 0
          const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
          return total + productDiscount + couponDiscount
        }, 0)

        salesData.push(monthlySales)
        orderCountData.push(monthlyOrders.length)
        discountData.push(monthlyDiscounts)
        labels.push(moment(monthStart).format("MMM"))
      }
    } else if (period === "monthly") {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStart = new Date(today.getFullYear(), today.getMonth(), day, 0, 0, 0)
        const dayEnd = new Date(today.getFullYear(), today.getMonth(), day, 23, 59, 59)

        const dailyOrders = await Order.find({
          orderDate: { $gte: dayStart, $lte: dayEnd },
          orderStatus: { $nin: ["cancelled"] },
        })

        const dailySales = dailyOrders.reduce((total, order) => total + order.finalAmount, 0)
        const dailyDiscounts = dailyOrders.reduce((total, order) => {
          const productDiscount = order.discount || 0
          const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
          return total + productDiscount + couponDiscount
        }, 0)

        salesData.push(dailySales)
        orderCountData.push(dailyOrders.length)
        discountData.push(dailyDiscounts)
        labels.push(day.toString())
      }
    } else if (period === "weekly") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(today.getDate() - i)
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        const dailyOrders = await Order.find({
          orderDate: { $gte: dayStart, $lte: dayEnd },
          orderStatus: { $nin: ["cancelled"] },
        })

        const dailySales = dailyOrders.reduce((total, order) => total + order.finalAmount, 0)
        const dailyDiscounts = dailyOrders.reduce((total, order) => {
          const productDiscount = order.discount || 0
          const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
          return total + productDiscount + couponDiscount
        }, 0)

        salesData.push(dailySales)
        orderCountData.push(dailyOrders.length)
        discountData.push(dailyDiscounts)
        labels.push(moment(date).format("ddd"))
      }
    } else if (period === "daily") {
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(today)
        hourStart.setHours(hour, 0, 0, 0)
        const hourEnd = new Date(today)
        hourEnd.setHours(hour, 59, 59, 999)

        const hourlyOrders = await Order.find({
          orderDate: { $gte: hourStart, $lte: hourEnd },
          orderStatus: { $nin: ["cancelled"] },
        })

        const hourlySales = hourlyOrders.reduce((total, order) => total + order.finalAmount, 0)
        const hourlyDiscounts = hourlyOrders.reduce((total, order) => {
          const productDiscount = order.discount || 0
          const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
          return total + productDiscount + couponDiscount
        }, 0)

        salesData.push(hourlySales)
        orderCountData.push(hourlyOrders.length)
        discountData.push(hourlyDiscounts)
        labels.push(`${hour}:00`)
      }
    }
    const periodOrders = await Order.find({
      orderDate: { $gte: startDate, $lte: endDate },
      orderStatus: { $nin: ["cancelled"] },
    })

    const paymentMethods = {}
    periodOrders.forEach((order) => {
      const method = order.paymentMethod
      if (!paymentMethods[method]) {
        paymentMethods[method] = {
          count: 0,
          amount: 0,
        }
      }
      paymentMethods[method].count += 1
      paymentMethods[method].amount += order.finalAmount
    })

    const bestSellingProducts = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate, $lte: endDate },
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.variant.salePrice"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          name: "$productInfo.name",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ])

    const bestSellingCategories = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate, $lte: endDate },
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: "$productInfo.categoryId",
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.variant.salePrice"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: "$categoryInfo" },
      {
        $project: {
          name: "$categoryInfo.name",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ])

    const bestSellingBrands = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate, $lte: endDate },
          orderStatus: { $nin: ["cancelled"] },
        },
      },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      { $match: { "productInfo.brand": { $exists: true, $ne: null, $ne: "" } } },
      {
        $group: {
          _id: "$productInfo.brand",
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.variant.salePrice"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: "$_id",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ])
    const chartData = {
      labels: labels,
      revenue: salesData.map((value) => Number.parseFloat(value.toFixed(2))),
      orderCount: orderCountData.map((value) => Number.parseInt(value)),
      discount: discountData.map((value) => Number.parseFloat(value.toFixed(2))),
    }

    res.json({
      success: true,
      data: {
        chartData,
        paymentMethods,
        bestSellingProducts,
        bestSellingCategories,
        bestSellingBrands,
        period,
        dateRange: {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        },
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard data: " + error.message,
    })
  }
}

const loadDashboard = async (req, res) => {
  try {
    const period = req.query.period || "monthly"
    const { startDate: startDateParam, endDate: endDateParam } = req.query

    const { startDate, endDate } = getDateRange(period, startDateParam, endDateParam)

    const userCount = await User.countDocuments({ isAdmin: false })
    const productCount = await Product.countDocuments()
    const categoryCount = await Category.countDocuments()
    const recentUsers = await User.find({ isAdmin: false }).sort({ createdAt: -1 }).limit(5)
    const pendingOrders = await Order.countDocuments({ orderStatus: "pending" })
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const usersThisMonth = await User.countDocuments({
      isAdmin: false,
      createdAt: { $gte: firstDayOfMonth },
    })
    const usersLastMonth = await User.countDocuments({
      isAdmin: false,
      createdAt: { $gte: lastMonth, $lt: firstDayOfMonth },
    })
    const userGrowth =
      usersLastMonth > 0
        ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
        : usersThisMonth > 0
          ? 100
          : 0
    let salesData = []
    let orderCountData = []
    let discountData = []
    const labels = []
    if (period === "custom") {
      const diffTime = Math.abs(endDate - startDate)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays > 31) {
        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          const weekStart = new Date(currentDate)
          const weekEnd = new Date(currentDate)
          weekEnd.setDate(weekEnd.getDate() + 6)

          if (weekEnd > endDate) {
            weekEnd.setTime(endDate.getTime())
          }

          const weekOrders = await Order.find({
            orderDate: { $gte: weekStart, $lte: weekEnd },
            orderStatus: { $nin: ["cancelled"] },
          })

          const weekSales = weekOrders.reduce((total, order) => total + order.finalAmount, 0)
          const weekDiscounts = weekOrders.reduce((total, order) => {
            const productDiscount = order.discount || 0
            const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
            return total + productDiscount + couponDiscount
          }, 0)

          salesData.push(weekSales)
          orderCountData.push(weekOrders.length)
          discountData.push(weekDiscounts)
          labels.push(`${moment(weekStart).format("MMM DD")} - ${moment(weekEnd).format("MMM DD")}`)
          currentDate.setDate(currentDate.getDate() + 7)
        }
      } else {
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dayStart = new Date(d)
          dayStart.setHours(0, 0, 0, 0)
          const dayEnd = new Date(d)
          dayEnd.setHours(23, 59, 59, 999)

          const dailyOrders = await Order.find({
            orderDate: { $gte: dayStart, $lte: dayEnd },
            orderStatus: { $nin: ["cancelled"] },
          })

          const dailySales = dailyOrders.reduce((total, order) => total + order.finalAmount, 0)
          const dailyDiscounts = dailyOrders.reduce((total, order) => {
            const productDiscount = order.discount || 0
            const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
            return total + productDiscount + couponDiscount
          }, 0)

          salesData.push(dailySales)
          orderCountData.push(dailyOrders.length)
          discountData.push(dailyDiscounts)
          labels.push(moment(dayStart).format("MMM DD"))
        }
      }
    } else if (period === "yearly") {
      const currentYear = today.getFullYear()
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(currentYear, month, 1)
        const monthEnd = new Date(currentYear, month + 1, 0, 23, 59, 59)

        const monthlyOrders = await Order.find({
          orderDate: { $gte: monthStart, $lte: monthEnd },
          orderStatus: { $nin: ["cancelled"] },
        })

        const monthlySales = monthlyOrders.reduce((total, order) => total + order.finalAmount, 0)
        const monthlyDiscounts = monthlyOrders.reduce((total, order) => {
          const productDiscount = order.discount || 0
          const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
          return total + productDiscount + couponDiscount
        }, 0)

        salesData.push(monthlySales)
        orderCountData.push(monthlyOrders.length)
        discountData.push(monthlyDiscounts)
        labels.push(moment(monthStart).format("MMM"))
      }
    } else if (period === "monthly") {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStart = new Date(today.getFullYear(), today.getMonth(), day, 0, 0, 0)
        const dayEnd = new Date(today.getFullYear(), today.getMonth(), day, 23, 59, 59)

        const dailyOrders = await Order.find({
          orderDate: { $gte: dayStart, $lte: dayEnd },
          orderStatus: { $nin: ["cancelled"] },
        })

        const dailySales = dailyOrders.reduce((total, order) => total + order.finalAmount, 0)
        const dailyDiscounts = dailyOrders.reduce((total, order) => {
          const productDiscount = order.discount || 0
          const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
          return total + productDiscount + couponDiscount
        }, 0)

        salesData.push(dailySales)
        orderCountData.push(dailyOrders.length)
        discountData.push(dailyDiscounts)
        labels.push(day.toString())
      }
    } else if (period === "weekly") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(today.getDate() - i)
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        const dailyOrders = await Order.find({
          orderDate: { $gte: dayStart, $lte: dayEnd },
          orderStatus: { $nin: ["cancelled"] },
        })

        const dailySales = dailyOrders.reduce((total, order) => total + order.finalAmount, 0)
        const dailyDiscounts = dailyOrders.reduce((total, order) => {
          const productDiscount = order.discount || 0
          const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
          return total + productDiscount + couponDiscount
        }, 0)

        salesData.push(dailySales)
        orderCountData.push(dailyOrders.length)
        discountData.push(dailyDiscounts)
        labels.push(moment(date).format("ddd"))
      }
    } else if (period === "daily") {
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(today)
        hourStart.setHours(hour, 0, 0, 0)
        const hourEnd = new Date(today)
        hourEnd.setHours(hour, 59, 59, 999)

        const hourlyOrders = await Order.find({
          orderDate: { $gte: hourStart, $lte: hourEnd },
          orderStatus: { $nin: ["cancelled"] },
        })

        const hourlySales = hourlyOrders.reduce((total, order) => total + order.finalAmount, 0)
        const hourlyDiscounts = hourlyOrders.reduce((total, order) => {
          const productDiscount = order.discount || 0
          const couponDiscount = order.coupon && order.coupon.discountAmount ? order.coupon.discountAmount : 0
          return total + productDiscount + couponDiscount
        }, 0)

        salesData.push(hourlySales)
        orderCountData.push(hourlyOrders.length)
        discountData.push(hourlyDiscounts)
        labels.push(`${hour}:00`)
      }
    }

    const currentQuarter = Math.floor(today.getMonth() / 3)
    const startOfQuarter = new Date(today.getFullYear(), currentQuarter * 3, 1)
    const endOfQuarter = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59)

    const quarterlyOrders = await Order.find({
      orderDate: { $gte: startOfQuarter, $lte: endOfQuarter },
      orderStatus: { $nin: ["cancelled"] },
    })

    const quarterlyRevenue = quarterlyOrders.reduce((total, order) => total + order.finalAmount, 0)
    const quarterlyTarget = 100000
    let salesProgress = (quarterlyRevenue / quarterlyTarget) * 100
    const paymentMethods = {}
    quarterlyOrders.forEach((order) => {
      const method = order.paymentMethod
      if (!paymentMethods[method]) {
        paymentMethods[method] = {
          count: 0,
          amount: 0,
        }
      }
      paymentMethods[method].count += 1
      paymentMethods[method].amount += order.finalAmount
    })

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)
    const yesterdayStart = new Date(yesterday)
    const yesterdayEnd = new Date(yesterday)
    yesterdayEnd.setHours(23, 59, 59, 999)
    const todayOrders = await Order.find({
      orderDate: { $gte: today, $lte: todayEnd },
      orderStatus: { $nin: ["cancelled"] },
    })
    const yesterdayOrders = await Order.find({
      orderDate: { $gte: yesterdayStart, $lte: yesterdayEnd },
      orderStatus: { $nin: ["cancelled"] },
    })
    const todayRevenue = todayOrders.reduce((total, order) => total + order.finalAmount, 0)
    const yesterdayRevenue = yesterdayOrders.reduce((total, order) => total + order.finalAmount, 0)
    const revenueGrowth =
      yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : todayRevenue > 0 ? 100 : 0

    const bestSellingProducts = await Order.aggregate([
      { $match: { orderStatus: { $nin: ["cancelled"] } } },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.variant.salePrice"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          name: "$productInfo.name",
          totalQuantity: 1,
          totalRevenue: 1,
          image: { $arrayElemAt: ["$productInfo.images.url", 0] },
        },
      },
    ])

    const bestSellingCategories = await Order.aggregate([
      { $match: { orderStatus: { $nin: ["cancelled"] } } },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: "$productInfo.categoryId",
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.variant.salePrice"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      { $unwind: "$categoryInfo" },
      {
        $project: {
          name: "$categoryInfo.name",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ])

    const bestSellingBrands = await Order.aggregate([
      { $match: { orderStatus: { $nin: ["cancelled"] } } },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      { $match: { "productInfo.brand": { $exists: true, $ne: null, $ne: "" } } },
      {
        $group: {
          _id: "$productInfo.brand",
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.variant.salePrice"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $project: {
          name: "$_id",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ])

    const admin = {
      name: req.session.admin.name,
      email: req.session.admin.email,
      profileImage: req.session.admin.profileImage,
    }

    salesData = salesData.map((value) => Number.parseFloat(value.toFixed(2)))
    orderCountData = orderCountData.map((value) => Number.parseInt(value))
    discountData = discountData.map((value) => Number.parseFloat(value.toFixed(2)))
    salesProgress = Math.min(100, Math.max(0, Number.parseFloat(salesProgress.toFixed(2))))
    const totalSales = quarterlyRevenue
    const totalOrders = quarterlyOrders.length
    const totalCustomers = userCount
    const orderTarget = 100
    const orderProgress = Math.min(100, Math.max(0, (totalOrders / orderTarget) * 100))
    const customerProgress = Math.abs(userGrowth)

    const recentOrders = await Order.find()
      .populate("user", "name email")
      .populate("products.product", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    const orders = recentOrders.map((order) => ({
      productName: order.products[0]?.product?.name || "Unknown Product",
      productNumber: order.orderID,
      paymentType: order.paymentMethod,
      status: order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1),
    }))

    const chartData = {
      labels: labels,
      revenue: salesData,
      orderCount: orderCountData,
      discount: discountData,
    }

    const dashboardData = {
      userCount,
      productCount,
      categoryCount,
      pendingOrders,
      recentUsers,
      userGrowth,
      salesData,
      orderCountData,
      discountData,
      labels,
      period,
      dateRange: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      salesProgress: Number.parseFloat(salesProgress.toFixed(2)),
      todayRevenue,
      quarterlyTarget,
      quarterlyRevenue,
      revenueGrowth: Number.parseFloat(revenueGrowth.toFixed(2)),
      totalSales,
      totalOrders,
      totalCustomers,
      orderProgress: Number.parseFloat(orderProgress.toFixed(2)),
      customerProgress,
      orders,
      bestSellingProducts,
      bestSellingCategories,
      bestSellingBrands,
      user: { username: req.session.admin.name },
      chartData,
      paymentMethods,
    }

    res.render("admin/pages/adminDashboard", {
      admin,
      ...dashboardData,
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Server error")
    res.status(500).render("admin/pages/adminDashboard", {
      error_msg: "Server error",
      admin: req.session.admin,
    })
  }
}

const logout = (req, res) => {
  delete req.session.admin
  req.session.save((err) => {
    if (err) {
      console.error("Session save error during logout:", err)
    }
    res.redirect("/admin/login")
  })
}

module.exports = {
  loadLogin,
  verifyLogin,
  loadAccount,
  loadEditAccount,
  updateAccount,
  loadChangePassword,
  updatePassword,
  loadDashboard,
  getDashboardData,
  logout,
}
