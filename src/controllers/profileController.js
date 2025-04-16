const User = require('../models/userModel');

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

module.exports = {
    loadAccount,
    loadEditAccount,
    updateAccount
};