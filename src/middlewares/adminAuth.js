/**
 * Checks if admin is logged in
 * If not logged in, redirects to admin login page with an error message
 */
const isAdminLoggedIn = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        req.flash('error_msg', 'Please log in to access this page');
        res.redirect('/admin/login');
    }
};

/**
 * Checks if admin is logged out
 * If already logged in, redirects to admin dashboard
 */
const isAdminLoggedOut = (req, res, next) => {
    if (!req.session.admin) {
        next();
    } else {
        res.redirect('/admin/dashboard');
    }
};

/**
 * Verifies admin session and passes admin data to views
 * If not logged in, redirects to admin login page with an error message
 */
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

module.exports = {
    isAdminLoggedIn,
    isAdminLoggedOut,
    verifyAdminSession
};