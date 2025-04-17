const User = require("../models/userModel")
const bcrypt = require("bcrypt")
const { sendOTPEmail } = require("../utils/emailService")

const loadNewPassword = (req, res) => {
  res.render("pages/newPassword")
}

const resetPassword = async (req, res) => {
  try {
    const { otp, newPassword, confirmPassword } = req.body
    const email = req.session.resetEmail

    if (!email) {
      req.flash("error_msg", "Session expired. Please try again.")
      return res.redirect("/forgetpassword")
    }

    if (newPassword !== confirmPassword) {
      req.flash("error_msg", "Passwords do not match")
      return res.redirect("/newpassword")
    }

    const user = await User.findOne({ email })
    if (!user) {
      req.flash("error_msg", "User not found")
      return res.redirect("/newpassword")
    }

    if (!user.verifyOTP(otp)) {
      req.flash("error_msg", "Invalid or expired OTP")
      return res.redirect("/newpassword")
    }

    user.password = newPassword
    user.otp = undefined
    await user.save()

    req.session.resetEmail = null
    req.flash("success_msg", "Password reset successful! You can now log in.")
    res.redirect("/login")
  } catch (error) {
    console.error("Reset password error:", error)
    req.flash("error_msg", "Something went wrong. Try again.")
    res.redirect("/newpassword")
  }
}

const loadReferralCode = (req, res) => {
  res.render("pages/referral")
}

const loadContact = (req, res) => {
  res.render("pages/contact")
}

const loadWishlist = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      req.flash("error_msg", "Please login to view your wishlist")
      return res.redirect("/login")
    }

    // Get user's wishlist
    const user = await User.findById(req.session.user._id).populate("wishlist")

    res.render("pages/wishlist", {
      user: req.session.user,
      wishlist: user.wishlist || [],
    })
  } catch (error) {
    console.error("Wishlist error:", error)
    req.flash("error_msg", "Failed to load wishlist")
    res.redirect("/")
  }
}

const loadAbout = (req, res) => {
  res.render("pages/about")
}

const loadAccount = (req, res)=>{
  res.render('pages/account');
}

const loadError = (req, res) => {
  res.render("errors/404")
}

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      req.flash("error_msg", "User not found")
      return res.redirect("/otp")
    }

    if (!user.verifyOTP(otp)) {
      req.flash("error_msg", "Invalid or expired OTP")
      return res.redirect("/otp")
    }

    user.isVerified = true
    user.isBlocked = false
    user.otp = undefined
    await user.save()

    req.flash("success_msg", "Email verified successfully! You can now log in.")
    res.redirect("/login")
  } catch (error) {
    console.error("OTP verification error:", error)
    req.flash("error_msg", "Verification failed. Please try again.")
    res.redirect("/otp")
  }
}

const resendOtp = async (req, res) => {
  try {
    const email = req.session.tempEmail

    if (!email) {
      req.flash("error_msg", "Session expired. Please sign up again.")
      return res.redirect("/signup")
    }

    const user = await User.findOne({ email })
    if (!user) {
      req.flash("error_msg", "User not found")
      return res.redirect("/otp")
    }

    const otp = user.generateOTP()
    await user.save()
    await sendOTPEmail(email, otp)

    req.flash("success_msg", "OTP resent successfully!")
    res.redirect("/otp")
  } catch (error) {
    console.error("Resend OTP error:", error)
    req.flash("error_msg", "Failed to resend OTP. Please try again.")
    res.redirect("/otp")
  }
}

const loadForgetPassword = (req, res) => {
  res.render("pages/forgetPassword")
}

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      req.flash("error_msg", "User not found with this email")
      return res.redirect("/forgetpassword")
    }

    const otp = user.generateOTP()
    await user.save()

    // Store email in session for password reset flow
    req.session.resetEmail = email

    await sendOTPEmail(email, otp)

    req.flash("success_msg", "OTP sent to your email")
    res.redirect("/newpassword")
  } catch (error) {
    console.error("Forget password error:", error)
    req.flash("error_msg", "Failed to process request. Please try again.")
    res.redirect("/forgetpassword")
  }
}

const loadLogin = (req, res) => {
  // Check if user is already logged in
  if (req.session.user) {
    return res.redirect("/")
  }
  res.render("pages/login")
}

const loadHome = (req, res)=>{
  res.render('pages/home');
}

// Renamed from login to loginUser to match route
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      req.flash("error_msg", "User not found")
      return res.redirect("/login")
    }

    if (user.isBlocked) {
      req.flash("error_msg", "Your account has been blocked. Please contact support.")
      return res.redirect("/login")
    }

    if (!user.isVerified) {
      // Store email in session for OTP verification
      req.session.tempEmail = email
      req.flash("error_msg", "Please verify your email first")
      return res.redirect("/otp")
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      req.flash("error_msg", "Invalid password")
      return res.redirect("/login")
    }

    // Set user session
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    }

    if (user.isAdmin) {
      return res.redirect("/admin/dashboard")
    }

    res.redirect("/")
  } catch (error) {
    console.error("Login error:", error)
    req.flash("error_msg", "Login failed. Please try again.")
    res.redirect("/login")
  }
}

const loadSignup = (req, res) => {
  // Check if user is already logged in
  if (req.session.user) {
    return res.redirect("/")
  }
  res.render("pages/signup")
}

// Renamed from signup to registerUser to match route
const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, password, confirmPassword } = req.body

    if (password !== confirmPassword) {
      req.flash("error_msg", "Passwords do not match")
      return res.redirect("/signup")
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      req.flash("error_msg", "Email already registered")
      return res.redirect("/signup")
    }

    // Create new user
    const user = new User({
      name,
      email,
      mobile,
      password,
      isVerified: false,
    })

    // Generate referral code
    user.referralCode = `${name.substring(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`

    // Generate OTP
    const otp = user.generateOTP()

    await user.save()

    // Store email in session for OTP verification
    req.session.tempEmail = email

    // Send OTP email
    await sendOTPEmail(email, otp)

    req.flash("success_msg", "Registration successful! Please verify your email with the OTP sent.")
    res.redirect("/otp")
  } catch (error) {
    console.error("Signup error:", error)
    req.flash("error_msg", "Registration failed. Please try again.")
    res.redirect("/signup")
  }
}

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err)
      return res.redirect("/")
    }
    res.redirect("/login")
  })
}

const loadOtp = (req, res) => {
  if (!req.session.tempEmail) {
    req.flash("error_msg", "Session expired. Please sign up again.")
    return res.redirect("/signup")
  }
  res.render('pages/otp', { email: req.session.tempEmail });
}

module.exports = {
  loadNewPassword,
  resetPassword,
  loadReferralCode,
  loadContact,
  loadWishlist,
  loadHome,
  loadAbout,
  loadAccount,
  loadError,
  verifyOtp,
  resendOtp,
  loadForgetPassword,
  forgetPassword,
  loadLogin,
  loginUser,  // Changed from login to loginUser
  loadSignup,
  registerUser,  // Changed from signup to registerUser
  logout,
  loadOtp,
}