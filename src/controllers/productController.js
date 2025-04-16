const Product = require('../models/productModel');
const Category = require('../models/categoryModel');

const loadProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page-1)*limit;
        const searchQuery = req.query.search || '';
        const category = req.query.category || '';
        const priceRange = req.query.priceRange || '';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder || 'desc';
        
        // Build filter
        let filter = {};
        
        if(searchQuery) {
            filter.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } }
            ];
        }
        
        if(category) {
            filter.category = category;
        }
        
        if(priceRange) {
            const [min, max] = priceRange.split('-');
            if(min && max) {
                filter.price = { $gte: Number(min), $lte: Number(max) };
            } else if(min) {
                filter.price = { $gte: Number(min) };
            }
        }
        
        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
        
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts/limit);
        
        // Get products with populated category
        const products = await Product.find(filter)
            .populate('category')
            .sort(sort)
            .skip(skip)
            .limit(limit);
        
        // Get all categories for the filter dropdown
        const categories = await Category.find({});
        
        // Get admin data for the sidebar
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage
        };
        
        res.render('admin/pages/adminProducts', {
            admin,
            products,
            categories,
            currentPage: page,
            totalPages,
            totalProducts,
            searchQuery,
            category,
            priceRange,
            sortBy,
            sortOrder,
            query: req.query
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render("admin/pages/adminProducts", { error_msg: "Server error" });
    }
}

const loadAddProducts = async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false });
        
        // Get admin data for the sidebar
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage
        };
        
        res.render('admin/pages/adminAddProduct', { admin, categories });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render("admin/pages/adminAddProduct", { error_msg: "Server error" });
    }
}

const addProduct = async(req, res) => {
    try {
        const { 
            name, 
            description, 
            price, 
            category, 
            stockQuantity,
            offer,
            color,
            sizeInfo,
            washCare,
            fitType,
            sleeve
        } = req.body;
        
        // Process sizes
        const sizes = [];
        const sizeKeys = Object.keys(req.body).filter(key => key.startsWith('sizes['));
        
        sizeKeys.forEach(key => {
            const size = key.match(/sizes\[(.*?)\]/)[1];
            const quantity = parseInt(req.body[key]) || 0;
            if (quantity > 0) {
                sizes.push({ size, quantity });
            }
        });
        
        // Process additional info
        const additionalInfo = req.body['additionalInfo[]'];
        const additionalInfoArray = Array.isArray(additionalInfo) 
            ? additionalInfo.filter(info => info.trim() !== '')
            : additionalInfo && additionalInfo.trim() !== '' ? [additionalInfo] : [];
        
        // Check for images
        if (!req.files || req.files.length === 0) {
            req.flash('error_msg', 'Please upload at least one image');
            const categories = await Category.find({ isDeleted: false });
            return res.render('admin/pages/adminAddProducts', {
                admin: {
                    name: req.session.admin.name,
                    email: req.session.admin.email,
                    profileImage: req.session.admin.profileImage
                },
                categories,
                error_msg: "Please upload at least one image"
            });
        }
        
        // Process images
        const images = req.files.map(file => file.path);
        
        const newProduct = new Product({
            name,
            description,
            price,
            category,
            stockQuantity,
            offer: offer || 0,
            color,
            sizeInfo,
            washCare,
            fitType,
            sleeve,
            sizes,
            additionalInfo: additionalInfoArray,
            images
        });
        
        await newProduct.save();
        req.flash('success_msg', 'Product added successfully');
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Failed to add product');
        const categories = await Category.find({ isDeleted: false });
        res.status(500).render("admin/pages/adminAddProducts", {
            admin: {
                name: req.session.admin.name,
                email: req.session.admin.email,
                profileImage: req.session.admin.profileImage
            },
            categories,
            error_msg: "Failed to add product"
        });
    }
}

const loadEditProducts = async (req, res) => {
    try {
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
        
        if (!product) {
            req.flash('error_msg', 'Product not found');
            return res.redirect('/admin/products');
        }
        
        const categories = await Category.find({ isDeleted: false });
        
        // Get admin data for the sidebar
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage
        };
        
        res.render('admin/pages/adminUpdateProduct', {
            admin,
            product,
            categories
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render("admin/pages/adminUpdateProduct", { error_msg: "Server error" });
    }
}

const updateProduct = async(req, res) => {
    try {
        const productId = req.params.id;
        const {
            name,
            description,
            price,
            category,
            stockQuantity,
            offer,
            color,
            sizeInfo,
            washCare,
            fitType,
            sleeve,
            isDeleted
        } = req.body;
        
        const product = await Product.findById(productId);
        if (!product) {
            req.flash('error_msg', 'Product not found');
            return res.redirect('/admin/products');
        }
        
        // Process sizes
        const sizes = [];
        const sizeKeys = Object.keys(req.body).filter(key => key.startsWith('sizes['));
        
        sizeKeys.forEach(key => {
            const size = key.match(/sizes\[(.*?)\]/)[1];
            const quantity = parseInt(req.body[key]) || 0;
            if (quantity > 0) {
                sizes.push({ size, quantity });
            }
        });
        
        // Process additional info
        const additionalInfo = req.body['additionalInfo[]'];
        const additionalInfoArray = Array.isArray(additionalInfo) 
            ? additionalInfo.filter(info => info.trim() !== '')
            : additionalInfo && additionalInfo.trim() !== '' ? [additionalInfo] : [];
        
        let updateData = {
            name,
            description,
            price,
            category,
            stockQuantity,
            offer: offer || 0,
            color,
            sizeInfo,
            washCare,
            fitType,
            sleeve,
            sizes,
            additionalInfo: additionalInfoArray,
            isDeleted: isDeleted === 'true'
        };
        
        // Process images if new ones are uploaded
        if (req.files && req.files.length > 0) {
            const images = req.files.map(file => {
                return file.path.replace('public/', '/');
            });
            updateData.images = images;
        }
        
        await Product.findByIdAndUpdate(productId, updateData);
        req.flash('success_msg', 'Product updated successfully');
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Failed to update product');
        res.status(500).render("admin/pages/adminUpdateProduct", { error_msg: "Failed to update product" });
    }
}

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        await Product.findByIdAndDelete(productId);
        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

const toggleProductListing = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({success: false, message: "Product not found"});
        }
        
        product.isDeleted = !product.isDeleted;
        await product.save();
        
        return res.status(200).json({
            success: true,
            message: product.isDeleted ? "Product unlisted successfully" : "Product listed successfully",
            isListed: !product.isDeleted
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

module.exports = {
    loadProducts,
    loadAddProducts,
    addProduct,
    loadEditProducts,
    updateProduct,
    deleteProduct,
    toggleProductListing
};