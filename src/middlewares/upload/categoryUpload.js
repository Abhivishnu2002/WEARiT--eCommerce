const multer = require('multer');
const createCloudinaryStorage = require('./cloudinaryConfig');

// Create storage for category images
const categoryStorage = createCloudinaryStorage(
  'categories',
  ['jpg', 'png', 'jpeg', 'webp'],
  [{ width: 600, height: 600, crop: 'fill' }]
);

// Create multer upload middleware for categories
const categoryUpload = multer({ storage: categoryStorage });

module.exports = categoryUpload;