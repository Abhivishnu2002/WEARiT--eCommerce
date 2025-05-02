const express = require("express")
const router = express.Router()
const passport = require("passport")
const authController = require("../controllers/user/authController")
const productController = require("../controllers/user/productController")
const pageController = require("../controllers/user/pageController")
const cartController = require("../controllers/user/cartController")
const wishlistController = require("../controllers/user/wishlistController")
const profileController = require("../controllers/user/profileController")
const addressController = require("../controllers/user/addressController")
const checkoutController = require("../controllers/user/checkoutController")
const orderController = require('../controllers/user/orderController')
const walletController = require('../controllers/user/walletController');
const { forwardAuthenticated, ensureAuthenticated } = require("../middlewares/auth")

router.get("/", authController.loadHome)
router.get("/about", pageController.loadAbout)
router.get("/contact", pageController.loadContact)
router.get("/products", productController.getAllProducts)
router.get("/products/:id", productController.getProductDetails)

router.get("/login", forwardAuthenticated, authController.loadLogin)
router.post("/login", forwardAuthenticated, authController.loginUser)
router.get("/signup", forwardAuthenticated, authController.loadSignup)
router.post("/signup", forwardAuthenticated, authController.registerUser)
router.get("/referral", forwardAuthenticated, pageController.loadReferralCode)
router.get("/otp", authController.loadOtp)
router.post("/verifyotp", authController.verifyOtp)
router.post("/resendotp", authController.resendOtp)
router.get("/forgetpassword", forwardAuthenticated, authController.loadForgetPassword)
router.post("/forgetpassword", forwardAuthenticated, authController.forgetPassword)
router.get("/newpassword", forwardAuthenticated, authController.loadNewPassword)
router.post("/resetpassword", forwardAuthenticated, authController.resetPassword)
router.get("/logout", authController.logout)

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }))
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    res.redirect("/")
  },
)

router.get("/cart", ensureAuthenticated, cartController.loadCart)
router.post("/cart/add", ensureAuthenticated, cartController.addToCart)
router.post("/cart/update", ensureAuthenticated, cartController.updateCartQuantity)
router.post("/cart/remove", ensureAuthenticated, cartController.removeFromCart)

router.get("/wishlist", ensureAuthenticated, wishlistController.loadWishlist)
router.post("/wishlist/add", ensureAuthenticated, wishlistController.addToWishlist)
router.post("/wishlist/remove", ensureAuthenticated, wishlistController.removeFromWishlist)

router.get("/profile", ensureAuthenticated, profileController.loadProfile)
router.get("/profile/edit", ensureAuthenticated, profileController.loadEditProfile)
router.post("/profile/update", ensureAuthenticated, profileController.updateProfile)
router.post("/profile/update-email", ensureAuthenticated, profileController.updateEmail)
router.get("/profile/verify-email", ensureAuthenticated, profileController.loadVerifyEmail)
router.post("/profile/verify-email", ensureAuthenticated, profileController.verifyEmailOtp)
router.get("/profile/resend-otp", ensureAuthenticated, profileController.resendOtp)
router.get("/profile/change-password", ensureAuthenticated, profileController.loadChangePassword)
router.post("/profile/change-password", ensureAuthenticated, profileController.updatePassword)

router.get("/profile/addresses", ensureAuthenticated, addressController.loadAddresses)
router.get("/profile/addresses/add", ensureAuthenticated, addressController.loadAddAddress)
router.post("/profile/addresses/add", ensureAuthenticated, addressController.addAddress)
router.get("/profile/addresses/edit/:id", ensureAuthenticated, addressController.loadEditAddress)
router.post("/profile/addresses/edit/:id", ensureAuthenticated, addressController.updateAddress)
router.delete("/profile/addresses/delete/:id", ensureAuthenticated, addressController.deleteAddress)
router.get("/profile/addresses/set-default/:id", ensureAuthenticated, addressController.setDefaultAddress)

router.get("/checkout", ensureAuthenticated, checkoutController.loadCheckout)
router.get("/payment", ensureAuthenticated, checkoutController.loadPayment)
router.post("/place-order", ensureAuthenticated, checkoutController.placeOrder)
router.get("/order-success/:id", ensureAuthenticated, checkoutController.orderSuccess)

router.get("/profile/orders", ensureAuthenticated, orderController.getOrdersPage)
router.get("/orders", ensureAuthenticated, orderController.getOrdersPage)
router.get("/orders/details/:id", ensureAuthenticated, orderController.getOrderDetails)
router.get("/orders/invoice/:id", ensureAuthenticated, orderController.getOrderInvoice)
router.post("/orders/cancel/:id", ensureAuthenticated, orderController.cancelOrder)
router.post("/orders/return/:id", ensureAuthenticated, orderController.returnOrder)
router.get("/orders/:id/track", ensureAuthenticated, orderController.trackOrder)
router.post("/orders/reorder/:id", ensureAuthenticated, orderController.reorder)
router.post("/orders/cancel-product/:orderId/:productId", ensureAuthenticated, orderController.cancelProduct)
router.get("/orders/search", ensureAuthenticated, orderController.searchOrders)

router.get('/wallet', ensureAuthenticated, walletController.getWalletPage);
router.post('/wallet/add-money', ensureAuthenticated, walletController.addMoney);
router.post('/wallet/use-balance', ensureAuthenticated, walletController.useWalletBalance);

router.get("/404", pageController.loadError)

module.exports = router