// utils/imageProcessor.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Process an image - resize and crop
 * @param {string} inputPath - Path to the input image
 * @param {string} outputPath - Path to save the processed image
 * @param {object} options - Processing options (width, height, etc.)
 * @returns {Promise} - Promise resolving to the processed image path
 */
const processImage = async (inputPath, outputPath, options = {}) => {
  const { width = 800, height = 800, quality = 90 } = options;
  
  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality })
      .toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

/**
 * Generate multiple sizes of an image
 * @param {string} originalPath - Path to the original image
 * @returns {object} - Object containing paths to different sizes
 */
const generateImageSizes = async (originalPath) => {
  try {
    const filename = path.basename(originalPath);
    const ext = path.extname(filename);
    const nameWithoutExt = filename.slice(0, -ext.length);
    const dir = path.dirname(originalPath);
    
    const sizes = {
      thumbnail: { width: 100, height: 100 },
      medium: { width: 300, height: 300 },
      large: { width: 800, height: 800 }
    };
    
    const results = {
      original: originalPath.replace('public/', '')
    };
    
    for (const [size, dimensions] of Object.entries(sizes)) {
      const outputPath = path.join(dir, `${nameWithoutExt}-${size}${ext}`);
      await processImage(originalPath, outputPath, dimensions);
      results[size] = outputPath.replace('public/', '');
    }
    
    return results;
  } catch (error) {
    console.error('Error generating image sizes:', error);
    throw error;
  }
};

/**
 * Process multiple images for product uploads
 * @param {Array} files - Array of uploaded files from multer
 * @returns {Array} - Array of processed image objects
 */
const processProductImages = async (files) => {
  try {
    const processedImages = [];
    
    for (const file of files) {
      const sizes = await generateImageSizes(file.path);
      processedImages.push(sizes);
    }
    
    return processedImages;
  } catch (error) {
    console.error('Error processing product images:', error);
    throw error;
  }
};

module.exports = {
  processImage,
  generateImageSizes,
  processProductImages
};