const productUpload = require('./productUpload');
const categoryUpload = require('./categoryUpload');
const profileUpload = require('./profileUpload');

module.exports = {
  product: productUpload,
  category: categoryUpload,
  profile: profileUpload
};