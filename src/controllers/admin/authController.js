const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');


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

        const admin = await User.findOne({ email }).select('+password');

        if (!admin) {
            req.flash('error_msg', 'Invalid email or password');
            return res.render("admin/pages/adminLogin", { error_msg: 'Invalid email or password' });
        }

        if (!admin.isAdmin) {
            req.flash('error_msg', 'You do not have admin privileges');
            return res.render('admin/pages/adminLogin', { error_msg: 'You do not have admin privileges' });
        }

        const isPasswordMatch = await admin.comparePassword(password);
        if (!isPasswordMatch) {
            req.flash('error_msg', 'Invalid email or password');
            return res.render("admin/pages/adminLogin", { error_msg: 'Invalid email or password' });
        }

        req.session.admin = {
            id: admin._id,
            name: admin.name,
            email: admin.email,
        };

        req.session.save(err => {
            if (err) {
                console.error("Session save error:", err);
                req.flash('error_msg', 'Server error');
                return res.status(500).render("admin/pages/adminLogin", { error_msg: "Server error" });
            }
            return res.redirect('/admin/dashboard');
        });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render("admin/pages/adminLogin", { error_msg: "Server error" });
    }
}

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

const loadAccount = async (req, res) => {
    try {
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
            mobile: phone 
        }, { new: true });

        if (!admin) {
            req.flash('error_msg', 'Admin not found');
            return res.redirect('/admin/login');
        }


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

const loadDashboard = async (req, res) => {
    try {
        const userCount = await User.countDocuments({isAdmin: false});
        const productCount = await Product.countDocuments();
        const categoryCount = await Category.countDocuments();
        const recentUsers = await User.find({isAdmin: false}).sort({ createdAt:-1 }).limit(5);
        
     
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
    delete req.session.admin;
    req.session.save(err => {
        if (err) {
            console.error("Session save error during logout:", err);
        }
        res.redirect('/admin/login');
    });
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
}