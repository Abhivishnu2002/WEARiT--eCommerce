const User = require('../models/userModel');

/**
 * Ensures that the user is authenticated before accessing a route
 * If not authenticated, redirects to login page with an error message
 */
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to view this resource');
    res.redirect('/login');
};

/**
 * Ensures that the user is NOT authenticated (for login/register pages)
 * If already authenticated, redirects to home page
 */
const forwardAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
};

module.exports = {
    ensureAuthenticated,
    forwardAuthenticated
};