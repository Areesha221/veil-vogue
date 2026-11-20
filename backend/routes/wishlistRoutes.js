import express from 'express';
import { protect } from '../middleware/auth.js';
import Wishlist from '../models/Wishlist.js';

const router = express.Router();

// Get user's wishlist
router.get('/', protect, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('items.product');
    
    if (!wishlist) {
      // Create empty wishlist if doesn't exist
      wishlist = await Wishlist.create({
        user: req.user._id,
        items: []
      });
    }
    
    res.json(wishlist.items || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add to wishlist
router.post('/add', protect, async (req, res) => {
  try {
    const { productId } = req.body;
    
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    
    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        items: []
      });
    }
    
    // Check if product already in wishlist
    const exists = wishlist.items.find(
      item => item.product.toString() === productId
    );
    
    if (exists) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }
    
    wishlist.items.push({ product: productId });
    await wishlist.save();
    
    const updatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.product');
    
    res.json(updatedWishlist.items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove from wishlist
router.post('/remove', protect, async (req, res) => {
  try {
    const { productId } = req.body;
    
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }
    
    wishlist.items = wishlist.items.filter(
      item => item.product.toString() !== productId
    );
    
    await wishlist.save();
    
    const updatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.product');
    
    res.json(updatedWishlist.items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check if product is in wishlist
router.get('/check/:productId', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    
    if (!wishlist) {
      return res.json({ inWishlist: false });
    }
    
    const exists = wishlist.items.some(
      item => item.product.toString() === req.params.productId
    );
    
    res.json({ inWishlist: exists });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;