const Product = require('../../models/productModel');

const searchProducts = async (req, res) => {
    try {
        const query = req.query.q;
        
        if (!query || query.trim() === '') {
            return res.json({ products: [] });
        }
        
        const products = await Product.find({
            isActive: true,
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { brand: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
            ]
        })
        .select('name images _id')
        .limit(5)
        .lean();

        const formattedProducts = products.map(product => {
            const imageUrl = product.images && product.images.length > 0 
                ? product.images[0].url 
                : '/images/placeholder.jpg';
                
            return {
                id: product._id,
                name: product.name,
                imageUrl: imageUrl
            };
        });

        res.json({ products: formattedProducts });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while searching' });
    }
};

module.exports = {
    searchProducts
};