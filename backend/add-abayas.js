import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import Category from './models/Category.js';

dotenv.config();

const abayaProducts = [
  {
    name: 'Classic Black Nida Abaya',
    description: 'Elegant classic black abaya made from premium nida fabric. Comfortable, flowy, and perfect for everyday wear and formal occasions.',
    price: 7200,
    compareAtPrice: 8500,
    images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'],
    stock: 25,
    rating: 4.8,
    numReviews: 34,
    isBestSeller: true,
    isFeatured: true,
    sold: 120,
    subcategory: 'abayas',
    fabric: 'Nida',
    tags: ['abaya', 'black', 'nida', 'classic', 'everyday', 'formal', 'best seller']
  },
  {
    name: 'Embroidered Wedding Abaya - Ivory',
    description: 'Luxury embroidered wedding abaya in ivory with delicate detailing. A graceful choice for weddings and special events.',
    price: 14500,
    compareAtPrice: 16500,
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800'],
    stock: 12,
    rating: 4.9,
    numReviews: 18,
    isBestSeller: true,
    isFeatured: true,
    sold: 64,
    subcategory: 'abayas',
    fabric: 'Chiffon & Crepe',
    tags: ['abaya', 'wedding', 'bridal', 'ivory', 'embroidered', 'formal', 'party']
  },
  {
    name: 'Front Open Chiffon Abaya - Beige',
    description: 'Lightweight front-open chiffon abaya with a modern silhouette. Ideal for layering and elegant daily styling.',
    price: 8900,
    compareAtPrice: 9900,
    images: ['https://images.unsplash.com/photo-1583391733981-8b530c6a4f63?w=800'],
    stock: 18,
    rating: 4.7,
    numReviews: 22,
    isBestSeller: false,
    isFeatured: true,
    sold: 41,
    subcategory: 'abayas',
    fabric: 'Chiffon',
    tags: ['abaya', 'chiffon', 'front open', 'beige', 'casual', 'elegant']
  },
  {
    name: 'Georgette Pleated Abaya - Navy',
    description: 'Stylish navy georgette abaya with pleated details and a soft drape. Suitable for office, gatherings, and evening wear.',
    price: 9800,
    compareAtPrice: 11000,
    images: ['https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?w=800'],
    stock: 15,
    rating: 4.6,
    numReviews: 15,
    isBestSeller: false,
    isFeatured: false,
    sold: 29,
    subcategory: 'abayas',
    fabric: 'Georgette',
    tags: ['abaya', 'georgette', 'navy', 'pleated', 'formal', 'evening']
  },
  {
    name: 'Casual Crepe Abaya - Mocha',
    description: 'Soft crepe abaya in mocha tone designed for comfort and modest everyday elegance.',
    price: 7600,
    compareAtPrice: 8400,
    images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800'],
    stock: 30,
    rating: 4.7,
    numReviews: 27,
    isBestSeller: false,
    isFeatured: true,
    sold: 53,
    subcategory: 'abayas',
    fabric: 'Crepe',
    tags: ['abaya', 'crepe', 'mocha', 'casual', 'everyday', 'modest']
  },
  {
    name: 'Premium Satin Trim Abaya - Black',
    description: 'Premium black abaya with satin trim accents for a refined and polished look. Great for events and formal wear.',
    price: 11200,
    compareAtPrice: 12500,
    images: ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800'],
    stock: 14,
    rating: 4.8,
    numReviews: 19,
    isBestSeller: true,
    isFeatured: true,
    sold: 72,
    subcategory: 'abayas',
    fabric: 'Nida & Satin',
    tags: ['abaya', 'black', 'satin', 'nida', 'formal', 'premium', 'party']
  }
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let abayaCategory = await Category.findOne({ slug: 'abayas' });
    if (!abayaCategory) {
      abayaCategory = await Category.findOne({ name: /abaya/i });
    }
    if (!abayaCategory) {
      abayaCategory = await Category.create({
        name: 'Abayas',
        slug: 'abayas',
        description: 'Elegant and modest abayas'
      });
      console.log('Created Abayas category');
    }

    let created = 0;
    let updated = 0;

    for (const item of abayaProducts) {
      const existing = await Product.findOne({ name: item.name });
      if (existing) {
        existing.set({
          ...item,
          category: abayaCategory._id
        });
        await existing.save();
        updated += 1;
        console.log(`Updated: ${item.name}`);
      } else {
        await Product.create({
          ...item,
          category: abayaCategory._id
        });
        created += 1;
        console.log(`Created: ${item.name}`);
      }
    }

    console.log(`Done. Created: ${created}, Updated: ${updated}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to add abaya products:', error);
    process.exit(1);
  }
};

run();
