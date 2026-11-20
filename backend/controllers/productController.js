import Product from '../models/Product.js';
import { uploadImageFile, removeStoredUpload } from '../utils/uploadStorage.js';
import { buildPublicUploadUrl } from '../utils/publicUrl.js';
import { logAudit, pickAuditFields } from '../utils/audit.js';

// Get all products
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single product
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('reviews.user', 'name');

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create product (Admin)
export const createProduct = async (req, res) => {
  try {
    console.log('Creating product with data:', req.body);
    console.log('Uploaded files:', req.files);

    // ✅ 1. SAFE NUMBER PARSING (Prevents NaN errors)
    const priceVal = parseFloat(req.body.price);
    if (isNaN(priceVal) || req.body.price === undefined || req.body.price === null || req.body.price === '') {
      return res.status(400).json({ message: 'Valid price is required' });
    }

    const stockVal = parseInt(req.body.stock, 10);
    if (isNaN(stockVal) || req.body.stock === undefined || req.body.stock === null || req.body.stock === '') {
      return res.status(400).json({ message: 'Valid stock quantity is required' });
    }

    let compareAtPriceVal = null;
    if (req.body.compareAtPrice !== undefined && req.body.compareAtPrice !== null && req.body.compareAtPrice !== '') {
      const parsedCompare = parseFloat(req.body.compareAtPrice);
      if (!isNaN(parsedCompare)) {
        compareAtPriceVal = parsedCompare;
      }
    }

    // ✅ 2. HANDLE IMAGES (configurable base URL / cloud storage)
    let imagesArray = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const stored = await uploadImageFile({ req, file });
        imagesArray.push(stored.url);
      }
    } else if (Array.isArray(req.body.images)) {
      imagesArray = req.body.images.filter(Boolean);
    } else if (typeof req.body.images === 'string' && req.body.images.trim() !== '') {
      try {
        const parsed = JSON.parse(req.body.images);
        imagesArray = Array.isArray(parsed) ? parsed.filter(Boolean) : [String(parsed)].filter(Boolean);
      } catch {
        imagesArray = req.body.images.split(',').map(url => url.trim()).filter(Boolean);
      }
    }

    if (imagesArray.length === 0) {
      imagesArray = ['https://via.placeholder.com/400x500?text=Product'];
    }

    // ✅ 3. Clean up the data
    const productData = {
      name: req.body.name,
      description: req.body.description || '',
      price: priceVal, // ✅ Safe number
      compareAtPrice: compareAtPriceVal,
      subcategory: req.body.subcategory || '',
      fabric: req.body.fabric || '',
      material: req.body.material || '',
      stock: stockVal, // ✅ Safe number
      images: imagesArray,
      isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true, // ✅ FormData boolean fix
      isNewArrival: req.body.isNewArrival === 'true' || req.body.isNewArrival === true,
      isBestSeller: req.body.isBestSeller === 'true' || req.body.isBestSeller === true,
      tags: Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? req.body.tags.split(',') : [])
    };

    // ✅ Handle category
    if (req.body.category) {
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.body.category);
      if (isValidObjectId) {
        productData.category = req.body.category;
      } else {
        // Agar slug hai, toh database mein dhundh kar _id lagayein
        const Category = (await import('../models/Category.js')).default;
        const foundCategory = await Category.findOne({ slug: req.body.category });
        if (foundCategory) {
          productData.category = foundCategory._id;
        } else if (!productData.subcategory) {
          productData.subcategory = req.body.category;
        }
      }
    }

    console.log('Cleaned product data:', productData);

    const product = await Product.create(productData);
    const populatedProduct = await Product.findById(product._id).populate('category', 'name slug');

    await logAudit(req, {
      action: 'admin.product.create',
      entityType: 'product',
      entityId: String(product._id),
      entityLabel: product.name,
      summary: `Created product ${product.name}`,
      after: pickAuditFields(populatedProduct, ['name', 'price', 'stock', 'subcategory', 'isFeatured', 'isNewArrival', 'isBestSeller'])
    });

    res.status(201).json(populatedProduct);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: error.message || 'Failed to create product' });
  }
};

