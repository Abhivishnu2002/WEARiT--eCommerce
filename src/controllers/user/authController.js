const User = require("../../models/userModel")
const Category = require("../../models/categoryModel")
const Product = require("../../models/productModel")
const passport = require("passport")
const { sendOTPEmail, sendPasswordResetEmail } = require("../../utils/emailService")

const loadHome = async (req, res) => {
  try {
    const newArrivals = await Product.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate("categoryId")
      .lean()

    const premiumCategory = await Category.findOne({
      name: { $regex: "premium", $options: "i" },
      isListed: true,
    })

    let premiumProducts = []
    if (premiumCategory) {
      premiumProducts = await Product.find({
        isActive: true,
        categoryId: premiumCategory._id,
      })
        .limit(4)
        .populate("categoryId")
        .lean()
    }

    if (premiumProducts.length === 0) {
      premiumProducts = await Product.find({ isActive: true })
        .sort({ "variants.0.varientPrice": -1 })
        .limit(4)
        .populate("categoryId")
        .lean()
    }

    res.render("pages/home", {
      newArrivals,
      premiumProducts,
      user: req.user || null,
    })
  } catch (error) {
    console.error("Home page error:", error)
    res.render("pages/home", {
      newArrivals: [],
      premiumProducts: [],
      user: req.user || null,
      error_msg: "Failed to load products",
    })
  }
}

const loadLogin = (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/")
  }
  let messages = {
    success_msg: [],
    error_msg: [],
    error: [],
  }

  try {
    if (req.flash) {
      messages = {
        success_msg: req.flash("success_msg") || [],
        error_msg: req.flash("error_msg") || [],
        error: req.flash("error") || [],
      }
    }
  } catch (error) {
    console.error("Flash message error:", error)
  }
  const logoutSuccess = req.query.logout === "success"

  res.render("pages/login", {
    messages,
    formData: {}, 
    validationErrors: {}, 
    logoutSuccess, 
  })
}

const validateLoginInput = (email, password) => {
  const errors = {}
  if (!email || email.trim() === "") {
    errors.email = "Email is required"
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid email address"
    }
  }
  if (!password || password.trim() === "") {
    errors.password = "Password is required"
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters long"
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

const loginUser = async (req, res, next) => {
  try {
    const email = req.body?.email || ""
    const password = req.body?.password || ""
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)
    const validation = validateLoginInput(email, password)
    if (!validation.isValid) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        })
      }

      return res.render("pages/login", {
        messages: { error_msg: ["Please fix the validation errors"], success_msg: [], error: [] },
        formData: { email: email || "" },
        validationErrors: validation.errors,
        logoutSuccess: false,
      })
    }
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err)
        if (isAjax) {
          return res.status(500).json({
            success: false,
            message: "Server error occurred. Please try again.",
          })
        }
        try {
          if (req.flash) {
            req.flash("error_msg", "Server error occurred. Please try again.")
          }
        } catch (flashError) {
          console.error("Flash error:", flashError)
        }
        return res.redirect("/login")
      }

      if (!user) {
        const errorMessage = info?.message || "Invalid email or password"
        if (isAjax) {
          return res.status(401).json({
            success: false,
            message: errorMessage,
          })
        }

        return res.render("pages/login", {
          messages: { error_msg: [errorMessage], success_msg: [], error: [] },
          formData: { email: email || "" },
          validationErrors: {},
          logoutSuccess: false,
        })
      }
      if (user.isBlocked) {
        const errorMessage = "Your account is blocked, please contact for support"
        if (isAjax) {
          return res.status(401).json({
            success: false,
            message: errorMessage,
          })
        }

        return res.render("pages/login", {
          messages: { error_msg: [errorMessage], success_msg: [], error: [] },
          formData: { email: email || "" },
          validationErrors: {},
          logoutSuccess: false,
        })
      }
      if (!user.isVerified) {
        const errorMessage = "Please verify your email before logging in"
        if (isAjax) {
          return res.status(401).json({
            success: false,
            message: errorMessage,
            redirectUrl: "/otp",
          })
        }
        if (req.session) {
          req.session.userRegistration = {
            tempEmail: user.email,
            tempUser: user,
          }
        }

        try {
          if (req.flash) {
            req.flash("error_msg", errorMessage)
          }
        } catch (flashError) {
          console.error("Flash error:", flashError)
        }
        return res.redirect("/otp")
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error("Login session error:", err)
          if (isAjax) {
            return res.status(500).json({
              success: false,
              message: "Login failed. Please try again.",
            })
          }

          try {
            if (req.flash) {
              req.flash("error_msg", "Login failed. Please try again.")
            }
          } catch (flashError) {
            console.error("Flash error:", flashError)
          }
          return res.redirect("/login")
        }

        if (req.session) {
          req.session.userId = user._id
        }

        const returnTo = (req.session && req.session.returnTo) || "/"
        if (req.session && req.session.returnTo) {
          delete req.session.returnTo
        }

        if (isAjax) {
          return res.json({
            success: true,
            message: "Login successful!",
            redirectUrl: returnTo,
            user: {
              name: user.name,
              email: user.email,
            },
          })
        }

        try {
          if (req.flash) {
            req.flash("success_msg", "Welcome back! You are now logged in.")
          }
        } catch (flashError) {
          console.error("Flash error:", flashError)
        }
        return res.redirect(returnTo)
      })
    })(req, res, next)
  } catch (error) {
    console.error("Login controller error:", error)
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)

    if (isAjax) {
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred. Please try again.",
      })
    }

    try {
      if (req.flash) {
        req.flash("error_msg", "An unexpected error occurred. Please try again.")
      }
    } catch (flashError) {
      console.error("Flash error:", flashError)
    }
    return res.redirect("/login")
  }
}

