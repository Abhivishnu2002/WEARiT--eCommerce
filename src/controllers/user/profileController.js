const User = require('../../models/userModel');
const Address = require('../../models/addressModel');
const Order = require('../../models/orderModel');
const bcrypt = require('bcrypt');

const loadProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const addresses = await Address.find({ user: req.user._id });
    const orders = await Order.find({ user: req.user._id })
      .populate('products.product')
      .sort({ orderDate: -1 })
      .limit(5);
    
    res.render('pages/profile', { user, addresses, orders });
  } catch (error) {
    console.error('Load profile error:', error);
    req.flash('error_msg', 'Failed to load profile');
    res.redirect('/');
  }
};

const loadEditProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.render('pages/edit-profile', { user });
  } catch (error) {
    console.error('Load edit profile error:', error);
    req.flash('error_msg', 'Failed to load edit profile');
    res.redirect('/profile');
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, mobile } = req.body;
    
    await User.findByIdAndUpdate(req.user._id, { name, mobile });
    
    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error('Update profile error:', error);
    req.flash('error_msg', 'Failed to update profile');
    res.redirect('/profile/edit');
  }
};

const updateEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (existingUser) {
      req.flash('error_msg', 'Email already in use by another account');
      return res.redirect('/profile/edit');
    }

    const user = await User.findById(req.user._id);
    const otp = user.generateOTP();
    user.tempEmail = email;
    await user.save();

    req.session.emailUpdatePending = true;
    req.flash('info_msg', 'An OTP has been sent to your new email for verification');
    res.redirect('/profile/verify-email');
  } catch (error) {
    console.error('Update email error:', error);
    req.flash('error_msg', 'Failed to update email');
    res.redirect('/profile/edit');
  }
};

const loadVerifyEmail = async (req, res) => {
  if (!req.session.emailUpdatePending) {
    return res.redirect('/profile');
  }
  
  res.render('pages/verify-email');
};

const verifyEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user.verifyOTP(otp)) {
      req.flash('error_msg', 'Invalid or expired OTP');
      return res.redirect('/profile/verify-email');
    }

    user.email = user.tempEmail;
    user.tempEmail = undefined;
    user.otp = undefined;
    await user.save();
    
    req.session.emailUpdatePending = false;
    req.flash('success_msg', 'Email updated successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error('Verify email OTP error:', error);
    req.flash('error_msg', 'Failed to verify email');
    res.redirect('/profile/verify-email');
  }
};

const loadChangePassword = async (req, res) => {
  res.render('pages/change-password');
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user._id);
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/profile/change-password');
    }
    
    if (newPassword !== confirmPassword) {
      req.flash('error_msg', 'New passwords do not match');
      return res.redirect('/profile/change-password');
    }
    
    const passwordCheck = User.validatePasswordComplexity(newPassword);
    if (!passwordCheck.isValid) {
      req.flash('error_msg', passwordCheck.message);
      return res.redirect('/profile/change-password');
    }

    user.password = newPassword;
    await user.save();
    
    req.flash('success_msg', 'Password updated successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error('Update password error:', error);
    req.flash('error_msg', 'Failed to update password');
    res.redirect('/profile/change-password');
  }
};

module.exports = {
  loadProfile,
  loadEditProfile,
  updateProfile,
  updateEmail,
  loadVerifyEmail,
  verifyEmailOtp,
  loadChangePassword,
  updatePassword
};