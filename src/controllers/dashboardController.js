const User = require('../models/userModel');
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');

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

module.exports = {
    loadDashboard
};