import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { createRateLimiter } from './middleware/rateLimit.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// Basic security headers
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Middleware
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api', createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: 'Too many requests, please slow down and try again later.'
}));
// Public static assets (product images etc.). Receipt files are served via authorized APIs only.
app.use('/uploads/products', express.static(path.join(__dirname, 'uploads', 'products')));
app.use('/uploads/receipts', (req, res) => {
  res.status(403).json({ message: 'Direct access to receipt files is not allowed' });
});

// Connect to Database
connectDB();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    if (userId) socket.join(`user_${userId}`);
  });

  socket.on('join_admin', () => {
    socket.join('admin_room');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', (await import('./routes/authRoutes.js')).default);
app.use('/api/products', (await import('./routes/productRoutes.js')).default);
app.use('/api/categories', (await import('./routes/categoryRoutes.js')).default);
app.use('/api/orders', (await import('./routes/orderRoutes.js')).default);
app.use('/api/admin', (await import('./routes/adminRoutes.js')).default);
app.use('/api/messages', (await import('./routes/messageRoutes.js')).default);
app.use('/api/notifications', (await import('./routes/notificationRoutes.js')).default);
app.use('/api/wishlist', (await import('./routes/wishlistRoutes.js')).default);

app.get('/', (req, res) => {
  res.json({ message: 'Veil & Vogue API is running' });
});

// Basic error handler (including upload errors)
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.name === 'MulterError' || /Only .* allowed|File too large/i.test(err.message || '')) {
    return res.status(400).json({ message: err.message || 'Invalid upload' });
  }
  console.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});