const loadSignup = (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/")
  }
  const referralCode = req.query.ref || (req.session && req.session.validReferralCode) || ""
  let messages = {
    success_msg: [],
    error_msg: [],
    error: [],
  }

  try {
    if (req.flash) {
      messages = {
        success_msg: req.flash("success_msg") || [],
        error_msg: req.flash("error_msg") || [],
        error: req.flash("error") || [],
      }
    }
  } catch (error) {
    console.error("Flash message error:", error)
  }

  res.render("pages/signup", {
    referralCode,
    user: null,
    messages,
    formData: {},
  })
}

const validateSignupInput = (name, email, mobile, password, confirmPassword) => {
  const errors = {}
  if (!name || name.trim() === "") {
    errors.name = "Name is required"
  } else if (name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters long"
  } else if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
    errors.name = "Name can only contain letters and spaces"
  }
  if (!email || email.trim() === "") {
    errors.email = "Email is required"
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid email address"
    }
  }
  if (!mobile || mobile.trim() === "") {
    errors.mobile = "Mobile number is required"
  } else {
    const mobileRegex = /^[6-9]\d{9}$/
    if (!mobileRegex.test(mobile.trim())) {
      errors.mobile = "Please enter a valid 10-digit mobile number"
    }
  }
  if (!password || password.trim() === "") {
    errors.password = "Password is required"
  } else {
    const passwordValidation = User.validatePasswordComplexity(password)
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message
    }
  }
  if (!confirmPassword || confirmPassword.trim() === "") {
    errors.confirmPassword = "Please confirm your password"
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match"
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, password, confirmPassword, referralCode } = req.body || {}
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)

    const validation = validateSignupInput(name, email, mobile, password, confirmPassword)

    if (!validation.isValid) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
          debug: {
            timestamp: new Date().toISOString(),
            step: "input_validation",
            receivedFields: Object.keys(req.body || {}),
          },
        })
      }

      return res.render("pages/signup", {
        messages: { error_msg: ["Please fix the validation errors"], success_msg: [], error: [] },
        formData: { name, email, mobile, referralCode },
        validationErrors: validation.errors,
        referralCode,
      })
    }
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() })

    if (existingUser) {
      const errorMessage = "An account with this email already exists"

      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
          errors: { email: errorMessage },
          debug: {
            timestamp: new Date().toISOString(),
            step: "duplicate_check",
          },
        })
      }

      return res.render("pages/signup", {
        messages: { error_msg: [errorMessage], success_msg: [], error: [] },
        formData: { name, email, mobile, referralCode },
        validationErrors: { email: errorMessage },
        referralCode,
      })
    }

    if (referralCode && referralCode.trim() !== "") {
      const referrer = await User.findOne({ referralCode: referralCode.trim() })

      if (referrer && req.session) {
        req.session.validReferralCode = referralCode.trim()
        req.session.referrerId = referrer._id
      } else if (!referrer) {
        const errorMessage = "Invalid referral code"

        if (isAjax) {
          return res.status(400).json({
            success: false,
            message: errorMessage,
            errors: { referralCode: errorMessage },
            debug: {
              timestamp: new Date().toISOString(),
              step: "referral_validation",
            },
          })
        }

        return res.render("pages/signup", {
          messages: { error_msg: [errorMessage], success_msg: [], error: [] },
          formData: { name, email, mobile, referralCode },
          validationErrors: { referralCode: errorMessage },
          referralCode,
        })
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    if (req.session) {
      req.session.userRegistration = {
        tempUser: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          mobile: mobile.trim(),
          password,
          referralCode: req.session.validReferralCode || null,
          referrerId: req.session.referrerId || null,
        },
        tempOTP: otp,
        tempOTPExpiry: Date.now() + 10 * 60 * 1000,
        tempEmail: email.trim().toLowerCase(),
      }
    } else {
      console.error("Session not available")
      throw new Error("Session not available")
    }
    try {
      await sendOTPEmail(email.trim(), otp)
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError)

      if (isAjax) {
        return res.status(500).json({
          success: false,
          message: "Failed to send verification email. Please try again.",
          debug: {
            timestamp: new Date().toISOString(),
            step: "email_sending",
            error: emailError.message,
          },
        })
      }

      return res.render("pages/signup", {
        messages: { error_msg: ["Failed to send verification email. Please try again."], success_msg: [], error: [] },
        formData: { name, email, mobile, referralCode },
        validationErrors: {},
        referralCode,
      })
    }

    if (isAjax) {
      return res.json({
        success: true,
        message: "OTP sent successfully to your email",
        redirectUrl: "/otp",
        debug: {
          timestamp: new Date().toISOString(),
          step: "success",
        },
      })
    }

    try {
      if (req.flash) {
        req.flash("success_msg", "OTP sent successfully to your email")
      }
    } catch (flashError) {
    }
    res.redirect("/otp")
  } catch (error) {
    console.error("Registration Error: ", error)
    console.error("Error stack:", error.stack)

    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)

    if (isAjax) {
      return res.status(500).json({
        success: false,
        message: "Registration failed. Please try again.",
        debug: {
          timestamp: new Date().toISOString(),
          step: "server_error",
          error: error.message,
        },
      })
    }

    res.render("pages/signup", {
      messages: { error_msg: ["Registration failed. Please try again."], success_msg: [], error: [] },
      formData: req.body || {},
      validationErrors: {},
      referralCode: (req.body && req.body.referralCode) || "",
    })
  }
}

