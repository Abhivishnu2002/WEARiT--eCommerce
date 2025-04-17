const Category = require("../models/categoryModel")

const loadCategory = async (req, res) => {
  try {
    // Check if admin is logged in
    if (!req.session.admin) {
      return res.redirect("/admin/login")
    }

    const page = Number.parseInt(req.query.page) || 1
    const limit = 10
    const skip = (page - 1) * limit
    const searchQuery = req.query.search || ""

    const filter = {}
    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: "i" }
    }

    const totalCategories = await Category.countDocuments(filter)
    const totalPages = Math.ceil(totalCategories / limit)
    const categories = await Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)

    // Get admin data for the sidebar
    const admin = {
      name: req.session.admin.name,
      email: req.session.admin.email,
      profileImage: req.session.admin.profileImage,
    }

    res.render("admin/pages/adminCategory", {
      admin,
      categories,
      currentPage: page,
      totalPages,
      totalCategories,
      searchQuery,
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Server error")
    res.status(500).render("admin/pages/adminCategory", { error_msg: "Server Error" })
  }
}

const loadAddCategory = (req, res) => {
  // Check if admin is logged in
  if (!req.session.admin) {
    return res.redirect("/admin/login")
  }

  // Get admin data for the sidebar
  const admin = {
    name: req.session.admin.name,
    email: req.session.admin.email,
    profileImage: req.session.admin.profileImage,
  }

  res.render("admin/pages/adminAddCategory", { admin })
}

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body

    // Check if category already exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    })

    if (existingCategory) {
      req.flash("error_msg", "Category already exists")
      return res.redirect("/admin/category/add")
    }

    // Create new category
    const newCategory = new Category({
      name,
      description,
    })

    await newCategory.save()

    req.flash("success_msg", "Category added successfully")
    res.redirect("/admin/category")
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to add category")
    res.redirect("/admin/category/add")
  }
}

const loadEditCategory = async (req, res) => {
  try {
    const categoryId = req.query.id
    const category = await Category.findById(categoryId)

    if (!category) {
      req.flash("error_msg", "Category not found")
      return res.redirect("/admin/category")
    }

    // Get admin data for the sidebar
    const admin = {
      name: req.session.admin.name,
      email: req.session.admin.email,
      profileImage: req.session.admin.profileImage,
    }

    res.render("admin/pages/adminEditCategory", { admin, category })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Server error")
    res.status(500).render("admin/pages/adminEditCategory", { error_msg: "Server error" })
  }
}

const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id
    const { name, description } = req.body

    // Check if category exists
    const category = await Category.findById(categoryId)
    if (!category) {
      req.flash("error_msg", "Category not found")
      return res.redirect("/admin/category")
    }

    // Check if name already exists (excluding current category)
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: categoryId },
    })

    if (existingCategory) {
      req.flash("error_msg", "Category name already exists")
      return res.redirect(`/admin/category/edit?id=${categoryId}`)
    }

    // Update category
    category.name = name
    category.description = description
    await category.save()

    req.flash("success_msg", "Category updated successfully")
    res.redirect("/admin/category")
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to update category")
    res.redirect(`/admin/category/edit?id=${req.params.id}`)
  }
}

const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id

    const category = await Category.findById(categoryId)
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" })
    }

    // Soft delete
    category.isDeleted = true
    await category.save()

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server Error" })
  }
}

module.exports = {
  loadCategory,
  loadAddCategory,
  addCategory,
  loadEditCategory,
  updateCategory,
  deleteCategory,
}
