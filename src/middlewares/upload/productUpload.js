const multer = require('multer');
const createCloudinaryStorage = require('./cloudinaryConfig');

// Create storage for product images
const productStorage = createCloudinaryStorage(
  'products',
  ['jpg', 'png', 'jpeg', 'webp'],
  [{ width: 800, height: 1000, crop: 'limit' }]
);

// Create multer upload middleware for products
const productUpload = multer({ storage: productStorage });

module.exports = productUpload;