const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/user/authController');
const productController = require('../controllers/user/productController');
const pageController = require('../controllers/user/pageController');
const {forwardAuthenticated, ensureAuthenticated} = require('../middlewares/auth');

router.get('/', authController.loadHome);
router.get('/login', forwardAuthenticated, authController.loadLogin);
router.post('/login', forwardAuthenticated, authController.loginUser);
router.get('/signup', forwardAuthenticated, authController.loadSignup);
router.post('/signup', forwardAuthenticated, authController.registerUser);
router.get('/otp', authController.loadOtp);
router.post('/verifyotp', authController.verifyOtp);
router.post('/resendotp', authController.resendOtp);
router.get('/forgetpassword', forwardAuthenticated, authController.loadForgetPassword);
router.post('/forgetpassword', forwardAuthenticated, authController.forgetPassword);
router.get('/newpassword', forwardAuthenticated, authController.loadNewPassword);
router.post('/resetpassword', forwardAuthenticated, authController.resetPassword);
router.get('/logout', authController.logout);


router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProductDetails);
router.get('/test', (req, res)=>{
    res.render('pages/product-details');
})


router.get('/about', pageController.loadAbout);
router.get('/contact', pageController.loadContact);


router.get('/google', passport.authenticate('google', {scope: ['profile', 'email']}));
router.get('/google/callback', 
    passport.authenticate('google', {
        failureRedirect: '/login', 
        failureFlash: true
    }), 
    (req, res) => {
        res.redirect('/');
    }
);

module.exports = router;