// Update product (Admin)
export const updateProduct = async (req, res) => {
  try {
    console.log('=== UPDATE REQUEST ===');
    console.log('req.body:', req.body);
    console.log('req.body.price:', req.body.price, 'Type:', typeof req.body.price);
    console.log('req.body.stock:', req.body.stock, 'Type:', typeof req.body.stock);
    console.log('Files:', req.files);

    // ✅ 1. BETTER PRICE HANDLING
    let priceVal;
    if (req.body.price !== undefined && req.body.price !== null && req.body.price !== '') {
      // String ko trim karein aur parse karein
      const priceStr = String(req.body.price).trim();
      priceVal = parseFloat(priceStr);

      if (isNaN(priceVal)) {
        console.error('Price parsing failed:', req.body.price);
        return res.status(400).json({
          message: 'Invalid price value',
          received: req.body.price
        });
      }
    } else {
      const existingProduct = await Product.findById(req.params.id);
      if (!existingProduct) {
        return res.status(404).json({ message: 'Product not found' });
      }
      priceVal = existingProduct.price;
      console.log('Using existing price:', priceVal);
    }

    // ✅ 2. BETTER STOCK HANDLING
    let stockVal;
    if (req.body.stock !== undefined && req.body.stock !== null && req.body.stock !== '') {
      const stockStr = String(req.body.stock).trim();
      stockVal = parseInt(stockStr, 10);

      if (isNaN(stockVal)) {
        console.error('Stock parsing failed:', req.body.stock);
        return res.status(400).json({
          message: 'Invalid stock value',
          received: req.body.stock
        });
      }
    } else {
      const existingProduct = await Product.findById(req.params.id);
      stockVal = existingProduct.stock;
      console.log('Using existing stock:', stockVal);
    }

    // ✅ 3. COMPARE AT PRICE
    let compareAtPriceVal = null;
    if (req.body.compareAtPrice && req.body.compareAtPrice !== '' && req.body.compareAtPrice !== 'null') {
      const compareStr = String(req.body.compareAtPrice).trim();
      const parsed = parseFloat(compareStr);
      if (!isNaN(parsed)) {
        compareAtPriceVal = parsed;
      }
    }

    const existingForImages = await Product.findById(req.params.id);
    if (!existingForImages) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Images handling (configurable base URL / cloud storage)
    let imagesArray;
    if (req.files && req.files.length > 0) {
      imagesArray = [];
      for (const file of req.files) {
        const stored = await uploadImageFile({ req, file });
        imagesArray.push(stored.url);
      }
      console.log('New images uploaded:', imagesArray);
    } else if (req.body.images) {
      try {
        const parsed = JSON.parse(req.body.images);
        imagesArray = Array.isArray(parsed) ? parsed.filter(Boolean) : [String(parsed)].filter(Boolean);
      } catch (e) {
        imagesArray = String(req.body.images).split(',').map(url => url.trim()).filter(Boolean);
      }
      console.log('Using provided/existing images:', imagesArray);
    } else {
      imagesArray = existingForImages?.images || [];
      console.log('Using database images:', imagesArray);
    }

    // ✅ 5. BUILD UPDATE DATA
    const updateData = {
      name: req.body.name,
      description: req.body.description || '',
      price: priceVal,
      compareAtPrice: compareAtPriceVal,
      subcategory: req.body.subcategory || '',
      fabric: req.body.fabric || '',
      material: req.body.material || '',
      stock: stockVal,
      isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true || req.body.isFeatured === 'on',
      isNewArrival: req.body.isNewArrival === 'true' || req.body.isNewArrival === true || req.body.isNewArrival === 'on',
      isBestSeller: req.body.isBestSeller === 'true' || req.body.isBestSeller === true || req.body.isBestSeller === 'on',
      tags: Array.isArray(req.body.tags) ? req.body.tags : (req.body.tags ? req.body.tags.split(',') : [])
    };

    if (imagesArray) {
      updateData.images = imagesArray.length > 0 ? imagesArray : ['https://via.placeholder.com/400x500?text=Product'];
    }

    // Category
    if (req.body.category) {
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.body.category);
      if (isValidObjectId) {
        updateData.category = req.body.category;
      } else {
        const Category = (await import('../models/Category.js')).default;
        const foundCategory = await Category.findOne({ slug: req.body.category });
        if (foundCategory) {
          updateData.category = foundCategory._id;
        } else {
          updateData.category = null;
          if (!updateData.subcategory) {
            updateData.subcategory = req.body.category;
          }
        }
      }
    }

    console.log('Final updateData:', updateData);

    const before = pickAuditFields(existingForImages, ['name', 'price', 'stock', 'subcategory', 'isFeatured', 'isNewArrival', 'isBestSeller']);
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name slug');

    if (product) {
      await logAudit(req, {
        action: 'admin.product.update',
        entityType: 'product',
        entityId: String(product._id),
        entityLabel: product.name,
        summary: `Updated product ${product.name}`,
        before,
        after: pickAuditFields(product, ['name', 'price', 'stock', 'subcategory', 'isFeatured', 'isNewArrival', 'isBestSeller'])
      });
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      message: error.message,
      stack: error.stack
    });
  }
};

