const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../controllers/userController');

router.get("/", userController.loadHome);
router.get("/login", userController.loadLogin);
router.post("/login", userController.loginUser)
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.registerUser);
router.get("/forgetpassword", userController.loadForgetPassword);
router.post("/forgetpassword", userController.forgetPassword);
router.get("/newpassword", userController.loadNewPassword);
router.post("/newpassword", userController.resetPassword);
router.get("/referral", userController.loadrReferralCode);
router.get("/contact", userController.loadContact);
router.get("/about", userController.loadAbout);
router.get("/wishlist", userController.loadWishlist);
router.get("/cart", userController.loadCart);
router.get("/error", userController.loadError);
router.get("/otp", userController.loadOtp);
router.post('/otp', userController.verifyOtp);
router.post('/otp', userController.resendOtp);

router.get('/google', passport.authenticate('google', {scope: ['profile', 'email']}));
router.get('/google/callback', passport.authenticate('google', {failureRedirect: '/login', failureFlash: true}), 
(req, res)=>{
    res.redirect('/');
}
);

router.get("/logout", userController.logout);

module.exports = router;