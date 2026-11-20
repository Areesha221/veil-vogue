import express from 'express';
import { protect } from '../middleware/auth.js';
import { admin } from '../middleware/admin.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { logAudit } from '../utils/audit.js';

const router = express.Router();

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

const parsePagination = (req, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const wantsPaged = (req) => {
  const v = String(req.query.paginated || '').toLowerCase();
  return Boolean(req.query.page || req.query.limit || req.query.sort || req.query.search || req.query.status || v === '1' || v === 'true');
};

// Create message (customer sends)
router.post('/', protect, async (req, res) => {
  try {
    const name = String(req.body?.name || req.user?.name || '').trim();
    const email = String(req.body?.email || req.user?.email || '').trim().toLowerCase();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || name.length < 2) return res.status(400).json({ message: 'Name is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Valid email is required' });
    if (!subject || subject.length < 3) return res.status(400).json({ message: 'Subject must be at least 3 characters' });
    if (!message || message.length < 5) return res.status(400).json({ message: 'Message must be at least 5 characters' });

    const newMessage = await Message.create({
      user: req.user._id,
      name: name.slice(0, 120),
      email: email.slice(0, 254),
      subject: subject.slice(0, 200),
      message: message.slice(0, 3000)
    });

    const io = req.app.get('io');
    io?.to('admin_room').emit('new_message', newMessage);

    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const adminUser of admins) {
      await Notification.create({
        user: adminUser._id,
        type: 'message_reply',
        title: 'New Contact Message',
        message: `New message from ${newMessage.name}: ${newMessage.subject}`,
        read: false
      });
      io?.to(`user_${adminUser._id}`).emit('new_notification', {
        type: 'message_reply',
        title: 'New Contact Message',
        message: `New message from ${newMessage.name}: ${newMessage.subject}`,
        createdAt: new Date()
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user's messages
router.get('/my-messages', protect, async (req, res) => {
  try {
    const messages = await Message.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all messages (admin) with pagination/sorting/search/export
router.get('/', protect, admin, async (req, res) => {
  try {
    const { search = '', status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    const s = String(search || '').trim();
    if (s) {
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { email: rx }, { subject: rx }, { message: rx }];
    }

    const sortParam = String(req.query.sort || '-createdAt');
    const desc = sortParam.startsWith('-');
    const key = desc ? sortParam.slice(1) : sortParam;
    const allowedSort = { createdAt: 'createdAt', status: 'status', name: 'name', email: 'email' };
    const sort = allowedSort[key] ? { [allowedSort[key]]: desc ? -1 : 1 } : { createdAt: -1 };

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

    const { page, limit, skip } = parsePagination(req);
    const [items, total] = await Promise.all([
      Message.find(query).populate('user', 'name email').sort(sort).skip(skip).limit(limit),
      Message.countDocuments(query)
    ]);
    return res.json({
      items,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit || 1)), hasMore: page * limit < total }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin replies to message
router.post('/:id/reply', protect, admin, async (req, res) => {
  try {
    const reply = String(req.body?.reply || '').trim();
    if (!reply) return res.status(400).json({ message: 'Reply is required' });
    if (reply.length > 3000) return res.status(400).json({ message: 'Reply is too long' });

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const before = { status: message.status, hadReply: Boolean(message.adminReply?.message) };
    message.adminReply = {
      message: reply.slice(0, 3000),
      repliedAt: new Date(),
      repliedBy: req.user._id
    };
    message.status = 'replied';
    await message.save();

    const io = req.app.get('io');
    io?.to(`user_${message.user}`).emit('message_reply', message);

    await Notification.create({
      user: message.user,
      type: 'message_reply',
      title: 'Admin replied to your message',
      message: `Admin has replied to: ${message.subject}`,
      read: false
    });

    await logAudit(req, {
      action: 'admin.message.reply',
      entityType: 'message',
      entityId: String(message._id),
      entityLabel: message.subject,
      summary: `Replied to message from ${message.email || message.name}`,
      before,
      after: { status: message.status, hadReply: true }
    });

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark message as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const isOwner = String(message.user) === String(req.user?._id);
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (message.status === 'unread') {
      message.status = 'read';
      await message.save();
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;