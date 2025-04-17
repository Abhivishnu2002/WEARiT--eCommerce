const User = require("../models/userModel")

const loadCustomer = async (req, res) => {
  try {
    // Check if admin is logged in
    if (!req.session.admin) {
      return res.redirect("/admin/login")
    }

    const page = Number.parseInt(req.query.page) || 1
    const limit = 10
    const skip = (page - 1) * limit
    const searchQuery = req.query.search || ""

    const filter = { isAdmin: false }
    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        { mobile: { $regex: searchQuery, $options: "i" } },
      ]
    }

    const totalCustomers = await User.countDocuments(filter)
    const totalPages = Math.ceil(totalCustomers / limit)
    const customers = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)

    // Get admin data for the sidebar
    const admin = {
      name: req.session.admin.name,
      email: req.session.admin.email,
      profileImage: req.session.admin.profileImage,
    }

    res.render("admin/pages/adminCustomer", {
      admin,
      customers,
      currentPage: page,
      totalPages,
      totalCustomers,
      searchQuery,
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Server error")
    res.status(500).render("admin/pages/adminCustomer", { error_msg: "Server Error" })
  }
}

const blockUnblockUser = async (req, res) => {
  try {
    const userId = req.params.id
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    user.isBlocked = !user.isBlocked
    await user.save()

    return res.status(200).json({
      success: true,
      message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
      isBlocked: user.isBlocked,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server Error" })
  }
}

const loadCustomerDetails = async (req, res) => {
  try {
    const userId = req.query.id
    const user = await User.findById(userId)

    if (!user) {
      req.flash("error_msg", "User not found")
      return res.redirect("/admin/customer")
    }

    // Get admin data for the sidebar
    const admin = {
      name: req.session.admin.name,
      email: req.session.admin.email,
      profileImage: req.session.admin.profileImage,
    }

    res.render("admin/pages/adminCustomerDetails", { admin, user })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Server error")
    res.redirect("/admin/customer")
  }
}

module.exports = {
  loadCustomer,
  blockUnblockUser,
  loadCustomerDetails,
}
