import express from 'express';
import { protect } from '../middleware/auth.js';
import { optionalProtect } from '../middleware/optionalAuth.js';
import { upload } from '../middleware/upload.js';
import {
  createOrder,
  getMyOrders,
  getOrder,
  trackOrder,
  uploadOrderReceipt,
  getOrderReceiptMeta,
  getOrderReceiptFile
} from '../controllers/orderController.js';

const router = express.Router();

// Create order (supports guest checkout via optional auth)
router.post('/', optionalProtect, createOrder);

// Logged-in user's order history
router.get('/myorders', protect, getMyOrders);

// Public/optional-auth order tracking by order number (+ guest verification)
router.get('/track', optionalProtect, trackOrder);
router.post('/track', optionalProtect, trackOrder);

// Upload payment receipt (owner/admin/guest with token)
router.post('/:id/upload-receipt', optionalProtect, upload.single('receipt'), uploadOrderReceipt);

// Receipt metadata/file (owner/admin/guest with token)
router.get('/:id/receipt', optionalProtect, getOrderReceiptMeta);
router.get('/:id/receipt-file', optionalProtect, getOrderReceiptFile);

// Get order by ID (owner/admin/guest with token)
router.get('/:id', optionalProtect, getOrder);

export default router;