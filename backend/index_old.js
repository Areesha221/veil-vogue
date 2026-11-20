const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully to Veil & Vogue DB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Base Route
app.get('/', (req, res) => {
  res.send('🚀 Veil & Vogue API is running... Where Modesty Meets Elegance.');
});

// TODO: Add Routes here (Products, Users, Orders, Payments)
// app.use('/api/products', require('./routes/products'));
// app.use('/api/users', require('./routes/users'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));