const loadOtp = (req, res) => {
  if (!req.session || !req.session.userRegistration || !req.session.userRegistration.tempEmail) {
    try {
      if (req.flash) {
        req.flash("error_msg", "Registration session expired. Please sign up again.")
      }
    } catch (flashError) {
      console.error("Flash error:", flashError)
    }
    return res.redirect("/signup")
  }

  let messages = {
    success_msg: [],
    error_msg: [],
    error: [],
  }

  try {
    if (req.flash) {
      messages = {
        success_msg: req.flash("success_msg") || [],
        error_msg: req.flash("error_msg") || [],
        error: req.flash("error") || [],
      }
    }
  } catch (error) {
    console.error("Flash message error:", error)
  }

  res.render("pages/otp", {
    email: req.session.userRegistration.tempEmail,
    messages,
    validationErrors: {},
  })
}

const validateOtpInput = (email, otp) => {
  const errors = {}

  if (!email || email.trim() === "") {
    errors.email = "Email is required"
  }

  if (!otp || otp.trim() === "") {
    errors.otp = "OTP is required"
  } else if (!/^\d{6}$/.test(otp.trim())) {
    errors.otp = "OTP must be a 6-digit number"
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body || {}
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)
    const validation = validateOtpInput(email, otp)
    if (!validation.isValid) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        })
      }

      return res.render("pages/otp", {
        email: email || "",
        messages: { error_msg: ["Please enter a valid OTP"], success_msg: [], error: [] },
        validationErrors: validation.errors,
      })
    }

    if (!req.session || !req.session.userRegistration) {
      const errorMessage = "Registration session expired. Please sign up again."
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
          redirectUrl: "/signup",
        })
      }

      try {
        if (req.flash) {
          req.flash("error_msg", errorMessage)
        }
      } catch (flashError) {
        console.error("Flash error:", flashError)
      }
      return res.redirect("/signup")
    }

    const userReg = req.session.userRegistration

    if (email.trim().toLowerCase() !== userReg.tempEmail) {
      const errorMessage = "Email mismatch. Please try again."
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
        })
      }

      return res.render("pages/otp", {
        email: userReg.tempEmail,
        messages: { error_msg: [errorMessage], success_msg: [], error: [] },
        validationErrors: {},
      })
    }

    const currentTime = new Date()
    if (otp.trim() !== userReg.tempOTP || currentTime > new Date(userReg.tempOTPExpiry)) {
      const errorMessage = "Invalid or expired OTP. Please try again."
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
        })
      }

      return res.render("pages/otp", {
        email: userReg.tempEmail,
        messages: { error_msg: [errorMessage], success_msg: [], error: [] },
        validationErrors: { otp: errorMessage },
      })
    }

    const userData = userReg.tempUser
    const { generateReferralCode } = require("../../utils/referralCodeGenerator")
    const newReferralCode = await generateReferralCode()
    const newUser = new User({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      mobile: userData.mobile,
      isVerified: true,
      isBlocked: false,
      referralCode: newReferralCode,
      referredBy: userData.referrerId || null,
    })
    await newUser.save()
    if (userData.referrerId) {
      const referrer = await User.findById(userData.referrerId)
      if (referrer) {
        if (!referrer.wallet) {
          referrer.wallet = { balance: 0, transactions: [] }
        }
        referrer.wallet.balance += 500
        referrer.wallet.transactions.push({
          amount: 500,
          type: "credit",
          description: `Referral bonus for user ${newUser.email}`,
          date: new Date(),
        })
        await referrer.save()
      }
    }
    if (req.session) {
      delete req.session.userRegistration
      delete req.session.validReferralCode
      delete req.session.referrerId
    }

    if (isAjax) {
      return res.json({
        success: true,
        message: "Email verified successfully! You can now log in.",
        redirectUrl: "/login",
      })
    }

    try {
      if (req.flash) {
        req.flash("success_msg", "Email verified successfully! You can now log in.")
      }
    } catch (flashError) {
      console.error("Flash error:", flashError)
    }
    res.redirect("/login")
  } catch (error) {
    console.error("OTP verification error:", error)
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)

    if (isAjax) {
      return res.status(500).json({
        success: false,
        message: "Verification failed. Please try again.",
      })
    }

    try {
      if (req.flash) {
        req.flash("error_msg", "Verification failed. Please try again.")
      }
    } catch (flashError) {
      console.error("Flash error:", flashError)
    }
    res.redirect("/otp")
  }
}

