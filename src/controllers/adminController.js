const loadLogin = (req, res)=>{
    res.render("pages/adminLogin");
}
const loadDashboard = (req, res)=>{
    res.render("pages/adminDashboard");
}
const loadCategory = (req, res)=>{
    res.render("pages/adminCategory");
}
const loadProducts = (req, res)=>{
    res.render("pages/adminProducts")
}

module.exports = {loadLogin, loadCategory, loadDashboard, loadProducts};