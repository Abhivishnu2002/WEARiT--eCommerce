const Product = require("../models/productModel")
const Category = require("../models/categoryModel")
const fs = require("fs")
const path = require("path")

const loadProducts = async (req, res) => {
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

    const totalProducts = await Product.countDocuments(filter)
    const totalPages = Math.ceil(totalProducts / limit)
    const products = await Product.find(filter).populate("category").sort({ createdAt: -1 }).skip(skip).limit(limit)

    // Get admin data for the sidebar
    const admin = {
      name: req.session.admin.name,
      email: req.session.admin.email,
      profileImage: req.session.admin.profileImage,
    }

    res.render("admin/pages/adminProducts", {
      admin,
      products,
      currentPage: page,
      totalPages,
      totalProducts,
      searchQuery,
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Server error")
    res.status(500).render("admin/pages/adminProducts", { error_msg: "Server Error" })
  }
}

const loadAddProducts = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false })

    // Get admin data for the sidebar
    const admin = {
      name: req.session.admin.name,
      email: req.session.admin.email,
      profileImage: req.session.admin.profileImage,
    }

    res.render("admin/pages/adminAddProduct", { admin, categories })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Server error")
    res.status(500).render("admin/pages/adminAddProduct", { error_msg: "Server error" })
  }
}

const addProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body

    // Handle image uploads
    const images = []
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        images.push(file.filename)
      })
    }

    const newProduct = new Product({
      name,
      description,
      price,
      stock,
      category,
      images,
    })

    await newProduct.save()

    req.flash("success_msg", "Product added successfully")
    res.redirect("/admin/products")
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to add product")
    res.redirect("/admin/products/add")
  }
}

const loadEditProducts = async (req, res) => {
  try {
    const productId = req.query.id
    const product = await Product.findById(productId).populate("category")

    if (!product) {
      req.flash("error_msg", "Product not found")
      return res.redirect("/admin/products")
    }

    const categories = await Category.find({ isDeleted: false })

    // Get admin data for the sidebar
    const admin = {
      name: req.session.admin.name,
      email: req.session.admin.email,
      profileImage: req.session.admin.profileImage,
    }

    res.render("admin/pages/adminUpdateProduct", {
      admin,
      product,
      categories,
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Server error")
    res.status(500).render("admin/pages/adminUpdateProduct", { error_msg: "Server error" })
  }
}

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id
    const { name, description, price, stock, category } = req.body

    const product = await Product.findById(productId)
    if (!product) {
      req.flash("error_msg", "Product not found")
      return res.redirect("/admin/products")
    }

    // Update product details
    product.name = name
    product.description = description
    product.price = price
    product.stock = stock
    product.category = category

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      // Remove old images from storage
      product.images.forEach((image) => {
        const imagePath = path.join(__dirname, "../public/uploads/products", image)
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath)
        }
      })

      // Add new images
      const images = []
      req.files.forEach((file) => {
        images.push(file.filename)
      })
      product.images = images
    }

    await product.save()

    req.flash("success_msg", "Product updated successfully")
    res.redirect("/admin/products")
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to update product")
    res.redirect(`/admin/products/edit?id=${req.params.id}`)
  }
}

const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" })
    }

    // Soft delete
    product.isDeleted = true
    await product.save()

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: "Server Error" })
  }
}

module.exports = {
  loadProducts,
  loadAddProducts,
  addProduct,
  loadEditProducts,
  updateProduct,
  deleteProduct,
}
