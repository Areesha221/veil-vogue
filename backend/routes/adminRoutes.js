import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import { admin } from '../middleware/admin.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import Message from '../models/Message.js';
import { logAudit, pickAuditFields } from '../utils/audit.js';
import { resolveLocalAbsolutePathFromStored, buildCloudinaryDeliveryUrl } from '../utils/uploadStorage.js';
import { isHttpUrl } from '../utils/publicUrl.js';

const router = express.Router();

const streamRemoteFile = (url, res, fallbackName = 'receipt', contentType = 'application/octet-stream') => new Promise((resolve, reject) => {
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
      res.setHeader('Content-Disposition', `inline; filename="${String(fallbackName || 'receipt').replace(/"/g, '')}"`);
      upstream.pipe(res);
      upstream.on('end', resolve);
      upstream.on('error', reject);
    });
    request.on('error', reject);
  } catch (error) {
    reject(error);
  }
});

const parsePagination = (req, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPagedResponse = (items, total, page, limit, extra = {}) => ({
  items,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit || 1)),
    hasMore: page * limit < total
  },
  ...extra
});

const wantsPaged = (req) => {
  const v = String(req.query.paginated || '').toLowerCase();
  return Boolean(req.query.page || req.query.limit || req.query.sort || req.query.search || v === '1' || v === 'true');
};

