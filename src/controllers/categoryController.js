const Category = require('../models/categoryModel');

const loadCategory = async (req, res) => {
   try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page-1)*limit;
        const searchQuery = req.query.search || '';
        
        // Changed filter to match your model structure
        let filter = {};
        if(searchQuery) {
            filter.name = { $regex: searchQuery, $options: 'i'};
        }
        
        const totalCategories = await Category.countDocuments(filter);
        const totalPages = Math.ceil(totalCategories/limit);
        const categories = await Category.find(filter).sort({createdAt: -1}).skip(skip).limit(limit);
        
        // Get admin data for the sidebar
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage
        };
        
        res.render('admin/pages/adminCategory', {
            admin,
            categories,
            currentPage: page,
            totalPages,
            totalCategories,
            searchQuery
        });
   } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render('admin/pages/adminCategory', { error_msg: "Server Error" });
   }
}

const loadAddCategory = (req, res) => {
    // Get admin data for the sidebar
    const admin = {
        name: req.session.admin.name,
        email: req.session.admin.email,
        profileImage: req.session.admin.profileImage
    };
    
    res.render("admin/pages/adminAddCategory", { admin });
}

const addCategory = async (req, res) => {
    try {
        const {name, description} = req.body;
        const existingCategory = await Category.findOne({name});
        
        if(existingCategory) {
            req.flash('error_msg', 'Category already exists');
            return res.render('admin/pages/adminAddCategory', { 
                error_msg: "Category already exists",
                admin: {
                    name: req.session.admin.name,
                    email: req.session.admin.email,
                    profileImage: req.session.admin.profileImage
                }
            });
        }
        
        let imagePath = '';
        if(req.file) {
            // Fixed path handling
            imagePath = req.file.path.replace('public/', '/');
        }
        
        const newCategory = new Category({
            name,
            description,
            image: imagePath
        });
        
        await newCategory.save();
        req.flash('success_msg', 'Category added successfully');
        res.redirect('/admin/category');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render("admin/pages/adminAddCategory", { 
            error_msg: "Server Error",
            admin: {
                name: req.session.admin.name,
                email: req.session.admin.email,
                profileImage: req.session.admin.profileImage
            }
        });
    }
};

const loadEditCategory = async (req, res) => {
    try {
        const categoryId = req.query.id;
        const category = await Category.findById(categoryId);

        if(!category) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/category');
        }
        
        // Get admin data for the sidebar
        const admin = {
            name: req.session.admin.name,
            email: req.session.admin.email,
            profileImage: req.session.admin.profileImage
        };
        
        res.render('admin/pages/adminEditCategory', { admin, category });
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render("admin/pages/adminEditCategory", { error_msg: "Server error" });
    }
}

const updateCategory = async(req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, description, isDeleted } = req.body;
        
        const category = await Category.findById(categoryId);
        if(!category) {
            req.flash('error_msg', 'Category not found');
            return res.redirect('/admin/category');
        }
        
        const existingCategory = await Category.findOne({name, _id: { $ne: categoryId }});
        if(existingCategory) {
            req.flash('error_msg', 'Category name already exists');
            return res.render("admin/pages/adminEditCategory", {
                category,
                error_msg: "Category name already exists",
                admin: {
                    name: req.session.admin.name,
                    email: req.session.admin.email,
                    profileImage: req.session.admin.profileImage
                }
            });
        }
        
        let updateData = { name, description, isDeleted: isDeleted === 'true' };
        
        if(req.file) {
            // Fixed path handling
            updateData.image = req.file.path.replace('public/', '/');
        }
        
        await Category.findByIdAndUpdate(categoryId, updateData);
        req.flash('success_msg', 'Category updated successfully');
        res.redirect('/admin/category');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Server error');
        res.status(500).render("admin/pages/adminEditCategory", { error_msg: "Server error" });
    }
}

const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        await Category.findByIdAndDelete(categoryId);
        return res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({success: false, message: "Server error"});
    }
};

module.exports = {
    loadCategory,
    loadAddCategory,
    addCategory,
    loadEditCategory,
    updateCategory,
    deleteCategory
};