const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary'); // You'll create this file

// Setup Cloudinary storage for products
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'WEARiT/products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 800, height: 1000, crop: 'limit' }],
  },
});

const upload = multer({ storage });

module.exports = upload;