// Delete product (Admin)
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const before = pickAuditFields(product, ['name', 'price', 'stock', 'subcategory']);
    await Product.findByIdAndDelete(req.params.id);
    await logAudit(req, {
      action: 'admin.product.delete',
      entityType: 'product',
      entityId: String(req.params.id),
      entityLabel: before?.name || String(req.params.id),
      summary: `Deleted product ${before?.name || req.params.id}`,
      before
    });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Search products
export const searchProducts = async (req, res) => {
  try {
    const { q, sort, category, minPrice, maxPrice } = req.query;

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

    if (category) {
      query.$or = query.$or || [];
      query.$or.push({ subcategory: { $regex: category, $options: 'i' } });
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_low') sortOption = { price: 1 };
    else if (sort === 'price_high') sortOption = { price: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };
    else if (sort === 'rating') sortOption = { rating: -1 };

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortOption);

    res.json(products);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create/update-style add review (one review per logged-in user per product; guests can also review)
export const createProductReview = async (req, res) => {
  try {
    const { rating, comment, name } = req.body || {};
    const ratingNum = Number(rating);
    const commentText = String(comment || '').trim();
    const guestName = String(name || '').trim();

    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Please select a rating between 1 and 5' });
    }
    if (!commentText) {
      return res.status(400).json({ message: 'Please write a review comment' });
    }
    if (commentText.length > 1000) {
      return res.status(400).json({ message: 'Review comment is too long' });
    }

    const isGuest = !req.user?._id;
    const reviewerName = isGuest ? (guestName || 'Guest Customer') : (req.user.name || 'Customer');
    if (isGuest && reviewerName.length < 2) {
      return res.status(400).json({ message: 'Please enter your name' });
    }
    if (reviewerName.length > 80) {
      return res.status(400).json({ message: 'Name is too long' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!isGuest) {
      const alreadyReviewed = (product.reviews || []).some(
        (r) => String(r.user) === String(req.user._id)
      );
      if (alreadyReviewed) {
        return res.status(400).json({ message: 'You have already reviewed this product' });
      }
    }

    product.reviews.push({
      ...(isGuest ? {} : { user: req.user._id }),
      name: reviewerName,
      rating: ratingNum,
      comment: commentText,
      createdAt: new Date()
    });

    product.numReviews = product.reviews.length;
    product.rating = Number(
      (
        product.reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / product.reviews.length
      ).toFixed(1)
    );

    await product.save();

    const populated = await Product.findById(product._id)
      .populate('category', 'name slug')
      .populate('reviews.user', 'name');

    res.status(201).json({ message: 'Review added successfully', product: populated });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: error.message || 'Failed to add review' });
  }
};