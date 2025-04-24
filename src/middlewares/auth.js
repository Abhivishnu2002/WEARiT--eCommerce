const User = require('../models/userModel');

const checkUserStatus = async (req, res, next) => {
    if (req.originalUrl.startsWith('/admin')) {
        return next();
    }

    if (!req.isAuthenticated() || !req.user) {
        return next();
    }
    
    try {
        const freshUserData = await User.findById(req.user._id);
        
        if (freshUserData && freshUserData.isBlocked) {
            req.flash('error_msg', 'Your account has been blocked. Please contact support for assistance.');
            
            return req.logout((err) => {
                if (err) {
                    console.error('Logout error:', err);
                    return next(err);
                }
                req.session.save(err => {
                    if (err) {
                        console.error('Session save error during logout:', err);
                    }
                    return res.redirect('/login');
                });
            });
        } else {
            return next();
        }
    } catch (error) {
        console.error('Error checking user status:', error);
        return next(error);
    }
}

const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this resource');
    res.redirect('/login');
};

const forwardAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
};

const isAdminLoggedIn = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        req.flash('error_msg', 'Please log in to access this page');
        res.redirect('/admin/login');
    }
};

const isAdminLoggedOut = (req, res, next) => {
    if (!req.session.admin) {
        next();
    } else {
        res.redirect('/admin/dashboard');
    }
};

const verifyAdminSession = (req, res, next) => {
    if (req.session.admin) {
        res.locals.admin = {
            id: req.session.admin.id,
            name: req.session.admin.name,
            email: req.session.admin.email,
        };
        next();
    } else {
        req.flash('error_msg', 'Please log in to access this page');
        res.redirect('/admin/login');
    }
};

module.exports = {checkUserStatus, ensureAuthenticated, forwardAuthenticated, isAdminLoggedIn, isAdminLoggedOut, verifyAdminSession};