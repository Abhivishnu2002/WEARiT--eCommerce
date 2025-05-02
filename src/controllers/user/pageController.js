const loadReferralCode = (req, res) => {
    res.render("pages/referral");
};

const loadContact = (req, res) => {
    res.render("pages/contact");
};

const loadAbout = (req, res) => {
    res.render("pages/about");
};

const loadError = (req, res) => {
    res.render("errors/404");
};

module.exports = {
    loadReferralCode,
    loadContact,
    loadAbout,
    loadError
}