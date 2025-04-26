const Address = require('../../models/addressModel');

const loadAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id });
    res.render('pages/addresses', { addresses });
  } catch (error) {
    console.error('Load addresses error:', error);
    req.flash('error_msg', 'Failed to load addresses');
    res.redirect('/profile');
  }
};

const loadAddAddress = async (req, res) => {
  res.render('pages/add-address', { returnTo: req.query.returnTo || 'addresses' });
};

const addAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, address, city, state, isDefault } = req.body;
    const returnTo = req.query.returnTo || 'addresses';
    if (isDefault === 'true') {
      await Address.updateMany(
        { user: req.user._id },
        { $set: { isDefault: false } }
      );
    }

    await Address.create({
      user: req.user._id,
      name,
      mobile,
      pincode,
      address,
      city,
      state,
      isDefault: isDefault === 'true'
    });
    
    req.flash('success_msg', 'Address added successfully');
    if (returnTo === 'checkout') {
      res.redirect('/checkout');
    } else {
      res.redirect('/profile/addresses');
    }
  } catch (error) {
    console.error('Add address error:', error);
    req.flash('error_msg', 'Failed to add address');
    res.redirect('/profile/addresses/add');
  }
};

const loadEditAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!address) {
      req.flash('error_msg', 'Address not found');
      return res.redirect('/profile/addresses');
    }
    
    res.render('pages/edit-address', { address, returnTo: req.query.returnTo || 'addresses' });
  } catch (error) {
    console.error('Load edit address error:', error);
    req.flash('error_msg', 'Failed to load address');
    res.redirect('/profile/addresses');
  }
};

const updateAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, address, city, state, isDefault } = req.body;
    const returnTo = req.query.returnTo || 'addresses';
    const addressDoc = await Address.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!addressDoc) {
      req.flash('error_msg', 'Address not found');
      return res.redirect('/profile/addresses');
    }

    if (isDefault === 'true') {
      await Address.updateMany(
        { user: req.user._id },
        { $set: { isDefault: false } }
      );
    }

    await Address.findByIdAndUpdate(req.params.id, {
      name,
      mobile,
      pincode,
      address,
      city,
      state,
      isDefault: isDefault === 'true'
    });
    
    req.flash('success_msg', 'Address updated successfully');
    if (returnTo === 'checkout') {
      res.redirect('/checkout');
    } else {
      res.redirect('/profile/addresses');
    }
  } catch (error) {
    console.error('Update address error:', error);
    req.flash('error_msg', 'Failed to update address');
    res.redirect(`/profile/addresses/edit/${req.params.id}`);
  }
};

const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    await Address.findByIdAndDelete(req.params.id);
    
    return res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    await Address.updateMany(
      { user: req.user._id },
      { $set: { isDefault: false } }
    );

    await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isDefault: true } }
    );
    
    req.flash('success_msg', 'Default address updated');
    res.redirect('/profile/addresses');
  } catch (error) {
    console.error('Set default address error:', error);
    req.flash('error_msg', 'Failed to update default address');
    res.redirect('/profile/addresses');
  }
};

module.exports = {
  loadAddresses,
  loadAddAddress,
  addAddress,
  loadEditAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};