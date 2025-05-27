const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const Order = require('../../models/orderModel');

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

        const orderCount = await Order.aggregate([
            {
                $group: {
                    _id: "$user",
                    orderCount: { $sum: 1 }
                }, 
            }, {
                $project:{
                    _id: 0,
                    orderCount: 1
                }
            }
        ])
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage
        };
        
        res.render('admin/pages/adminCustomer', {
            admin,
            users,
            currentPage: page,
            limit,
            totalPages,
            orderCount,
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
        const returnTo = req.query.returnTo || 'list'; 
        const page = req.query.page || 1;
        const search = req.query.search || '';
        
        if (!user) {
            req.flash('error_msg', 'User not found');
            if (returnTo === 'details') {
                return res.redirect('/admin/customer');
            }
            return res.redirect(`/admin/customer?page=${page}${search ? `&search=${search}` : ''}`);
        }
        
        user.isBlocked = !user.isBlocked;
        await user.save();
        
        const message = user.isBlocked ? "User blocked successfully" : "User unblocked successfully";
        req.flash('success_msg', message);
        
        if (returnTo === 'details') {
            return res.redirect(`/admin/customerdetails/${userId}`);
        } else {
            return res.redirect(`/admin/customer?page=${page}${search ? `&search=${search}` : ''}`);
        }
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server Error');
        res.redirect('/admin/customer');
    }
};

const loadCustomerDetails = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/customer');
        }
        
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage,
        };
        
        res.render("admin/pages/adminCustomerDetails", { admin, user, orders:[1,2,3,4,5] });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.redirect('/admin/customer');
    }
}

module.exports = {
    loadCustomer,
    loadCustomerDetails,
    blockUnblockUser,
}