const resendOtp = async (req, res) => {
  try {
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)

    if (!req.session || !req.session.userRegistration) {
      const errorMessage = "Session expired. Please sign up again."
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
          redirectUrl: "/signup",
        })
      }

      try {
        if (req.flash) {
          req.flash("error_msg", errorMessage)
        }
      } catch (flashError) {
        console.error("Flash error:", flashError)
      }
      return res.redirect("/signup")
    }

    const email = req.session.userRegistration.tempEmail
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    req.session.userRegistration.tempOTP = otp
    req.session.userRegistration.tempOTPExpiry = otpExpiry

    await sendOTPEmail(email, otp)

    if (isAjax) {
      return res.json({
        success: true,
        message: "OTP resent successfully!",
      })
    }

    try {
      if (req.flash) {
        req.flash("success_msg", "OTP resent successfully!")
      }
    } catch (flashError) {
      console.error("Flash error:", flashError)
    }
    res.redirect("/otp")
  } catch (error) {
    console.error("Resend OTP error:", error)
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)

    if (isAjax) {
      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again.",
      })
    }

    try {
      if (req.flash) {
        req.flash("error_msg", "Failed to resend OTP. Please try again.")
      }
    } catch (flashError) {
      console.error("Flash error:", flashError)
    }
    res.redirect("/otp")
  }
}

