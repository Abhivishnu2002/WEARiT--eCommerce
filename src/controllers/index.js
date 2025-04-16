const authController = require('./authController');
const profileController = require('./profileController');
const dashboardController = require('./dashboardController');
const customerController = require('./customerController');
const categoryController = require('./categoryController');
const productController = require('./productController');

module.exports = {
    auth: authController,
    profile: profileController,
    dashboard: dashboardController,
    customer: customerController,
    category: categoryController,
    product: productController
};