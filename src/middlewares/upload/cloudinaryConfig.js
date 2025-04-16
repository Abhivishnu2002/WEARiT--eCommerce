const cloudinary = require('../../utils/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/**
 * Creates a Cloudinary storage configuration
 * @param {string} folder - The folder path in Cloudinary
 * @param {string[]} formats - Allowed file formats
 * @param {Object[]} transformations - Image transformations to apply
 * @returns {CloudinaryStorage} Configured Cloudinary storage
 */
const createCloudinaryStorage = (folder, formats = ['jpg', 'png', 'jpeg', 'webp'], transformations = []) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `WEARiT/${folder}`,
      allowed_formats: formats,
      transformation: transformations.length > 0 ? transformations : undefined,
    },
  });
};

module.exports = createCloudinaryStorage;