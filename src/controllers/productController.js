const Product = require('../models/productModel.js');
const Category = require('../models/categoryModel.js');

const getAllProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const query = { isBlocked: false, isListed: true };

        // Apply filters if provided
        if (req.query.search) {
            query.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.brand) {
            query.brand = req.query.brand;
        }

        if (req.query.minPrice || req.query.maxPrice) {
            query.price = {};
            if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
        }

        let sortOption = {};
        switch (req.query.sort) {
            case 'price-asc': sortOption = { price: 1 }; break;
            case 'price-desc': sortOption = { price: -1 }; break;
            case 'name-asc': sortOption = { name: 1 }; break;
            case 'name-desc': sortOption = { name: -1 }; break;
            case 'rating': sortOption = { averageRating: -1 }; break;
            case 'newest': sortOption = { createdAt: -1 }; break;
            default: sortOption = { createdAt: -1 };
        }

        const products = await Product.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);
        const categories = await Product.distinct('category');
        const brands = await Product.distinct('brand');
        const priceRange = await Product.aggregate([
            { $match: { isBlocked: false, isListed: true } },
            {
                $group: {
                    _id: null,
                    minPrice: { $min: '$price' },
                    maxPrice: { $max: '$price' }
                }
            }
        ]);

        // Check where to render based on request path
        const template = req.originalUrl.startsWith('/products') ? 'pages/product' : 'pages/home';

        res.render(template, {
            products,
            currentPage: page,
            totalPages,
            totalProducts,
            categories,
            brands,
            priceRange: priceRange[0] || { minPrice: 0, maxPrice: 1000 },
            query: req.query
        });
    } catch (error) {
        console.error('Product listing error:', error);
        req.flash('error_msg', 'Failed to load products');
        res.redirect('/');
    }
};

const getProductDetails = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if(!product || product.isBlocked || !product.isListed) {
            req.flash('error_msg', 'Product not available');
            return res.redirect('/products');
        }

        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            isBlocked: false,
            isListed: true
        }).limit(4);
        
        res.render('pages/productDetails', {
            product,
            relatedProducts
        });
    } catch (error) {
        console.error('Product details error:', error);
        req.flash('error_msg', 'Failed to load product details');
        res.redirect('/products');
    }
};

module.exports = {
    getAllProducts,
    getProductDetails
};