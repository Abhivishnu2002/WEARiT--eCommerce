const User = require('../../models/userModel');
const Category = require('../../models/categoryModel');
const Product = require('../../models/productModel');
const passport = require('passport');
const { sendOTPEmail, sendPasswordResetEmail } = require('../../utils/emailService');

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
    };

const loadLogin = (req, res) => {
    if(req.session.userId) {
        return res.redirect('/');
    }
    res.render("pages/login");
};

const loginUser = async (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Login error:", err)
      return next(err)
    }

    if (!user) {
      req.flash("error_msg", info.message || "Invalid email or password")
      return res.redirect("/login")
    }

    if (!user.isVerified) {
      req.flash("error_msg", "Please verify your email before logging in")
      return res.redirect("/otp")
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error("Login error:", err)
        return next(err)
      }

      req.session.userId = user._id
      req.flash("success_msg", "You are now logged in")
      const returnTo = req.session.returnTo || "/"
      delete req.session.returnTo

      return res.redirect(returnTo)
    })
  })(req, res, next)
}

const loadSignup = (req, res) => {
    if(req.session.userId){
        return res.redirect('/')
    }
    const referralCode = req.query.ref || req.session.validReferralCode || ""

  res.render("pages/signup", {
    referralCode,
    user: null,
  })
};

const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, password, confirmPassword, referralCode } = req.body

    if (!name || !email || !password || !confirmPassword) {
      return res.render("pages/signup", { error: "All fields are required" })
    }

    if (password !== confirmPassword) {
      return res.render("pages/signup", { error: "Passwords do not match." })
    }

    const passwordValidation = User.validatePasswordComplexity(password)
    if (!passwordValidation.isValid) {
      return res.render("pages/signup", { error: passwordValidation.message })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.render("pages/signup", { error: "User already exists" })
    }

    if (referralCode) {
      const referrer = await User.findOne({ referralCode })
      if (referrer) {
        req.session.validReferralCode = referralCode
        req.session.referrerId = referrer._id
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    req.session.userRegistration = {
      tempUser: {
        name,
        email,
        mobile,
        password,
        referralCode: req.session.validReferralCode || null,
        referrerId: req.session.referrerId || null,
      },
      tempOTP: otp,
      tempOTPExpiry: Date.now() + 10 * 60 * 1000,
      tempEmail: email,
    }

    req.session.save(async (err) => {
      if (err) {
        console.error("Session save error:", err)
        return res.render("pages/signup", {
          error: "An error occurred during registration",
        })
      }

      await sendOTPEmail(email, otp)
      req.flash("success_msg", "OTP sent successfully.")
      res.redirect("/otp")
    })
  } catch (error) {
    console.error("Registration Error: ", error)
    res.render("pages/signup", {
      error: "An error occurred during registration",
    })
  }
}

const loadOtp = (req, res) => {
  if (!req.session.userRegistration || !req.session.userRegistration.tempEmail) {
      req.flash('error_msg', 'Registration session expired. Please sign up again.');
      return res.redirect('/signup');
  }

  res.render("pages/otp", { email: req.session.userRegistration.tempEmail });
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body

    if (!req.session.userRegistration) {
      req.flash("error_msg", "Registration session expired. Please sign up again.")
      return res.redirect("/signup")
    }

    const userReg = req.session.userRegistration

    if (email !== userReg.tempEmail) {
      req.flash("error_msg", "Email mismatch. Please try again.")
      return res.redirect("/otp")
    }

    const currentTime = new Date()
    if (otp !== userReg.tempOTP || currentTime > new Date(userReg.tempOTPExpiry)) {
      req.flash("error_msg", "Invalid or expired OTP")
      return res.redirect("/otp")
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

    delete req.session.userRegistration
    delete req.session.validReferralCode
    delete req.session.referrerId

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err)
      }
      req.flash("success_msg", "Email verified successfully! You can now log in.")
      res.redirect("/login")
    })
  } catch (error) {
    console.error("OTP verification error:", error)
    req.flash("error_msg", "Verification failed. Please try again.")
    res.redirect("/otp")
  }
};

const resendOtp = async (req, res) => {
  try {
      if (!req.session.userRegistration) {
          req.flash('error_msg', 'Session expired. Please sign up again.');
          return res.redirect('/signup');
      }
      
      const email = req.session.userRegistration.tempEmail;

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 

      req.session.userRegistration.tempOTP = otp;
      req.session.userRegistration.tempOTPExpiry = otpExpiry;

      req.session.save(async (err) => {
          if (err) {
              console.error('Session save error:', err);
              req.flash('error_msg', 'Failed to resend OTP. Please try again.');
              return res.redirect('/otp');
          }
          
          await sendOTPEmail(email, otp);
          req.flash('success_msg', 'OTP resent successfully!');
          res.redirect('/otp');
      });
  } catch (error) {
      console.error('Resend OTP error:', error);
      req.flash('error_msg', 'Failed to resend OTP. Please try again.');
      res.redirect('/otp');
  }
};

const loadForgetPassword = (req, res) => {
    res.render("pages/forgetPassword");
};

const forgetPassword = async (req, res) => {
    try {
      const { email } = req.body;
  
      const user = await User.findOne({ email });
      if (!user) {
        req.flash('error_msg', 'User not found');
        return res.redirect('/forgetpassword');
      }
  
      const otp = user.generateOTP();
      await user.save();
      await sendPasswordResetEmail(email, otp);
  
      req.session.resetEmail = email;
  
      req.flash('success_msg', 'OTP sent to your email');
      return res.redirect('/newpassword');
    } catch (error) {
      console.error('Forget Password Error:', error);
      req.flash('error_msg', 'Failed to process request. Try again.');
      return res.redirect('/forgetpassword');
    }
  };
  

const loadNewPassword = (req, res) => {
    res.render("pages/newPassword");
};

const resetPassword = async (req, res) => {
    try {
      const { otp, newPassword, confirmPassword } = req.body;
      const email = req.session.resetEmail;
  
      if (!email) {
        req.flash('error_msg', 'Session expired. Please try again.');
        return res.redirect('/forgetpassword');
      }
  
      if (newPassword !== confirmPassword) {
        req.flash('error_msg', 'Passwords do not match');
        return res.redirect('/newpassword');
      }
  
      const user = await User.findOne({ email });
      if (!user) {
        req.flash('error_msg', 'User not found');
        return res.redirect('/newpassword');
      }
  
      if (!user.verifyOTP(otp)) {
        req.flash('error_msg', 'Invalid or expired OTP');
        return res.redirect('/newpassword');
      }
  
      user.password = newPassword;
      user.otp = undefined;
      await user.save();
  
      req.session.resetEmail = null;
      req.flash('success_msg', 'Password reset successful! You can now log in.');
      res.redirect('/login');
    } catch (error) {
      console.error('Reset password error:', error);
      req.flash('error_msg', 'Something went wrong. Try again.');
      res.redirect('/newpassword');
    }
  };

  const logout = (req, res, next)=>{
      req.logout(function(err){
          if(err){return next(err);}
          req.flash('success_msg', 'You are logged out');
          res.redirect('/login');
      });
  };


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
    logout
  }