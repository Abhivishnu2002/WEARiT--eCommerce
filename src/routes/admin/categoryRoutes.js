const express = require('express');
const router = express.Router();
const { category } = require('../../controllers');
const { isAdminAuthenticated } = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/uploadMiddleware');

// Category routes
router.get('/category', isAdminAuthenticated, category.loadCategory);
router.get('/add-category', isAdminAuthenticated, category.loadAddCategory);
router.post('/add-category', isAdminAuthenticated, upload.single('image'), category.addCategory);
router.get('/edit-category', isAdminAuthenticated, category.loadEditCategory);
router.post('/update-category/:id', isAdminAuthenticated, upload.single('image'), category.updateCategory);
router.delete('/delete-category/:id', isAdminAuthenticated, category.deleteCategory);

module.exports = router;