const loadForgetPassword = (req, res) => {
  let messages = {
    success_msg: [],
    error_msg: [],
    error: [],
  }

  try {
    if (req.flash) {
      messages = {
        success_msg: req.flash("success_msg") || [],
        error_msg: req.flash("error_msg") || [],
        error: req.flash("error") || [],
      }
    }
  } catch (error) {
    console.error("Flash message error:", error)
  }

  res.render("pages/forgetPassword", {
    messages,
    formData: {},
    validationErrors: {},
  })
}

const validateForgetPasswordInput = (email) => {
  const errors = {}

  if (!email || email.trim() === "") {
    errors.email = "Email is required"
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid email address"
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body || {}
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)
    const validation = validateForgetPasswordInput(email)
    if (!validation.isValid) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        })
      }

      return res.render("pages/forgetPassword", {
        messages: { error_msg: ["Please enter a valid email address"], success_msg: [], error: [] },
        formData: { email: email || "" },
        validationErrors: validation.errors,
      })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
    if (!user) {
      const errorMessage = "No account found with this email address"
      if (isAjax) {
        return res.status(404).json({
          success: false,
          message: errorMessage,
          errors: { email: errorMessage },
        })
      }

      return res.render("pages/forgetPassword", {
        messages: { error_msg: [errorMessage], success_msg: [], error: [] },
        formData: { email },
        validationErrors: { email: errorMessage },
      })
    }

    const otp = user.generateOTP()
    await user.save()
    await sendPasswordResetEmail(email.trim(), otp)

    if (req.session) {
      req.session.resetEmail = email.trim().toLowerCase()
    }

    if (isAjax) {
      return res.json({
        success: true,
        message: "Password reset OTP sent to your email",
        redirectUrl: "/newpassword",
      })
    }

    try {
      if (req.flash) {
        req.flash("success_msg", "Password reset OTP sent to your email")
      }
    } catch (flashError) {
      console.error("Flash error:", flashError)
    }
    return res.redirect("/newpassword")
  } catch (error) {
    console.error("Forget Password Error:", error)
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)

    if (isAjax) {
      return res.status(500).json({
        success: false,
        message: "Failed to process request. Please try again.",
      })
    }

    try {
      if (req.flash) {
        req.flash("error_msg", "Failed to process request. Please try again.")
      }
    } catch (flashError) {
      console.error("Flash error:", flashError)
    }
    return res.redirect("/forgetpassword")
  }
}

const loadNewPassword = (req, res) => {
  if (!req.session || !req.session.resetEmail) {
    try {
      if (req.flash) {
        req.flash("error_msg", "Session expired. Please try again.")
      }
    } catch (flashError) {
      console.error("Flash error:", flashError)
    }
    return res.redirect("/forgetpassword")
  }

  let messages = {
    success_msg: [],
    error_msg: [],
    error: [],
  }

  try {
    if (req.flash) {
      messages = {
        success_msg: req.flash("success_msg") || [],
        error_msg: req.flash("error_msg") || [],
        error: req.flash("error") || [],
      }
    }
  } catch (error) {
    console.error("Flash message error:", error)
  }

  res.render("pages/newPassword", {
    messages,
    formData: {},
    validationErrors: {},
  })
}

