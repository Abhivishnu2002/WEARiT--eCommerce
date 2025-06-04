const Address = require("../../models/addressModel")

const loadAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id })
    res.render("pages/addresses", { addresses })
  } catch (error) {
    console.error("Load addresses error:", error)
    req.flash("error_msg", "Failed to load addresses")
    res.redirect("/profile")
  }
}

const loadAddAddress = async (req, res) => {
  res.render("pages/add-address", {
    returnTo: req.query.returnTo || "addresses",
    errors: {},
    formData: {},
  })
}

const validateAddressData = (data) => {
  const errors = {}
  if (!data.name || !data.name.trim()) {
    errors.name = "Full name is required"
  } else if (data.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters long"
  } else if (data.name.trim().length > 50) {
    errors.name = "Name cannot exceed 50 characters"
  } else if (!/^[a-zA-Z\s]+$/.test(data.name.trim())) {
    errors.name = "Name can only contain letters and spaces"
  }
  if (!data.mobile || !data.mobile.trim()) {
    errors.mobile = "Mobile number is required"
  } else if (!/^[6-9]\d{9}$/.test(data.mobile.trim())) {
    errors.mobile = "Please enter a valid 10-digit mobile number starting with 6-9"
  }
  if (!data.pincode || !data.pincode.trim()) {
    errors.pincode = "PIN code is required"
  } else if (!/^[1-9][0-9]{5}$/.test(data.pincode.trim())) {
    errors.pincode = "Please enter a valid 6-digit PIN code"
  }
  if (!data.city || !data.city.trim()) {
    errors.city = "City is required"
  } else if (data.city.trim().length < 2) {
    errors.city = "City name must be at least 2 characters long"
  } else if (data.city.trim().length > 50) {
    errors.city = "City name cannot exceed 50 characters"
  } else if (!/^[a-zA-Z\s]+$/.test(data.city.trim())) {
    errors.city = "City name can only contain letters and spaces"
  }
  if (!data.address || !data.address.trim()) {
    errors.address = "Address is required"
  } else if (data.address.trim().length < 10) {
    errors.address = "Address must be at least 10 characters long"
  } else if (data.address.trim().length > 200) {
    errors.address = "Address cannot exceed 200 characters"
  }
  if (!data.state || !data.state.trim()) {
    errors.state = "Please select a state"
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

const addAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, address, city, state, isDefault } = req.body
    const returnTo = req.query.returnTo || "addresses"
    const validation = validateAddressData(req.body)

    if (!validation.isValid) {
      return res.render("pages/add-address", {
        returnTo,
        errors: validation.errors,
        formData: req.body,
      })
    }
    const existingAddresses = await Address.find({ user: req.user._id })
    const shouldBeDefault = isDefault === "true" || existingAddresses.length === 0

    if (shouldBeDefault) {
      await Address.updateMany({ user: req.user._id }, { $set: { isDefault: false } })
    }

    await Address.create({
      user: req.user._id,
      name: name.trim(),
      mobile: mobile.trim(),
      pincode: pincode.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      isDefault: shouldBeDefault,
    })

    req.flash("success_msg", "Address added successfully")
    if (returnTo === "checkout") {
      res.redirect("/checkout")
    } else {
      res.redirect("/profile/addresses")
    }
  } catch (error) {
    console.error("Add address error:", error)
    res.render("pages/add-address", {
      returnTo: req.query.returnTo || "addresses",
      errors: { general: "Failed to add address. Please try again." },
      formData: req.body,
    })
  }
}

const loadEditAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id })

    if (!address) {
      req.flash("error_msg", "Address not found")
      return res.redirect("/profile/addresses")
    }

    res.render("pages/edit-address", {
      address,
      returnTo: req.query.returnTo || "addresses",
      errors: {},
      formData: {},
    })
  } catch (error) {
    console.error("Load edit address error:", error)
    req.flash("error_msg", "Failed to load address")
    res.redirect("/profile/addresses")
  }
}

const updateAddress = async (req, res) => {
  try {
    const { name, mobile, pincode, address, city, state, isDefault } = req.body
    const returnTo = req.query.returnTo || "addresses"

    const addressDoc = await Address.findOne({ _id: req.params.id, user: req.user._id })

    if (!addressDoc) {
      req.flash("error_msg", "Address not found")
      return res.redirect("/profile/addresses")
    }
    const validation = validateAddressData(req.body)

    if (!validation.isValid) {
      return res.render("pages/edit-address", {
        address: addressDoc,
        returnTo,
        errors: validation.errors,
        formData: req.body, 
      })
    }

    if (isDefault === "true") {
      await Address.updateMany({ user: req.user._id }, { $set: { isDefault: false } })
    }

    await Address.findByIdAndUpdate(req.params.id, {
      name: name.trim(),
      mobile: mobile.trim(),
      pincode: pincode.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      isDefault: isDefault === "true",
    })

    req.flash("success_msg", "Address updated successfully")
    if (returnTo === "checkout") {
      res.redirect("/checkout")
    } else {
      res.redirect("/profile/addresses")
    }
  } catch (error) {
    console.error("Update address error:", error)
    const addressDoc = await Address.findOne({ _id: req.params.id, user: req.user._id })
    res.render("pages/edit-address", {
      address: addressDoc,
      returnTo: req.query.returnTo || "addresses",
      errors: { general: "Failed to update address. Please try again." },
      formData: req.body,
    })
  }
}

const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id })

    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" })
    }

    await Address.findByIdAndDelete(req.params.id)

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    })
  } catch (error) {
    console.error("Delete address error:", error)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

const setDefaultAddress = async (req, res) => {
  try {
    await Address.updateMany({ user: req.user._id }, { $set: { isDefault: false } })

    await Address.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { isDefault: true } })

    req.flash("success_msg", "Default address updated")
    res.redirect("/profile/addresses")
  } catch (error) {
    console.error("Set default address error:", error)
    req.flash("error_msg", "Failed to update default address")
    res.redirect("/profile/addresses")
  }
}

module.exports = {
  loadAddresses,
  loadAddAddress,
  addAddress,
  loadEditAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
}
