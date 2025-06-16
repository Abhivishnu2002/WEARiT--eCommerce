const User = require("../../models/userModel")
const Product = require("../../models/productModel")
const Category = require("../../models/categoryModel")
const { calculateBestPrice, determineBestOffer } = require("../../utils/offerUtils")

const loadCategory = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = 2
    const skip = (page - 1) * limit
    const searchQuery = req.query.search || ""
    const sort = req.query.sort || "addedDate"
    const order = req.query.order || "desc"

    const filter = {}
    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: "i" }
    }

    const sortObj = {}
    sortObj[sort] = order === "asc" ? 1 : -1

    const totalCategories = await Category.countDocuments(filter)
    const totalPages = Math.ceil(totalCategories / limit)
    const categories = await Category.find(filter).sort(sortObj).skip(skip).limit(limit)

    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({ categoryId: category._id })
        return {
          ...category._doc,
          productCount,
        }
      }),
    )

    const admin = {
      name: req.session.admin.name,
      email: req.session.admin.email,
      profileImage: req.session.admin.profileImage,
    }

    res.render("admin/pages/adminCategory", {
      admin,
      categories: categoriesWithCounts,
      currentPage: page,
      totalPages,
      totalCategories,
      searchQuery,
      sort,
      order,
      limit,
    })
  } catch (error) {
    console.error("Admin loadCategory error:", error)
    req.flash("error_msg", "Server error")
    res.status(500).render("admin/pages/adminCategory", { error_msg: "Server Error" })
  }
}

const loadAddCategory = (req, res) => {
  const admin = {
    name: req.session.admin.name,
    email: req.session.admin.email,
    profileImage: req.session.admin.profileImage,
  }

  res.render("admin/pages/adminAddCategory", { admin })
}

const addCategory = async (req, res) => {
  try {
    const { name, description, offer = 0, maxRedeemable = 0, isDeleted = "false" } = req.body
    const existingCategory = await Category.findOne({ name })

    if (existingCategory) {
      req.flash("error_msg", "Category already exists")
      return res.render("admin/pages/adminAddCategory", {
        error_msg: "Category already exists",
        admin: {
          name: req.session.admin.name,
          email: req.session.admin.email,
          profileImage: req.session.admin.profileImage,
        },
      })
    }

    const newCategory = new Category({
      name,
      description,
      offer: Number(offer),
      maxRedeemable: Number(maxRedeemable),
      stock: 0,
      isListed: isDeleted === "false",
    })

    await newCategory.save()
    if (Number(offer) > 0) {
      const products = await Product.find({ categoryId: newCategory._id })

      for (const product of products) {
        const bestOffer = determineBestOffer(product.offer, Number(offer))
        product.variants = product.variants.map((variant) => {
          const originalPrice = variant.varientPrice
          const { salePrice } = calculateBestPrice(originalPrice, product.offer, Number(offer))
          return {
            ...variant,
            salePrice,
          }
        })
        product.displayOffer = bestOffer.offerValue
        product.offerSource = bestOffer.offerSource

        await product.save()
      }
    }

    req.flash("success_msg", "Category added successfully")
    res.redirect("/admin/category")
  } catch (error) {
    console.error("Admin addCategory error:", error)
    req.flash("error_msg", "Server error: " + error.message)
    res.status(500).render("admin/pages/adminAddCategory", {
      error_msg: "Server Error: " + error.message,
      admin: {
        name: req.session.admin.name,
        email: req.session.admin.email,
        profileImage: req.session.admin.profileImage,
      },
    })
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

    const admin = {
      name: req.session.admin.name,
      email: req.session.admin.email,
      profileImage: req.session.admin.profileImage,
    }

    res.render("admin/pages/adminEditCategory", { admin, category })
  } catch (error) {
    console.error("Admin loadEditCategory error:", error)
    req.flash("error_msg", "Server error")
    res.status(500).render("admin/pages/adminEditCategory", { error_msg: "Server error" })
  }
}

const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id
    const { name, description, offer, maxRedeemable, isDeleted } = req.body

    const category = await Category.findById(categoryId)
    if (!category) {
      req.flash("error_msg", "Category not found")
      return res.redirect("/admin/category")
    }

    const existingCategory = await Category.findOne({ name, _id: { $ne: categoryId } })
    if (existingCategory) {
      req.flash("error_msg", "Category name already exists")
      return res.render("admin/pages/adminEditCategory", {
        category,
        error_msg: "Category name already exists",
        admin: {
          name: req.session.admin.name,
          email: req.session.admin.email,
          profileImage: req.session.admin.profileImage,
        },
      })
    }

    const oldOffer = category.offer
    const newOffer = Number(offer) || 0

    const updateData = {
      name,
      description,
      offer: newOffer,
      maxRedeemable: Number(maxRedeemable) || 0,
      isListed: isDeleted === "false",
    }

    await Category.findByIdAndUpdate(categoryId, updateData, { new: true })
    if (oldOffer !== newOffer) {
      const products = await Product.find({ categoryId: categoryId })

      for (const product of products) {
        const bestOffer = determineBestOffer(product.offer, newOffer)
        product.variants = product.variants.map((variant) => {
          const originalPrice = variant.varientPrice
          const { salePrice } = calculateBestPrice(originalPrice, product.offer, newOffer)
          return {
            ...variant,
            salePrice,
          }
        })
        product.displayOffer = bestOffer.offerValue
        product.offerSource = bestOffer.offerSource

        await product.save()
      }
    }

    req.flash("success_msg", "Category updated successfully")
    res.redirect("/admin/category")
  } catch (error) {
    console.error("Admin updateCategory error:", error)
    req.flash("error_msg", "Server error: " + error.message)
    res.status(500).render("admin/pages/adminEditCategory", { error_msg: "Server error: " + error.message })
  }
}

const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id

    const productsUsingCategory = await Product.countDocuments({ categoryId: categoryId })
    if (productsUsingCategory > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category because it has associated products",
      })
    }

    await Category.findByIdAndDelete(categoryId)
    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    console.error("Admin deleteCategory error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
}

const toggleCategoryListing = async (req, res) => {
  try {
    const categoryId = req.params.id
    const category = await Category.findById(categoryId)

    if (!category) {
      req.flash("error_msg", "Category not found")
      return res.redirect("/admin/category")
    }

    const newListingStatus = !category.isListed
    category.isListed = newListingStatus
    await category.save()

    await Product.updateMany({ categoryId: categoryId }, { isActive: newListingStatus })

    req.flash("success_msg", `Category ${category.isListed ? "listed" : "unlisted"} successfully`)
    res.redirect("/admin/category")
  } catch (error) {
    console.error("Admin toggleCategoryListing error:", error)
    req.flash("error_msg", "Server error")
    res.redirect("/admin/category")
  }
}

module.exports = {
  loadCategory,
  loadAddCategory,
  addCategory,
  loadEditCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryListing,
}