const validateResetPasswordInput = (otp, newPassword, confirmPassword) => {
  const errors = {}

  if (!otp || otp.trim() === "") {
    errors.otp = "OTP is required"
  } else if (!/^\d{6}$/.test(otp.trim())) {
    errors.otp = "OTP must be a 6-digit number"
  }

  if (!newPassword || newPassword.trim() === "") {
    errors.newPassword = "New password is required"
  } else {
    const passwordValidation = User.validatePasswordComplexity(newPassword)
    if (!passwordValidation.isValid) {
      errors.newPassword = passwordValidation.message
    }
  }

  if (!confirmPassword || confirmPassword.trim() === "") {
    errors.confirmPassword = "Please confirm your new password"
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match"
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

const resetPassword = async (req, res) => {
  try {
    const { otp, newPassword, confirmPassword } = req.body || {}
    const email = req.session && req.session.resetEmail
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)

    if (!email) {
      const errorMessage = "Session expired. Please try again."
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
          redirectUrl: "/forgetpassword",
        })
      }

      try {
        if (req.flash) {
          req.flash("error_msg", errorMessage)
        }
      } catch (flashError) {
        console.error("Flash error:", flashError)
      }
      return res.redirect("/forgetpassword")
    }
    const validation = validateResetPasswordInput(otp, newPassword, confirmPassword)
    if (!validation.isValid) {
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        })
      }

      return res.render("pages/newPassword", {
        messages: { error_msg: ["Please fix the validation errors"], success_msg: [], error: [] },
        formData: { otp },
        validationErrors: validation.errors,
      })
    }

    const user = await User.findOne({ email })
    if (!user) {
      const errorMessage = "User not found"
      if (isAjax) {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        })
      }

      return res.render("pages/newPassword", {
        messages: { error_msg: [errorMessage], success_msg: [], error: [] },
        formData: { otp },
        validationErrors: {},
      })
    }

    if (!user.verifyOTP(otp.trim())) {
      const errorMessage = "Invalid or expired OTP"
      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: errorMessage,
          errors: { otp: errorMessage },
        })
      }

      return res.render("pages/newPassword", {
        messages: { error_msg: [errorMessage], success_msg: [], error: [] },
        formData: { otp },
        validationErrors: { otp: errorMessage },
      })
    }

    user.password = newPassword
    user.otp = undefined
    await user.save()

    if (req.session) {
      req.session.resetEmail = null
    }

    if (isAjax) {
      return res.json({
        success: true,
        message: "Password reset successful! You can now log in.",
        redirectUrl: "/login",
      })
    }

    try {
      if (req.flash) {
        req.flash("success_msg", "Password reset successful! You can now log in.")
      }
    } catch (flashError) {
      console.error("Flash error:", flashError)
    }
    res.redirect("/login")
  } catch (error) {
    console.error("Reset password error:", error)
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf("json") > -1)

    if (isAjax) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong. Please try again.",
      })
    }

    try {
      if (req.flash) {
        req.flash("error_msg", "Something went wrong. Please try again.")
      }
    } catch (flashError) {
      console.error("Flash error:", flashError)
    }
    res.redirect("/newpassword")
  }
}

const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err)
      return next(err)
    }
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err)
      }
      res.clearCookie("connect.sid")
      res.redirect("/login?logout=success")
    })
  })
}

module.exports = {
  loadHome,
  loadLogin,
  loginUser,
  verifyOtp,
  registerUser,
  loadNewPassword,
  loadForgetPassword,
  forgetPassword,
  resetPassword,
  resendOtp,
  loadOtp,
  loadSignup,
  logout,
}
