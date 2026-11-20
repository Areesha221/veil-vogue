import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendOrderConfirmation } from '../utils/sendOrderConfirmation.js';
import { sanitizeOrderItem, validateShippingAddress, validateEmail, toTrimmedString } from '../utils/validate.js';
import { uploadReceiptFile, resolveLocalAbsolutePathFromStored, buildCloudinaryDeliveryUrl } from '../utils/uploadStorage.js';
import { isHttpUrl } from '../utils/publicUrl.js';

const generateOrderNumber = () => {
  return 'VV-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000);
};

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const generateGuestAccessToken = () => crypto.randomBytes(24).toString('hex');

const computePricing = (items) => {
  const itemsPrice = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const discountPrice = itemsPrice > 10000 ? Math.round(itemsPrice * 0.1) : 0;
  const shippingPrice = itemsPrice > 3000 ? 0 : 200;
  const totalPrice = Math.max(0, itemsPrice - discountPrice + shippingPrice);
  return { itemsPrice, discountPrice, shippingPrice, totalPrice };
};

const canAccessOrder = (order, req) => {
  if (!order) return false;
  if (req.user?.role === 'admin') return true;
  if (req.user && order.user && String(order.user) === String(req.user._id)) return true;
  if (order.isGuest || !order.user) {
    const token = req.query?.guestToken || req.body?.guestToken || req.headers['x-guest-token'];
    if (!token || !order.guestAccessTokenHash) return false;
    return hashToken(token) === order.guestAccessTokenHash;
  }
  return false;
};

const streamRemoteFile = (url, res, fallbackName = 'receipt', contentType = 'application/octet-stream', disposition = 'inline') => new Promise((resolve, reject) => {
  try {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const request = client.get(parsed, (upstream) => {
      if (upstream.statusCode && upstream.statusCode >= 400) {
        res.status(502).json({ message: 'Failed to fetch receipt file' });
        upstream.resume();
        return resolve();
      }
      res.setHeader('Content-Type', upstream.headers['content-type'] || contentType);
      const safeName = String(fallbackName || 'receipt').replace(/"/g, '');
      res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
      upstream.pipe(res);
      upstream.on('end', resolve);
      upstream.on('error', reject);
    });
    request.on('error', reject);
  } catch (error) {
    reject(error);
  }
});

export const createOrder = asyncHandler(async (req, res) => {
  const rawItems = req.body.orderItems || req.body.items || [];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return res.status(400).json({ message: 'No order items' });
  }

  const orderItems = rawItems.map(sanitizeOrderItem).filter(Boolean);
  if (orderItems.length !== rawItems.length) {
    return res.status(400).json({ message: 'One or more order items are invalid' });
  }

  const shippingValidation = validateShippingAddress(req.body.shippingAddress || {});
  if (!shippingValidation.ok) {
    return res.status(400).json({ message: shippingValidation.message });
  }

  const paymentMethod = toTrimmedString(req.body.paymentMethod || 'COD');
  const allowedPayments = ['COD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA', 'NAYAPAY', 'STRIPE'];
  if (!allowedPayments.includes(paymentMethod)) {
    return res.status(400).json({ message: 'Invalid payment method' });
  }

  const isGuest = !req.user;
  let guestInfo = null;
  if (isGuest) {
    const name = toTrimmedString(req.body.guestName || req.body.shippingAddress?.fullName || '');
    const email = toTrimmedString(req.body.guestEmail || req.body.email || '').toLowerCase();
    const phone = toTrimmedString(req.body.guestPhone || req.body.shippingAddress?.phone || '');
    if (!name) return res.status(400).json({ message: 'Guest name is required' });
    if (!validateEmail(email)) return res.status(400).json({ message: 'A valid guest email is required' });
    guestInfo = { name: name.slice(0, 120), email: email.slice(0, 254), phone: phone.slice(0, 30) };
  }

  // Validate products and stock, and use trusted prices
  const verifiedItems = [];
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(400).json({ message: `Product not found: ${item.name}` });
    }
    if (typeof product.stock === 'number' && product.stock < item.quantity) {
      return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
    }
    verifiedItems.push({
      name: product.name || item.name,
      quantity: item.quantity,
      image: (Array.isArray(product.images) && product.images[0]) || item.image || '',
      price: Number(product.price ?? item.price),
      product: product._id,
      ...(item.variant ? { variant: item.variant } : {})
    });
  }

  const { itemsPrice, discountPrice, shippingPrice, totalPrice } = computePricing(verifiedItems);

  // Update stock after validation
  for (const item of verifiedItems) {
    const product = await Product.findById(item.product);
    if (product) {
      if (typeof product.stock === 'number') {
        product.stock = Math.max(0, product.stock - item.quantity);
      }
      product.sold = (product.sold || 0) + item.quantity;
      await product.save();
    }
  }

  let guestAccessToken = null;
  let guestAccessTokenHash = null;
  if (isGuest) {
    guestAccessToken = generateGuestAccessToken();
    guestAccessTokenHash = hashToken(guestAccessToken);
  }

  const order = await Order.create({
    user: req.user?._id || null,
    isGuest,
    ...(guestInfo ? { guestInfo } : {}),
    ...(guestAccessTokenHash ? { guestAccessTokenHash } : {}),
    orderNumber: generateOrderNumber(),
    orderItems: verifiedItems,
    shippingAddress: shippingValidation.value,
    paymentMethod,
    itemsPrice,
    discountPrice,
    shippingPrice,
    totalPrice,
    notes: toTrimmedString(req.body.notes || req.body.orderNote || '').slice(0, 1000),
    giftMessage: toTrimmedString(req.body.giftMessage || req.body.giftNote || '').slice(0, 1000),
    orderStatus: 'PENDING',
    paymentStatus: 'PENDING'
  });

  // Send confirmation email (best effort, non-blocking so checkout response is not delayed/hung)
  void (async () => {
    try {
      let recipient = null;
      if (req.user) {
        recipient = await User.findById(req.user._id).select('name email');
      } else if (guestInfo) {
        recipient = { name: guestInfo.name, email: guestInfo.email };
      }
      if (recipient?.email) {
        await sendOrderConfirmation(order, recipient, {
          guestAccessToken,
          isGuest
        });
      }
    } catch (error) {
      console.error('Order email error:', error?.message || error);
    }
  })();

  const response = order.toObject();
  if (guestAccessToken) {
    response.guestAccessToken = guestAccessToken;
  }
  res.status(201).json(response);
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (!canAccessOrder(order, req)) {
    return res.status(403).json({ message: 'Not authorized to view this order' });
  }

  res.json(order);
});

