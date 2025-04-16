const multer = require('multer');
const createCloudinaryStorage = require('./cloudinaryConfig');

// Create storage for user profile images
const profileStorage = createCloudinaryStorage(
  'profiles',
  ['jpg', 'png', 'jpeg', 'webp'],
  [{ width: 400, height: 400, crop: 'fill' }]
);

// Create multer upload middleware for user profiles
const profileUpload = multer({ storage: profileStorage });

module.exports = profileUpload;