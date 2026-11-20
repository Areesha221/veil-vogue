import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  slug: { 
    type: String, 
    unique: true, 
    sparse: true  // ✅ sparse: true allows null/undefined
  },
  description: {
    type: String,
    default: ''
  },
  // ✅ FIXED: Category optional banaya
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category',
    default: null  // ✅ Default null, required nahi
  },
  subcategory: {
    type: String,
    default: ''
  },
  fabric: {
    type: String,
    default: ''
  },
  material: {
    type: String,
    default: ''
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  compareAtPrice: {
    type: Number,
    min: 0,
    default: null
  },
  images: [{
    type: String,
    default: ''
  }],
  variants: [{
    color: String,
    size: String,
    stock: { type: Number, default: 0 },
    sku: String
  }],
  rating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],
  tags: [String],
  isFeatured: { 
    type: Boolean, 
    default: false 
  },
  isNewArrival: { 
    type: Boolean, 
    default: false 
  },
  isBestSeller: { 
    type: Boolean, 
    default: false 
  },
  stock: { 
    type: Number, 
    default: 0,
    min: 0
  },
  sold: { 
    type: Number, 
    default: 0 
  }
}, { 
  timestamps: true 
});

// ✅ Auto-generate slug from name
productSchema.pre('save', async function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  }
  next();
});

// ✅ Text index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.model('Product', productSchema);