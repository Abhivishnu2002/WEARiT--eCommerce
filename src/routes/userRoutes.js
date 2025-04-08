const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get("/", userController.loadHome);
router.get("/login", userController.loadLogin);
router.get("/signup", userController.loadSignup);
router.get("/forgetpassword", userController.loadForgetPassword);
router.get("/newpassword", userController.loadNewPassword);
router.get("/referral", userController.loadrReferralCode);
router.get("/contact", userController.loadContact);
router.get("/about", userController.loadAbout);
router.get("/products", userController.loadProducts);
router.get("/wishlist", userController.loadWishlist);
router.get("/cart", userController.loadCart);
router.get("/error", userController.loadError);
router.get("/otp", userController.loadOtp);
module.exports = router;