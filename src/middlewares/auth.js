const User = require('../models/userModel');

// Ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this resource');
    res.redirect('/login');
};

// Ensure user is NOT authenticated (for login/register pages)
const forwardAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
};

// Check if admin is logged in
const isAdminLoggedIn = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        req.flash('error_msg', 'Please log in to access this page');
        res.redirect('/admin/login');
    }
};

// Check if admin is logged out
const isAdminLoggedOut = (req, res, next) => {
    if (!req.session.admin) {
        next();
    } else {
        res.redirect('/admin/dashboard');
    }
};

// Verify admin session and pass admin data to views
const verifyAdminSession = (req, res, next) => {
    if (req.session.admin) {
        // Pass admin data to all views
        res.locals.admin = {
            id: req.session.admin.id,
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage || 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WEARiT-CzWLpMp95jvKXjnFM6cS4gWAWSGCH2.png'
        };
        next();
    } else {
        req.flash('error_msg', 'Please log in to access this page');
        res.redirect('/admin/login');
    }
};

module.exports = {ensureAuthenticated, forwardAuthenticated, isAdminLoggedIn, isAdminLoggedOut, verifyAdminSession};