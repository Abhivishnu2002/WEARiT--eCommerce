const User = require('../models/userModel');
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const bcrypt = require('bcrypt');

const loadLogin = (req, res) => {
    try {
        res.render("admin/pages/adminLogin");
    } catch (error) {
        console.error(error);
        res.status(500).render("admin/pages/adminLogin", { error_msg: "Server error" });
    }
}

const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find admin user in the User model
        const admin = await User.findOne({ email }).select('+password');

        if (!admin) {
            req.flash('error_msg', 'Invalid email or password');
            return res.render("admin/pages/adminLogin", { error_msg: 'Invalid email or password' });
        }

        // Check if user is an admin
        if (!admin.isAdmin) {
            req.flash('error_msg', 'You do not have admin privileges');
            return res.render('admin/pages/adminLogin', { error_msg: 'You do not have admin privileges' });
        }

        // Compare password
        const isPasswordMatch = await admin.comparePassword(password);
        if (!isPasswordMatch) {
            req.flash('error_msg', 'Invalid email or password');
            return res.render("admin/pages/adminLogin", { error_msg: 'Invalid email or password' });
        }

        // Set admin session
        req.session.admin = {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            profileImage: admin.profileImage || 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WEARiT-CzWLpMp95jvKXjnFM6cS4gWAWSGCH2.png'
        };

        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render("admin/pages/adminLogin", { error_msg: "Server error" });
    }
}

const loadAccount = async (req, res) => {
    try {
        // Make sure we're using the admin session ID
        const admin = await User.findById(req.session.admin.id);
        if (!admin) {
            req.flash('error_msg', 'Admin not found');
            return res.redirect('/admin/login');
        }
        res.render("admin/pages/adminAccount", { admin });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.redirect('/admin/dashboard');
    }
}

const loadEditAccount = async (req, res) => {
    try {
        const admin = await User.findById(req.session.admin.id);
        if (!admin) {
            req.flash('error_msg', 'Admin not found');
            return res.redirect('/admin/login');
        }
        res.render("admin/pages/adminEditAccount", { admin });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.redirect('/admin/account');
    }
}

const updateAccount = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const admin = await User.findByIdAndUpdate(req.session.admin.id, {
            name, 
            email, 
            mobile: phone // Match field names (phone vs mobile)
        }, { new: true });

        if (!admin) {
            req.flash('error_msg', 'Admin not found');
            return res.redirect('/admin/login');
        }

        // Update session data
        req.session.admin.name = name;
        req.session.admin.email = email;
        
        req.flash('success_msg', 'Account updated successfully');
        res.redirect('/admin/account');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Failed to update account');
        res.status(500).render('admin/pages/adminEditAccount', { error_msg: 'Failed to update account' });
    }
};

const loadChangePassword = (req, res) => {
    res.render("admin/pages/adminChangePassword");
}

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'New passwords do not match');
            return res.render("admin/pages/adminChangePassword", { error_msg: 'New passwords do not match' });
        }
        
        const admin = await User.findById(req.session.admin.id).select('+password');
        if (!admin) {
            req.flash('error_msg', 'Admin not found');
            return res.redirect('/admin/login');
        }
        
        const isPasswordMatch = await admin.comparePassword(currentPassword);
        if (!isPasswordMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.render("admin/pages/adminChangePassword", { error_msg: 'Current password is incorrect' });
        }
        
        admin.password = newPassword;
        await admin.save();
        
        req.flash('success_msg', 'Password updated successfully');
        res.render('admin/pages/adminChangePassword', { success_msg: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Failed to update password');
        res.status(500).render('admin/pages/adminChangePassword', { error_msg: 'Failed to update password' });
    }
}

const loadDashboard = async (req, res) => {
    try {
        const userCount = await User.countDocuments({isAdmin: false});
        const productCount = await Product.countDocuments();
        const categoryCount = await Category.countDocuments();
        const recentUsers = await User.find({isAdmin: false}).sort({ createdAt:-1 }).limit(5);
        
        // Get admin data for the sidebar
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage
        };
        
        res.render('admin/pages/adminDashboard', {
            admin,
            userCount,
            productCount,
            categoryCount,
            recentUsers
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render('admin/pages/adminDashboard', { error_msg: 'Server error' });
    }
};

const logout = (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login'); // Fixed redirect path
}

const loadCustomer = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const searchQuery = req.query.search || '';
        let filter = {isAdmin: false};

        if(searchQuery) {
            filter = {
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { email: { $regex: searchQuery, $options: 'i' } },
                    { mobile: { $regex: searchQuery, $options: 'i' } }
                ],
                isAdmin: false
            };
        }
        
        const totalUsers = await User.countDocuments(filter);
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(filter).sort({createdAt: -1}).skip(skip).limit(limit);
        
        // Get admin data for the sidebar
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage
        };
        
        res.render('admin/pages/adminCustomer', {
            admin,
            users,
            currentPage: page,
            totalPages,
            totalUsers,
            searchQuery
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render('admin/pages/adminCustomer', { error_msg: 'Server error' });
    }
};

const blockUnblockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if(!user) {
            return res.status(404).json({success: false, message: "User not found"});
        }
        
        user.isBlocked = !user.isBlocked;
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
            isBlocked: user.isBlocked
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

const loadCustomerDetails = async (req, res) => {
    try {
        const userId = req.query.id;
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/customer');
        }
        
        // Get admin data for the sidebar
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage
        };
        
        res.render("admin/pages/adminCustomerDetails", { admin, user });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.redirect('/admin/customer');
    }
}

const loadCategory = async (req, res) => {
   try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page-1)*limit;
        const searchQuery = req.query.search || '';
        
        // Changed filter to match your model structure
        let filter = {};
        if(searchQuery) {
            filter.name = { $regex: searchQuery, $options: 'i'};
        }
        
        const totalCategories = await Category.countDocuments(filter);
        const totalPages = Math.ceil(totalCategories/limit);
        const categories = await Category.find(filter).sort({createdAt: -1}).skip(skip).limit(limit);
        
        // Get admin data for the sidebar
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage
        };
        
        res.render('admin/pages/adminCategory', {
            admin,
            categories,
            currentPage: page,
            totalPages,
            totalCategories,
            searchQuery
        });
   } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render('admin/pages/adminCategory', { error_msg: "Server Error" });
   }
}

const loadAddCategory = (req, res) => {
    // Get admin data for the sidebar
    const admin = {
        name: req.session.admin.name,
        email: req.session.admin.email,
        profileImage: req.session.admin.profileImage
    };
    
    res.render("admin/pages/adminAddCategory", { admin });
}

const addCategory = async (req, res) => {
    try {
        const {name, description} = req.body;
        const existingCategory = await Category.findOne({name});
        
        if(existingCategory) {
            req.flash('error_msg', 'Category already exists');
            return res.render('admin/pages/adminAddCategory', { 
                error_msg: "Category already exists",
                admin: {
                    name: req.session.admin.name,
                    email: req.session.admin.email,
                    profileImage: req.session.admin.profileImage
                }
            });
        }
        
        let imagePath = '';
        if(req.file) {
            // Fixed path handling
            imagePath = req.file.path.replace('public/', '/');
        }
        
        const newCategory = new Category({
            name,
            description,
            image: imagePath
        });
        
        await newCategory.save();
        req.flash('success_msg', 'Category added successfully');
        res.redirect('/admin/category');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render("admin/pages/adminAddCategory", { 
            error_msg: "Server Error",
            admin: {
                name: req.session.admin.name,
                email: req.session.admin.email,
                profileImage: req.session.admin.profileImage
            }
        });
    }
};

const loadEditCategory = async (req, res) => {
    try {
        const categoryId = req.query.id;
        const category = await Category.findById(categoryId);

        if(!category) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/category');
        }
        
        // Get admin data for the sidebar
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage
        };
        
        res.render('admin/pages/adminEditCategory', { admin, category });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render("admin/pages/adminEditCategory", { error_msg: "Server error" });
    }
}

const updateCategory = async(req, res) => {
    try {
        const categoryId = req.params.id; // Changed from req.body.categoryId
        const { name, description, isDeleted } = req.body;
        
        const category = await Category.findById(categoryId);
        if(!category) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/category');
        }
        
        const existingCategory = await Category.findOne({name, _id: { $ne: categoryId }});
        if(existingCategory) {
            req.flash('error_msg', 'Category name already exists');
            return res.render("admin/pages/adminEditCategory", {
                category,
                error_msg: "Category name already exists",
                admin: {
                    name: req.session.admin.name,
                    email: req.session.admin.email,
                    profileImage: req.session.admin.profileImage
                }
            });
        }
        
        let updateData = { name, description, isDeleted: isDeleted === 'true' };
        
        if(req.file) {
            // Fixed path handling
            updateData.image = req.file.path.replace('public/', '/');
        }
        
        await Category.findByIdAndUpdate(categoryId, updateData);
        req.flash('success_msg', 'Category updated successfully');
        res.redirect('/admin/category');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render("admin/pages/adminEditCategory", { error_msg: "Server error" });
    }
}

const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        await Category.findByIdAndDelete(categoryId);
        return res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({success: false, message: "Server error"});
    }
};

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
        const productId = req.params.id; // Changed from req.body.productId
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
    loadLogin,
    verifyLogin,
    loadAccount,
    loadEditAccount,
    updateAccount,
    loadChangePassword,
    updatePassword,
    loadDashboard,
    logout,
    loadCustomer,
    loadCustomerDetails,
    blockUnblockUser,
    loadCategory,
    loadAddCategory,
    addCategory,
    loadEditCategory,
    updateCategory,
    deleteCategory,
    loadProducts,
    loadAddProducts,
    addProduct,
    loadEditProducts,
    updateProduct,
    deleteProduct,
    toggleProductListing
};