const escapeCsv = (value) => {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const sendCsv = (res, filename, rows) => {
  const header = rows.length ? Object.keys(rows[0]) : [];
  const csv = [header.join(','), ...rows.map((row) => header.map((h) => escapeCsv(row[h])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
};

const parseSort = (sortParam, allowed = {}, fallback = { createdAt: -1 }) => {
  const raw = String(sortParam || '').trim();
  if (!raw) return fallback;
  const desc = raw.startsWith('-');
  const key = desc ? raw.slice(1) : raw;
  if (allowed[key]) return { [allowed[key]]: desc ? -1 : 1 };
  return fallback;
};

// Get all orders (with optional status filter, search, pagination, sorting, export)
router.get('/orders', protect, admin, async (req, res) => {
  try {
    const { status, search = '', paymentMethod, paymentStatus, isGuest, from, to } = req.query;
    const query = {};
    if (status && status !== 'all') query.orderStatus = status;
    if (paymentMethod && paymentMethod !== 'all') query.paymentMethod = paymentMethod;
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;
    if (isGuest === 'true') query.$and = [...(query.$and || []), { $or: [{ isGuest: true }, { user: null }] }];
    if (isGuest === 'false') query.$and = [...(query.$and || []), { isGuest: { $ne: true }, user: { $ne: null } }];
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const s = String(search || '').trim();
    if (s) {
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { orderNumber: rx },
        { 'shippingAddress.fullName': rx },
        { 'shippingAddress.phone': rx },
        { 'shippingAddress.city': rx },
        { 'shippingAddress.state': rx },
        { 'guestInfo.name': rx },
        { 'guestInfo.email': rx },
        { 'guestInfo.phone': rx },
        { notes: rx },
        { giftMessage: rx }
      ];
    }

    const sort = parseSort(req.query.sort, {
      createdAt: 'createdAt',
      totalPrice: 'totalPrice',
      orderStatus: 'orderStatus',
      paymentStatus: 'paymentStatus',
      orderNumber: 'orderNumber'
    }, { createdAt: -1 });

    const exportCsv = String(req.query.export || '').toLowerCase() === 'csv';
    const baseQuery = Order.find(query).populate('user', 'name email phone').sort(sort);
    const allOrders = exportCsv || !wantsPaged(req)
      ? await baseQuery
      : null;

    if (exportCsv) {
      const rows = (allOrders || []).map((o) => ({
        orderNumber: o.orderNumber,
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : '',
        customerName: o.user?.name || o.guestInfo?.name || o.shippingAddress?.fullName || '',
        customerEmail: o.user?.email || o.guestInfo?.email || '',
        customerPhone: o.shippingAddress?.phone || o.guestInfo?.phone || o.user?.phone || '',
        isGuest: o.isGuest || !o.user ? 'yes' : 'no',
        orderStatus: o.orderStatus || '',
        paymentMethod: o.paymentMethod || '',
        paymentStatus: o.paymentStatus || '',
        itemsCount: Array.isArray(o.orderItems) ? o.orderItems.length : 0,
        itemsPrice: o.itemsPrice ?? '',
        discountPrice: o.discountPrice ?? '',
        shippingPrice: o.shippingPrice ?? '',
        totalPrice: o.totalPrice ?? '',
        city: o.shippingAddress?.city || '',
        receiptUploaded: o.paymentReceipt?.filePath ? 'yes' : 'no',
        receiptVerified: o.paymentReceipt?.verified ? 'yes' : 'no'
      }));
      await logAudit(req, { action: 'admin.orders.export', entityType: 'order', summary: `Exported ${rows.length} orders to CSV`, metadata: { status, search: s, paymentMethod, paymentStatus } });
      return sendCsv(res, `orders-${Date.now()}.csv`, rows);
    }

    if (!wantsPaged(req)) {
      return res.json(allOrders || []);
    }

    const { page, limit, skip } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
    const [items, total] = await Promise.all([
      Order.find(query).populate('user', 'name email phone').sort(sort).skip(skip).limit(limit),
      Order.countDocuments(query)
    ]);
    return res.json(buildPagedResponse(items, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dashboard stats + richer analytics
router.get('/dashboard-stats', protect, admin, async (req, res) => {
  try {
    const [orders, users, products, unreadMessages, reviewAgg] = await Promise.all([
      Order.find({}),
      User.find({}),
      Product.find({}),
      Message.countDocuments({ status: 'unread' }),
      Product.aggregate([
        { $project: { reviewsCount: { $size: { $ifNull: ['$reviews', []] } } } },
        { $group: { _id: null, totalReviews: { $sum: '$reviewsCount' } } }
      ])
    ]);

    const validOrders = orders.filter(order => order.orderStatus !== 'CANCELLED' && order.paymentStatus !== 'REJECTED');
    const totalRevenue = validOrders.reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);
    const totalDiscount = validOrders.reduce((sum, order) => sum + (Number(order.discountPrice) || 0), 0);
    const averageOrderValue = validOrders.length ? Math.round(totalRevenue / validOrders.length) : 0;

    const countBy = (key, val) => orders.filter(o => o[key] === val).length;
    const pendingReceiptCount = orders.filter(o =>
      o?.paymentReceipt?.filePath &&
      o?.paymentReceipt?.verified !== true &&
      o?.paymentStatus !== 'REJECTED'
    ).length;

    const now = new Date();
    const last30Cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ordersLast30Days = orders.filter(o => new Date(o.createdAt) >= last30Cutoff);
    const ordersLast7Days = orders.filter(o => new Date(o.createdAt) >= last7Cutoff);
    const revenueLast30Days = ordersLast30Days
      .filter(order => order.orderStatus !== 'CANCELLED' && order.paymentStatus !== 'REJECTED')
      .reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);

    const productSalesMap = new Map();
    for (const order of validOrders) {
      for (const item of (order.orderItems || [])) {
        const key = String(item.product || item.name || 'unknown');
        const prev = productSalesMap.get(key) || { productId: item.product || null, name: item.name || 'Unknown', quantity: 0, revenue: 0 };
        prev.quantity += Number(item.quantity || 0);
        prev.revenue += Number(item.price || 0) * Number(item.quantity || 0);
        productSalesMap.set(key, prev);
      }
    }
    const topProducts = [...productSalesMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    const dailyMap = new Map();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, orders: 0, revenue: 0 });
    }
    for (const order of ordersLast7Days) {
      const key = new Date(order.createdAt).toISOString().slice(0, 10);
      if (!dailyMap.has(key)) continue;
      const row = dailyMap.get(key);
      row.orders += 1;
      if (order.orderStatus !== 'CANCELLED' && order.paymentStatus !== 'REJECTED') {
        row.revenue += Number(order.totalPrice || 0);
      }
    }

    const lowStockProducts = products.filter(p => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5).length;
    const outOfStockProducts = products.filter(p => Number(p.stock || 0) <= 0).length;

    res.json({
      totalOrders: orders.length,
      totalRevenue,
      totalDiscount,
      averageOrderValue,
      totalProducts: products.length,
      totalCustomers: users.filter(u => u.role !== 'admin').length,
      totalAdmins: users.filter(u => u.role === 'admin').length,
      pendingOrders: countBy('orderStatus', 'PENDING'),
      pendingReceipts: pendingReceiptCount,
      processingOrders: countBy('orderStatus', 'PROCESSING'),
      shippedOrders: countBy('orderStatus', 'SHIPPED'),
      deliveredOrders: countBy('orderStatus', 'DELIVERED'),
      cancelledOrders: countBy('orderStatus', 'CANCELLED'),
      unreadMessages,
      totalReviews: reviewAgg?.[0]?.totalReviews || 0,
      ordersLast30Days: ordersLast30Days.length,
      revenueLast30Days,
      lowStockProducts,
      outOfStockProducts,
      ordersByPayment: {
        COD: countBy('paymentMethod', 'COD'),
        BANK_TRANSFER: countBy('paymentMethod', 'BANK_TRANSFER'),
        JAZZCASH: countBy('paymentMethod', 'JAZZCASH'),
        EASYPAISA: countBy('paymentMethod', 'EASYPAISA'),
        NAYAPAY: countBy('paymentMethod', 'NAYAPAY'),
        STRIPE: countBy('paymentMethod', 'STRIPE')
      },
      ordersByStatus: {
        PENDING: countBy('orderStatus', 'PENDING'),
        PROCESSING: countBy('orderStatus', 'PROCESSING'),
        SHIPPED: countBy('orderStatus', 'SHIPPED'),
        DELIVERED: countBy('orderStatus', 'DELIVERED'),
        CANCELLED: countBy('orderStatus', 'CANCELLED')
      },
      last7Days: [...dailyMap.values()],
      topProducts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order status
router.put('/orders/:id', protect, admin, async (req, res) => {
  try {
    const allowed = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const { orderStatus } = req.body;
    if (!allowed.includes(orderStatus)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const existing = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!existing) return res.status(404).json({ message: 'Order not found' });

    const updates = { orderStatus };
    if (orderStatus === 'DELIVERED') {
      updates.isDelivered = true;
      updates.deliveredAt = new Date();
    } else if (existing.orderStatus === 'DELIVERED' && orderStatus !== 'DELIVERED') {
      updates.isDelivered = false;
      updates.deliveredAt = null;
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('user', 'name email phone');

    await logAudit(req, {
      action: 'admin.order.status_update',
      entityType: 'order',
      entityId: String(order._id),
      entityLabel: order.orderNumber,
      summary: `Order status changed from ${existing.orderStatus} to ${orderStatus}`,
      before: { orderStatus: existing.orderStatus, paymentStatus: existing.paymentStatus },
      after: { orderStatus: order.orderStatus, paymentStatus: order.paymentStatus }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users (search, pagination, sorting, export)
router.get('/users', protect, admin, async (req, res) => {
  try {
    const { search = '', role } = req.query;
    const query = {};
    if (role && role !== 'all') query.role = role;
    const s = String(search || '').trim();
    if (s) {
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }

    const sort = parseSort(req.query.sort, {
      createdAt: 'createdAt',
      name: 'name',
      email: 'email',
      role: 'role'
    }, { createdAt: -1 });

    const exportCsv = String(req.query.export || '').toLowerCase() === 'csv';
    if (exportCsv) {
      const users = await User.find(query).select('-password -resetPasswordToken -resetPasswordExpire').sort(sort);
      const rows = users.map((u) => ({
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        role: u.role || '',
        addressesCount: Array.isArray(u.addresses) ? u.addresses.length : 0,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : ''
      }));
      await logAudit(req, { action: 'admin.users.export', entityType: 'user', summary: `Exported ${rows.length} users to CSV`, metadata: { role, search: s } });
      return sendCsv(res, `users-${Date.now()}.csv`, rows);
    }

    if (!wantsPaged(req)) {
      const users = await User.find(query).select('-password').sort(sort);
      return res.json(users);
    }

    const { page, limit, skip } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
    const [items, total] = await Promise.all([
      User.find(query).select('-password').sort(sort).skip(skip).limit(limit),
      User.countDocuments(query)
    ]);
    return res.json(buildPagedResponse(items, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get orders with receipts pending verification (supports pagination/sorting/export)
router.get('/orders/receipts', protect, admin, async (req, res) => {
  try {
    const { search = '' } = req.query;
    const query = {
      'paymentReceipt.filePath': { $exists: true, $ne: '' },
      $and: [
        {
          $or: [
            { 'paymentReceipt.verified': false },
            { 'paymentReceipt.verified': { $exists: false } }
          ]
        },
        {
          $or: [
            { paymentStatus: { $ne: 'REJECTED' } },
            { paymentStatus: { $exists: false } }
          ]
        }
      ]
    };
    const s = String(search || '').trim();
    if (s) {
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$and.push({
        $or: [
          { orderNumber: rx },
          { 'shippingAddress.fullName': rx },
          { 'guestInfo.name': rx },
          { 'guestInfo.email': rx },
          { paymentMethod: rx }
        ]
      });
    }

    const sort = parseSort(req.query.sort, {
      createdAt: 'createdAt',
      uploadedAt: 'paymentReceipt.uploadedAt',
      totalPrice: 'totalPrice',
      orderNumber: 'orderNumber'
    }, { 'paymentReceipt.uploadedAt': -1, createdAt: -1 });

    const exportCsv = String(req.query.export || '').toLowerCase() === 'csv';
    if (exportCsv) {
      const orders = await Order.find(query).populate('user', 'name email phone').sort(sort);
      const rows = orders.map((o) => ({
        orderNumber: o.orderNumber,
        customer: o.user?.name || o.guestInfo?.name || o.shippingAddress?.fullName || '',
        email: o.user?.email || o.guestInfo?.email || '',
        paymentMethod: o.paymentMethod || '',
        totalPrice: o.totalPrice ?? '',
        receiptFileName: o.paymentReceipt?.fileName || '',
        uploadedAt: o.paymentReceipt?.uploadedAt ? new Date(o.paymentReceipt.uploadedAt).toISOString() : '',
        receiptVerified: o.paymentReceipt?.verified ? 'yes' : 'no'
      }));
      await logAudit(req, { action: 'admin.receipts.export', entityType: 'order', summary: `Exported ${rows.length} pending receipts to CSV` });
      return sendCsv(res, `pending-receipts-${Date.now()}.csv`, rows);
    }

    if (!wantsPaged(req)) {
      const orders = await Order.find(query).populate('user', 'name email phone').sort(sort);
      return res.json(orders);
    }

    const { page, limit, skip } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
    const [items, total] = await Promise.all([
      Order.find(query).populate('user', 'name email phone').sort(sort).skip(skip).limit(limit),
      Order.countDocuments(query)
    ]);
    return res.json(buildPagedResponse(items, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify receipt (admin)
router.put('/orders/:id/verify-receipt', protect, admin, async (req, res) => {
  try {
    const { verified, adminNotes } = req.body;
    const isVerified = Boolean(verified);
    const existing = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!existing) return res.status(404).json({ message: 'Order not found' });

    const update = {
      'paymentReceipt.verified': isVerified,
      'paymentReceipt.verifiedBy': req.user._id,
      'paymentReceipt.verifiedAt': new Date(),
      'paymentReceipt.adminNotes': String(adminNotes || '').slice(0, 1000),
      paymentStatus: isVerified ? 'VERIFIED' : 'REJECTED',
      orderStatus: isVerified ? 'PROCESSING' : 'CANCELLED'
    };

    if (isVerified) {
      update.isPaid = true;
      update.paidAt = new Date();
    } else {
      update.isPaid = false;
      update.paidAt = null;
    }

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name email phone');

    // If rejected and user account exists, create in-app notification
    if (!isVerified && order.user?._id) {
      const notification = await Notification.create({
        user: order.user._id,
        type: 'receipt_rejected',
        title: 'Payment Receipt Rejected',
        message: `Your payment receipt for order #${order.orderNumber} has been rejected. Reason: ${String(adminNotes || 'Not specified').slice(0, 300)}. Please upload a valid receipt or choose a different payment method.`,
        orderId: order._id
      });

      const io = req.app.get('io');
      if (io) io.to(`user_${order.user._id}`).emit('new_notification', notification);
    }

    await logAudit(req, {
      action: isVerified ? 'admin.receipt.verify' : 'admin.receipt.reject',
      entityType: 'order',
      entityId: String(order._id),
      entityLabel: order.orderNumber,
      summary: `Receipt ${isVerified ? 'verified' : 'rejected'} for order ${order.orderNumber}`,
      before: {
        paymentStatus: existing.paymentStatus,
        orderStatus: existing.orderStatus,
        receiptVerified: Boolean(existing.paymentReceipt?.verified)
      },
      after: {
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        receiptVerified: Boolean(order.paymentReceipt?.verified)
      },
      metadata: { adminNotes: String(adminNotes || '').slice(0, 500) }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single order with receipt details
router.get('/orders/:id', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('paymentReceipt.verifiedBy', 'name');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Stream receipt file for admin (stronger access control than public static URL)
router.get('/orders/:id/receipt-file', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || !order.paymentReceipt?.filePath) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const stored = order.paymentReceipt;
    const filename = stored.fileName || 'receipt';
    const contentType = stored.fileType || 'application/octet-stream';

    if (isHttpUrl(stored.filePath) || stored.storageProvider === 'cloudinary') {
      const remoteUrl = stored.storageProvider === 'cloudinary'
        ? (buildCloudinaryDeliveryUrl(stored) || stored.filePath)
        : stored.filePath;
      if (!remoteUrl || !isHttpUrl(remoteUrl)) {
        return res.status(404).json({ message: 'Receipt file URL is unavailable' });
      }
      await logAudit(req, { action: 'admin.receipt.view', entityType: 'order', entityId: String(order._id), entityLabel: order.orderNumber, summary: 'Admin accessed receipt file' });
      return streamRemoteFile(remoteUrl, res, filename, contentType);
    }

    const resolved = resolveLocalAbsolutePathFromStored(stored.filePath);
    if (!resolved || !fs.existsSync(resolved)) {
      return res.status(404).json({ message: 'Receipt file not found on server' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${String(filename).replace(/"/g, '')}"`);
    await logAudit(req, { action: 'admin.receipt.view', entityType: 'order', entityId: String(order._id), entityLabel: order.orderNumber, summary: 'Admin accessed receipt file' });
    return res.sendFile(path.resolve(resolved));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user
router.delete('/users/:id', protect, admin, async (req, res) => {
  try {
    if (String(req.user?._id) === String(req.params.id)) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'At least one admin account is required' });
      }
    }

    const before = pickAuditFields(user, ['name', 'email', 'role', 'phone', 'createdAt']);
    await user.deleteOne();
    await logAudit(req, {
      action: 'admin.user.delete',
      entityType: 'user',
      entityId: String(user._id),
      entityLabel: user.email || user.name,
      summary: `Deleted user ${user.email || user.name}`,
      before
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user role
router.put('/users/:id/role', protect, admin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    // Prevent admin from accidentally locking themselves out
    if (String(req.user?._id) === String(target._id) && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin role' });
    }

    // Prevent demoting the last admin
    if (target.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'At least one admin account is required' });
      }
    }

    const beforeRole = target.role;
    target.role = role;
    await target.save();

    const safeUser = await User.findById(target._id).select('-password');
    await logAudit(req, {
      action: 'admin.user.role_update',
      entityType: 'user',
      entityId: String(target._id),
      entityLabel: target.email || target.name,
      summary: `Changed user role from ${beforeRole} to ${role}`,
      before: { role: beforeRole },
      after: { role }
    });
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin products (pagination/sort/search/export)
router.get('/products', protect, admin, async (req, res) => {
  try {
    const { search = '', category, featured, inStock } = req.query;
    const query = {};
    if (category) query.subcategory = new RegExp(String(category).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (featured === 'true') query.isFeatured = true;
    if (inStock === 'true') query.stock = { $gt: 0 };
    if (inStock === 'false') query.stock = { $lte: 0 };
    const s = String(search || '').trim();
    if (s) {
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { name: rx },
        { description: rx },
        { subcategory: rx },
        { fabric: rx },
        { material: rx },
        { tags: rx }
      ];
    }

    const sort = parseSort(req.query.sort, {
      createdAt: 'createdAt',
      name: 'name',
      price: 'price',
      stock: 'stock',
      sold: 'sold',
      rating: 'rating'
    }, { createdAt: -1 });

    const exportCsv = String(req.query.export || '').toLowerCase() === 'csv';
    if (exportCsv) {
      const products = await Product.find(query).populate('category', 'name slug').sort(sort);
      const rows = products.map((p) => ({
        name: p.name || '',
        category: p.category?.name || p.subcategory || '',
        subcategory: p.subcategory || '',
        price: p.price ?? '',
        compareAtPrice: p.compareAtPrice ?? '',
        stock: p.stock ?? '',
        sold: p.sold ?? '',
        rating: p.rating ?? '',
        numReviews: p.numReviews ?? (Array.isArray(p.reviews) ? p.reviews.length : 0),
        isFeatured: p.isFeatured ? 'yes' : 'no',
        isNewArrival: p.isNewArrival ? 'yes' : 'no',
        isBestSeller: p.isBestSeller ? 'yes' : 'no',
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : ''
      }));
      await logAudit(req, { action: 'admin.products.export', entityType: 'product', summary: `Exported ${rows.length} products to CSV` });
      return sendCsv(res, `products-${Date.now()}.csv`, rows);
    }

    if (!wantsPaged(req)) {
      const products = await Product.find(query).populate('category', 'name slug').sort(sort);
      return res.json(products);
    }

    const { page, limit, skip } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
    const [items, total] = await Promise.all([
      Product.find(query).populate('category', 'name slug').sort(sort).skip(skip).limit(limit),
      Product.countDocuments(query)
    ]);
    return res.json(buildPagedResponse(items, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin messages (pagination/sort/search/export)
router.get('/messages', protect, admin, async (req, res) => {
  try {
    const { search = '', status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    const s = String(search || '').trim();
    if (s) {
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { email: rx }, { subject: rx }, { message: rx }];
    }
    const sort = parseSort(req.query.sort, {
      createdAt: 'createdAt',
      status: 'status',
      name: 'name',
      email: 'email'
    }, { createdAt: -1 });

    const exportCsv = String(req.query.export || '').toLowerCase() === 'csv';
    if (exportCsv) {
      const messages = await Message.find(query).populate('user', 'name email').sort(sort);
      const rows = messages.map((m) => ({
        name: m.name || '',
        email: m.email || '',
        subject: m.subject || '',
        status: m.status || '',
        message: m.message || '',
        replied: m.adminReply?.message ? 'yes' : 'no',
        repliedAt: m.adminReply?.repliedAt ? new Date(m.adminReply.repliedAt).toISOString() : '',
        createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : ''
      }));
      await logAudit(req, { action: 'admin.messages.export', entityType: 'message', summary: `Exported ${rows.length} messages to CSV` });
      return sendCsv(res, `messages-${Date.now()}.csv`, rows);
    }

    if (!wantsPaged(req)) {
      const messages = await Message.find(query).populate('user', 'name email').sort(sort);
      return res.json(messages);
    }

    const { page, limit, skip } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
    const [items, total] = await Promise.all([
      Message.find(query).populate('user', 'name email').sort(sort).skip(skip).limit(limit),
      Message.countDocuments(query)
    ]);
    return res.json(buildPagedResponse(items, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Review moderation: list reviews across products
router.get('/reviews', protect, admin, async (req, res) => {
  try {
    const { search = '', productId, rating } = req.query;
    const sortDir = String(req.query.sort || '-createdAt').startsWith('-') ? -1 : 1;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const pipeline = [
      { $unwind: '$reviews' },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: '$name',
          productImage: { $arrayElemAt: ['$images', 0] },
          reviewId: '$reviews._id',
          user: '$reviews.user',
          name: '$reviews.name',
          rating: '$reviews.rating',
          comment: '$reviews.comment',
          createdAt: '$reviews.createdAt'
        }
      }
    ];

    const match = {};
    if (productId && mongoose.Types.ObjectId.isValid(productId)) match.productId = new mongoose.Types.ObjectId(productId);
    if (rating) match.rating = Number(rating);
    const s = String(search || '').trim();
    if (s) {
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match.$or = [{ productName: rx }, { name: rx }, { comment: rx }];
    }
    if (Object.keys(match).length) pipeline.push({ $match: match });

    const exportCsv = String(req.query.export || '').toLowerCase() === 'csv';
    if (exportCsv) {
      const items = await Product.aggregate([...pipeline, { $sort: { createdAt: sortDir } }]);
      const rows = items.map((r) => ({
        productName: r.productName || '',
        reviewer: r.name || '',
        rating: r.rating ?? '',
        comment: r.comment || '',
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
        reviewId: r.reviewId || '',
        productId: r.productId || ''
      }));
      await logAudit(req, { action: 'admin.reviews.export', entityType: 'review', summary: `Exported ${rows.length} reviews to CSV` });
      return sendCsv(res, `reviews-${Date.now()}.csv`, rows);
    }

    const [result] = await Product.aggregate([
      ...pipeline,
      {
        $facet: {
          items: [{ $sort: { createdAt: sortDir } }, { $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }]
        }
      }
    ]);
    const items = result?.items || [];
    const total = result?.total?.[0]?.count || 0;
    return res.json(buildPagedResponse(items, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Review moderation: delete a review
router.delete('/reviews/:productId/:reviewId', protect, admin, async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const review = (product.reviews || []).id(reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const before = {
      productId: String(product._id),
      productName: product.name,
      reviewId: String(review._id),
      name: review.name,
      rating: review.rating,
      comment: review.comment
    };

    review.deleteOne();
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.length
      ? Number((product.reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / product.reviews.length).toFixed(1))
      : 0;
    await product.save();

    await logAudit(req, {
      action: 'admin.review.delete',
      entityType: 'review',
      entityId: String(reviewId),
      entityLabel: `${product.name} / ${before.name || 'review'}`,
      summary: `Deleted review from ${before.name || 'reviewer'} on product ${product.name}`,
      before
    });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Audit logs (pagination/filter/sort/export)
router.get('/audit-logs', protect, admin, async (req, res) => {
  try {
    const { search = '', action, entityType, actor } = req.query;
    const query = {};
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (actor) query.actor = actor;
    const s = String(search || '').trim();
    if (s) {
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { action: rx },
        { entityType: rx },
        { entityId: rx },
        { entityLabel: rx },
        { summary: rx },
        { actorName: rx },
        { actorEmail: rx }
      ];
    }
    const sort = parseSort(req.query.sort, { createdAt: 'createdAt', action: 'action', entityType: 'entityType' }, { createdAt: -1 });

    const exportCsv = String(req.query.export || '').toLowerCase() === 'csv';
    if (exportCsv) {
      const logs = await AuditLog.find(query).sort(sort).limit(5000);
      const rows = logs.map((l) => ({
        createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : '',
        actorName: l.actorName || '',
        actorEmail: l.actorEmail || '',
        actorRole: l.actorRole || '',
        action: l.action || '',
        entityType: l.entityType || '',
        entityId: l.entityId || '',
        entityLabel: l.entityLabel || '',
        summary: l.summary || ''
      }));
      await logAudit(req, { action: 'admin.audit_logs.export', entityType: 'audit_log', summary: `Exported ${rows.length} audit logs to CSV` });
      return sendCsv(res, `audit-logs-${Date.now()}.csv`, rows);
    }

    const { page, limit, skip } = parsePagination(req, { defaultLimit: 20, maxLimit: 100 });
    const [items, total] = await Promise.all([
      AuditLog.find(query).sort(sort).skip(skip).limit(limit),
      AuditLog.countDocuments(query)
    ]);
    return res.json(buildPagedResponse(items, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;