export const trackOrder = asyncHandler(async (req, res) => {
  const orderNumber = toTrimmedString(req.query.orderNumber || req.body.orderNumber || '').toUpperCase();
  const guestToken = toTrimmedString(req.query.guestToken || req.body.guestToken || '');
  const email = toTrimmedString(req.query.email || req.body.email || '').toLowerCase();
  const phone = toTrimmedString(req.query.phone || req.body.phone || '');

  if (!orderNumber) {
    return res.status(400).json({ message: 'Order number is required' });
  }

  const order = await Order.findOne({ orderNumber }).select('+guestAccessTokenHash');
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Authenticated owner/admin can track
  if (req.user && (req.user.role === 'admin' || (order.user && String(order.user) === String(req.user._id)))) {
    return res.json(order);
  }

  // Guest access: token OR (email/phone match)
  if (order.isGuest || !order.user) {
    const tokenOk = guestToken && order.guestAccessTokenHash && hashToken(guestToken) === order.guestAccessTokenHash;
    const emailOk = email && order.guestInfo?.email && email === String(order.guestInfo.email).toLowerCase();
    const phoneOk = phone && order.guestInfo?.phone && phone === String(order.guestInfo.phone);
    const shippingPhoneOk = phone && order.shippingAddress?.phone && phone === String(order.shippingAddress.phone);

    if (tokenOk || emailOk || phoneOk || shippingPhoneOk) {
      return res.json(order);
    }
  }

  return res.status(403).json({ message: 'Unable to verify order access. Provide the correct email/phone used at checkout.' });
});

export const uploadOrderReceipt = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const order = await Order.findById(req.params.id).select('+guestAccessTokenHash');
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!canAccessOrder(order, req)) {
    return res.status(403).json({ message: 'Not authorized to upload receipt for this order' });
  }

  const stored = await uploadReceiptFile({ req, file: req.file });
  order.paymentReceipt = {
    fileName: stored.originalFilename || req.file.originalname,
    fileSize: stored.size || req.file.size,
    fileType: stored.mimeType || req.file.mimetype,
    filePath: stored.path || stored.url,
    storageProvider: stored.provider || 'local',
    storagePublicId: stored.publicId || '',
    storageResourceType: stored.resourceType || '',
    storageDeliveryType: stored.deliveryType || '',
    uploadedVia: 'website',
    uploadedAt: new Date(),
    verified: false
  };
  await order.save();

  res.json({ message: 'Receipt uploaded successfully', order });
});

export const getOrderReceiptMeta = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select('+guestAccessTokenHash').populate('user', 'name email');
  if (!order || !order.paymentReceipt || !order.paymentReceipt.filePath) {
    return res.status(404).json({ message: 'Receipt not found' });
  }

  if (!canAccessOrder(order, req)) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  res.json({
    fileName: order.paymentReceipt.fileName,
    fileSize: order.paymentReceipt.fileSize,
    fileType: order.paymentReceipt.fileType,
    filePath: order.paymentReceipt.filePath,
    storageProvider: order.paymentReceipt.storageProvider || 'local',
    uploadedAt: order.paymentReceipt.uploadedAt,
    uploadedVia: order.paymentReceipt.uploadedVia,
    verified: order.paymentReceipt.verified
  });
});

export const getOrderReceiptFile = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select('+guestAccessTokenHash');
  if (!order || !order.paymentReceipt?.filePath) {
    return res.status(404).json({ message: 'Receipt not found' });
  }

  if (!canAccessOrder(order, req)) {
    return res.status(403).json({ message: 'Not authorized to access this receipt' });
  }

  const stored = order.paymentReceipt;
  const filename = stored.fileName || 'receipt';
  const contentType = stored.fileType || 'application/octet-stream';
  const download = String(req.query.download || '').toLowerCase() === '1' || String(req.query.download || '').toLowerCase() === 'true';
  const disposition = download ? 'attachment' : 'inline';

  // Remote/cloud-stored receipt
  if (isHttpUrl(stored.filePath) || stored.storageProvider === 'cloudinary') {
    const remoteUrl = stored.storageProvider === 'cloudinary'
      ? (buildCloudinaryDeliveryUrl(stored) || stored.filePath)
      : stored.filePath;
    if (!remoteUrl || !isHttpUrl(remoteUrl)) {
      return res.status(404).json({ message: 'Receipt file URL is unavailable' });
    }
    return streamRemoteFile(remoteUrl, res, filename, contentType, disposition);
  }

  // Local receipt
  const resolved = resolveLocalAbsolutePathFromStored(stored.filePath);
  if (!resolved || !fs.existsSync(resolved)) {
    return res.status(404).json({ message: 'Receipt file not found on server' });
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `${disposition}; filename="${String(filename).replace(/"/g, '')}"`);
  return res.sendFile(path.resolve(resolved));
});