import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import sendEmail from '../utils/sendEmail.js';
import {
  validateEmail,
  validatePassword,
  validatePhone,
  isNonEmptyString,
  toTrimmedString
} from '../utils/validate.js';

const router = express.Router();

const authSensitiveLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many attempts. Please try again later.'
});
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again later.'
});
const forgotLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please try again later.'
});

const signToken = (id) => jwt.sign(
  { id },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '30d' }
);

// Register
router.post('/register', authSensitiveLimiter, async (req, res) => {
  try {
    const name = toTrimmedString(req.body.name);
    const email = toTrimmedString(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const phone = toTrimmedString(req.body.phone);

    if (!isNonEmptyString(name, 120)) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ message: 'Please provide a valid phone number' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password, ...(phone ? { phone } : {}) });

    const token = signToken(user._id);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const email = toTrimmedString(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!validateEmail(email) || !password) {
      return res.status(400).json({ message: 'Please provide a valid email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (user && (await user.comparePassword(password))) {
      const token = signToken(user._id);
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        addresses: user.addresses || [],
        role: user.role,
        token
      });
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.name !== undefined) {
      const name = toTrimmedString(req.body.name);
      if (!isNonEmptyString(name, 120)) return res.status(400).json({ message: 'Name is required' });
      user.name = name;
    }

    if (req.body.email !== undefined) {
      const email = toTrimmedString(req.body.email).toLowerCase();
      if (!validateEmail(email)) return res.status(400).json({ message: 'Please provide a valid email address' });
      if (email !== user.email) {
        const existing = await User.findOne({ email, _id: { $ne: user._id } });
        if (existing) return res.status(400).json({ message: 'Email is already in use' });
        user.email = email;
      }
    }

    if (req.body.phone !== undefined) {
      const phone = toTrimmedString(req.body.phone);
      if (phone && !validatePhone(phone)) return res.status(400).json({ message: 'Please provide a valid phone number' });
      user.phone = phone;
    }

    if (req.body.password) {
      if (!validatePassword(req.body.password)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || '',
      role: updatedUser.role,
      addresses: updatedUser.addresses || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const sanitizeAddressInput = (body = {}) => ({
  fullName: toTrimmedString(body.fullName).slice(0, 120),
  phone: toTrimmedString(body.phone).slice(0, 30),
  street: toTrimmedString(body.street).slice(0, 300),
  city: toTrimmedString(body.city).slice(0, 120),
  state: toTrimmedString(body.state).slice(0, 120),
  zip: toTrimmedString(body.zip).slice(0, 30),
  country: (toTrimmedString(body.country) || 'Pakistan').slice(0, 80),
  isDefault: Boolean(body.isDefault)
});

const validateAddressInput = (addr) => {
  const required = ['fullName', 'phone', 'street', 'city', 'state'];
  for (const key of required) {
    if (!addr[key]) return `${key} is required`;
  }
  if (!validatePhone(addr.phone)) return 'Invalid phone number';
  return null;
};

// Add saved address
router.post('/profile/addresses', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const address = sanitizeAddressInput(req.body);
    const err = validateAddressInput(address);
    if (err) return res.status(400).json({ message: err });

    if (address.isDefault) {
      user.addresses.forEach(a => { a.isDefault = false; });
    }
    user.addresses.push(address);
    await user.save();
    res.json(user.addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update saved address
router.put('/profile/addresses/:addressId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const address = user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: 'Address not found' });

    const next = sanitizeAddressInput({ ...address.toObject(), ...req.body });
    const err = validateAddressInput(next);
    if (err) return res.status(400).json({ message: err });

    if (next.isDefault) {
      user.addresses.forEach(a => { a.isDefault = false; });
    }
    Object.assign(address, next);
    await user.save();
    res.json(user.addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete saved address
router.delete('/profile/addresses/:addressId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.addresses = user.addresses.filter(
      addr => addr._id.toString() !== req.params.addressId
    );
    await user.save();
    res.json(user.addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Forgot password
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const email = toTrimmedString(req.body.email).toLowerCase();
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email });
    // Security: avoid account enumeration. Respond generically if user does not exist.
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #d4af37 0%, #f4e5c2 100%); padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #0a0a0a; font-size: 28px;">Veil & Vogue</h1>
          <p style="color: #0a0a0a; margin-top: 10px;">Password Reset Request</p>
        </div>
        <div style="padding: 30px; color: #333;">
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password for your Veil & Vogue account.</p>
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <strong>Important:</strong> This link will expire in 30 minutes for security reasons.
          </div>
          <p style="text-align: center;">
            <a href="${resetUrl}" style="display: inline-block; background: #d4af37; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold;">Reset Password</a>
          </p>
          <p style="word-break: break-all; color: #666; font-size: 14px; text-align: center;">Or copy this link: ${resetUrl}</p>
          <p><strong>If you didn't request this, please ignore this email.</strong></p>
          <p>Best regards,<br>The Veil & Vogue Team</p>
        </div>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Veil & Vogue. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Veil & Vogue - Password Reset Request',
        html: emailHtml
      });
      const payload = { message: 'If an account with that email exists, a password reset link has been sent.' };
      // Helpful for local development/testing; avoid exposing in production.
      if (process.env.NODE_ENV !== 'production') payload.resetUrl = resetUrl;
      res.json(payload);
    } catch (emailError) {
      console.error('Email error:', emailError);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      // Do not reveal whether account exists; still avoid exposing reset link on send failure in production
      res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Reset password
router.put('/reset-password/:token', authSensitiveLimiter, async (req, res) => {
  try {
    const token = toTrimmedString(req.params.token);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!token) return res.status(400).json({ message: 'Invalid or expired token' });
    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;