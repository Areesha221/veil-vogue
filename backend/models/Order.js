import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    ref: 'User',
    default: null
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  guestInfo: {
    name: { type: String },
    email: { type: String },
    phone: { type: String }
  },
  guestAccessTokenHash: {
    type: String,
    select: false
  },
  orderItems: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Product'
    },
    variant: { type: String }
  }],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String },
    country: { type: String, default: 'Pakistan' }
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['COD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA', 'NAYAPAY', 'STRIPE']
  },
  paymentStatus: {
    type: String,
    default: 'PENDING',
    enum: ['PENDING', 'PAID', 'FAILED', 'VERIFIED', 'REJECTED']
  },

  paymentReceipt: {
    fileName: String,
    fileSize: Number,
    fileType: String,
    filePath: String,        // Local relative path or remote URL/reference
    storageProvider: { type: String, default: 'local' }, // local | cloudinary
    storagePublicId: String,
    storageResourceType: String,
    storageDeliveryType: String,
    uploadedVia: {           // Track upload method
      type: String,
      enum: ['website', 'whatsapp'],
      default: 'website'
    },
    uploadedAt: Date,
    verified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    adminNotes: String
  },

  orderStatus: {
    type: String,
    default: 'PENDING',
    enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
  },
  itemsPrice: { type: Number, required: true, default: 0.0 },
  discountPrice: { type: Number, required: true, default: 0.0 },
  shippingPrice: { type: Number, required: true, default: 0.0 },
  totalPrice: { type: Number, required: true, default: 0.0 },
  orderNumber: { type: String, unique: true },
  notes: { type: String, default: '' },
  giftMessage: { type: String, default: '' },
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date },
  isDelivered: { type: Boolean, default: false },
  deliveredAt: { type: Date }
}, {
  timestamps: true
});

// Auto-generate order number if missing
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `VV-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('Order', orderSchema);
