const User = require('../models/userModel');
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

const logout = (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
}

module.exports = {
    loadLogin,
    verifyLogin,
    loadChangePassword,
    updatePassword,
    logout
};