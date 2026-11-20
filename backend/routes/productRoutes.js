import express from 'express';
import { 
  getProducts, 
  getProduct, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  createProductReview
} from '../controllers/productController.js';
import { protect, protectOptional } from '../middleware/auth.js';
import { admin } from '../middleware/admin.js';
import { uploadProduct } from '../middleware/upload.js'; // ✅ 1. Ye import add karein
import Product from '../models/Product.js';

const router = express.Router();

// Search route (before /:id)
router.get('/search', async (req, res) => {
  try {
    const { q, sort } = req.query;
    let query = {};

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { subcategory: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { fabric: { $regex: q, $options: 'i' } },
        { material: { $regex: q, $options: 'i' } }
      ];
    }

    let products = await Product.find(query).populate('category', 'name slug');

    if (sort === 'price_low') products.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sort === 'price_high') products.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sort === 'newest') products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    else if (sort === 'rating') products.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    res.json(products);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/:id/reviews', protectOptional, createProductReview); // allow guest reviews

router.post('/', protect, admin, uploadProduct.array('images', 5), createProduct);

router.put('/:id', protect, admin, uploadProduct.array('images', 5), updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

export default router;