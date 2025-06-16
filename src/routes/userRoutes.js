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
const orderController = require("../controllers/user/orderController")
const walletController = require("../controllers/user/walletController")
const couponController = require("../controllers/user/couponController")
const paymentController = require("../controllers/user/paymentController")
const referralController = require("../controllers/user/referralController")
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
router.post("/cart/empty", ensureAuthenticated, cartController.emptyCart)
router.get("/cart/check-stock", ensureAuthenticated, cartController.checkStock)

router.get("/wishlist", ensureAuthenticated, wishlistController.loadWishlist)
router.post("/wishlist/add", ensureAuthenticated, wishlistController.addToWishlist)
router.post("/wishlist/remove", ensureAuthenticated, wishlistController.removeFromWishlist)
router.get("/wishlist/check", ensureAuthenticated, wishlistController.checkWishlistStatus)
router.post("/wishlist/empty", ensureAuthenticated, wishlistController.emptyWishlist)

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
router.get("/coupons", ensureAuthenticated, couponController.getUserCoupons)
router.get("/checkout/available-coupons", ensureAuthenticated, couponController.getAvailableCoupons)
router.post("/checkout/apply-coupon", ensureAuthenticated, couponController.applyCoupon)
router.post("/checkout/remove-coupon", ensureAuthenticated, couponController.removeCoupon)
router.get("/checkout/session-coupon", ensureAuthenticated, couponController.getSessionCoupon)
router.get("/payment", ensureAuthenticated, checkoutController.loadPayment)
router.post("/checkout/place-order", ensureAuthenticated, checkoutController.placeOrder)

// PayPal Payment Routes
router.post("/payment/paypal/create", ensureAuthenticated, paymentController.createPaypalPayment)
router.get("/payment/paypal/success", ensureAuthenticated, paymentController.executePaypalPayment)
router.get("/payment/paypal/cancel", ensureAuthenticated, paymentController.cancelPaypalPayment)

// Razorpay Payment Routes
router.post("/payment/razorpay/create", ensureAuthenticated, paymentController.createRazorpayOrder)
router.post("/payment/razorpay/verify", ensureAuthenticated, paymentController.verifyRazorpayPayment)
router.post("/payment/razorpay/failure", ensureAuthenticated, paymentController.handleRazorpayFailure)
router.get("/payment/razorpay/success", ensureAuthenticated, paymentController.razorpaySuccess)
router.get("/payment/razorpay/failure", ensureAuthenticated, paymentController.razorpayFailure)

router.get("/order-success/:id", ensureAuthenticated, orderController.orderSuccess)
router.get("/order-failure/:id", ensureAuthenticated, orderController.orderFailure)
router.post("/order/retry-payment/:id", ensureAuthenticated, paymentController.retryPayment)

router.get("/profile/orders", ensureAuthenticated, orderController.getOrdersPage)
router.get("/orders", ensureAuthenticated, orderController.getOrdersPage)
router.get("/orders/details/:id", ensureAuthenticated, orderController.getOrderDetails)
router.get("/orders/invoice/:id", ensureAuthenticated, orderController.getOrderInvoice)
router.post("/orders/cancel/:id", ensureAuthenticated, orderController.cancelOrder)
router.post("/orders/return/:id", ensureAuthenticated, orderController.returnOrder)
router.post("/orders/return-product/:orderId/:productId", ensureAuthenticated, orderController.returnProduct)
router.get("/orders/:id/track", ensureAuthenticated, orderController.trackOrder)
router.post("/orders/reorder/:id", ensureAuthenticated, orderController.reorderItems)
router.post("/orders/cancel-product/:orderId/:productId", ensureAuthenticated, orderController.cancelProduct)
router.get("/orders/search", ensureAuthenticated, orderController.searchOrders)

router.get("/wallet", ensureAuthenticated, walletController.getWalletPage)
router.post("/wallet/add-money", ensureAuthenticated, walletController.addMoney)
router.post("/wallet/use-balance", ensureAuthenticated, walletController.useWalletBalance)
router.post("/wallet/paypal/create", ensureAuthenticated, walletController.createPaypalOrder)
router.get("/wallet/paypal/success", ensureAuthenticated, walletController.executePaypalPayment)
router.get("/wallet/paypal/cancel", ensureAuthenticated, walletController.cancelPaypalPayment)

router.get("/referral", ensureAuthenticated, referralController.loadReferralPage)
router.get("/referral-entry", forwardAuthenticated, referralController.loadReferralCodeEntry)
router.post("/validate-referral", referralController.validateReferralCode)

router.get("/404", pageController.loadError)

module.exports = router
