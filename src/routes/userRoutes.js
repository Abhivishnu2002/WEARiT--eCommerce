const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../controllers/userController');
const {forwardAuthenticated, ensureAuthenticated} = require('../middlewares/auth');

router.get('/', userController.loadHome);
router.get('/login', forwardAuthenticated, userController.loadLogin);
router.post('/login', forwardAuthenticated, userController.loginUser);
router.get('/signup', forwardAuthenticated, userController.loadSignup);
router.post('/signup', forwardAuthenticated, userController.registerUser);
router.get('/otp', userController.loadOtp);
router.post('/verifyotp', userController.verifyOtp);
router.post('/resendotp', userController.resendOtp);
router.get('/forgetpassword', forwardAuthenticated, userController.loadForgetPassword);
router.post('/forgetpassword', forwardAuthenticated, userController.forgetPassword);
router.get('/newpassword', forwardAuthenticated, userController.loadNewPassword);
router.post('/resetpassword', forwardAuthenticated, userController.resetPassword);
router.get('/logout', userController.logout);

// Protected routes
// router.get('/account', ensureAuthenticated, userController.loadAccount);
// router.get('/wishlist', ensureAuthenticated, userController.loadWishlist);
// router.get('/cart', ensureAuthenticated, userController.loadCart);

// Other routes
router.get('/about', userController.loadAbout);
router.get('/contact', userController.loadContact);

router.get('/google', passport.authenticate('google', {scope: ['profile', 'email']}));
router.get('/google/callback', passport.authenticate('google', {failureRedirect: '/login', failureFlash: true}), (req, res)=>{
    res.redirect('/');
});

router.get("/logout", userController.logout);

module.exports = router;