const Product = require("../../models/productModel")
const Category = require("../../models/categoryModel")
const User = require("../../models/userModel")
const Wishlist = require("../../models/wishlistModel")
const mongoose = require("mongoose")
const { calculateBestPrice, determineBestOffer } = require("../../utils/offerUtils");

const getAllProducts = async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 12
    const skip = (page - 1) * limit

    const query = { isActive: true }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { brands: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
        { tags: { $in: [new RegExp(req.query.search, "i")] } },
      ]
    }

    if (req.query.category) {
      query.categoryId = req.query.category
    }

    if (req.query.brand) {
      query.brand = { $regex: req.query.brand, $options: "i" }
    }

    if (req.query.color) {
      query.color = { $regex: req.query.color, $options: "i" }
    }

    if (req.query.fabric) {
      query.fabric = { $regex: req.query.fabric, $options: "i" }
    }
    if (req.query.inStock === "true") {
      query["variants.varientquatity"] = { $gt: 0 }
    }

    let sortOption = {}
    switch (req.query.sort) {
      case "price-asc":
        sortOption = { "variants.0.salePrice": 1 }
        break
      case "price-desc":
        sortOption = { "variants.0.salePrice": -1 }
        break
      case "name-asc":
        sortOption = { name: 1 }
        break
      case "name-desc":
        sortOption = { name: -1 }
        break
      case "rating":
        sortOption = { "ratings.average": -1 }
        break
      case "newest":
        sortOption = { createdAt: -1 }
        break
      case "popular":
        sortOption = { "ratings.count": -1 }
        break
      default:
        sortOption = { createdAt: -1 }
    }

    if (req.query.minPrice || req.query.maxPrice) {
      const priceFilter = {}

      if (req.query.minPrice) priceFilter.$gte = Number.parseFloat(req.query.minPrice)
      if (req.query.maxPrice) priceFilter.$lte = Number.parseFloat(req.query.maxPrice)

      query["variants.salePrice"] = priceFilter
    }

    const products = await Product.find(query).populate("categoryId").sort(sortOption).skip(skip).limit(limit).lean()
    
    const processedProducts = products.map((product) => {
      const hasStock = product.variants.some((variant) => variant.varientquatity > 0)
      
      const productOffer = product.offer || 0
      const categoryOffer = product.categoryId ? product.categoryId.offer || 0 : 0
      const bestOffer = determineBestOffer(productOffer, categoryOffer)
      
      const updatedVariants = product.variants.map(variant => {
        const { salePrice } = calculateBestPrice(variant.varientPrice, productOffer, categoryOffer)
        return {
          ...variant,
          salePrice
        }
      })
      
      return {
        ...product,
        variants: updatedVariants,
        inStock: hasStock,
        stockCount: product.variants.reduce((total, variant) => total + variant.varientquatity, 0),
        displayOffer: bestOffer.offerValue,
        offerSource: bestOffer.offerSource,
        appliedOffer: bestOffer.offerValue
      }
    })

    const totalProducts = await Product.countDocuments(query)
    const totalPages = Math.ceil(totalProducts / limit)

    const categories = await Category.find({ isListed: true }).lean()

    const brands = await Product.distinct("brand", { isActive: true })

    const colors = await Product.distinct("color", { isActive: true })

    const fabrics = await Product.distinct("fabric", { isActive: true })

    const priceRange = await Product.aggregate([
      { $match: { isActive: true } },
      { $unwind: "$variants" },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$variants.salePrice" },
          maxPrice: { $max: "$variants.salePrice" },
        },
      },
    ])

    const removeFilterUrl = (filterName) => {
      const params = new URLSearchParams(req.query)

      if (Array.isArray(filterName)) {
        filterName.forEach((name) => params.delete(name))
      } else {
        params.delete(filterName)
      }

      return "/products?" + params.toString()
    }

    const getPaginationUrl = (pageNum) => {
      const params = new URLSearchParams(req.query)
      params.set("page", pageNum)
      return "/products?" + params.toString()
    }

    res.render("pages/product", {
      products: processedProducts,
      currentPage: page,
      totalPages,
      totalProducts,
      categories,
      brands,
      colors,
      fabrics,
      priceRange: priceRange[0] || { minPrice: 0, maxPrice: 1000 },
      query: req.query,
      filters: {
        category: req.query.category || "",
        brand: req.query.brand || "",
        color: req.query.color || "",
        fabric: req.query.fabric || "",
        minPrice: req.query.minPrice || "",
        maxPrice: req.query.maxPrice || "",
        sort: req.query.sort || "newest",
        search: req.query.search || "",
        inStock: req.query.inStock || "",
      },
      removeFilterUrl,
      getPaginationUrl,
    })
  } catch (error) {
    console.error("Product listing error:", error)
    req.flash("error_msg", "Failed to load products")
    res.redirect("/")
  }
}

