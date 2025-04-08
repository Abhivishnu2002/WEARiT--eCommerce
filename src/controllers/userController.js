const loadHome = (req, res)=>{
    res.render("pages/home");
}

const loadLogin = (req, res)=>{
    res.render("pages/login");
}

const loadSignup = (req, res)=>{
    res.render("pages/signup");
}

const loadForgetPassword = (req, res)=>{
    res.render("pages/forgetPassword");
}

const loadNewPassword = (req, res)=>{
    res.render("pages/newPassword");
}

const loadrReferralCode = (req, res)=>{
    res.render("pages/referral");
}

const loadContact = (req, res)=>{
    res.render("pages/contact");
}

const loadProducts = (req, res)=>{
    res.render("pages/product.ejs");
}

const loadWishlist = (req, res)=>{
    res.render("pages/wishlist");
}

const loadCart = (req, res)=>{
    res.render("pages/cart");
}

const loadAbout = (req, res)=>{
    res.render("pages/about");
}

const loadError = (req, res)=>{
    res.render("errors/404")
}

const loadOtp = (req, res)=>{
    res.render("pages/otp")
}


module.exports = {loadHome, loadLogin, loadSignup, loadForgetPassword, loadrReferralCode, loadContact, loadProducts, loadCart, loadWishlist, loadAbout, loadError, loadOtp, loadNewPassword};