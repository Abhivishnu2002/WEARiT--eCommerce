const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const User = require("../../models/userModel");
const mongoose = require("mongoose");
const upload = require("../../middlewares/uploadMiddleware");
const cloudinary = require("cloudinary").v2;

const loadProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search || "";
        const category = req.query.category || "";
        const priceRange = req.query.priceRange || "";
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder || "desc";
        const isActiveFilter = req.query.isActive || "";

        let filter = {};

        if (searchQuery) {
            filter.$or = [
                { name: { $regex: searchQuery, $options: "i" } },
                { description: { $regex: searchQuery, $options: "i" } },
            ];
        }

        if (category && category.trim() !== "") {
            filter.categoryId = new mongoose.Types.ObjectId(category);
        }

        if (isActiveFilter === "true") {
            filter.isActive = true;
        } else if (isActiveFilter === "false") {
            filter.isActive = false;
        }

        if (priceRange) {
            const [min, max] = priceRange.split("-");
            const minPrice = parseFloat(min);
            const maxPrice = parseFloat(max);
            
            if (!isNaN(minPrice) && !isNaN(maxPrice)) {
                filter["variants.varientPrice"] = {
                    $gte: minPrice,
                    $lte: maxPrice,
                };
            } else if (!isNaN(minPrice)) {
                filter["variants.varientPrice"] = { $gte: minPrice };
            }
        }

        const sort = {};

        if (sortBy === "price") {
            const sortStage = { $sort: {} };
            sortStage.$sort[`variants.0.varientPrice`] = sortOrder === "asc" ? 1 : -1;
            
            const totalProducts = await Product.countDocuments(filter);
            const totalPages = Math.ceil(totalProducts / limit);

            const products = await Product.aggregate([
                { $match: filter },
                sortStage,
                { $skip: skip },
                { $limit: limit },
                { $lookup: {
                    from: "categories",
                    localField: "categoryId",
                    foreignField: "_id",
                    as: "categoryId"
                }},
                { $unwind: "$categoryId" }
            ]);
            
            const categories = await Category.find({ isListed: true });
            
            const admin = req.session.admin
                ? {
                    name: req.session.admin.name,
                    email: req.session.admin.email,
                    profileImage: req.session.admin.profileImage || "",
                }
                : {};
            
            return res.render("admin/pages/adminProducts", {
                admin,
                products,
                categories,
                currentPage: page,
                totalPages,
                totalProducts,
                searchQuery,
                category,
                limit,
                priceRange,
                sortBy,
                sortOrder,
                query: req.query,
            });
        } else {
            sort[sortBy] = sortOrder === "asc" ? 1 : -1;
            
            const totalProducts = await Product.countDocuments(filter);
            const totalPages = Math.ceil(totalProducts / limit);
            
            const products = await Product.find(filter)
                .populate("categoryId")
                .sort(sort)
                .skip(skip)
                .limit(limit);
            
            const categories = await Category.find({ isListed: true });
            
            const admin = req.session.admin
                ? {
                    name: req.session.admin.name,
                    email: req.session.admin.email,
                    profileImage: req.session.admin.profileImage || "",
                }
                : {};
            
            res.render("admin/pages/adminProducts", {
                admin,
                products,
                categories,
                currentPage: page,
                totalPages,
                totalProducts,
                searchQuery,
                category,
                limit,
                priceRange,
                sortBy,
                sortOrder,
                query: req.query,
            });
        }
    } catch (error) {
        console.error(error);
        req.flash("error_msg", "Server error");
        res.status(500).render("admin/pages/adminProducts", {
            admin: req.session.admin || {},
            products: [],
            categories: [],
            currentPage: 1,
            totalPages: 0,
            totalProducts: 0,
            searchQuery: req.query.search || "",
            category: req.query.category || "",
            priceRange: req.query.priceRange || "",
            sortBy: req.query.sortBy || "createdAt",
            sortOrder: req.query.sortOrder || "desc",
            query: req.query,
            error_msg: "Server error: " + error.message,
        });
    }
};

const loadAddProducts = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true });

        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage,
        };

        res.render("admin/pages/adminAddProducts", { admin, categories });
    } catch (error) {
        console.error(error);
        req.flash("error_msg", "Server error");
        res.status(500).render("admin/pages/adminAddProducts", {
            admin: req.session.admin || {},
            categories: [],
            error_msg: "Server error",
        });
    }
};

const addProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            categoryId,
            brand,
            color,
            offer,
            fabric,
            sku,
            tags,
        } = req.body;

        const variants = [];
        const sizes = ["S", "M", "L", "XL"];

        const varientPrices = Array.isArray(req.body.varientPrice)
            ? req.body.varientPrice
            : [req.body.varientPrice];
        const varientQuantities = Array.isArray(req.body.varientquatity)
            ? req.body.varientquatity
            : [req.body.varientquatity];

        for (let i = 0; i < sizes.length; i++) {
            const price = Number(varientPrices[i]);
            const quantity = Number(varientQuantities[i]);

            if (!isNaN(price) && !isNaN(quantity)) {
                const discount = (price * Number(offer || 0)) / 100;
                const salePrice = price - discount;

                variants.push({
                    size: sizes[i],
                    varientPrice: price,
                    salePrice: Math.round(salePrice),
                    varientquatity: quantity,
                });
            }
        }

        if (variants.length === 0) {
            req.flash("error_msg", "At least one variant is required");
            const categories = await Category.find({ isListed: true });
            return res.render("admin/pages/adminAddProducts", {
                admin: req.session.admin,
                categories,
                error_msg: "At least one variant is required",
            });
        }

        const tagArray = tags ? (Array.isArray(tags) ? tags : [tags]) : [];

        const images = [];

        if (!req.files || Object.keys(req.files).length === 0) {
            req.flash("error_msg", "Please upload at least one image");
            const categories = await Category.find({ isListed: true });
            return res.render("admin/pages/adminAddProducts", {
                admin: req.session.admin,
                categories,
                error_msg: "Please upload at least one image",
            });
        }

        let hasMainImage = false;

        for (const fieldName in req.files) {
            const file = req.files[fieldName][0];

            const imageObj = {
                url: file.path,
                thumbnail: file.path.replace(
                    "/upload/",
                    "/upload/w_200,h_200,c_thumb/"
                ),
                isMain: !hasMainImage,
            };

            hasMainImage = true;
            images.push(imageObj);
        }

        const newProduct = new Product({
            name,
            description,
            categoryId: new mongoose.Types.ObjectId(categoryId),
            brand: brand || "",
            color,
            offer: Number(offer) || 0,
            images,
            variants,
            sku: sku || "",
            tags: tagArray,
            fabric,
            ratings: {
                average: 0,
                count: 0,
            },
            isActive: true,
        });

        await newProduct.save();

        req.flash("success_msg", "Product added successfully");
        res.redirect("/admin/products");
    } catch (error) {
        console.error(error);
        req.flash("error_msg", "Failed to add product: " + error.message);
        res.status(500).render("admin/pages/adminAddProducts", {
            admin: req.session.admin,
            error_msg: "Failed to add product: " + error.message,
        });
    }
};

const loadEditProducts = async (req, res) => {
    try {
        const productId = req.query.id;
        const product = await Product.findById(productId).populate(
            "categoryId"
        );

        if (!product) {
            req.flash("error_msg", "Product not found");
            return res.redirect("/admin/products");
        }

        const categories = await Category.find({ isListed: true });
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage,
        };

        res.render("admin/pages/adminUpdateProduct", {
            admin,
            product,
            categories,
        });
    } catch (error) {
        console.error("Load edit products error:", error);
        req.flash("error_msg", "Server error");
        res.status(500).render("admin/pages/adminUpdateProduct", {
            error_msg: "Server error",
        });
    }
};

const updateProduct = async (req, res) => {
    try {
        const {
            productId,
            name,
            description,
            color,
            offer,
            sizeInfo,
            washCare,
            additionalInfo,
            category,
            fitType,
            sleeve,
            isDeleted,
        } = req.body;

        const variantPrices = req.body.varientPrice || {};
        const offerValue = parseFloat(offer) || 0;
        const sizes = ["S", "M", "L", "XL"];
        const variants = sizes.map((size) => {
            const price = parseFloat(variantPrices[size]) || 0;
            const discount = price * (offerValue / 100);
            const salePrice = price - discount;
            const quantity =
                req.body.sizes && req.body.sizes[size]
                    ? parseInt(req.body.sizes[size])
                    : 0;

            return {
                size,
                varientPrice: price,
                salePrice: Math.round(salePrice),
                varientquatity: quantity,
            };
        });
        const totalStock = variants.reduce(
            (sum, v) => sum + v.varientquatity,
            0
        );

        let images = [];

        if (req.files && Object.keys(req.files).length > 0) {
            for (const fieldName in req.files) {
                const file = req.files[fieldName][0];
                const imageObj = {
                    url: file.path,
                    thumbnail: file.path.replace(
                        "/upload/",
                        "/upload/w_200,h_200,c_thumb/"
                    ),
                    isMain: fieldName === "mainImage", 
                };
                images.push(imageObj);
            }
        } else {
            const existingProduct = await Product.findById(productId);
            images = existingProduct.images;
        }

        await Product.findByIdAndUpdate(productId, {
            name,
            description,
            categoryId: new mongoose.Types.ObjectId(category),
            brand: req.body.brand || "",
            color,
            offer: offerValue,
            sizeInfo,
            washCare,
            additionalInfo: Array.isArray(additionalInfo)
                ? additionalInfo
                : [additionalInfo],
            fitType,
            sleeve,
            variants,
            images,
            stockQuantity: totalStock,
            isActive: isDeleted !== "true",
            updatedAt: Date.now(),
        });
        req.flash("success_msg", "Product updated successfully");
        res.redirect("/admin/products");
    } catch (error) {
        console.error("Update product error:", error);
        req.flash("error_msg", "Failed to update product");
        res.redirect("/admin/products");
    }
};

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        for (const image of product.images) {
            try {
                const publicId = image.url.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.error("Error deleting image from Cloudinary:", error);
            }
        }
        await Product.findByIdAndDelete(productId);
        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const toggleProductListing = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        const previousStatus = product.isActive;
        product.isActive = !product.isActive;
        await product.save();
        return res.status(200).json({
            success: true,
            message: product.isActive ? "Product listed successfully" : "Product unlisted successfully",
            isListed: product.isActive,
        });
    } catch (error) {
        console.error(`Error toggling product listing: ${error.message}`);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {
    loadProducts,
    loadAddProducts,
    addProduct,
    loadEditProducts,
    updateProduct,
    deleteProduct,
    toggleProductListing,
};
