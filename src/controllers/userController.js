const User = require('../models/userModel');
const passport = require('passport');
const {sendOTPEmail, sendPasswordResetEmail} = require('../utils/emailService.js');

const otpStore = {};

const loadHome = (req, res) => {
    res.render("pages/home");
};

const loadLogin = (req, res) => {
    if(req.session.userId) {
        return res.redirect('/');
    }
    res.render("pages/login");
};

const loginUser = async (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
      })(req, res, next);
}

const loadSignup = (req, res) => {
    if(req.session.userId){
        return res.redirect('/')
    }
    res.render("pages/signup");
};

const registerUser = async (req, res)=>{
    try {
        const {name, email, mobile, password, confirmPassword} = req.body;

        if(!name || !email || !password || !confirmPassword){
            return res.render('pages/signup', {error: "All fields are required"});
        }

        if(password !== confirmPassword){
            return res.render('pages/signup', {error: 'Passwords do not match.'});
        }

        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.render('pages/signup', {error: "User already exists"});
        }

        const newUser = new User({
            name,
            email,
            password,
            mobile
          });
          
          const otp = newUser.generateOTP();
          
          await newUser.save();
          
          await sendOTPEmail(email, otp);
          req.flash('success_msg', 'Registration successful! Please verify your email with the OTP sent to your email.');
          res.redirect('/otp');
    } catch (error) {
        console.error('Registration Error: ', error);
        res.render('pages/signup',{
            error: 'An error occured during registration',
        });
    }
}

const loadOtp = (req, res) => {
    res.render("pages/otp");
};

const verifyOtp = async (req, res, next)=>{
    try {
        const { email, otp } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
          req.flash('error_msg', 'User not found');
          return res.redirect('/otp');
        }
        
        if (!user.verifyOTP(otp)) {
          req.flash('error_msg', 'Invalid or expired OTP');
          return res.redirect('/otp');
        }
        
        user.isVerified = true;
        user.isBlocked = false;
        user.otp = undefined;
        await user.save();
        
        req.flash('success_msg', 'Email verified successfully! You can now log in.');
        res.redirect('/login');
      } catch (error) {
        console.error('OTP verification error:', error);
        req.flash('error_msg', 'Verification failed. Please try again.');
        res.redirect('/otp');
      }
};

const resendOtp = async (req, res)=>{
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
          req.flash('error_msg', 'User not found');
          return res.redirect('/otp');
        }
 
        const otp = user.generateOTP();
        await user.save();
        
        await sendOTPEmail(email, otp);
        
        req.flash('success_msg', 'OTP resent successfully!');
        res.redirect('/otp');
      } catch (error) {
        console.error('Resend OTP error:', error);
        req.flash('error_msg', 'Failed to resend OTP. Please try again.');
        res.redirect('/otp');
      }
}

const loadForgetPassword = (req, res) => {
    res.render("pages/forgetPassword");
};

const forgetPassword = async(req, res, next)=>{
    try {
        const {email} = req.body;
        const user = await User.findOne({email});
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/forgetpassword');
          }
          const otp = user.generateOTP();
          await user.save();
          await sendPasswordResetEmail(email, otp);
          
          req.flash('success_msg', 'Password reset OTP sent to your email');
          res.redirect('/newpassword');
    } catch (error) {
        console.error('Forgot password error:', error);
        req.flash('error_msg', 'Failed to process request. Please try again.');
        res.redirect('/forgetpassword');
    }
}

const loadNewPassword = (req, res) => {
    res.render("pages/newPassword");
};

const resetPassword = async (req, res, next)=>{
    try {
        const {email, otp, newPassword, confirmPassword} = req.body;
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
          
          req.flash('success_msg', 'Password reset successfully! You can now log in with your new password.');
          res.redirect('/login');
    }catch(error){
        console.error('Reset password error:', error);
        req.flash('error_msg', 'Failed to reset password. Please try again.');
        res.redirect('/newpassword');
    }
}

const loadrReferralCode = (req, res) => {
    res.render("pages/referral");
};

const loadContact = (req, res) => {
    res.render("pages/contact");
};

const loadWishlist = (req, res) => {
    res.render("pages/wishlist");
};

const loadCart = (req, res) => {
    res.render("pages/cart");
};

const loadAbout = (req, res) => {
    res.render("pages/about");
};

const loadError = (req, res) => {
    res.render("errors/404");
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
    loadSignup,
    loadForgetPassword,
    loadrReferralCode,
    loadContact,
    loadCart,
    loadWishlist,
    loadAbout,
    loadError,
    loadOtp,
    loadNewPassword,
    loginUser,
    registerUser,
    verifyOtp,
    resendOtp,
    forgetPassword,
    resetPassword,
    logout
};