const getProductDetails = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      req.flash("error_msg", "Invalid product ID")
      return res.redirect("/products")
    }

    const product = await Product.findById(req.params.id).populate("categoryId").lean()

    if (!product || !product.isActive) {
      req.flash("error_msg", "Product not available")
      return res.redirect("/products")
    }
    
    const productOffer = product.offer || 0
    const categoryOffer = product.categoryId ? product.categoryId.offer || 0 : 0
    const bestOffer = determineBestOffer(productOffer, categoryOffer)
    
    const updatedVariants = product.variants.map(variant => {
      const { salePrice } = calculateBestPrice(variant.varientPrice, productOffer, categoryOffer)
      return {
        ...variant,
        salePrice
      }
    })
    
    const enhancedProduct = {
      ...product,
      variants: updatedVariants,
      displayOffer: bestOffer.offerValue,
      offerSource: bestOffer.offerSource,
      appliedOffer: bestOffer.offerValue
    }

    const relatedProducts = await Product.find({
      categoryId: product.categoryId._id,
      _id: { $ne: product._id },
      isActive: true,
    })
      .populate("categoryId")
      .limit(4)
      .lean()
    
    const processedRelatedProducts = relatedProducts.map((relProduct) => {
      const hasStock = relProduct.variants.some((variant) => variant.varientquatity > 0)
      
      const relProductOffer = relProduct.offer || 0
      const relCategoryOffer = relProduct.categoryId ? relProduct.categoryId.offer || 0 : 0
      const relBestOffer = determineBestOffer(relProductOffer, relCategoryOffer)
      
      const relUpdatedVariants = relProduct.variants.map(variant => {
        const { salePrice } = calculateBestPrice(variant.varientPrice, relProductOffer, relCategoryOffer)
        return {
          ...variant,
          salePrice
        }
      })
      
      return {
        ...relProduct,
        variants: relUpdatedVariants,
        inStock: hasStock,
        stockCount: relProduct.variants.reduce((total, variant) => total + variant.varientquatity, 0),
        displayOffer: relBestOffer.offerValue,
        offerSource: relBestOffer.offerSource,
        appliedOffer: relBestOffer.offerValue
      }
    })

    let recentlyViewed = []
    if (req.session.recentlyViewed) {
      recentlyViewed = await Product.find({
        _id: { $in: req.session.recentlyViewed, $ne: product._id },
        isActive: true,
      })
        .populate("categoryId")
        .limit(4)
        .lean()
      
      recentlyViewed = recentlyViewed.map((viewedProduct) => {
        const hasStock = viewedProduct.variants.some((variant) => variant.varientquatity > 0)
        
        const viewedProductOffer = viewedProduct.offer || 0
        const viewedCategoryOffer = viewedProduct.categoryId ? viewedProduct.categoryId.offer || 0 : 0
        const viewedBestOffer = determineBestOffer(viewedProductOffer, viewedCategoryOffer)
        
        const viewedUpdatedVariants = viewedProduct.variants.map(variant => {
          const { salePrice } = calculateBestPrice(variant.varientPrice, viewedProductOffer, viewedCategoryOffer)
          return {
            ...variant,
            salePrice
          }
        })
        
        return {
          ...viewedProduct,
          variants: viewedUpdatedVariants,
          inStock: hasStock,
          stockCount: viewedProduct.variants.reduce((total, variant) => total + variant.varientquatity, 0),
          displayOffer: viewedBestOffer.offerValue,
          offerSource: viewedBestOffer.offerSource,
          appliedOffer: viewedBestOffer.offerValue
        }
      })
    }

    if (req.isAuthenticated()) {
      if (!req.session.recentlyViewed) {
        req.session.recentlyViewed = []
      }

      req.session.recentlyViewed = [
        product._id.toString(),
        ...req.session.recentlyViewed.filter((id) => id !== product._id.toString()),
      ].slice(0, 10)
    }

    const sizeOptions = enhancedProduct.variants.map((variant) => variant.size)
    const colorOption = enhancedProduct.color
    const inStock = enhancedProduct.variants.some((variant) => variant.varientquatity > 0)
    const defaultVariant = enhancedProduct.variants[0] || null

    res.render("pages/product-details", {
      product: enhancedProduct,
      relatedProducts: processedRelatedProducts,
      recentlyViewed,
      sizeOptions,
      colorOption,
      inStock,
      defaultVariant,
      user: req.user || null,
    })
  } catch (error) {
    console.error("Product details error:", error)
    req.flash("error_msg", "Failed to load product details")
    res.redirect("/products")
  }
}

module.exports = {
  getAllProducts,
  getProductDetails,
}